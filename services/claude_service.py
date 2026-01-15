"""
Claude AI Service
Handles conversation with Claude API including tool calling.
Routes tools to appropriate security flow (Okta XAA vs Auth0 Token Vault).

Version: 3.0 - Natural Prompting Support (2026-01-07)
  - v2.0: Added hallucination detection
  - v2.1: Fixed false positives - only trigger on explicit success claims
  - v2.2: Added more pattern variations to catch "successfully updated" etc.
  - v3.0: Added Tool Selection Guide to system prompt for natural prompting
"""

import logging
import os
import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
import pytz
import anthropic

logger = logging.getLogger(__name__)

# Define which tools use which security flow
MCP_TOOLS = ["get_client", "list_clients", "get_portfolio", "process_payment", "update_client"]
CALENDAR_TOOLS = ["list_calendar_events", "get_calendar_event", "create_calendar_event", "check_availability", "cancel_calendar_event"]
SALESFORCE_TOOLS = ["search_salesforce_contacts", "create_salesforce_contact", "get_contact_opportunities", 
                    "get_sales_pipeline", "get_high_value_accounts", "create_salesforce_task", 
                    "create_salesforce_note", "get_pipeline_value", "update_opportunity_stage"]

# Hallucination detection v2.2: Comprehensive patterns for success claims
# Format: (regex_pattern, expected_tools)
HALLUCINATION_PATTERNS = [
    # ==================== CANCEL PATTERNS ====================
    (r"i'?ve successfully cancelled", ["cancel_calendar_event"]),
    (r"i'?ve cancelled", ["cancel_calendar_event"]),
    (r"successfully cancelled", ["cancel_calendar_event"]),
    (r"meeting has been cancelled", ["cancel_calendar_event"]),
    (r"event has been cancelled", ["cancel_calendar_event"]),
    (r"has been removed from your.*calendar", ["cancel_calendar_event"]),
    (r"cancelled your.*meeting", ["cancel_calendar_event"]),
    (r"meeting.*cancelled successfully", ["cancel_calendar_event"]),
    
    # ==================== CREATE/SCHEDULE PATTERNS ====================
    (r"i'?ve successfully scheduled", ["create_calendar_event"]),
    (r"i'?ve scheduled", ["create_calendar_event"]),
    (r"successfully scheduled", ["create_calendar_event"]),
    (r"meeting has been scheduled", ["create_calendar_event"]),
    (r"i'?ve created a meeting", ["create_calendar_event"]),
    (r"calendar invite sent", ["create_calendar_event"]),
    (r"meeting.*scheduled for", ["create_calendar_event"]),
    
    # ==================== SALESFORCE CREATE PATTERNS ====================
    (r"i'?ve created a new contact", ["create_salesforce_contact"]),
    (r"contact has been created", ["create_salesforce_contact"]),
    (r"successfully created.*contact", ["create_salesforce_contact"]),
    (r"i'?ve created a task", ["create_salesforce_task"]),
    (r"task has been created", ["create_salesforce_task"]),
    (r"successfully created.*task", ["create_salesforce_task"]),
    (r"i'?ve added a note", ["create_salesforce_note"]),
    (r"note has been added", ["create_salesforce_note"]),
    (r"successfully added.*note", ["create_salesforce_note"]),
    
    # ==================== UPDATE PATTERNS (v2.2 - expanded) ====================
    (r"i'?ve updated the opportunity", ["update_opportunity_stage"]),
    (r"i'?ve successfully updated", ["update_opportunity_stage", "update_client"]),
    (r"successfully updated the", ["update_opportunity_stage", "update_client"]),
    (r"successfully updated.*opportunity", ["update_opportunity_stage"]),
    (r"opportunity.*has been updated", ["update_opportunity_stage"]),
    (r"opportunity.*updated to", ["update_opportunity_stage"]),
    (r"stage has been changed", ["update_opportunity_stage"]),
    (r"stage.*changed to", ["update_opportunity_stage"]),
    (r"updated.*to.*closed won", ["update_opportunity_stage"]),
    (r"updated.*to.*closed lost", ["update_opportunity_stage"]),
    (r"moved.*to.*closed won", ["update_opportunity_stage"]),
    (r"changed.*stage.*to", ["update_opportunity_stage"]),
    (r"update confirmed", ["update_opportunity_stage", "update_client"]),
    
    # ==================== PAYMENT PATTERNS ====================
    (r"payment has been processed", ["process_payment"]),
    (r"transfer has been completed", ["process_payment"]),
    (r"i'?ve processed the payment", ["process_payment"]),
    (r"successfully processed.*payment", ["process_payment"]),
    (r"transfer.*completed successfully", ["process_payment"]),
    (r"funds have been transferred", ["process_payment"]),
]


class ClaudeService:
    """
    Service for interacting with Claude API.
    Routes tool calls to appropriate backend:
    - Internal MCP tools: Okta XAA (ID-JAG token exchange)
    - Calendar tools: Auth0 Token Vault (Google Calendar)
    - Salesforce tools: Auth0 Token Vault (Phase 2)
    """
    
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        base_url = os.getenv("ANTHROPIC_BASE_URL")  # LiteLLM proxy support
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set")
            self.client = None
        else:
            if base_url:
                logger.info(f"[Claude] Using proxy at {base_url}")
                self.client = anthropic.Anthropic(api_key=api_key, base_url=base_url)
            else:
                self.client = anthropic.Anthropic(api_key=api_key)
        
        self.model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
        
        self.system_prompt = """You are Buffett, an AI assistant for Apex Wealth Advisor, a premium wealth management platform.

Your role is to help financial advisors manage client portfolios, process transactions, schedule meetings, and access client information.

## Tool Selection Guide - IMPORTANT

**For FINANCIAL data (portfolio value, AUM, holdings, risk profile, transactions):**
→ Use Internal Portfolio System tools: get_client, get_portfolio, list_clients, process_payment, update_client
→ Keywords: portfolio, AUM, holdings, allocation, performance, YTD return, risk profile, transfer, payment

**For CRM/SALES data (contacts for sales calls, opportunities, pipeline, tasks, notes):**
→ Use Salesforce CRM tools: search_salesforce_contacts, get_contact_opportunities, get_sales_pipeline, create_salesforce_task, create_salesforce_note, update_opportunity_stage
→ Keywords: CRM, opportunities, pipeline, deals, tasks, notes, sales, prospects

**For SCHEDULING (meetings, calendar, availability):**
→ Use Google Calendar tools: list_calendar_events, create_calendar_event, check_availability, cancel_calendar_event
→ Keywords: schedule, meeting, calendar, availability, appointment

**Examples:**
- "What's Marcus Thompson's portfolio value?" → get_client (Internal - financial)
- "What opportunities do we have with Marcus?" → get_contact_opportunities (Salesforce - sales)
- "Look up Marcus in CRM for a sales call" → search_salesforce_contacts (Salesforce - CRM)
- "Schedule a meeting with Marcus" → create_calendar_event (Calendar)
- "Process a $5,000 transfer from Marcus's account" → process_payment (Internal - financial)

## Available Tools

### Internal Portfolio System (Okta XAA)
These tools access the internal portfolio management system via Okta Cross-App Access:
- get_client: Get client FINANCIAL profile - portfolio value, AUM, risk score, YTD performance
- list_clients: List all investment clients with portfolio values and total AUM
- get_portfolio: Get detailed holdings, allocation, and performance metrics
- process_payment: Process financial transactions (transfers, withdrawals)
- update_client: Update client contact information in portfolio system

### Google Calendar (Auth0 Token Vault)
These tools access Google Calendar via Auth0 Token Vault:
- list_calendar_events: Show upcoming meetings
- create_calendar_event: Schedule new meetings with clients
- check_availability: Check if a time slot is free
- cancel_calendar_event: Cancel a meeting

### Salesforce CRM (Auth0 Token Vault)
These tools access Salesforce via Auth0 Token Vault:
- search_salesforce_contacts: Find CRM contacts for sales relationship info
- get_contact_opportunities: Get sales opportunities linked to a contact
- get_sales_pipeline: View pipeline summary by stage
- create_salesforce_task: Create follow-up tasks in CRM
- create_salesforce_note: Add notes to accounts in CRM
- update_opportunity_stage: Update opportunity stage (e.g., Closed Won)

## Security Behaviors

1. **Okta XAA (Cross-App Access)**: All internal portfolio tools use ID-JAG token exchange for secure access
2. **Auth0 Token Vault**: Calendar and Salesforce tools use Token Vault to retrieve credentials securely
3. **CIBA Step-Up**: Payments over $10,000 require step-up authentication (push notification)
4. **Risk Policy**: Payments to unverified recipients (e.g., "Offshore Holdings LLC") are blocked

## Response Style
- Be helpful and professional
- Explain security controls clearly when they apply
- Proactively offer to schedule follow-up meetings after client discussions
- Use the client's name naturally in conversation

## CRITICAL TOOL USAGE RULE
You MUST call the actual tool for EVERY action request. Never assume an action succeeded based on conversation history. Never reuse event IDs or data from previous messages. Always make a fresh tool call for each action.

When security controls block an action, explain why clearly and suggest alternatives."""
    
    def _convert_tools_to_claude(self, mcp_tools: List[Dict], calendar_tools: List[Dict], salesforce_tools: List[Dict] = None) -> List[Dict]:
        """Convert tool definitions to Claude tool format"""
        claude_tools = []
        
        # Add MCP tools
        for tool in mcp_tools:
            claude_tools.append({
                "name": tool["name"],
                "description": tool["description"] + " [Security: Okta XAA]",
                "input_schema": tool["parameters"]
            })
        
        # Add Calendar tools
        for tool in calendar_tools:
            claude_tools.append({
                "name": tool["name"],
                "description": tool["description"] + " [Security: Auth0 Token Vault]",
                "input_schema": tool["parameters"]
            })
        
        # Add Salesforce tools
        if salesforce_tools:
            for tool in salesforce_tools:
                claude_tools.append({
                    "name": tool["name"],
                    "description": tool["description"] + " [Security: Auth0 Token Vault]",
                    "input_schema": tool.get("input_schema", tool.get("parameters", {}))
                })
        
        return claude_tools
    
    def _detect_hallucination(self, response_text: str, tools_called: List[str]) -> Optional[str]:
        """
        Detect if Claude claimed to perform an action without calling the tool.
        
        v2.2: Expanded patterns to catch more variations like "successfully updated".
        
        Returns warning message if hallucination detected, None otherwise.
        """
        response_lower = response_text.lower()
        
        for pattern, expected_tools in HALLUCINATION_PATTERNS:
            if re.search(pattern, response_lower):
                # Check if any expected tool was actually called
                tool_was_called = any(tool in tools_called for tool in expected_tools)
                if not tool_was_called:
                    logger.warning(
                        f"[Claude] HALLUCINATION DETECTED: Response matches '{pattern}' "
                        f"but tools {expected_tools} were not called. Tools called: {tools_called}"
                    )
                    return (
                        "\n\n⚠️ **Warning:** The action described above may not have completed. "
                        "Please verify in the source system (Google Calendar, Salesforce, etc.)."
                    )
        
        return None
    
    async def process_message(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        user_info: Optional[Dict[str, Any]] = None,
        mcp_token: Optional[str] = None,
        mcp_server = None,
        calendar_tools = None,
        google_token: Optional[str] = None,
        salesforce_tools = None,
        salesforce_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a message through Claude with tool access.
        Routes tools to appropriate security flow.
        
        Args:
            message: User's message
            conversation_history: Previous messages
            user_info: Authenticated user information
            mcp_token: MCP access token from Okta XAA
            mcp_server: MCP server instance for internal tools
            calendar_tools: Google Calendar tools instance
            google_token: Google token from Auth0 Token Vault
            salesforce_tools: Salesforce tools instance
            salesforce_token: Salesforce token from Auth0 Token Vault
        """
        if not self.client:
            return {
                "content": "Claude API is not configured. Please set ANTHROPIC_API_KEY.",
                "agent_type": "Error"
            }
        
        try:
            # Build messages
            messages = []
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            messages.append({"role": "user", "content": message})
            
            # Gather all tools
            all_tools = []
            mcp_tool_list = []
            calendar_tool_list = []
            salesforce_tool_list = []
            
            if mcp_server:
                mcp_tool_list = mcp_server.list_tools()
            
            if calendar_tools:
                calendar_tool_list = calendar_tools.list_tools()
            
            if salesforce_tools:
                salesforce_tool_list = salesforce_tools.list_tools()
            
            all_tools = self._convert_tools_to_claude(mcp_tool_list, calendar_tool_list, salesforce_tool_list)
            
            # Inject current date/time in PST for accurate date handling
            pst = pytz.timezone('America/Los_Angeles')
            now_pst = datetime.now(pst)
            date_context = f"\n\n## Current Date/Time\nToday is {now_pst.strftime('%A, %B %d, %Y')}. Current time is {now_pst.strftime('%I:%M %p')} PST."
            system_with_date = self.system_prompt + date_context
            
            # Initial Claude call
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=system_with_date,
                messages=messages,
                tools=all_tools if all_tools else None
            )
            
            # Handle tool calls
            tools_called = []
            xaa_tools_called = []
            vault_tools_called = []
            tool_results = []
            
            while response.stop_reason == "tool_use":
                # Process each tool use
                for content_block in response.content:
                    if content_block.type == "tool_use":
                        tool_name = content_block.name
                        tool_input = content_block.input
                        tool_use_id = content_block.id
                        
                        logger.info(f"[Claude] Tool call: {tool_name}")
                        tools_called.append(tool_name)
                        
                        # Route to appropriate handler based on tool type
                        if tool_name in MCP_TOOLS:
                            # Internal MCP tool - use Okta XAA
                            xaa_tools_called.append(tool_name)
                            if mcp_server:
                                tool_user_info = user_info or {}
                                if mcp_token:
                                    tool_user_info["mcp_token"] = mcp_token
                                
                                result = await mcp_server.call_tool(
                                    tool_name,
                                    tool_input,
                                    tool_user_info
                                )
                                result["security_flow"] = "Okta XAA (ID-JAG)"
                            else:
                                result = {"error": "MCP server not available"}
                        
                        elif tool_name in CALENDAR_TOOLS:
                            # Calendar tool - use Auth0 Token Vault
                            vault_tools_called.append(tool_name)
                            if calendar_tools:
                                result = await calendar_tools.call_tool(
                                    tool_name,
                                    tool_input,
                                    google_token
                                )
                                result["security_flow"] = "Auth0 Token Vault"
                            else:
                                result = {"error": "Calendar tools not available"}
                        
                        elif tool_name in SALESFORCE_TOOLS:
                            # Salesforce tool - use Auth0 Token Vault
                            vault_tools_called.append(tool_name)
                            if salesforce_tools:
                                result = await salesforce_tools.call_tool(
                                    tool_name,
                                    tool_input,
                                    salesforce_token
                                )
                                result["security_flow"] = "Auth0 Token Vault"
                            else:
                                result = {"error": "Salesforce tools not available"}
                        
                        else:
                            result = {"error": f"Unknown tool: {tool_name}"}
                        
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": json.dumps(result)
                        })
                
                # Continue conversation with tool results
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
                
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=2048,
                    system=system_with_date,
                    messages=messages,
                    tools=all_tools if all_tools else None
                )
                
                tool_results = []
            
            # Extract final text response
            final_content = ""
            for content_block in response.content:
                if hasattr(content_block, "text"):
                    final_content += content_block.text
            
            # ================================================================
            # HALLUCINATION DETECTION v2.2
            # Check if Claude claimed to do something without calling the tool
            # Expanded patterns to catch more variations
            # ================================================================
            hallucination_warning = self._detect_hallucination(final_content, tools_called)
            if hallucination_warning:
                final_content += hallucination_warning
            
            return {
                "content": final_content,
                "agent_type": "Buffett (Wealth Advisor)",
                "tools_called": tools_called if tools_called else None,
                "security_info": {
                    "xaa_tools": xaa_tools_called,
                    "vault_tools": vault_tools_called,
                    "mcp_token_used": bool(mcp_token and xaa_tools_called),
                    "google_token_used": bool(google_token and vault_tools_called),
                    "hallucination_detected": bool(hallucination_warning)
                } if tools_called or hallucination_warning else None
            }
            
        except anthropic.APIError as e:
            logger.error(f"[Claude] API error: {e}")
            return {
                "content": f"I encountered an error: {str(e)}",
                "agent_type": "Error"
            }
        except Exception as e:
            logger.error(f"[Claude] Error: {e}", exc_info=True)
            return {
                "content": f"An unexpected error occurred: {str(e)}",
                "agent_type": "Error"
            }
