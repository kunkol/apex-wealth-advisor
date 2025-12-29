"""
Auth0 Token Vault Client
Retrieves tokens for third-party services (Salesforce, Google) from Auth0 Token Vault
"""

import logging
import os
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class TokenVaultClient:
    """
    Client for Auth0 Token Vault
    Handles Okta-to-Auth0 token exchange and token retrieval for connected accounts
    """
    
    def __init__(self):
        self.auth0_domain = os.getenv("AUTH0_DOMAIN", "").strip()
        self.auth0_client_id = os.getenv("AUTH0_CLIENT_ID", "").strip()
        self.auth0_client_secret = os.getenv("AUTH0_CLIENT_SECRET", "").strip()
        self.vault_audience = os.getenv("AUTH0_VAULT_AUDIENCE", "").strip()
        
        # Token cache
        self._vault_token = None
    
    def is_configured(self) -> bool:
        """Check if Token Vault is configured"""
        return all([
            self.auth0_domain,
            self.auth0_client_id,
            self.auth0_client_secret
        ])
    
    async def exchange_okta_token(self, okta_token: str) -> Optional[str]:
        """
        Exchange Okta access token for Auth0 vault token.
        This is the CTE (Cross-Tenant Exchange) flow.
        """
        if not self.is_configured():
            logger.error("[TokenVault] Not configured")
            return None
        
        try:
            token_endpoint = f"https://{self.auth0_domain}/oauth/token"
            
            data = {
                "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
                "audience": self.vault_audience,
                "client_id": self.auth0_client_id,
                "client_secret": self.auth0_client_secret,
                "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
                "subject_token": okta_token,
                "scope": "read:vault"
            }
            
            resp = requests.post(
                token_endpoint,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30
            )
            
            if resp.status_code == 200:
                result = resp.json()
                self._vault_token = result.get("access_token")
                logger.info("[TokenVault] Okta token exchanged for vault token")
                return self._vault_token
            else:
                logger.error(f"[TokenVault] Exchange failed: {resp.status_code} - {resp.text}")
                return None
                
        except Exception as e:
            logger.error(f"[TokenVault] Exchange error: {e}", exc_info=True)
            return None
    
    async def get_connection_token(self, connection: str, vault_token: str = None) -> Optional[Dict[str, Any]]:
        """
        Get access token for a connected service (e.g., salesforce, google-oauth2)
        """
        if not self.is_configured():
            logger.error("[TokenVault] Not configured")
            return None
        
        token = vault_token or self._vault_token
        if not token:
            logger.error("[TokenVault] No vault token available")
            return None
        
        try:
            token_endpoint = f"https://{self.auth0_domain}/oauth/token"
            
            data = {
                "grant_type": "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
                "client_id": self.auth0_client_id,
                "client_secret": self.auth0_client_secret,
                "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
                "subject_token": token,
                "connection": connection,
                "requested_token_type": "http://auth0.com/oauth/token-type/federated-connection-access-token"
            }
            
            resp = requests.post(
                token_endpoint,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30
            )
            
            if resp.status_code == 200:
                result = resp.json()
                logger.info(f"[TokenVault] Got token for {connection}")
                return {
                    "access_token": result.get("access_token"),
                    "token_type": result.get("token_type", "Bearer"),
                    "expires_in": result.get("expires_in"),
                    "connection": connection
                }
            else:
                logger.error(f"[TokenVault] Failed to get {connection} token: {resp.status_code} - {resp.text}")
                return None
                
        except Exception as e:
            logger.error(f"[TokenVault] Error getting {connection} token: {e}", exc_info=True)
            return None
    
    async def get_salesforce_token(self, vault_token: str = None) -> Optional[Dict[str, Any]]:
        """Get Salesforce access token"""
        return await self.get_connection_token("salesforce", vault_token)
    
    async def get_google_token(self, vault_token: str = None) -> Optional[Dict[str, Any]]:
        """Get Google access token"""
        return await self.get_connection_token("google-oauth2", vault_token)
