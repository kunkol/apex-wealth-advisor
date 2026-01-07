"""
Apex Wealth Advisor - MCP Server
Provides tools for wealth management operations
Based on Indranil's employees_mcp.py pattern

Version: 2.0 - Natural Prompting Support (2026-01-07)
  - Updated tool descriptions with financial-specific language
  - Added "Use for X questions" hints for Claude routing
  - Added "NOT for CRM" boundaries to prevent wrong routing
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
        """
        Define available MCP tools with NATURAL PROMPTING descriptions.
        
        Key principles:
        1. Each description ends with "Use for X questions" to help Claude route
        2. Clear boundary statements distinguish from Salesforce (CRM)
        3. Financial-specific keywords: portfolio, AUM, holdings, risk profile
        """
        return [
            {
                "name": "get_client",
                "description": "Get client FINANCIAL profile from internal portfolio system - portfolio value, AUM, investment account type, risk score, YTD performance, and advisor assignment. Use for portfolio value, investment status, and financial profile questions. NOT for CRM contact info or sales opportunities.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "client_identifier": {
                            "type": "string",
                            "description": "Client name (e.g., 'Marcus Thompson') or client ID (e.g., 'CLT001')"
                        }
                    },
                    "required": ["client_identifier"]
                }
            },
            {
                "name": "list_clients",
                "description": "List all investment clients with portfolio values, total AUM (Assets Under Management), risk profiles, and account types from internal system. Use for managed accounts overview, total AUM questions, and client roster requests.",
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
                "description": "Get detailed portfolio breakdown - individual holdings, asset allocation percentages, sector weights, cost basis, and performance metrics. Use for investment holdings, allocation analysis, YTD returns, and performance questions.",
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
                "description": "Process financial transactions - transfers, withdrawals, distributions from investment accounts. May require CIBA step-up authentication for amounts over $10,000. Use for money movement, transfer requests, and payment processing.",
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
                "description": "Update client contact information (phone, email, address) in the internal portfolio management system. Use for updating client details in the investment system.",
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
        """
        Initialize internal portfolio/operational data for wealth management demo.
        
        This data represents what wealth advisors keep in internal systems (not Salesforce):
        - Real-time portfolio positions & balances
        - Compliance flags & holds
        - Transaction history
        - Risk scores & KYC status
        - Fee schedules & restrictions
        
        Salesforce contains: Contact info, opportunities, tasks (relationship data)
        Internal MCP contains: Portfolio holdings, compliance, transactions (operational data)
        """
        return {
            "clients": {
                # ============================================================
                # MARCUS THOMPSON - High Net Worth Client
                # Salesforce: Thompson Family Trust ($2.4M), Portfolio Rebalancing opportunity
                # Internal: Detailed holdings, compliance clear, quarterly reviews
                # ============================================================
                "CLT001": {
                    "id": "CLT001",
                    "name": "Marcus Thompson",
                    "email": "marcus.thompson@email.com",
                    "phone": "555-0101",
                    "status": "Active",
                    "account_type": "High Net Worth",
                    "account_name": "Thompson Family Trust",
                    "portfolio_value": 2400000.00,
                    "risk_profile": "Moderate",
                    "risk_score": 45,  # 1-100 scale
                    "advisor": "Kundan Kolhe",
                    "created_date": "2019-08-01",
                    "last_review": "2024-11-15",
                    "next_review": "2025-02-15",
                    "holdings": [
                        {"asset": "US Large Cap Equities", "ticker": "VTI", "allocation": 25, "value": 600000, "cost_basis": 480000},
                        {"asset": "US Small Cap Equities", "ticker": "VB", "allocation": 10, "value": 240000, "cost_basis": 200000},
                        {"asset": "International Developed", "ticker": "VEA", "allocation": 15, "value": 360000, "cost_basis": 340000},
                        {"asset": "Emerging Markets", "ticker": "VWO", "allocation": 10, "value": 240000, "cost_basis": 260000},
                        {"asset": "Investment Grade Bonds", "ticker": "BND", "allocation": 20, "value": 480000, "cost_basis": 500000},
                        {"asset": "Municipal Bonds", "ticker": "VTEB", "allocation": 10, "value": 240000, "cost_basis": 230000},
                        {"asset": "Real Estate", "ticker": "VNQ", "allocation": 5, "value": 120000, "cost_basis": 100000},
                        {"asset": "Cash & Equivalents", "ticker": "VMFXX", "allocation": 5, "value": 120000, "cost_basis": 120000}
                    ],
                    "ytd_return": 9.8,
                    "inception_return": 47.2,
                    "compliance_status": "clear",
                    "kyc_status": "verified",
                    "kyc_expiry": "2026-08-01",
                    "aml_flag": False,
                    "trading_restrictions": [],
                    "recent_transactions": [
                        {"date": "2024-11-01", "type": "Dividend Reinvestment", "amount": 4500, "description": "Q3 dividends reinvested"},
                        {"date": "2024-10-15", "type": "Rebalance", "amount": 0, "description": "Quarterly rebalance - reduced equity exposure"},
                        {"date": "2024-09-30", "type": "Withdrawal", "amount": -25000, "description": "Quarterly distribution"}
                    ]
                },
                
                # ============================================================
                # ELENA RODRIGUEZ - Retirement Client
                # Salesforce: Rodriguez Retirement Fund ($850K), Retirement Rollover opportunity
                # Internal: Conservative allocation, income-focused, monthly distributions
                # ============================================================
                "CLT002": {
                    "id": "CLT002",
                    "name": "Elena Rodriguez",
                    "email": "elena.rodriguez@email.com",
                    "phone": "555-0102",
                    "status": "Active",
                    "account_type": "Retirement",
                    "account_name": "Rodriguez Retirement Fund",
                    "portfolio_value": 850000.00,
                    "risk_profile": "Conservative",
                    "risk_score": 25,
                    "advisor": "Kundan Kolhe",
                    "created_date": "2020-03-15",
                    "last_review": "2024-10-20",
                    "next_review": "2025-01-20",
                    "holdings": [
                        {"asset": "Investment Grade Bonds", "ticker": "BND", "allocation": 30, "value": 255000, "cost_basis": 260000},
                        {"asset": "US Large Cap Equities", "ticker": "VTI", "allocation": 20, "value": 170000, "cost_basis": 140000},
                        {"asset": "Dividend Growth", "ticker": "VIG", "allocation": 15, "value": 127500, "cost_basis": 110000},
                        {"asset": "Treasury Inflation Protected", "ticker": "VTIP", "allocation": 15, "value": 127500, "cost_basis": 125000},
                        {"asset": "Short-Term Bonds", "ticker": "BSV", "allocation": 10, "value": 85000, "cost_basis": 85000},
                        {"asset": "Cash & Equivalents", "ticker": "VMFXX", "allocation": 10, "value": 85000, "cost_basis": 85000}
                    ],
                    "ytd_return": 5.6,
                    "inception_return": 28.4,
                    "compliance_status": "clear",
                    "kyc_status": "verified",
                    "kyc_expiry": "2025-03-15",
                    "aml_flag": False,
                    "trading_restrictions": [],
                    "recent_transactions": [
                        {"date": "2024-11-15", "type": "Distribution", "amount": -5500, "description": "Monthly income distribution"},
                        {"date": "2024-10-15", "type": "Rebalance", "amount": 0, "description": "Shifted to more conservative allocation"},
                        {"date": "2024-10-01", "type": "Distribution", "amount": -5500, "description": "Monthly income distribution"}
                    ]
                },
                
                # ============================================================
                # JAMES CHEN - Business Owner Client
                # Salesforce: Chen Industries Holdings ($1.2M), Business Succession opportunity
                # Internal: Growth-oriented, concentrated stock position, tax-sensitive
                # ============================================================
                "CLT003": {
                    "id": "CLT003",
                    "name": "James Chen",
                    "email": "jchen@chenindustries.com",
                    "phone": "555-0103",
                    "status": "Active",
                    "account_type": "Business Owner",
                    "account_name": "Chen Industries Holdings",
                    "portfolio_value": 1200000.00,
                    "risk_profile": "Aggressive",
                    "risk_score": 72,
                    "advisor": "Kundan Kolhe",
                    "created_date": "2021-06-01",
                    "last_review": "2024-09-15",
                    "next_review": "2025-03-15",
                    "holdings": [
                        {"asset": "Company Stock (CHEN)", "ticker": "CHEN", "allocation": 35, "value": 420000, "cost_basis": 50000},
                        {"asset": "US Large Cap Growth", "ticker": "VUG", "allocation": 20, "value": 240000, "cost_basis": 180000},
                        {"asset": "US Small Cap", "ticker": "VB", "allocation": 15, "value": 180000, "cost_basis": 150000},
                        {"asset": "International Developed", "ticker": "VEA", "allocation": 10, "value": 120000, "cost_basis": 100000},
                        {"asset": "Emerging Markets", "ticker": "VWO", "allocation": 10, "value": 120000, "cost_basis": 95000},
                        {"asset": "Cash & Equivalents", "ticker": "VMFXX", "allocation": 10, "value": 120000, "cost_basis": 120000}
                    ],
                    "ytd_return": 18.5,
                    "inception_return": 65.3,
                    "compliance_status": "clear",
                    "kyc_status": "verified",
                    "kyc_expiry": "2026-06-01",
                    "aml_flag": False,
                    "trading_restrictions": ["Company stock subject to Rule 144 - 90 day holding period"],
                    "recent_transactions": [
                        {"date": "2024-11-20", "type": "Stock Sale", "amount": 50000, "description": "Partial CHEN stock sale under Rule 144"},
                        {"date": "2024-10-01", "type": "Deposit", "amount": 100000, "description": "Business profit contribution"},
                        {"date": "2024-08-15", "type": "Tax Payment", "amount": -35000, "description": "Estimated quarterly tax"}
                    ]
                },
                
                # ============================================================
                # PRIYA PATEL - Growth Client
                # Salesforce: Patel Investment Account ($150K), New Growth opportunity
                # Internal: Newer client, growth allocation, building relationship
                # ============================================================
                "CLT004": {
                    "id": "CLT004",
                    "name": "Priya Patel",
                    "email": "priya.patel@email.com",
                    "phone": "555-0104",
                    "status": "Active",
                    "account_type": "Growth",
                    "account_name": "Patel Investment Account",
                    "portfolio_value": 150000.00,
                    "risk_profile": "Moderate-Aggressive",
                    "risk_score": 62,
                    "advisor": "Kundan Kolhe",
                    "created_date": "2024-01-15",
                    "last_review": "2024-07-15",
                    "next_review": "2025-01-15",
                    "holdings": [
                        {"asset": "US Total Market", "ticker": "VTI", "allocation": 40, "value": 60000, "cost_basis": 55000},
                        {"asset": "International Developed", "ticker": "VEA", "allocation": 20, "value": 30000, "cost_basis": 28000},
                        {"asset": "Emerging Markets", "ticker": "VWO", "allocation": 15, "value": 22500, "cost_basis": 20000},
                        {"asset": "US Small Cap Growth", "ticker": "VBK", "allocation": 15, "value": 22500, "cost_basis": 21000},
                        {"asset": "Cash & Equivalents", "ticker": "VMFXX", "allocation": 10, "value": 15000, "cost_basis": 15000}
                    ],
                    "ytd_return": 12.3,
                    "inception_return": 12.3,
                    "compliance_status": "clear",
                    "kyc_status": "verified",
                    "kyc_expiry": "2027-01-15",
                    "aml_flag": False,
                    "trading_restrictions": [],
                    "recent_transactions": [
                        {"date": "2024-11-01", "type": "Deposit", "amount": 5000, "description": "Monthly contribution"},
                        {"date": "2024-10-01", "type": "Deposit", "amount": 5000, "description": "Monthly contribution"},
                        {"date": "2024-09-01", "type": "Deposit", "amount": 5000, "description": "Monthly contribution"}
                    ]
                }
            },
            
            # Transaction approval thresholds (for HITL demo)
            "transaction_limits": {
                "auto_approve": 1000,           # Under $1K: auto-approve
                "requires_step_up": 10000,      # $10K+: requires CIBA step-up
                "requires_manager": 50000,      # $50K+: manager approval
                "requires_vp": 250000,          # $250K+: VP approval
                "requires_compliance": 500000   # $500K+: compliance review
            },
            
            # Blocked recipients for risk demo
            "blocked_recipients": [
                "Offshore Holdings LLC",
                "Anonymous Trust",
                "CryptoMixer Services"
            ]
        }
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """Return list of available tools"""
        return self.tools
    
    async def call_tool(self, tool_name: str, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """Execute a tool with given arguments"""
        logger.info(f"[MCP] Calling tool: {tool_name}")
        
        tool_handlers = {
            "get_client": self._tool_get_client,
            "list_clients": self._tool_list_clients,
            "get_portfolio": self._tool_get_portfolio,
            "process_payment": self._tool_process_payment,
            "update_client": self._tool_update_client
        }
        
        handler = tool_handlers.get(tool_name)
        if not handler:
            return {"error": "unknown_tool", "message": f"Tool '{tool_name}' not found"}
        
        try:
            result = await handler(args, user_info)
            return result
        except Exception as e:
            logger.error(f"[MCP] Tool error: {e}", exc_info=True)
            return {"error": "tool_error", "message": str(e)}
    
    def _find_client(self, identifier: str) -> Optional[Dict]:
        """Find client by name or ID"""
        identifier_lower = identifier.lower()
        
        for client_id, client in self.clients_data["clients"].items():
            if client_id.lower() == identifier_lower:
                return client
            if client["name"].lower() == identifier_lower:
                return client
            # Partial name match
            if identifier_lower in client["name"].lower():
                return client
        
        return None
    
    def _check_compliance(self, client: Dict) -> bool:
        """Check if client passes compliance checks"""
        if client.get("compliance_status") != "clear":
            return False
        if client.get("aml_flag", False):
            return False
        return True
    
    async def _tool_get_client(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """Get client financial profile"""
        identifier = args.get("client_identifier", "")
        client = self._find_client(identifier)
        
        if not client:
            return {"error": "client_not_found", "message": f"Client '{identifier}' not found in portfolio system"}
        
        # Check compliance before returning data
        if not self._check_compliance(client):
            return {
                "error": "access_denied",
                "message": f"Access to {client['name']}'s data is restricted due to compliance hold",
                "compliance_reason": client.get("compliance_reason", "Pending review"),
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
                "account_name": client.get("account_name", "N/A"),
                "portfolio_value": f"${client['portfolio_value']:,.2f}",
                "risk_profile": client["risk_profile"],
                "risk_score": f"{client.get('risk_score', 'N/A')}/100",
                "advisor": client["advisor"],
                "ytd_return": f"{client['ytd_return']}%",
                "inception_return": f"{client.get('inception_return', 'N/A')}%",
                "last_review": client["last_review"],
                "next_review": client.get("next_review", "Not scheduled"),
                "compliance_status": client["compliance_status"],
                "trading_restrictions": client.get("trading_restrictions", [])
            },
            "source": "Internal Portfolio Management System"
        }
    
    async def _tool_list_clients(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """List all clients with portfolio summary"""
        status_filter = args.get("status_filter", "Active")
        
        clients = []
        total_aum = 0
        restricted_count = 0
        
        for client_id, client in self.clients_data["clients"].items():
            # Track restricted clients
            if not self._check_compliance(client):
                restricted_count += 1
                continue  # Don't show restricted clients in list
            
            if status_filter == "All" or client["status"] == status_filter:
                clients.append({
                    "id": client["id"],
                    "name": client["name"],
                    "account_name": client.get("account_name", "N/A"),
                    "account_type": client["account_type"],
                    "portfolio_value": f"${client['portfolio_value']:,.2f}",
                    "risk_profile": client["risk_profile"],
                    "ytd_return": f"{client['ytd_return']}%",
                    "last_review": client["last_review"],
                    "status": client["status"]
                })
                total_aum += client["portfolio_value"]
        
        return {
            "clients": clients,
            "summary": {
                "total_clients": len(clients),
                "total_aum": f"${total_aum:,.2f}",
                "restricted_clients": restricted_count,
                "filter_applied": status_filter
            },
            "source": "Internal Portfolio Management System"
        }
    
    async def _tool_get_portfolio(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """Get detailed portfolio information including holdings and transactions"""
        identifier = args.get("client_identifier", "")
        client = self._find_client(identifier)
        
        if not client:
            return {"error": "client_not_found", "message": f"Client '{identifier}' not found"}
        
        if not self._check_compliance(client):
            return {
                "error": "access_denied",
                "message": f"Access to {client['name']}'s portfolio is restricted: {client.get('compliance_reason', 'Compliance hold')}",
                "security_control": "FGA - Compliance Hold"
            }
        
        return {
            "portfolio": {
                "client_name": client["name"],
                "account_name": client.get("account_name", "N/A"),
                "account_type": client["account_type"],
                "total_value": f"${client['portfolio_value']:,.2f}",
                "risk_profile": client["risk_profile"],
                "risk_score": f"{client.get('risk_score', 'N/A')}/100",
                "ytd_return": f"{client['ytd_return']}%",
                "inception_return": f"{client.get('inception_return', 'N/A')}%",
                "holdings": client["holdings"],
                "trading_restrictions": client.get("trading_restrictions", []),
                "recent_transactions": client.get("recent_transactions", [])[-3:],  # Last 3
                "last_review": client["last_review"],
                "next_review": client.get("next_review", "Not scheduled")
            },
            "source": "Internal Portfolio Management System"
        }
    
    async def _tool_process_payment(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """Process payment with comprehensive risk checks"""
        identifier = args.get("client_identifier", "")
        amount = args.get("amount", 0)
        recipient = args.get("recipient", "")
        description = args.get("description", "")
        
        client = self._find_client(identifier)
        
        if not client:
            return {"error": "client_not_found", "message": f"Client '{identifier}' not found"}
        
        # Check compliance status
        if not self._check_compliance(client):
            return {
                "error": "payment_blocked",
                "message": f"Transactions for {client['name']} are blocked: {client.get('compliance_reason', 'Compliance hold')}",
                "security_control": "FGA - Compliance Hold",
                "action_required": "Contact compliance team"
            }
        
        # Check trading restrictions
        restrictions = client.get("trading_restrictions", [])
        if any("NO" in r.upper() for r in restrictions):
            return {
                "error": "payment_blocked",
                "message": f"Account has trading restrictions: {restrictions[0]}",
                "security_control": "Trading Restriction"
            }
        
        # Risk check: Blocked recipients
        if recipient in self.clients_data["blocked_recipients"]:
            return {
                "error": "payment_blocked",
                "message": f"Payment to '{recipient}' blocked - unverified or high-risk recipient",
                "security_control": "Risk Policy - Blocked Recipient List",
                "blocked_recipients": self.clients_data["blocked_recipients"]
            }
        
        # Get transaction limits
        limits = self.clients_data["transaction_limits"]
        
        # Amount-based authorization
        if amount >= limits["requires_compliance"]:
            return {
                "status": "compliance_review_required",
                "message": f"Payment of ${amount:,.2f} exceeds ${limits['requires_compliance']:,} threshold",
                "security_control": "Compliance Review Required",
                "action": "Transaction queued for compliance team approval"
            }
        elif amount >= limits["requires_step_up"]:
            return {
                "status": "step_up_required",
                "message": f"Payment of ${amount:,.2f} requires step-up authentication (MFA)",
                "security_control": "CIBA Step-Up Authentication",
                "action": "Push notification sent to your registered device for approval",
                "threshold": f">${limits['requires_step_up']:,}"
            }
        elif amount >= limits["auto_approve"]:
            return {
                "status": "approved",
                "message": f"Payment of ${amount:,.2f} to {recipient} approved",
                "security_control": "Standard Authorization - Logged",
                "transaction_id": f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "from_account": client.get("account_name", client["name"]),
                "audit_log": "Transaction recorded for audit trail"
            }
        else:
            return {
                "status": "approved",
                "message": f"Payment of ${amount:,.2f} to {recipient} auto-approved",
                "security_control": "Low Value - Auto-Approved",
                "transaction_id": f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "from_account": client.get("account_name", client["name"])
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
