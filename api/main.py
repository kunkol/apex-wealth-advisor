"""
Apex Wealth Advisor - Backend API
FastAPI backend with Claude AI, Okta XAA, and Auth0 Token Vault integration
"""

from fastapi import FastAPI, HTTPException, Request, Depends
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "https://apex-wealth-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
xaa_manager = OktaCrossAppAccessManager()
token_validator = TokenValidator()
token_vault = TokenVaultClient()
wealth_mcp = WealthMCP()
claude_service = ClaudeService()

# Pydantic models
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
    mcp_info: Optional[Dict[str, Any]] = None
    token_info: Optional[Dict[str, Any]] = None


@app.get("/")
async def root():
    return {
        "service": "Apex Wealth Advisor API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "xaa": xaa_manager.is_configured(),
            "token_vault": token_vault.is_configured(),
            "mcp": True
        }
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request):
    """
    Main chat endpoint - processes messages through Claude with tool access
    """
    try:
        # Extract tokens from headers
        id_token = http_request.headers.get("X-ID-Token")
        access_token = http_request.headers.get("Authorization", "").replace("Bearer ", "")
        
        logger.info(f"[CHAT] Received request: {len(request.messages)} messages")
        logger.debug(f"[CHAT] Has ID token: {bool(id_token)}, Has access token: {bool(access_token)}")
        
        # Validate user if token provided
        user_info = None
        if id_token:
            user_info = await token_validator.validate_token(id_token)
            if user_info:
                logger.info(f"[CHAT] User validated: {user_info.get('email')}")
        
        # Exchange for MCP token if ID token provided
        mcp_token_info = None
        if id_token and xaa_manager.is_configured():
            mcp_token_info = await xaa_manager.exchange_id_to_mcp_token(id_token)
            if mcp_token_info:
                logger.info(f"[CHAT] MCP token obtained, expires in {mcp_token_info.get('expires_in')}s")
        
        # Get last message
        last_message = request.messages[-1].content if request.messages else ""
        
        # Process through Claude with tools
        response = await claude_service.process_message(
            message=last_message,
            conversation_history=[m.dict() for m in request.messages[:-1]],
            user_info=user_info,
            mcp_token=mcp_token_info.get("access_token") if mcp_token_info else None,
            mcp_server=wealth_mcp,
            token_vault=token_vault
        )
        
        return ChatResponse(
            content=response["content"],
            agent_type=response.get("agent_type", "Wealth Advisor"),
            tools_called=response.get("tools_called"),
            mcp_info=response.get("mcp_info"),
            token_info={
                "has_id_token": bool(id_token),
                "has_mcp_token": bool(mcp_token_info),
                "mcp_expires_in": mcp_token_info.get("expires_in") if mcp_token_info else None
            }
        )
        
    except Exception as e:
        logger.error(f"[CHAT] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tools")
async def list_tools():
    """List available MCP tools"""
    return {
        "tools": wealth_mcp.list_tools(),
        "count": len(wealth_mcp.list_tools())
    }


@app.post("/api/tools/call")
async def call_tool(request: Dict[str, Any], http_request: Request):
    """Call an MCP tool directly"""
    tool_name = request.get("tool_name")
    arguments = request.get("arguments", {})
    
    # Get MCP token from header
    auth_header = http_request.headers.get("Authorization", "")
    mcp_token = auth_header.replace("Bearer ", "") if auth_header else None
    
    user_info = {"mcp_token": mcp_token} if mcp_token else {}
    
    result = await wealth_mcp.call_tool(tool_name, arguments, user_info)
    return result


@app.get("/api/xaa/status")
async def xaa_status():
    """Check XAA configuration status"""
    return {
        "configured": xaa_manager.is_configured(),
        "okta_domain": os.getenv("OKTA_DOMAIN", "not set"),
        "auth_server": os.getenv("OKTA_AUTH_SERVER_ID", "not set")
    }


@app.get("/api/token-vault/status")
async def token_vault_status():
    """Check Token Vault configuration status"""
    return {
        "configured": token_vault.is_configured(),
        "auth0_domain": os.getenv("AUTH0_DOMAIN", "not set"),
        "connections": ["salesforce", "google-oauth2"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
