"""
Apex Wealth Advisor - Backend API
FastAPI backend with Claude AI, Okta XAA, and Auth0 Token Vault integration.

Architecture:
- Internal MCP (Portfolio): Okta XAA (ID-JAG token exchange)
- Google Calendar: Auth0 Token Vault
- Salesforce CRM: Auth0 Token Vault
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

# Import Claude service
from services.claude_service import ClaudeService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

# Suppress noisy logs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

app = FastAPI(
    title="Apex Wealth Advisor API",
    description="AI-powered wealth advisory platform with Okta XAA and Auth0 Token Vault",
    version="1.0.0"
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

# Okta XAA Manager - for Internal MCP access
xaa_manager = OktaCrossAppAccessManager()
logger.info(f"[INIT] Okta XAA configured: {xaa_manager.is_configured()}")

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
        "version": "1.0.0",
        "status": "running",
        "security_flows": {
            "internal_mcp": "Okta XAA (ID-JAG)",
            "google_calendar": "Auth0 Token Vault",
            "salesforce": "Auth0 Token Vault"
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
    
    Security Flow:
    1. Validate user's ID token
    2. Exchange ID token for MCP token (Okta XAA) for internal tools
    3. Exchange for Auth0 vault token, then get Google/Salesforce tokens (Token Vault)
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
        # STEP 2: Okta XAA - Get MCP token for internal tools
        # ================================================================
        mcp_token_info = None
        if id_token and xaa_manager.is_configured():
            mcp_token_info = await xaa_manager.exchange_id_to_mcp_token(id_token)
            if mcp_token_info:
                logger.info(f"[CHAT] XAA: MCP token obtained, expires_in={mcp_token_info.get('expires_in')}s")
        
        # ================================================================
        # STEP 3: Auth0 Token Vault - Get external tokens
        # ================================================================
        vault_token = None
        google_token_info = None
        salesforce_token_info = None
        
        if access_token and token_vault.is_configured():
            # First exchange Okta token for Auth0 vault token
            vault_token = await token_vault.exchange_okta_token_for_vault_token(
                mcp_token_info.get("access_token") if mcp_token_info else access_token
            )
            if vault_token:
                # Get Google token from vault
                google_token_info = await token_vault.get_google_token(vault_token)
                if google_token_info:
                    logger.info(f"[CHAT] Token Vault: Google token obtained")
                
                # Get Salesforce token from vault
                salesforce_token_info = await token_vault.get_salesforce_token(vault_token)
                if salesforce_token_info:
                    logger.info(f"[CHAT] Token Vault: Salesforce token obtained")
        
        # ================================================================
        # STEP 4: Process through Claude with tools
        # ================================================================
        last_message = request.messages[-1].content if request.messages else ""
        
        response = await claude_service.process_message(
            message=last_message,
            conversation_history=[m.dict() for m in request.messages[:-1]],
            user_info=user_info,
            mcp_token=mcp_token_info.get("access_token") if mcp_token_info else None,
            mcp_server=wealth_mcp,
            calendar_tools=calendar_tools,
            google_token=google_token_info.get("access_token") if google_token_info else None,
            salesforce_token=salesforce_token_info.get("access_token") if salesforce_token_info else None
        )
        
        # ================================================================
        # Build response with security info
        # ================================================================
        return ChatResponse(
            content=response["content"],
            agent_type=response.get("agent_type", "Buffett"),
            tools_called=response.get("tools_called"),
            security_info=response.get("security_info"),
            xaa_info={
                "configured": xaa_manager.is_configured(),
                "token_obtained": bool(mcp_token_info),
                "id_jag_token": mcp_token_info.get("id_jag_token") if mcp_token_info else None,
                "mcp_token": mcp_token_info.get("access_token") if mcp_token_info else None,
                "id_jag_expires_in": 300,
                "mcp_token_expires_in": mcp_token_info.get("expires_in") if mcp_token_info else None,
                "scope": mcp_token_info.get("scope") if mcp_token_info else None
            } if mcp_token_info or xaa_manager.is_configured() else None,
            token_vault_info={
                "configured": token_vault.is_configured(),
                "vault_token": vault_token if vault_token else None,
                "google": {
                    "connected": bool(google_token_info),
                    "token": google_token_info.get("access_token") if google_token_info else None,
                    "expires_in": google_token_info.get("expires_in") if google_token_info else None,
                    "connection": "google-oauth2"
                } if google_token_info else None,
                "salesforce": {
                    "connected": bool(salesforce_token_info),
                    "token": salesforce_token_info.get("access_token") if salesforce_token_info else None,
                    "expires_in": salesforce_token_info.get("expires_in") if salesforce_token_info else None,
                    "connection": "salesforce"
                } if salesforce_token_info else None
            } if vault_token or token_vault.is_configured() else None
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
            "tools": mcp_tools,
            "count": len(mcp_tools)
        },
        "google_calendar": {
            "security": "Auth0 Token Vault",
            "tools": cal_tools,
            "count": len(cal_tools)
        },
        "salesforce": {
            "security": "Auth0 Token Vault",
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
    elif tool_name in cal_tool_names:
        result = await calendar_tools.call_tool(tool_name, arguments, None)
        result["backend"] = "Google Calendar"
        result["security"] = "Auth0 Token Vault"
    else:
        result = {"error": "unknown_tool", "message": f"Tool '{tool_name}' not found"}
    
    return result


@app.get("/api/security/status")
async def security_status():
    """Check all security configurations"""
    return {
        "okta_xaa": {
            "configured": xaa_manager.is_configured(),
            "domain": os.getenv("OKTA_DOMAIN", "not set"),
            "auth_server": os.getenv("OKTA_MCP_AUTH_SERVER_ID", "not set"),
            "description": "ID-JAG token exchange for Internal MCP access"
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
