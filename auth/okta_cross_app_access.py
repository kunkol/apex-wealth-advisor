"""
Okta Cross-App Access (XAA) Manager
Implements ID-JAG token exchange flow for MCP, Google, and Salesforce access
Based on Indranil's implementation

Version: 2.0 - Multi-Auth-Server Support
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
    Manages ID-JAG token exchange for multiple authorization servers.
    
    Supported Auth Servers:
    - MCP (apex-wealth-mcp): Internal portfolio tools
    - Google (https://google.com): Google Calendar via Token Vault
    - Salesforce (https://salesforce.com): Salesforce CRM via Token Vault
    
    4-Step Flow (per auth server):
    1. Exchange ID token for ID-JAG token
    2. Verify ID-JAG token
    3. Exchange ID-JAG for Auth Server access token
    4. Verify Auth Server access token
    """
    
    # Auth Server IDs - from Okta configuration
    AUTH_SERVER_IDS = {
        "mcp": os.getenv("OKTA_MCP_AUTH_SERVER_ID", "aust6u013gCoEB6sz1d7"),
        "google": os.getenv("OKTA_GOOGLE_AUTH_SERVER_ID", "ausst9jmul5dzXzDZ1d7"),
        "salesforce": os.getenv("OKTA_SALESFORCE_AUTH_SERVER_ID", "aust9a53uybbE8WG41d7")
    }
    
    # Audiences - from Okta Auth Server configuration
    AUDIENCES = {
        "mcp": os.getenv("OKTA_MCP_AUDIENCE", "apex-wealth-mcp"),
        "google": "https://google.com",
        "salesforce": "https://salesforce.com"
    }
    
    def __init__(self):
        self.okta_domain = os.getenv("OKTA_DOMAIN", "").strip()
        self.agent_id = os.getenv("OKTA_AGENT_ID", "").strip()
        
        # For backward compatibility
        self.auth_server_id = self.AUTH_SERVER_IDS["mcp"]
        self.mcp_audience = self.AUDIENCES["mcp"]
        
        # Parse private key
        private_key_str = os.getenv("OKTA_AGENT_PRIVATE_KEY", "")
        self.private_jwk = None
        if private_key_str:
            try:
                self.private_jwk = json.loads(private_key_str)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse OKTA_AGENT_PRIVATE_KEY: {e}")
        
        # Initialize SDK instances
        self.sdk = None  # Main SDK for ID-JAG exchange
        self.sdk_mcp = None
        self.sdk_google = None
        self.sdk_salesforce = None
        
        if OKTA_SDK_AVAILABLE and self._is_configured():
            try:
                # Main config for ID-JAG exchange (uses default auth server)
                main_config = OktaAIConfig(
                    oktaDomain=self.okta_domain,
                    clientId=self.agent_id,
                    clientSecret="",
                    authorizationServerId="default",
                    principalId=self.agent_id,
                    privateJWK=self.private_jwk
                )
                self.sdk = OktaAISDK(main_config)
                
                # MCP Auth Server SDK
                mcp_config = OktaAIConfig(
                    oktaDomain=self.okta_domain,
                    clientId=self.agent_id,
                    clientSecret="",
                    authorizationServerId=self.AUTH_SERVER_IDS["mcp"],
                    principalId=self.agent_id,
                    privateJWK=self.private_jwk
                )
                self.sdk_mcp = OktaAISDK(mcp_config)
                
                # Google Auth Server SDK
                google_config = OktaAIConfig(
                    oktaDomain=self.okta_domain,
                    clientId=self.agent_id,
                    clientSecret="",
                    authorizationServerId=self.AUTH_SERVER_IDS["google"],
                    principalId=self.agent_id,
                    privateJWK=self.private_jwk
                )
                self.sdk_google = OktaAISDK(google_config)
                
                # Salesforce Auth Server SDK
                salesforce_config = OktaAIConfig(
                    oktaDomain=self.okta_domain,
                    clientId=self.agent_id,
                    clientSecret="",
                    authorizationServerId=self.AUTH_SERVER_IDS["salesforce"],
                    principalId=self.agent_id,
                    privateJWK=self.private_jwk
                )
                self.sdk_salesforce = OktaAISDK(salesforce_config)
                
                logger.info("[XAA] Initialized with MCP, Google, and Salesforce auth servers")
            except Exception as e:
                logger.error(f"[XAA] Initialization failed: {e}")
    
    def _is_configured(self) -> bool:
        """Check if all required config is present"""
        return all([
            self.okta_domain,
            self.agent_id,
            self.private_jwk
        ])
    
    def is_configured(self) -> bool:
        """Public method to check configuration"""
        return self._is_configured() and self.sdk is not None
    
    async def _exchange_id_to_auth_server_token(
        self, 
        id_token: str, 
        auth_server_id: str,
        audience: str,
        sdk_instance: OktaAISDK,
        service_name: str,
        scope: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Generic method to exchange ID token for any auth server token.
        
        Args:
            id_token: User's ID token from Okta
            auth_server_id: The target auth server ID
            audience: The audience for the auth server
            sdk_instance: The SDK instance configured for this auth server
            service_name: Name for logging (e.g., "MCP", "Google", "Salesforce")
            scope: Optional scope for the token
            
        Returns:
            Dict with access_token, id_jag_token, and metadata
        """
        if not self.sdk or not sdk_instance:
            logger.error(f"[XAA-{service_name}] SDK not configured")
            return None
        
        try:
            # STEP 1: Exchange ID token for ID-JAG token
            id_jag_audience = f"{self.okta_domain}/oauth2/{auth_server_id}"
            logger.debug(f"[XAA-{service_name}] Step 1: Exchanging ID token, audience={id_jag_audience}")
            
            exchange_params = {
                "token": id_token,
                "audience": id_jag_audience
            }
            if scope:
                exchange_params["scope"] = scope
            
            id_jag_result = self.sdk.cross_app_access.exchange_token(**exchange_params)
            logger.info(f"[XAA-{service_name}] Step 1 SUCCESS: ID-JAG token obtained, expires_in={id_jag_result.expires_in}s")
            
            # STEP 2: Verify ID-JAG token (optional but good for logging)
            try:
                verification = self.sdk.cross_app_access.verify_id_jag_token(
                    token=id_jag_result.access_token,
                    audience=id_jag_audience
                )
                if verification.valid:
                    logger.debug(f"[XAA-{service_name}] Step 2: ID-JAG verified, sub={verification.sub}")
            except Exception as e:
                logger.debug(f"[XAA-{service_name}] Step 2 skipped: {e}")
            
            # STEP 3: Exchange ID-JAG for Auth Server access token
            logger.debug(f"[XAA-{service_name}] Step 3: Exchanging ID-JAG for {service_name} token")
            
            auth_server_request = AuthServerTokenRequest(
                id_jag_token=id_jag_result.access_token,
                authorization_server_id=auth_server_id,
                principal_id=self.agent_id,
                private_jwk=self.private_jwk
            )
            
            auth_server_result = sdk_instance.cross_app_access.exchange_id_jag_for_auth_server_token(
                auth_server_request
            )
            logger.info(f"[XAA-{service_name}] Step 3 SUCCESS: {service_name} token obtained, expires_in={auth_server_result.expires_in}s")
            
            return {
                "access_token": auth_server_result.access_token,
                "id_jag_token": id_jag_result.access_token,
                "token_type": getattr(auth_server_result, "token_type", "Bearer"),
                "expires_in": auth_server_result.expires_in,
                "scope": getattr(auth_server_result, "scope", scope),
                "audience": audience,
                "auth_server_id": auth_server_id,
                "service": service_name.lower(),
                "exchanged_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[XAA-{service_name}] Token exchange failed: {e}", exc_info=True)
            return None
    
    async def exchange_id_to_mcp_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Exchange user's ID token for MCP access token.
        Uses MCP Auth Server (aust6u013gCoEB6sz1d7) with audience 'apex-wealth-mcp'.
        
        Steps 1-3 of ID-JAG flow for internal MCP tools.
        """
        return await self._exchange_id_to_auth_server_token(
            id_token=id_token,
            auth_server_id=self.AUTH_SERVER_IDS["mcp"],
            audience=self.AUDIENCES["mcp"],
            sdk_instance=self.sdk_mcp,
            service_name="MCP",
            scope="mcp:read"
        )
    
    async def exchange_id_to_google_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Exchange user's ID token for Google auth server token.
        Uses Google Auth Server (ausst9jmul5dzXzDZ1d7) with audience 'https://google.com'.
        
        This token is then exchanged via Auth0 Token Vault for actual Google OAuth token.
        """
        return await self._exchange_id_to_auth_server_token(
            id_token=id_token,
            auth_server_id=self.AUTH_SERVER_IDS["google"],
            audience=self.AUDIENCES["google"],
            sdk_instance=self.sdk_google,
            service_name="Google"
        )
    
    async def exchange_id_to_salesforce_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Exchange user's ID token for Salesforce auth server token.
        Uses Salesforce Auth Server (aust9a53uybbE8WG41d7) with audience 'https://salesforce.com'.
        
        This token is then exchanged via Auth0 Token Vault for actual Salesforce OAuth token.
        """
        return await self._exchange_id_to_auth_server_token(
            id_token=id_token,
            auth_server_id=self.AUTH_SERVER_IDS["salesforce"],
            audience=self.AUDIENCES["salesforce"],
            sdk_instance=self.sdk_salesforce,
            service_name="Salesforce"
        )
    
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
                authorization_server_id=self.AUTH_SERVER_IDS["mcp"],
                audience=self.AUDIENCES["mcp"]
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
