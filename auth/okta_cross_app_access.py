"""
Okta Cross-App Access (XAA) Manager
Implements ID-JAG token exchange flow for MCP access
Based on Indranil's implementation
"""

import logging
import os
import json
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import Okta AI SDK
try:
    from okta_ai_sdk import OktaAISDK, OktaAIConfig, AuthServerTokenRequest
    OKTA_SDK_AVAILABLE = True
except ImportError:
    OKTA_SDK_AVAILABLE = False
    logger.warning("okta-ai-sdk-proto not installed. XAA features disabled.")


class OktaCrossAppAccessManager:
    """
    Manages ID-JAG token exchange for MCP server access.
    
    4-Step Flow:
    1. Exchange ID token for ID-JAG token
    2. Verify ID-JAG token
    3. Exchange ID-JAG for MCP access token
    4. Verify MCP access token
    """
    
    def __init__(self):
        self.okta_domain = os.getenv("OKTA_DOMAIN", "").strip()
        self.auth_server_id = os.getenv("OKTA_MCP_AUTH_SERVER_ID", "").strip()
        self.agent_id = os.getenv("OKTA_AGENT_ID", "").strip()
        self.mcp_audience = os.getenv("OKTA_MCP_AUDIENCE", "").strip()
        
        # Parse private key
        private_key_str = os.getenv("OKTA_AGENT_PRIVATE_KEY", "")
        self.private_jwk = None
        if private_key_str:
            try:
                self.private_jwk = json.loads(private_key_str)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse OKTA_AGENT_PRIVATE_KEY: {e}")
        
        # Initialize SDK
        self.sdk = None
        self.sdk_mcp = None
        
        if OKTA_SDK_AVAILABLE and self._is_configured():
            try:
                # Main config for ID-JAG exchange
                main_config = OktaAIConfig(
                    oktaDomain=self.okta_domain,
                    clientId=self.agent_id,
                    clientSecret="",
                    authorizationServerId="default",
                    principalId=self.agent_id,
                    privateJWK=self.private_jwk
                )
                self.sdk = OktaAISDK(main_config)
                
                # MCP config for auth server token
                mcp_config = OktaAIConfig(
                    oktaDomain=self.okta_domain,
                    clientId=self.agent_id,
                    clientSecret="",
                    authorizationServerId=self.auth_server_id,
                    principalId=self.agent_id,
                    privateJWK=self.private_jwk
                )
                self.sdk_mcp = OktaAISDK(mcp_config)
                
                logger.info("[XAA] Initialized successfully")
            except Exception as e:
                logger.error(f"[XAA] Initialization failed: {e}")
    
    def _is_configured(self) -> bool:
        """Check if all required config is present"""
        return all([
            self.okta_domain,
            self.auth_server_id,
            self.agent_id,
            self.private_jwk
        ])
    
    def is_configured(self) -> bool:
        """Public method to check configuration"""
        return self._is_configured() and self.sdk is not None
    
    async def exchange_id_to_mcp_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Exchange user's ID token for MCP access token.
        
        Steps 1-3 of ID-JAG flow.
        """
        if not self.sdk or not self.sdk_mcp:
            logger.error("[XAA] SDK not configured")
            return None
        
        try:
            # STEP 1: Exchange ID token for ID-JAG token
            id_jag_audience = f"{self.okta_domain}/oauth2/{self.auth_server_id}"
            logger.debug(f"[XAA] Step 1: Exchanging ID token, audience={id_jag_audience}")
            
            id_jag_result = self.sdk.cross_app_access.exchange_token(
                id_token=id_token,
                audience=id_jag_audience,
                scope="read_data write_data"
            )
            logger.info(f"[XAA] Step 1 SUCCESS: ID-JAG token obtained, expires_in={id_jag_result.expires_in}s")
            
            # STEP 2: Verify ID-JAG token (optional but good for logging)
            try:
                verification = self.sdk.cross_app_access.verify_id_jag_token(
                    token=id_jag_result.access_token,
                    audience=id_jag_audience
                )
                if verification.valid:
                    logger.debug(f"[XAA] Step 2: ID-JAG verified, sub={verification.sub}")
            except Exception as e:
                logger.debug(f"[XAA] Step 2 skipped: {e}")
            
            # STEP 3: Exchange ID-JAG for MCP access token
            logger.debug(f"[XAA] Step 3: Exchanging ID-JAG for MCP token")
            
            auth_server_request = AuthServerTokenRequest(
                id_jag_token=id_jag_result.access_token,
                authorization_server_id=self.auth_server_id,
                principal_id=self.agent_id,
                private_jwk=self.private_jwk
            )
            
            mcp_result = self.sdk_mcp.cross_app_access.exchange_id_jag_for_auth_server_token(
                auth_server_request
            )
            logger.info(f"[XAA] Step 3 SUCCESS: MCP token obtained, expires_in={mcp_result.expires_in}s")
            
            return {
                "access_token": mcp_result.access_token,
                "id_jag_token": id_jag_result.access_token,
                "token_type": getattr(mcp_result, "token_type", "Bearer"),
                "expires_in": mcp_result.expires_in,
                "scope": getattr(mcp_result, "scope", None),
                "exchanged_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[XAA] Token exchange failed: {e}", exc_info=True)
            return None
    
    async def verify_mcp_token(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify MCP access token (Step 4).
        Called by MCP server before executing tools.
        """
        if not self.sdk_mcp:
            logger.error("[XAA] SDK not configured for verification")
            return None
        
        try:
            verification = self.sdk_mcp.cross_app_access.verify_auth_server_token(
                token=access_token,
                authorization_server_id=self.auth_server_id,
                audience=self.mcp_audience
            )
            
            if verification.valid:
                logger.info(f"[XAA] Step 4 SUCCESS: Token valid, sub={verification.sub}, scope={verification.scope}")
                return {
                    "valid": True,
                    "sub": verification.sub,
                    "scope": verification.scope,
                    "aud": verification.aud,
                    "iss": verification.iss,
                    "exp": verification.exp
                }
            else:
                logger.error(f"[XAA] Step 4 FAILED: {verification.error}")
                return None
                
        except Exception as e:
            logger.error(f"[XAA] Token verification failed: {e}", exc_info=True)
            return None
