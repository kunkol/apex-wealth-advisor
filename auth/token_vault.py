"""
Auth0 Token Vault Client
Retrieves tokens for third-party services (Google, Salesforce) from Auth0 Token Vault

Flow (Okta IdP with Token Vault):
1. Exchange Okta token for Auth0 Vault token (using custom token type: urn:dell:okta-token)
2. Exchange Vault token for external provider token (using standard access_token type)

Reference: https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault
"""

import logging
import os
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class TokenVaultClient:
    """
    Client for Auth0 Token Vault
    Handles Okta-to-Auth0 token exchange and retrieval of external provider tokens
    """
    
    def __init__(self):
        self.auth0_domain = os.getenv("AUTH0_DOMAIN", "").strip()
        self.auth0_client_id = os.getenv("AUTH0_CLIENT_ID", "").strip()
        self.auth0_client_secret = os.getenv("AUTH0_CLIENT_SECRET", "").strip()
        self.vault_audience = os.getenv("AUTH0_VAULT_AUDIENCE", "https://vault.dell.auth101.dev").strip()
        
        # Custom token type for Okta-to-Auth0 exchange (configured in Auth0 Token Exchange Profile)
        self.okta_token_type = os.getenv("AUTH0_OKTA_TOKEN_TYPE", "urn:dell:okta-token").strip()
        
        # Cache for vault token (short-lived, refreshed as needed)
        self._vault_token: Optional[str] = None
        self._vault_token_expires_at: float = 0
    
    def is_configured(self) -> bool:
        """Check if Token Vault is properly configured"""
        configured = all([
            self.auth0_domain,
            self.auth0_client_id,
            self.auth0_client_secret,
            self.vault_audience
        ])
        if not configured:
            logger.warning(f"[TokenVault] Missing configuration - domain: {bool(self.auth0_domain)}, "
                          f"client_id: {bool(self.auth0_client_id)}, secret: {bool(self.auth0_client_secret)}, "
                          f"audience: {bool(self.vault_audience)}")
        return configured
    
    async def exchange_okta_token_for_vault_token(self, okta_token: str) -> Optional[str]:
        """
        Step 1: Exchange Okta access token for Auth0 Vault token
        
        This uses the Custom Token Exchange flow configured in Auth0:
        - Token Exchange Profile with subject_token_type: urn:dell:okta-token
        - Custom Token Exchange Action that validates Okta tokens and maps users
        
        Args:
            okta_token: Access token from Okta (obtained via XAA or direct login)
            
        Returns:
            Auth0 Vault token (access token scoped to vault audience)
        """
        if not self.is_configured():
            logger.error("[TokenVault] Not configured - cannot exchange Okta token")
            return None
        
        try:
            token_endpoint = f"https://{self.auth0_domain}/oauth/token"
            
            # Custom Token Exchange: Okta token -> Auth0 Vault token
            # Reference: Auth0 Token Exchange Profile configured with urn:dell:okta-token
            data = {
                "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
                "audience": self.vault_audience,
                "client_id": self.auth0_client_id,
                "client_secret": self.auth0_client_secret,
                "subject_token_type": self.okta_token_type,  # urn:dell:okta-token
                "subject_token": okta_token,
                "scope": "read:vault"
            }
            
            logger.info(f"[TokenVault] Step 1: Exchanging Okta token for Vault token")
            logger.debug(f"[TokenVault] Endpoint: {token_endpoint}")
            logger.debug(f"[TokenVault] Audience: {self.vault_audience}")
            logger.debug(f"[TokenVault] Subject token type: {self.okta_token_type}")
            
            resp = requests.post(
                token_endpoint,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30
            )
            
            if resp.status_code == 200:
                result = resp.json()
                self._vault_token = result.get("access_token")
                
                # Cache expiration (with 60s buffer)
                expires_in = result.get("expires_in", 3600)
                import time
                self._vault_token_expires_at = time.time() + expires_in - 60
                
                logger.info("[TokenVault] Step 1 SUCCESS: Obtained Vault token")
                return self._vault_token
            else:
                error_body = resp.text
                logger.error(f"[TokenVault] Step 1 FAILED: {resp.status_code} - {error_body}")
                
                # Parse error for better debugging
                try:
                    error_json = resp.json()
                    error_code = error_json.get("error", "unknown")
                    error_desc = error_json.get("error_description", "No description")
                    logger.error(f"[TokenVault] Error: {error_code} - {error_desc}")
                except:
                    pass
                    
                return None
                
        except requests.exceptions.Timeout:
            logger.error("[TokenVault] Step 1 FAILED: Request timeout")
            return None
        except Exception as e:
            logger.error(f"[TokenVault] Step 1 FAILED: {e}", exc_info=True)
            return None
    
    async def get_connection_token(self, connection: str, vault_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Step 2: Exchange Vault token for external provider token (e.g., Google, Salesforce)
        
        This uses the standard Token Vault Access Token Exchange:
        - grant_type: federated-connection-access-token
        - subject_token_type: access_token (standard OAuth type)
        
        Args:
            connection: The Auth0 connection name (e.g., 'google-oauth2', 'salesforce')
            vault_token: Auth0 Vault token from Step 1 (uses cached token if not provided)
            
        Returns:
            Dict with access_token, token_type, expires_in, connection
        """
        if not self.is_configured():
            logger.error("[TokenVault] Not configured - cannot get connection token")
            return None
        
        token = vault_token or self._vault_token
        if not token:
            logger.error("[TokenVault] No Vault token available - call exchange_okta_token_for_vault_token first")
            return None
        
        try:
            token_endpoint = f"https://{self.auth0_domain}/oauth/token"
            
            # Token Vault Access Token Exchange: Vault token -> External provider token
            # Reference: https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/access-token-exchange-with-token-vault
            data = {
                "grant_type": "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
                "client_id": self.auth0_client_id,
                "client_secret": self.auth0_client_secret,
                "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",  # Standard OAuth type
                "subject_token": token,
                "connection": connection,
                "requested_token_type": "http://auth0.com/oauth/token-type/federated-connection-access-token"
            }
            
            logger.info(f"[TokenVault] Step 2: Getting {connection} token from Vault")
            
            resp = requests.post(
                token_endpoint,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30
            )
            
            if resp.status_code == 200:
                result = resp.json()
                logger.info(f"[TokenVault] Step 2 SUCCESS: Got {connection} token (expires in {result.get('expires_in')}s)")
                return {
                    "access_token": result.get("access_token"),
                    "token_type": result.get("token_type", "Bearer"),
                    "expires_in": result.get("expires_in"),
                    "scope": result.get("scope"),
                    "connection": connection
                }
            else:
                error_body = resp.text
                logger.error(f"[TokenVault] Step 2 FAILED: {resp.status_code} - {error_body}")
                
                # Parse error for better debugging
                try:
                    error_json = resp.json()
                    error_code = error_json.get("error", "unknown")
                    error_desc = error_json.get("error_description", "No description")
                    logger.error(f"[TokenVault] Error: {error_code} - {error_desc}")
                    
                    # Common errors:
                    # - "tokenset_not_found": User hasn't linked this connection
                    # - "access_denied": User hasn't authorized this connection
                    if error_code == "access_denied" and "tokenset" in error_desc.lower():
                        logger.error(f"[TokenVault] User has not linked their {connection} account. "
                                    "They need to complete the Connected Accounts flow first.")
                except:
                    pass
                    
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"[TokenVault] Step 2 FAILED: Request timeout for {connection}")
            return None
        except Exception as e:
            logger.error(f"[TokenVault] Step 2 FAILED: {e}", exc_info=True)
            return None
    
    async def get_google_token(self, okta_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Convenience method: Get Google access token (combines both steps)
        
        Args:
            okta_token: Okta access token. If provided, performs full 2-step exchange.
                       If not provided, uses cached vault token.
        
        Returns:
            Dict with Google access_token and metadata
        """
        # Step 1: Get vault token if okta_token provided
        if okta_token:
            vault_token = await self.exchange_okta_token_for_vault_token(okta_token)
            if not vault_token:
                logger.error("[TokenVault] Failed to get Google token - Step 1 failed")
                return None
        
        # Step 2: Get Google token
        return await self.get_connection_token("google-oauth2")
    
    async def get_salesforce_token(self, okta_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Convenience method: Get Salesforce access token (combines both steps)
        
        Args:
            okta_token: Okta access token. If provided, performs full 2-step exchange.
                       If not provided, uses cached vault token.
        
        Returns:
            Dict with Salesforce access_token and metadata
        """
        # Step 1: Get vault token if okta_token provided
        if okta_token:
            vault_token = await self.exchange_okta_token_for_vault_token(okta_token)
            if not vault_token:
                logger.error("[TokenVault] Failed to get Salesforce token - Step 1 failed")
                return None
        
        # Step 2: Get Salesforce token
        return await self.get_connection_token("salesforce")
    
    def clear_cache(self):
        """Clear cached vault token"""
        self._vault_token = None
        self._vault_token_expires_at = 0
        logger.debug("[TokenVault] Cache cleared")


# Singleton instance
_token_vault_client: Optional[TokenVaultClient] = None


def get_token_vault_client() -> TokenVaultClient:
    """Get or create singleton TokenVaultClient instance"""
    global _token_vault_client
    if _token_vault_client is None:
        _token_vault_client = TokenVaultClient()
    return _token_vault_client
