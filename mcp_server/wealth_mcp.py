"""
Apex Wealth Advisor - MCP Server
Provides tools for wealth management operations
Based on Indranil's employees_mcp.py pattern
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class WealthMCP:
    """
    MCP Server for Wealth Management Operations
    
    Features:
    - Client portfolio management
    - Transaction processing with step-up auth
    - Account information retrieval
    - Validates MCP access tokens before granting tool access
    """
    
    def __init__(self):
        self.clients_data = self._initialize_client_data()
        self.tools = self._define_tools()
        logger.info("[MCP] WealthMCP initialized")
    
    def _define_tools(self) -> List[Dict[str, Any]]:
        """Define available MCP tools"""
        return [
            {
                "name": "get_client",
                "description": "Get detailed information about a client by name or ID. Returns portfolio value, account type, and status.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "client_identifier": {
                            "type": "string",
                            "description": "Client name (e.g., 'Alice Johnson') or client ID (e.g., 'CLT001')"
                        }
                    },
                    "required": ["client_identifier"]
                }
            },
            {
                "name": "list_clients",
                "description": "List all clients with their basic information. Can filter by status.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "status_filter": {
                            "type": "string",
                            "enum": ["Active", "Inactive", "All"],
                            "description": "Filter by client status. Default: Active"
                        }
                    }
                }
            },
            {
                "name": "get_portfolio",
                "description": "Get portfolio details for a client including holdings, performance, and allocation.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "client_identifier": {
                            "type": "string",
                            "description": "Client name or ID"
                        }
                    },
                    "required": ["client_identifier"]
                }
            },
            {
                "name": "process_payment",
                "description": "Process a payment transaction for a client. May require step-up authentication for high-value transactions.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "client_identifier": {
                            "type": "string",
                            "description": "Client name or ID"
                        },
                        "amount": {
                            "type": "number",
                            "description": "Payment amount in USD"
                        },
                        "recipient": {
                            "type": "string",
                            "description": "Payment recipient name or account"
                        },
                        "description": {
                            "type": "string",
                            "description": "Payment description"
                        }
                    },
                    "required": ["client_identifier", "amount", "recipient"]
                }
            },
            {
                "name": "update_client",
                "description": "Update client information such as phone, email, or address.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "client_identifier": {
                            "type": "string",
                            "description": "Client name or ID"
                        },
                        "field": {
                            "type": "string",
                            "enum": ["phone", "email", "address"],
                            "description": "Field to update"
                        },
                        "value": {
                            "type": "string",
                            "description": "New value"
                        }
                    },
                    "required": ["client_identifier", "field", "value"]
                }
            }
        ]
    
    def _initialize_client_data(self) -> Dict[str, Any]:
        """Initialize mock client data for wealth management demo"""
        return {
            "clients": {
                "CLT001": {
                    "id": "CLT001",
                    "name": "Alice Johnson",
                    "email": "alice.johnson@email.com",
                    "phone": "555-0101",
                    "status": "Active",
                    "account_type": "Premium",
                    "portfolio_value": 125000.00,
                    "risk_profile": "Moderate",
                    "advisor": "Kundan Kolhe",
                    "created_date": "2022-03-15",
                    "last_review": "2024-11-01",
                    "holdings": [
                        {"asset": "US Equities", "allocation": 40, "value": 50000},
                        {"asset": "International Equities", "allocation": 20, "value": 25000},
                        {"asset": "Bonds", "allocation": 30, "value": 37500},
                        {"asset": "Cash", "allocation": 10, "value": 12500}
                    ],
                    "ytd_return": 8.5,
                    "compliance_status": "clear"
                },
                "CLT002": {
                    "id": "CLT002",
                    "name": "Bob Smith",
                    "email": "bob.smith@email.com",
                    "phone": "555-0102",
                    "status": "Active",
                    "account_type": "Standard",
                    "portfolio_value": 15420.00,
                    "risk_profile": "Conservative",
                    "advisor": "Kundan Kolhe",
                    "created_date": "2023-06-20",
                    "last_review": "2024-10-15",
                    "holdings": [
                        {"asset": "Bonds", "allocation": 50, "value": 7710},
                        {"asset": "US Equities", "allocation": 30, "value": 4626},
                        {"asset": "Cash", "allocation": 20, "value": 3084}
                    ],
                    "ytd_return": 4.2,
                    "compliance_status": "clear"
                },
                "CLT003": {
                    "id": "CLT003",
                    "name": "Charlie Brown",
                    "email": "charlie.brown@email.com",
                    "phone": "555-0103",
                    "status": "Active",
                    "account_type": "Premium",
                    "portfolio_value": 89000.00,
                    "risk_profile": "Aggressive",
                    "advisor": "Kundan Kolhe",
                    "created_date": "2021-01-10",
                    "last_review": "2024-09-01",
                    "holdings": [
                        {"asset": "US Equities", "allocation": 60, "value": 53400},
                        {"asset": "International Equities", "allocation": 30, "value": 26700},
                        {"asset": "Cash", "allocation": 10, "value": 8900}
                    ],
                    "ytd_return": 12.1,
                    "compliance_status": "hold"  # FGA will block access
                },
                "CLT004": {
                    "id": "CLT004",
                    "name": "Marcus Thompson",
                    "email": "marcus.thompson@email.com",
                    "phone": "555-0104",
                    "status": "Active",
                    "account_type": "High Net Worth",
                    "portfolio_value": 2400000.00,
                    "risk_profile": "Moderate",
                    "advisor": "Kundan Kolhe",
                    "created_date": "2019-08-01",
                    "last_review": "2024-11-15",
                    "holdings": [
                        {"asset": "US Equities", "allocation": 35, "value": 840000},
                        {"asset": "International Equities", "allocation": 25, "value": 600000},
                        {"asset": "Bonds", "allocation": 25, "value": 600000},
                        {"asset": "Alternative Investments", "allocation": 10, "value": 240000},
                        {"asset": "Cash", "allocation": 5, "value": 120000}
                    ],
                    "ytd_return": 9.8,
                    "compliance_status": "clear"
                },
                "CLT005": {
                    "id": "CLT005",
                    "name": "Elena Rodriguez",
                    "email": "elena.rodriguez@email.com",
                    "phone": "555-0105",
                    "status": "Active",
                    "account_type": "Retirement",
                    "portfolio_value": 850000.00,
                    "risk_profile": "Conservative",
                    "advisor": "Kundan Kolhe",
                    "created_date": "2020-02-15",
                    "last_review": "2024-10-20",
                    "holdings": [
                        {"asset": "Bonds", "allocation": 45, "value": 382500},
                        {"asset": "US Equities", "allocation": 35, "value": 297500},
                        {"asset": "Cash", "allocation": 20, "value": 170000}
                    ],
                    "ytd_return": 5.6,
                    "compliance_status": "clear"
                }
            },
            "blocked_recipients": [
                "Offshore Holdings LLC",
                "Anonymous Trust",
                "Unverified Account"
            ]
        }
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """Return list of available tools"""
        return self.tools
    
    def _find_client(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Find client by name or ID"""
        identifier_lower = identifier.lower()
        
        for client_id, client in self.clients_data["clients"].items():
            if client_id.lower() == identifier_lower:
                return client
            if identifier_lower in client["name"].lower():
                return client
        
        return None
    
    def _check_compliance(self, client: Dict[str, Any]) -> bool:
        """Check if client passes compliance check (FGA simulation)"""
        return client.get("compliance_status") == "clear"
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an MCP tool.
        
        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments
            user_info: User context including mcp_token
        """
        try:
            # Check for MCP token (XAA validation)
            mcp_token = user_info.get("mcp_token")
            if not mcp_token:
                logger.warning("[MCP] No MCP token provided")
                # For demo, we'll allow access but log warning
                # In production, this would return unauthorized
            
            logger.info(f"[MCP] Calling tool: {tool_name}")
            
            if tool_name == "get_client":
                return await self._tool_get_client(arguments, user_info)
            elif tool_name == "list_clients":
                return await self._tool_list_clients(arguments, user_info)
            elif tool_name == "get_portfolio":
                return await self._tool_get_portfolio(arguments, user_info)
            elif tool_name == "process_payment":
                return await self._tool_process_payment(arguments, user_info)
            elif tool_name == "update_client":
                return await self._tool_update_client(arguments, user_info)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
                
        except Exception as e:
            logger.error(f"[MCP] Tool error: {e}", exc_info=True)
            return {"error": str(e)}
    
    async def _tool_get_client(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """Get client information"""
        identifier = args.get("client_identifier", "")
        client = self._find_client(identifier)
        
        if not client:
            return {
                "error": "client_not_found",
                "message": f"Client '{identifier}' not found"
            }
        
        # FGA check - compliance hold
        if not self._check_compliance(client):
            return {
                "error": "access_denied",
                "message": f"Access to {client['name']} is restricted due to compliance hold",
                "security_control": "FGA - Compliance Hold"
            }
        
        return {
            "client": {
                "id": client["id"],
                "name": client["name"],
                "email": client["email"],
                "phone": client["phone"],
                "status": client["status"],
                "account_type": client["account_type"],
                "portfolio_value": f"${client['portfolio_value']:,.2f}",
                "risk_profile": client["risk_profile"],
                "advisor": client["advisor"],
                "last_review": client["last_review"]
            }
        }
    
    async def _tool_list_clients(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """List all clients"""
        status_filter = args.get("status_filter", "Active")
        
        clients = []
        for client_id, client in self.clients_data["clients"].items():
            # Skip clients with compliance hold
            if not self._check_compliance(client):
                continue
            
            if status_filter == "All" or client["status"] == status_filter:
                clients.append({
                    "id": client["id"],
                    "name": client["name"],
                    "account_type": client["account_type"],
                    "portfolio_value": f"${client['portfolio_value']:,.2f}",
                    "status": client["status"]
                })
        
        return {
            "clients": clients,
            "total_count": len(clients),
            "filter": status_filter
        }
    
    async def _tool_get_portfolio(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """Get portfolio details"""
        identifier = args.get("client_identifier", "")
        client = self._find_client(identifier)
        
        if not client:
            return {"error": "client_not_found", "message": f"Client '{identifier}' not found"}
        
        if not self._check_compliance(client):
            return {
                "error": "access_denied",
                "message": f"Access to {client['name']}'s portfolio is restricted",
                "security_control": "FGA - Compliance Hold"
            }
        
        return {
            "portfolio": {
                "client_name": client["name"],
                "total_value": f"${client['portfolio_value']:,.2f}",
                "risk_profile": client["risk_profile"],
                "ytd_return": f"{client['ytd_return']}%",
                "holdings": client["holdings"],
                "last_review": client["last_review"]
            }
        }
    
    async def _tool_process_payment(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """Process payment with risk checks"""
        identifier = args.get("client_identifier", "")
        amount = args.get("amount", 0)
        recipient = args.get("recipient", "")
        description = args.get("description", "")
        
        client = self._find_client(identifier)
        
        if not client:
            return {"error": "client_not_found", "message": f"Client '{identifier}' not found"}
        
        # Risk check: Blocked recipients
        if recipient in self.clients_data["blocked_recipients"]:
            return {
                "error": "payment_blocked",
                "message": f"Payment to '{recipient}' blocked - unverified recipient",
                "security_control": "Risk Policy - Unverified Recipient"
            }
        
        # Amount-based authorization
        if amount > 10000:
            return {
                "status": "step_up_required",
                "message": f"Payment of ${amount:,.2f} requires step-up authentication",
                "security_control": "CIBA Step-Up Required",
                "action": "Push notification sent to your registered device"
            }
        elif amount > 1000:
            return {
                "status": "approved",
                "message": f"Payment of ${amount:,.2f} to {recipient} approved with logging",
                "security_control": "Medium Value - Logged",
                "transaction_id": f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            }
        else:
            return {
                "status": "approved",
                "message": f"Payment of ${amount:,.2f} to {recipient} auto-approved",
                "security_control": "Low Value - Auto-Approved",
                "transaction_id": f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            }
    
    async def _tool_update_client(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """Update client information"""
        identifier = args.get("client_identifier", "")
        field = args.get("field", "")
        value = args.get("value", "")
        
        client = self._find_client(identifier)
        
        if not client:
            return {"error": "client_not_found", "message": f"Client '{identifier}' not found"}
        
        # Check write permission (scope check)
        # In production, verify mcp_token has write_data scope
        
        if field in ["phone", "email", "address"]:
            old_value = client.get(field, "N/A")
            client[field] = value
            
            return {
                "status": "updated",
                "message": f"Updated {client['name']}'s {field}",
                "field": field,
                "old_value": old_value,
                "new_value": value
            }
        else:
            return {
                "error": "invalid_field",
                "message": f"Cannot update field '{field}'"
            }
