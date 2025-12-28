"""
Apex Wealth MCP Server - Standalone API
Exposes MCP tools via REST and MCP protocol endpoints
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
import os
from datetime import datetime

from .wealth_mcp import WealthMCP
from auth.okta_cross_app_access import OktaCrossAppAccessManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Apex Wealth MCP Server",
    description="MCP Server for Wealth Management Tools",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize
wealth_mcp = WealthMCP()
xaa_manager = OktaCrossAppAccessManager()


class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = {}


class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None
    id: Optional[str] = None


@app.get("/")
async def root():
    return {
        "service": "Apex Wealth MCP Server",
        "version": "1.0.0",
        "endpoints": {
            "tools": "/tools",
            "call_tool": "/call_tool",
            "mcp": "/mcp"
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/tools")
async def list_tools(request: Request):
    """List available MCP tools - REST endpoint"""
    # Optional: verify token
    auth_header = request.headers.get("Authorization", "")
    
    return {
        "tools": wealth_mcp.list_tools(),
        "count": len(wealth_mcp.list_tools())
    }


@app.post("/call_tool")
async def call_tool(request: ToolCallRequest, http_request: Request):
    """Call an MCP tool - REST endpoint"""
    # Extract token from header
    auth_header = http_request.headers.get("Authorization", "")
    mcp_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    
    # Verify token if present
    user_info = {}
    if mcp_token:
        token_claims = await xaa_manager.verify_mcp_token(mcp_token)
        if token_claims:
            user_info["mcp_token"] = mcp_token
            user_info["mcp_token_claims"] = token_claims
            logger.info(f"[MCP] Token verified: sub={token_claims.get('sub')}")
        else:
            logger.warning("[MCP] Token verification failed")
            # For demo, continue anyway but log
    
    # Call the tool
    result = await wealth_mcp.call_tool(
        request.tool_name,
        request.arguments,
        user_info
    )
    
    return result


@app.post("/mcp")
async def mcp_protocol(request: MCPRequest, http_request: Request):
    """
    MCP Protocol endpoint - Streamable HTTP
    Supports: initialize, tools/list, tools/call
    """
    auth_header = http_request.headers.get("Authorization", "")
    mcp_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    session_id = http_request.headers.get("Mcp-Session-Id", "")
    
    user_info = {"mcp_token": mcp_token} if mcp_token else {}
    
    method = request.method
    params = request.params or {}
    
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request.id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": "apex-wealth-mcp",
                    "version": "1.0.0"
                },
                "capabilities": {
                    "tools": {}
                }
            }
        }
    
    elif method == "tools/list":
        tools = wealth_mcp.list_tools()
        return {
            "jsonrpc": "2.0",
            "id": request.id,
            "result": {
                "tools": [
                    {
                        "name": t["name"],
                        "description": t["description"],
                        "inputSchema": t["parameters"]
                    }
                    for t in tools
                ]
            }
        }
    
    elif method == "tools/call":
        tool_name = params.get("tool_name") or params.get("name")
        arguments = params.get("arguments", {})
        
        result = await wealth_mcp.call_tool(tool_name, arguments, user_info)
        
        return {
            "jsonrpc": "2.0",
            "id": request.id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": str(result)
                    }
                ]
            }
        }
    
    else:
        return {
            "jsonrpc": "2.0",
            "id": request.id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            }
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
