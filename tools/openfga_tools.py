"""
OpenFGA Tools for Apex Wealth Advisor
Provides OpenFGA authorization checks using the OpenFGA SDK.
"""

import logging
import os
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    from openfga_sdk import ClientConfiguration, OpenFgaClient
    from openfga_sdk.client.models import ClientCheckRequest
    from openfga_sdk.credentials import Credentials, CredentialConfiguration
    OPENFGA_SDK_AVAILABLE = True
    OPENFGA_SDK_IMPORT_ERROR = None
except ImportError as exc:
    ClientConfiguration = None  # type: ignore[assignment]
    OpenFgaClient = None  # type: ignore[assignment]
    ClientCheckRequest = None  # type: ignore[assignment]
    Credentials = None  # type: ignore[assignment]
    CredentialConfiguration = None  # type: ignore[assignment]
    OPENFGA_SDK_AVAILABLE = False
    OPENFGA_SDK_IMPORT_ERROR = exc


def _read_env(name: str) -> str:
    """Read env var and normalize optional wrapping quotes."""
    return os.getenv(name, "").strip().strip("'").strip('"')


def is_fga_enabled() -> bool:
    """Feature flag for OpenFGA authorization checks."""
    return _read_env("FGA_ENABLED") == "1"


def get_fga_user(user_info: Optional[Dict[str, Any]]) -> Optional[str]:
    """Resolve current user into OpenFGA user format."""
    if not user_info:
        return None

    user_id = user_info.get("fga_user") or user_info.get("sub") or user_info.get("email")
    if not user_id:
        return None

    user_id = str(user_id)
    return user_id if user_id.startswith("user:") else f"user:{user_id}"


def build_openfga_client_configuration() -> Tuple[Optional[Any], Optional[str]]:
    """Initialize OpenFGA client configuration from env vars."""
    if not OPENFGA_SDK_AVAILABLE:
        detail = f" ({OPENFGA_SDK_IMPORT_ERROR})" if OPENFGA_SDK_IMPORT_ERROR else ""
        return None, f"OpenFGA SDK is not installed. Install dependency 'openfga-sdk'.{detail}"

    fga_api_url = _read_env("FGA_API_URL")
    fga_store_id = _read_env("FGA_STORE_ID")
    fga_client_id = _read_env("FGA_CLIENT_ID")
    fga_client_secret = _read_env("FGA_CLIENT_SECRET")
    fga_api_token_issuer = _read_env("FGA_API_TOKEN_ISSUER")
    fga_api_audience = _read_env("FGA_API_AUDIENCE")
    fga_model_id = _read_env("FGA_MODEL_ID")

    missing = [
        name for name, value in {
            "FGA_API_URL": fga_api_url,
            "FGA_STORE_ID": fga_store_id,
            "FGA_CLIENT_ID": fga_client_id,
            "FGA_CLIENT_SECRET": fga_client_secret,
            "FGA_API_TOKEN_ISSUER": fga_api_token_issuer,
            "FGA_API_AUDIENCE": fga_api_audience,
        }.items() if not value
    ]
    if missing:
        return None, f"OpenFGA is enabled but missing config: {', '.join(missing)}"

    config_kwargs: Dict[str, Any] = {
        "api_url": fga_api_url,
        "store_id": fga_store_id,
        "credentials": Credentials(
            method="client_credentials",
            configuration=CredentialConfiguration(
                api_issuer=fga_api_token_issuer,
                api_audience=fga_api_audience,
                client_id=fga_client_id,
                client_secret=fga_client_secret,
            ),
        ),
    }
    if fga_model_id:
        config_kwargs["authorization_model_id"] = fga_model_id

    try:
        return ClientConfiguration(**config_kwargs), None
    except Exception as exc:
        logger.error(f"[OpenFGA] Client initialization failed: {exc}", exc_info=True)
        return None, f"OpenFGA client initialization failed: {exc}"


async def check_permission(
    object_type: str,
    object_id: str,
    relation: str,
    user_info: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Use OpenFGA Check API to verify a user has a relation on an object.
    Returns {"allowed": bool, ...}.
    """
    fga_user = get_fga_user(user_info)
    obj = f"{object_type}:{object_id}"

    if not fga_user:
        return {
            "allowed": False,
            "error": "OpenFGA check failed: current user identity is missing.",
            "relation": relation,
            "object": obj,
        }

    configuration, init_error = build_openfga_client_configuration()
    if init_error:
        return {
            "allowed": False,
            "error": init_error,
            "relation": relation,
            "object": obj,
            "user": fga_user,
        }

    try:
        async with OpenFgaClient(configuration) as fga_client:
            check_request = ClientCheckRequest(
                user=fga_user,
                relation=relation,
                object=obj,
            )
            response = await fga_client.check(check_request)
            return {
                "allowed": bool(response.allowed),
                "relation": relation,
                "object": obj,
                "user": fga_user,
            }
    except Exception as exc:
        logger.error(f"[OpenFGA] Check failed for {fga_user} on {obj}: {exc}", exc_info=True)
        return {
            "allowed": False,
            "error": f"OpenFGA check failed: {exc}",
            "relation": relation,
            "object": obj,
            "user": fga_user,
        }
