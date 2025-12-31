"""
Claude AI Service
Handles conversation with Claude API including tool calling.
Routes tools to appropriate security flow (Okta XAA vs Auth0 Token Vault).
"""

import logging
import os
import json
from typing import Dict, Any, List, Optional
import anthropic

logger = logging.getLogger(__name__)

# Define which tools use which security flow
MCP_TOOLS = ["get_client", "list_clients", "get_portfolio", "process_payment", "update_client"]
CALENDAR_TOOLS = ["list_calendar_events", "get_calendar_event", "create_calendar_event", "check_availability", "cancel_calendar_event"]
SALESFORCE_TOOLS = [
    "search_salesforce_contacts",
    "get_contact_opportunities", 
    "get_sales_pipeline",
    "get_high_value_accounts",
    "create_salesforce_task",
    "create_salesforce_note",
    "get_pipeline_value",
    "update_opportunity_stage"
]


class ClaudeService:
    """
    Service for interacting with Claude API.
    Routes tool calls to appropriate backend:
    - Internal MCP tools: Okta XAA (ID-JAG token exchange)
    - Calendar tools: Auth0 Token Vault (Google Calendar)
    - Salesforce tools: Auth0 Token Vault (Salesforce)
    """
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=api_key)
        
        self.model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
        
        self.system_prompt = """You are Buffett, an AI assistant for Apex Wealth Advisor, a premium wealth management platform.

Your role is to help financial advisors manage client portfolios, process transactions, schedule meetings, and access client information.

## Available Tools

### Internal Portfolio System (Okta XAA)
These tools access the internal portfolio management system via Okta Cross-App Access:
- get_client: Look up client information by name or ID
- list_clients: List all active clients  
- get_portfolio: Get detailed portfolio holdings and performance
- process_payment: Process payment transactions
- update_client: Update client contact information

### Google Calendar (Auth0 Token Vault)
These tools access Google Calendar via Auth0 Token Vault:
- list_calendar_events: Show upcoming meetings
- create_calendar_event: Schedule new meetings with clients
- check_availability: Check if a time slot is free
- cancel_calendar_event: Cancel a meeting

### Salesforce CRM (Auth0 Token Vault)
These tools access Salesforce CRM via Auth0 Token Vault:
- search_salesforce_contacts: Search for contacts by name
- get_contact_opportunities: Get opportunities for a contact
- get_sales_pipeline: View sales pipeline by stage
- get_high_value_accounts: Find high-value opportunities (>$500K)
- create_salesforce_task: Create follow-up tasks
- create_salesforce_note: Add notes to accounts
- get_pipeline_value: Get total pipeline value
- update_opportunity_stage: Update opportunity stage

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

When security controls block an action, explain why clearly and suggest alternatives."""
    
    def _get_salesforce_tools(self) -> List[Dict]:
        """Get Salesforce tool definitions"""
        return [
            {
                "name": "search_salesforce_contacts",
                "description": "Search for contacts in Salesforce by name. Returns contact details including email, phone, title, and associated account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "search_term": {
                            "type": "string",
                            "description": "Name or partial name to search for"
                        }
                    },
                    "required": ["search_term"]
                }
            },
            {
                "name": "get_contact_opportunities",
                "description": "Get all opportunities associated with a contact's account. Shows opportunity name, amount, stage, and close date.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "contact_name": {
                            "type": "string",
                            "description": "Name of the contact to look up opportunities for"
                        }
                    },
                    "required": ["contact_name"]
                }
            },
            {
                "name": "get_sales_pipeline",
                "description": "Get the current sales pipeline summary grouped by stage. Shows count and total value for each stage.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "stage_filter": {
                            "type": "string",
                            "description": "Optional: Filter to a specific stage"
                        }
                    }
                }
            },
            {
                "name": "get_high_value_accounts",
                "description": "Get opportunities above a certain value threshold. Default is $500,000.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "min_amount": {
                            "type": "number",
                            "description": "Minimum opportunity amount (default: 500000)"
                        }
                    }
                }
            },
            {
                "name": "create_salesforce_task",
                "description": "Create a follow-up task for a contact in Salesforce.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "subject": {
                            "type": "string",
                            "description": "Task subject/title"
                        },
                        "contact_name": {
                            "type": "string",
                            "description": "Name of the contact to associate the task with"
                        },
                        "due_date": {
                            "type": "string",
                            "description": "Due date in YYYY-MM-DD format"
                        },
                        "description": {
                            "type": "string",
                            "description": "Task description/notes"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["High", "Normal", "Low"],
                            "description": "Task priority"
                        }
                    },
                    "required": ["subject", "contact_name"]
                }
            },
            {
                "name": "create_salesforce_note",
                "description": "Add a note to an account in Salesforce.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_name": {
                            "type": "string",
                            "description": "Name of the account to add the note to"
                        },
                        "title": {
                            "type": "string",
                            "description": "Note title"
                        },
                        "body": {
                            "type": "string",
                            "description": "Note content"
                        }
                    },
                    "required": ["account_name", "title", "body"]
                }
            },
            {
                "name": "get_pipeline_value",
                "description": "Get the total value and count of all open opportunities in the pipeline.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "update_opportunity_stage",
                "description": "Update the stage of an opportunity. Common stages: Prospecting, Qualification, Needs Analysis, Value Proposition, Id. Decision Makers, Perception Analysis, Proposal/Price Quote, Negotiation/Review, Closed Won, Closed Lost.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "opportunity_name": {
                            "type": "string",
                            "description": "Name or partial name of the opportunity"
                        },
                        "new_stage": {
                            "type": "string",
                            "description": "New stage to set"
                        }
                    },
                    "required": ["opportunity_name", "new_stage"]
                }
            }
        ]
    
    def _convert_tools_to_claude(self, mcp_tools: List[Dict], calendar_tools: List[Dict]) -> List[Dict]:
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
        for tool in self._get_salesforce_tools():
            claude_tools.append({
                "name": tool["name"],
                "description": tool["description"] + " [Security: Auth0 Token Vault - Salesforce]",
                "input_schema": tool["parameters"]
            })
        
        return claude_tools
    
    async def _execute_salesforce_tool(self, tool_name: str, tool_input: Dict, salesforce_token: str) -> Dict:
        """Execute a Salesforce tool"""
        # Import here to avoid circular imports
        from tools.salesforce_tools import (
            search_contacts, get_contact_opportunities, get_sales_pipeline,
            get_high_value_accounts, create_task, create_note,
            get_pipeline_value, update_opportunity_stage
        )
        
        if tool_name == "search_salesforce_contacts":
            return await search_contacts(salesforce_token, tool_input.get("search_term", ""))
        
        elif tool_name == "get_contact_opportunities":
            return await get_contact_opportunities(salesforce_token, tool_input.get("contact_name", ""))
        
        elif tool_name == "get_sales_pipeline":
            return await get_sales_pipeline(salesforce_token, tool_input.get("stage_filter"))
        
        elif tool_name == "get_high_value_accounts":
            return await get_high_value_accounts(salesforce_token, tool_input.get("min_amount", 500000))
        
        elif tool_name == "create_salesforce_task":
            return await create_task(
                salesforce_token,
                subject=tool_input.get("subject", ""),
                contact_name=tool_input.get("contact_name", ""),
                due_date=tool_input.get("due_date"),
                description=tool_input.get("description"),
                priority=tool_input.get("priority", "Normal")
            )
        
        elif tool_name == "create_salesforce_note":
            return await create_note(
                salesforce_token,
                account_name=tool_input.get("account_name", ""),
                title=tool_input.get("title", ""),
                body=tool_input.get("body", "")
            )
        
        elif tool_name == "get_pipeline_value":
            return await get_pipeline_value(salesforce_token)
        
        elif tool_name == "update_opportunity_stage":
            return await update_opportunity_stage(
                salesforce_token,
                opportunity_name=tool_input.get("opportunity_name", ""),
                new_stage=tool_input.get("new_stage", "")
            )
        
        return {"error": f"Unknown Salesforce tool: {tool_name}"}
    
    async def process_message(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        user_info: Optional[Dict[str, Any]] = None,
        mcp_token: Optional[str] = None,
        mcp_server = None,
        calendar_tools = None,
        google_token: Optional[str] = None,
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
            
            if mcp_server:
                mcp_tool_list = mcp_server.list_tools()
            
            if calendar_tools:
                calendar_tool_list = calendar_tools.list_tools()
            
            all_tools = self._convert_tools_to_claude(mcp_tool_list, calendar_tool_list)
            
            # Initial Claude call
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=self.system_prompt,
                messages=messages,
                tools=all_tools if all_tools else None
            )
            
            # Handle tool calls
            tools_called = []
            xaa_tools_called = []
            vault_tools_called = []
            salesforce_tools_called = []
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
                                result["security_flow"] = "Auth0 Token Vault (Google)"
                            else:
                                result = {"error": "Calendar tools not available"}
                        
                        elif tool_name in SALESFORCE_TOOLS:
                            # Salesforce tool - use Auth0 Token Vault
                            salesforce_tools_called.append(tool_name)
                            if salesforce_token:
                                result = await self._execute_salesforce_tool(
                                    tool_name,
                                    tool_input,
                                    salesforce_token
                                )
                                result["security_flow"] = "Auth0 Token Vault (Salesforce)"
                            else:
                                result = {
                                    "error": "Salesforce not connected",
                                    "message": "Your Salesforce account is not linked. Please link your Salesforce account via Token Vault."
                                }
                        
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
                    system=self.system_prompt,
                    messages=messages,
                    tools=all_tools if all_tools else None
                )
                
                tool_results = []
            
            # Extract final text response
            final_content = ""
            for content_block in response.content:
                if hasattr(content_block, "text"):
                    final_content += content_block.text
            
            return {
                "content": final_content,
                "agent_type": "Buffett (Wealth Advisor)",
                "tools_called": tools_called if tools_called else None,
                "security_info": {
                    "xaa_tools": xaa_tools_called,
                    "vault_tools": vault_tools_called,
                    "salesforce_tools": salesforce_tools_called,
                    "mcp_token_used": bool(mcp_token and xaa_tools_called),
                    "google_token_used": bool(google_token and vault_tools_called),
                    "salesforce_token_used": bool(salesforce_token and salesforce_tools_called)
                } if tools_called else None
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
