"""
Okta Token Validator
Validates ID tokens and access tokens from Okta
"""

import logging
import os
import jwt
import requests
from typing import Dict, Any, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)


class TokenValidator:
    """Validates Okta tokens"""
    
    def __init__(self):
        self.okta_domain = os.getenv("OKTA_DOMAIN", "").strip()
        self.client_id = os.getenv("OKTA_CLIENT_ID", "").strip()
        self._jwks_cache = None
    
    @lru_cache(maxsize=1)
    def _get_jwks(self) -> Dict:
        """Fetch JWKS from Okta"""
        try:
            jwks_url = f"{self.okta_domain}/oauth2/v1/keys"
            resp = requests.get(jwks_url, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            return {"keys": []}
    
    def _get_signing_key(self, token: str) -> Optional[str]:
        """Get the signing key for a token"""
        try:
            headers = jwt.get_unverified_header(token)
            kid = headers.get("kid")
            
            jwks = self._get_jwks()
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    return jwt.algorithms.RSAAlgorithm.from_jwk(key)
            
            # Clear cache and retry
            self._get_jwks.cache_clear()
            jwks = self._get_jwks()
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    return jwt.algorithms.RSAAlgorithm.from_jwk(key)
            
            return None
        except Exception as e:
            logger.error(f"Failed to get signing key: {e}")
            return None
    
    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate an Okta ID token.
        Returns user info if valid, None if invalid.
        """
        try:
            signing_key = self._get_signing_key(token)
            if not signing_key:
                logger.error("Could not find signing key for token")
                return None
            
            # Decode and verify
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.okta_domain
            )
            
            return {
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "name": payload.get("name"),
                "groups": payload.get("groups", []),
                "exp": payload.get("exp")
            }
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None


# Singleton instance
token_validator = TokenValidator()
