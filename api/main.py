"""
Apex Wealth Advisor - Backend API
FastAPI backend with Claude AI, Okta XAA, and Auth0 Token Vault integration.

Architecture (Multi-Auth-Server):
- Internal MCP (Portfolio): Okta XAA → MCP Auth Server (aud: apex-wealth-mcp)
- Google Calendar: Okta XAA → Google Auth Server (aud: https://google.com) → Token Vault
- Salesforce CRM: Okta XAA → Salesforce Auth Server (aud: https://salesforce.com) → Token Vault

Version: 2.0 - Multi-Auth-Server Support
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Import auth modules
from auth.okta_cross_app_access import OktaCrossAppAccessManager
from auth.okta_validator import TokenValidator
from auth.token_vault import TokenVaultClient

# Import MCP server
from mcp_server.wealth_mcp import WealthMCP

# Import tools
from tools.google_calendar import GoogleCalendarTools
from tools.salesforce_tools import SalesforceTools

# Import Claude service
from services.claude_service import ClaudeService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

# Suppress noisy logs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# ============================================================================
# SCOPE DETECTION - Determine read vs write operations
# ============================================================================

# Keywords that indicate write operations
WRITE_KEYWORDS = [
    # Calendar write operations
    "schedule", "create", "book", "set up", "arrange", "plan", "add",
    "cancel", "delete", "remove", "reschedule", "move", "change",
    # Payment/transaction operations  
    "pay", "transfer", "send", "process", "execute", "wire",
    # Update operations
    "update", "modify", "edit", "change", "set", "assign",
    # Salesforce write operations
    "log", "record", "note", "task", "follow-up", "followup"
]

# Tool names that are write operations
WRITE_TOOLS = {
    # Calendar
    "create_calendar_event", "cancel_calendar_event", "update_calendar_event",
    # MCP
    "process_payment", "update_client", "create_transaction",
    # Salesforce
    "create_salesforce_task", "create_salesforce_note", "update_opportunity_stage",
    "update_contact", "create_opportunity"
}

def detect_required_scope(query: str) -> str:
    """
    Analyze user query to determine if write operations might be needed.
    Returns 'mcp:write' for write operations, 'mcp:read' for read operations.
    
    This implements least-privilege access - only request write permissions
    when the query indicates a write operation is intended.
    """
    query_lower = query.lower()
    
    # Check for write keywords
    for keyword in WRITE_KEYWORDS:
        if keyword in query_lower:
            logger.info(f"[SCOPE] Write operation detected (keyword: '{keyword}')")
            return "mcp:write"
    
    # Default to read-only
    logger.info(f"[SCOPE] Read operation detected (default)")
    return "mcp:read"

app = FastAPI(
    title="Apex Wealth Advisor API",
    description="AI-powered wealth advisory platform with Okta XAA and Auth0 Token Vault",
    version="2.0.0"
)

# CORS - Allow frontend origins
frontend_origins = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
    "https://apex-wealth-app.vercel.app",
    "https://apex-wealth-advisor.vercel.app",
    "https://okta-ai-agent-demo.vercel.app"
]
# Add any additional origins from env
extra_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
frontend_origins.extend([o.strip() for o in extra_origins if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# INITIALIZE SERVICES
# ============================================================================

# Okta XAA Manager - for all auth server exchanges
xaa_manager = OktaCrossAppAccessManager()
logger.info(f"[INIT] Okta XAA configured: {xaa_manager.is_configured()}")
logger.info(f"[INIT] Auth Servers: MCP={xaa_manager.AUTH_SERVER_IDS['mcp']}, Google={xaa_manager.AUTH_SERVER_IDS['google']}, Salesforce={xaa_manager.AUTH_SERVER_IDS['salesforce']}")

# Token Validator - for ID token validation
token_validator = TokenValidator()

# Auth0 Token Vault - for external APIs (Google, Salesforce)
token_vault = TokenVaultClient()
logger.info(f"[INIT] Auth0 Token Vault configured: {token_vault.is_configured()}")

# Internal MCP Server - Portfolio data
wealth_mcp = WealthMCP()
logger.info(f"[INIT] Internal MCP server initialized with {len(wealth_mcp.list_tools())} tools")

# Google Calendar Tools - uses Token Vault
calendar_tools = GoogleCalendarTools(token_vault_client=token_vault)
logger.info(f"[INIT] Google Calendar tools initialized with {len(calendar_tools.list_tools())} tools")

# Salesforce Tools - uses Token Vault
salesforce_tools = SalesforceTools()
logger.info(f"[INIT] Salesforce tools initialized with {len(salesforce_tools.list_tools())} tools")

# Claude AI Service
claude_service = ClaudeService()
logger.info(f"[INIT] Claude service initialized")


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    content: str
    agent_type: str
    tools_called: Optional[List[str]] = None
    security_info: Optional[Dict[str, Any]] = None
    xaa_info: Optional[Dict[str, Any]] = None
    token_vault_info: Optional[Dict[str, Any]] = None


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {
        "service": "Apex Wealth Advisor API",
        "version": "2.0.0",
        "status": "running",
        "architecture": "Multi-Auth-Server",
        "security_flows": {
            "internal_mcp": {
                "flow": "Okta XAA (ID-JAG)",
                "auth_server": xaa_manager.AUTH_SERVER_IDS["mcp"],
                "audience": xaa_manager.AUDIENCES["mcp"]
            },
            "google_calendar": {
                "flow": "Okta XAA → Auth0 Token Vault",
                "auth_server": xaa_manager.AUTH_SERVER_IDS["google"],
                "audience": xaa_manager.AUDIENCES["google"]
            },
            "salesforce": {
                "flow": "Okta XAA → Auth0 Token Vault",
                "auth_server": xaa_manager.AUTH_SERVER_IDS["salesforce"],
                "audience": xaa_manager.AUDIENCES["salesforce"]
            }
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "okta_xaa": xaa_manager.is_configured(),
            "auth0_token_vault": token_vault.is_configured(),
            "internal_mcp": True,
            "google_calendar": True,
            "salesforce": True,
            "claude": claude_service.client is not None
        }
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request):
    """
    Main chat endpoint - processes messages through Claude with tool access.
    
    Security Flow (Multi-Auth-Server):
    1. Validate user's ID token
    2. Exchange ID token for service-specific tokens via Okta XAA:
       - MCP Auth Server (aud: apex-wealth-mcp) for internal tools
       - Google Auth Server (aud: https://google.com) for calendar
       - Salesforce Auth Server (aud: https://salesforce.com) for CRM
    3. Exchange service-specific tokens for external API tokens via Token Vault
    4. Route tool calls to appropriate backend
    """
    try:
        # Extract tokens from headers
        id_token = http_request.headers.get("X-ID-Token")
        access_token = http_request.headers.get("Authorization", "").replace("Bearer ", "")
        
        logger.info(f"[CHAT] Request received: {len(request.messages)} messages")
        
        # ================================================================
        # STEP 1: Validate user
        # ================================================================
        user_info = None
        if id_token:
            user_info = await token_validator.validate_token(id_token)
            if user_info:
                logger.info(f"[CHAT] User validated: {user_info.get('email')}")
        
        # ================================================================
        # STEP 2: Okta XAA - Get service-specific tokens
        # ================================================================
        mcp_token_info = None
        google_xaa_info = None
        salesforce_xaa_info = None
        
        # Detect required scope based on user's query
        last_message = request.messages[-1].content if request.messages else ""
        required_scope = detect_required_scope(last_message)
        logger.info(f"[CHAT] Detected scope: {required_scope}")
        
        if id_token and xaa_manager.is_configured():
            # MCP Auth Server token (for internal portfolio tools)
            mcp_token_info = await xaa_manager.exchange_id_to_mcp_token(id_token, scope=required_scope)
            if mcp_token_info:
                logger.info(f"[CHAT] XAA-MCP: Token obtained (aud: {mcp_token_info.get('audience')}, scope: {mcp_token_info.get('scope')})")
            
            # Google Auth Server token (for calendar via Token Vault)
            google_xaa_info = await xaa_manager.exchange_id_to_google_token(id_token, scope=required_scope)
            if google_xaa_info:
                logger.info(f"[CHAT] XAA-Google: Token obtained (aud: {google_xaa_info.get('audience')}, scope: {google_xaa_info.get('scope')})")
            
            # Salesforce Auth Server token (for CRM via Token Vault)
            salesforce_xaa_info = await xaa_manager.exchange_id_to_salesforce_token(id_token, scope=required_scope)
            if salesforce_xaa_info:
                logger.info(f"[CHAT] XAA-Salesforce: Token obtained (aud: {salesforce_xaa_info.get('audience')}, scope: {salesforce_xaa_info.get('scope')})")
        
        # ================================================================
        # STEP 3: Auth0 Token Vault - Get external tokens
        # ================================================================
        google_vault_token = None
        google_token_info = None
        salesforce_vault_token = None
        salesforce_token_info = None
        
        if token_vault.is_configured():
            # Google: Use Google Auth Server token for Token Vault exchange
            if google_xaa_info:
                google_vault_token = await token_vault.exchange_okta_token_for_vault_token(
                    google_xaa_info.get("access_token")
                )
                if google_vault_token:
                    google_token_info = await token_vault.get_google_token(google_vault_token)
                    if google_token_info:
                        logger.info(f"[CHAT] Token Vault: Google token obtained via Google AS")
            
            # Salesforce: Use Salesforce Auth Server token for Token Vault exchange
            if salesforce_xaa_info:
                salesforce_vault_token = await token_vault.exchange_okta_token_for_vault_token(
                    salesforce_xaa_info.get("access_token")
                )
                if salesforce_vault_token:
                    salesforce_token_info = await token_vault.get_salesforce_token(salesforce_vault_token)
                    if salesforce_token_info:
                        logger.info(f"[CHAT] Token Vault: Salesforce token obtained via Salesforce AS")
        
        # ================================================================
        # STEP 4: Process through Claude with tools
        # ================================================================
        response = await claude_service.process_message(
            message=last_message,
            conversation_history=[m.dict() for m in request.messages[:-1]],
            user_info=user_info,
            mcp_token=mcp_token_info.get("access_token") if mcp_token_info else None,
            mcp_server=wealth_mcp,
            calendar_tools=calendar_tools,
            google_token=google_token_info.get("access_token") if google_token_info else None,
            salesforce_tools=salesforce_tools,
            salesforce_token=salesforce_token_info.get("access_token") if salesforce_token_info else None
        )
        
        # ================================================================
        # Build response with per-service security info
        # ================================================================
        
        # Build xaaInfo with per-service details
        xaa_info = {
            "configured": xaa_manager.is_configured(),
            "architecture": "multi-auth-server",
            # MCP flow info
            "mcp": {
                "token_obtained": bool(mcp_token_info),
                "auth_server_id": xaa_manager.AUTH_SERVER_IDS["mcp"],
                "audience": mcp_token_info.get("audience") if mcp_token_info else xaa_manager.AUDIENCES["mcp"],
                "scope": mcp_token_info.get("scope") if mcp_token_info else None,
                "id_jag_token": mcp_token_info.get("id_jag_token") if mcp_token_info else None,
                "access_token": mcp_token_info.get("access_token") if mcp_token_info else None,
                "expires_in": mcp_token_info.get("expires_in") if mcp_token_info else None
            } if mcp_token_info else None,
            # Google flow info  
            "google": {
                "token_obtained": bool(google_xaa_info),
                "auth_server_id": xaa_manager.AUTH_SERVER_IDS["google"],
                "audience": google_xaa_info.get("audience") if google_xaa_info else xaa_manager.AUDIENCES["google"],
                "scope": google_xaa_info.get("scope") if google_xaa_info else None,
                "id_jag_token": google_xaa_info.get("id_jag_token") if google_xaa_info else None,
                "access_token": google_xaa_info.get("access_token") if google_xaa_info else None,
                "expires_in": google_xaa_info.get("expires_in") if google_xaa_info else None
            } if google_xaa_info else None,
            # Salesforce flow info
            "salesforce": {
                "token_obtained": bool(salesforce_xaa_info),
                "auth_server_id": xaa_manager.AUTH_SERVER_IDS["salesforce"],
                "audience": salesforce_xaa_info.get("audience") if salesforce_xaa_info else xaa_manager.AUDIENCES["salesforce"],
                "scope": salesforce_xaa_info.get("scope") if salesforce_xaa_info else None,
                "id_jag_token": salesforce_xaa_info.get("id_jag_token") if salesforce_xaa_info else None,
                "access_token": salesforce_xaa_info.get("access_token") if salesforce_xaa_info else None,
                "expires_in": salesforce_xaa_info.get("expires_in") if salesforce_xaa_info else None
            } if salesforce_xaa_info else None
        }
        
        # Build token_vault_info with per-service details
        token_vault_info = {
            "configured": token_vault.is_configured(),
            "google": {
                "connected": bool(google_token_info),
                "vault_token": google_vault_token if google_vault_token else None,
                "token": google_token_info.get("access_token") if google_token_info else None,
                "expires_in": google_token_info.get("expires_in") if google_token_info else None,
                "connection": "google-oauth2"
            } if google_token_info or google_vault_token else None,
            "salesforce": {
                "connected": bool(salesforce_token_info),
                "vault_token": salesforce_vault_token if salesforce_vault_token else None,
                "token": salesforce_token_info.get("access_token") if salesforce_token_info else None,
                "expires_in": salesforce_token_info.get("expires_in") if salesforce_token_info else None,
                "connection": "salesforce"
            } if salesforce_token_info or salesforce_vault_token else None
        }
        
        return ChatResponse(
            content=response["content"],
            agent_type=response.get("agent_type", "Buffett"),
            tools_called=response.get("tools_called"),
            security_info=response.get("security_info"),
            xaa_info=xaa_info,
            token_vault_info=token_vault_info
        )
        
    except Exception as e:
        logger.error(f"[CHAT] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tools")
async def list_tools():
    """List all available tools across all backends"""
    mcp_tools = wealth_mcp.list_tools()
    cal_tools = calendar_tools.list_tools()
    
    return {
        "internal_mcp": {
            "security": "Okta XAA (ID-JAG)",
            "auth_server": xaa_manager.AUTH_SERVER_IDS["mcp"],
            "audience": xaa_manager.AUDIENCES["mcp"],
            "tools": mcp_tools,
            "count": len(mcp_tools)
        },
        "google_calendar": {
            "security": "Okta XAA → Auth0 Token Vault",
            "auth_server": xaa_manager.AUTH_SERVER_IDS["google"],
            "audience": xaa_manager.AUDIENCES["google"],
            "tools": cal_tools,
            "count": len(cal_tools)
        },
        "salesforce": {
            "security": "Okta XAA → Auth0 Token Vault",
            "auth_server": xaa_manager.AUTH_SERVER_IDS["salesforce"],
            "audience": xaa_manager.AUDIENCES["salesforce"],
            "tools": ["search_salesforce_contacts", "get_contact_opportunities", "get_sales_pipeline", 
                     "get_high_value_accounts", "create_salesforce_task", "create_salesforce_note",
                     "get_pipeline_value", "update_opportunity_stage"],
            "count": 8
        },
        "total_tools": len(mcp_tools) + len(cal_tools) + 8
    }


@app.post("/api/tools/call")
async def call_tool(request: Dict[str, Any], http_request: Request):
    """Call a tool directly (for testing)"""
    tool_name = request.get("tool_name")
    arguments = request.get("arguments", {})
    
    # Determine which backend handles this tool
    mcp_tool_names = [t["name"] for t in wealth_mcp.list_tools()]
    cal_tool_names = [t["name"] for t in calendar_tools.list_tools()]
    
    if tool_name in mcp_tool_names:
        result = await wealth_mcp.call_tool(tool_name, arguments, {})
        result["backend"] = "Internal MCP"
        result["security"] = "Okta XAA"
        result["audience"] = xaa_manager.AUDIENCES["mcp"]
    elif tool_name in cal_tool_names:
        result = await calendar_tools.call_tool(tool_name, arguments, None)
        result["backend"] = "Google Calendar"
        result["security"] = "Okta XAA → Auth0 Token Vault"
        result["audience"] = xaa_manager.AUDIENCES["google"]
    else:
        result = {"error": "unknown_tool", "message": f"Tool '{tool_name}' not found"}
    
    return result


@app.get("/api/security/status")
async def security_status():
    """Check all security configurations"""
    return {
        "architecture": "multi-auth-server",
        "okta_xaa": {
            "configured": xaa_manager.is_configured(),
            "domain": os.getenv("OKTA_DOMAIN", "not set"),
            "agent_id": os.getenv("OKTA_AGENT_ID", "not set"),
            "auth_servers": {
                "mcp": {
                    "id": xaa_manager.AUTH_SERVER_IDS["mcp"],
                    "audience": xaa_manager.AUDIENCES["mcp"],
                    "description": "Internal MCP portfolio tools"
                },
                "google": {
                    "id": xaa_manager.AUTH_SERVER_IDS["google"],
                    "audience": xaa_manager.AUDIENCES["google"],
                    "description": "Google Calendar via Token Vault"
                },
                "salesforce": {
                    "id": xaa_manager.AUTH_SERVER_IDS["salesforce"],
                    "audience": xaa_manager.AUDIENCES["salesforce"],
                    "description": "Salesforce CRM via Token Vault"
                }
            }
        },
        "auth0_token_vault": {
            "configured": token_vault.is_configured(),
            "domain": os.getenv("AUTH0_DOMAIN", "not set"),
            "connections": ["google-oauth2", "salesforce"],
            "description": "Secure token storage for external SaaS APIs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
