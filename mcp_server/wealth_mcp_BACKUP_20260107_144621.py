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
                    "fee_schedule": "0.75% AUM annually",
                    "trading_restrictions": [],
                    "recent_transactions": [
                        {"date": "2024-12-15", "type": "Dividend", "amount": 4200, "description": "Q4 dividend reinvestment"},
                        {"date": "2024-11-20", "type": "Rebalance", "amount": 0, "description": "Quarterly rebalancing"},
                        {"date": "2024-10-01", "type": "Deposit", "amount": 50000, "description": "Annual contribution"}
                    ],
                    "internal_notes": "Prefers quarterly in-person reviews. Interested in ESG options for 2025."
                },
                
                # ============================================================
                # ELENA RODRIGUEZ - Retirement Planning Client
                # Salesforce: Rodriguez Retirement Fund ($850K), Retirement Rollover opportunity
                # Internal: Conservative allocation, target date 2028, monthly income focus
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
                    "created_date": "2020-02-15",
                    "last_review": "2024-10-20",
                    "next_review": "2025-01-20",
                    "target_retirement": "2028",
                    "monthly_income_target": 5500,
                    "holdings": [
                        {"asset": "US Large Cap Equities", "ticker": "VTI", "allocation": 20, "value": 170000, "cost_basis": 140000},
                        {"asset": "Dividend Growth", "ticker": "VIG", "allocation": 15, "value": 127500, "cost_basis": 110000},
                        {"asset": "Investment Grade Bonds", "ticker": "BND", "allocation": 30, "value": 255000, "cost_basis": 260000},
                        {"asset": "Treasury Inflation Protected", "ticker": "VTIP", "allocation": 15, "value": 127500, "cost_basis": 125000},
                        {"asset": "Short-Term Bonds", "ticker": "BSV", "allocation": 10, "value": 85000, "cost_basis": 84000},
                        {"asset": "Cash & Equivalents", "ticker": "VMFXX", "allocation": 10, "value": 85000, "cost_basis": 85000}
                    ],
                    "ytd_return": 5.6,
                    "inception_return": 28.4,
                    "compliance_status": "clear",
                    "kyc_status": "verified",
                    "kyc_expiry": "2025-02-15",
                    "aml_flag": False,
                    "fee_schedule": "0.65% AUM annually",
                    "trading_restrictions": [],
                    "recent_transactions": [
                        {"date": "2024-12-01", "type": "Withdrawal", "amount": 5500, "description": "Monthly income distribution"},
                        {"date": "2024-11-01", "type": "Withdrawal", "amount": 5500, "description": "Monthly income distribution"},
                        {"date": "2024-10-15", "type": "Rebalance", "amount": 0, "description": "Shift to more conservative allocation"}
                    ],
                    "internal_notes": "Planning full retirement in 2028. Wants to maintain $5,500/month income stream."
                },
                
                # ============================================================
                # JAMES CHEN - Business Owner
                # Salesforce: Chen Industries ($1.2M), Business Succession opportunity
                # Internal: Business + personal accounts, complex tax situation
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
                    "risk_profile": "Moderate-Aggressive",
                    "risk_score": 62,
                    "advisor": "Kundan Kolhe",
                    "created_date": "2021-03-10",
                    "last_review": "2024-09-15",
                    "next_review": "2025-01-15",
                    "holdings": [
                        {"asset": "US Large Cap Growth", "ticker": "VUG", "allocation": 30, "value": 360000, "cost_basis": 280000},
                        {"asset": "US Small Cap", "ticker": "VB", "allocation": 15, "value": 180000, "cost_basis": 150000},
                        {"asset": "International Developed", "ticker": "VEA", "allocation": 15, "value": 180000, "cost_basis": 170000},
                        {"asset": "Corporate Bonds", "ticker": "VCIT", "allocation": 15, "value": 180000, "cost_basis": 185000},
                        {"asset": "Company Stock (Chen Ind.)", "ticker": "PRIVATE", "allocation": 15, "value": 180000, "cost_basis": 50000},
                        {"asset": "Cash & Equivalents", "ticker": "VMFXX", "allocation": 10, "value": 120000, "cost_basis": 120000}
                    ],
                    "ytd_return": 11.2,
                    "inception_return": 35.8,
                    "compliance_status": "clear",
                    "kyc_status": "verified",
                    "kyc_expiry": "2025-03-10",
                    "aml_flag": False,
                    "fee_schedule": "0.70% AUM annually",
                    "trading_restrictions": ["Concentrated position in PRIVATE - diversification recommended"],
                    "recent_transactions": [
                        {"date": "2024-12-10", "type": "Deposit", "amount": 100000, "description": "Q4 business profit distribution"},
                        {"date": "2024-09-15", "type": "Tax Loss Harvest", "amount": 0, "description": "Harvested $15K in losses"},
                        {"date": "2024-06-01", "type": "Deposit", "amount": 75000, "description": "Q2 business profit distribution"}
                    ],
                    "internal_notes": "Discussing business succession planning. Wants to reduce company stock concentration over 3 years."
                },
                
                # ============================================================
                # PRIYA PATEL - Young Professional (Growth Focus)
                # Salesforce: Patel Investment Account ($150K), Growth Portfolio opportunity (Closed Won)
                # Internal: Aggressive growth, tech-heavy, high risk tolerance
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
                    "risk_profile": "Aggressive",
                    "risk_score": 82,
                    "advisor": "Kundan Kolhe",
                    "created_date": "2024-06-15",
                    "last_review": "2024-12-01",
                    "next_review": "2025-03-01",
                    "holdings": [
                        {"asset": "US Large Cap Growth", "ticker": "VUG", "allocation": 35, "value": 52500, "cost_basis": 45000},
                        {"asset": "Technology Sector", "ticker": "VGT", "allocation": 25, "value": 37500, "cost_basis": 32000},
                        {"asset": "US Small Cap Growth", "ticker": "VBK", "allocation": 20, "value": 30000, "cost_basis": 28000},
                        {"asset": "Emerging Markets", "ticker": "VWO", "allocation": 15, "value": 22500, "cost_basis": 24000},
                        {"asset": "Cash & Equivalents", "ticker": "VMFXX", "allocation": 5, "value": 7500, "cost_basis": 7500}
                    ],
                    "ytd_return": 18.5,
                    "inception_return": 18.5,
                    "compliance_status": "clear",
                    "kyc_status": "verified",
                    "kyc_expiry": "2027-06-15",
                    "aml_flag": False,
                    "fee_schedule": "0.50% AUM annually",
                    "trading_restrictions": [],
                    "recent_transactions": [
                        {"date": "2024-12-15", "type": "Deposit", "amount": 2500, "description": "Monthly auto-investment"},
                        {"date": "2024-11-15", "type": "Deposit", "amount": 2500, "description": "Monthly auto-investment"},
                        {"date": "2024-10-15", "type": "Deposit", "amount": 2500, "description": "Monthly auto-investment"}
                    ],
                    "internal_notes": "New client, aggressive growth focus. Contributing $2,500/month. 30-year investment horizon."
                },
                
                # ============================================================
                # ROBERT WILLIAMS - Estate Planning (COMPLIANCE HOLD - FGA Demo)
                # Salesforce: Williams Estate ($3.1M), Estate Restructure opportunity
                # Internal: COMPLIANCE HOLD due to pending estate litigation
                # ============================================================
                "CLT005": {
                    "id": "CLT005",
                    "name": "Robert Williams",
                    "email": "rwilliams@williamsestate.org",
                    "phone": "555-0105",
                    "status": "Active",
                    "account_type": "Estate",
                    "account_name": "Williams Estate",
                    "portfolio_value": 3100000.00,
                    "risk_profile": "Conservative",
                    "risk_score": 20,
                    "advisor": "Kundan Kolhe",
                    "created_date": "2018-05-20",
                    "last_review": "2024-08-01",
                    "next_review": "HOLD - Pending Compliance Review",
                    "holdings": [
                        {"asset": "US Large Cap Value", "ticker": "VTV", "allocation": 20, "value": 620000, "cost_basis": 500000},
                        {"asset": "Dividend Aristocrats", "ticker": "NOBL", "allocation": 15, "value": 465000, "cost_basis": 400000},
                        {"asset": "Investment Grade Bonds", "ticker": "BND", "allocation": 25, "value": 775000, "cost_basis": 800000},
                        {"asset": "Municipal Bonds", "ticker": "VTEB", "allocation": 20, "value": 620000, "cost_basis": 600000},
                        {"asset": "Treasury Bonds", "ticker": "VGLT", "allocation": 10, "value": 310000, "cost_basis": 320000},
                        {"asset": "Cash & Equivalents", "ticker": "VMFXX", "allocation": 10, "value": 310000, "cost_basis": 310000}
                    ],
                    "ytd_return": 4.2,
                    "inception_return": 52.1,
                    "compliance_status": "hold",  # FGA DEMO - Access will be denied
                    "compliance_reason": "Pending estate litigation - beneficiary dispute",
                    "kyc_status": "review_required",
                    "kyc_expiry": "2024-05-20",  # Expired
                    "aml_flag": True,  # Flagged for review
                    "fee_schedule": "0.60% AUM annually",
                    "trading_restrictions": ["NO TRADES - Compliance hold", "NO WITHDRAWALS - Court order"],
                    "recent_transactions": [
                        {"date": "2024-08-01", "type": "Hold Placed", "amount": 0, "description": "Compliance hold - estate litigation"},
                        {"date": "2024-07-15", "type": "Dividend", "amount": 12500, "description": "Q2 dividends (held in cash)"},
                        {"date": "2024-04-15", "type": "Dividend", "amount": 11800, "description": "Q1 dividends"}
                    ],
                    "internal_notes": "COMPLIANCE HOLD: Estate beneficiary dispute in litigation. No trading or withdrawals until resolved. Legal review required before any action."
                }
            },
            "blocked_recipients": [
                "Offshore Holdings LLC",
                "Anonymous Trust", 
                "Unverified Account",
                "Crypto Exchange XYZ"
            ],
            "high_risk_countries": ["Country A", "Country B", "Country C"],
            "transaction_limits": {
                "auto_approve": 1000,
                "requires_logging": 10000,
                "requires_step_up": 10000,
                "requires_compliance": 50000
            }
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
        """Get client information with full operational details"""
        identifier = args.get("client_identifier", "")
        client = self._find_client(identifier)
        
        if not client:
            return {
                "error": "client_not_found",
                "message": f"Client '{identifier}' not found in internal systems"
            }
        
        # FGA check - compliance hold
        if not self._check_compliance(client):
            return {
                "error": "access_denied",
                "message": f"Access to {client['name']} is restricted: {client.get('compliance_reason', 'Compliance hold')}",
                "security_control": "FGA - Compliance Hold",
                "action_required": "Contact compliance team for review"
            }
        
        return {
            "client": {
                "id": client["id"],
                "name": client["name"],
                "email": client["email"],
                "phone": client["phone"],
                "status": client["status"],
                "account_type": client["account_type"],
                "account_name": client["account_name"],
                "portfolio_value": f"${client['portfolio_value']:,.2f}",
                "risk_profile": client["risk_profile"],
                "risk_score": client.get("risk_score", "N/A"),
                "advisor": client["advisor"],
                "last_review": client["last_review"],
                "next_review": client.get("next_review", "Not scheduled"),
                "ytd_return": f"{client['ytd_return']}%",
                "compliance_status": client["compliance_status"],
                "kyc_status": client.get("kyc_status", "N/A"),
                "fee_schedule": client.get("fee_schedule", "N/A")
            },
            "source": "Internal Portfolio Management System"
        }
    
    async def _tool_list_clients(self, args: Dict, user_info: Dict) -> Dict[str, Any]:
        """List all clients with summary information"""
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
