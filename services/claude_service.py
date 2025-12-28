"""
Claude AI Service
Handles conversation with Claude API including tool calling
"""

import logging
import os
import json
from typing import Dict, Any, List, Optional
import anthropic

logger = logging.getLogger(__name__)


class ClaudeService:
    """
    Service for interacting with Claude API
    Supports tool calling for MCP integration
    """
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=api_key)
        
        self.model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
        
        self.system_prompt = """You are an AI assistant for Apex Wealth Advisor, a premium wealth management platform.

Your role is to help financial advisors manage client portfolios, process transactions, and access client information.

You have access to the following tools:
- get_client: Look up client information by name or ID
- list_clients: List all active clients
- get_portfolio: Get detailed portfolio information for a client
- process_payment: Process payment transactions (may require step-up auth for high values)
- update_client: Update client contact information

Security behaviors to demonstrate:
1. FGA (Fine-Grained Authorization): Client "Charlie Brown" has a compliance hold - access will be denied
2. CIBA Step-Up: Payments over $10,000 require step-up authentication
3. Risk Policy: Payments to unverified recipients like "Offshore Holdings LLC" are blocked
4. XAA Token Flow: All tool access is secured via Okta Cross-App Access tokens

Be helpful, professional, and always prioritize security. When security controls block an action, explain why clearly."""
    
    def _convert_mcp_tools_to_claude(self, mcp_tools: List[Dict]) -> List[Dict]:
        """Convert MCP tool definitions to Claude tool format"""
        claude_tools = []
        for tool in mcp_tools:
            claude_tools.append({
                "name": tool["name"],
                "description": tool["description"],
                "input_schema": tool["parameters"]
            })
        return claude_tools
    
    async def process_message(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        user_info: Optional[Dict[str, Any]] = None,
        mcp_token: Optional[str] = None,
        mcp_server = None,
        token_vault = None
    ) -> Dict[str, Any]:
        """
        Process a message through Claude with tool access.
        
        Args:
            message: User's message
            conversation_history: Previous messages
            user_info: Authenticated user information
            mcp_token: MCP access token from XAA
            mcp_server: MCP server instance for tool calls
            token_vault: Token vault client for external APIs
        """
        if not self.client:
            return {
                "content": "Claude API is not configured. Please set ANTHROPIC_API_KEY.",
                "agent_type": "Error"
            }
        
        try:
            # Build messages
            messages = []
            for msg in conversation_history[-10:]:  # Last 10 messages for context
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            messages.append({"role": "user", "content": message})
            
            # Get tools from MCP server
            tools = []
            if mcp_server:
                mcp_tools = mcp_server.list_tools()
                tools = self._convert_mcp_tools_to_claude(mcp_tools)
            
            # Initial Claude call
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=self.system_prompt,
                messages=messages,
                tools=tools if tools else None
            )
            
            # Handle tool calls
            tools_called = []
            tool_results = []
            
            while response.stop_reason == "tool_use":
                # Process each tool use
                for content_block in response.content:
                    if content_block.type == "tool_use":
                        tool_name = content_block.name
                        tool_input = content_block.input
                        tool_use_id = content_block.id
                        
                        logger.info(f"[Claude] Calling tool: {tool_name}")
                        tools_called.append(tool_name)
                        
                        # Execute tool through MCP server
                        if mcp_server:
                            tool_user_info = user_info or {}
                            if mcp_token:
                                tool_user_info["mcp_token"] = mcp_token
                            
                            result = await mcp_server.call_tool(
                                tool_name,
                                tool_input,
                                tool_user_info
                            )
                        else:
                            result = {"error": "MCP server not available"}
                        
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
                    max_tokens=1024,
                    system=self.system_prompt,
                    messages=messages,
                    tools=tools if tools else None
                )
                
                tool_results = []
            
            # Extract final text response
            final_content = ""
            for content_block in response.content:
                if hasattr(content_block, "text"):
                    final_content += content_block.text
            
            return {
                "content": final_content,
                "agent_type": "Wealth Advisor (Buffett)",
                "tools_called": tools_called if tools_called else None,
                "mcp_info": {
                    "tools_available": len(tools),
                    "tools_used": len(tools_called)
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
