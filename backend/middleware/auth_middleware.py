from fastapi import Request, HTTPException, Depends
from typing import Optional, Dict, Any

from backend.services.auth_service import verify_session_jwt
from backend.repositories.user_repository import user_repository
from backend.utils.logging import logger

SESSION_COOKIE_NAME = "seespeak_session"

async def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """
    Extracts authenticated user from HTTP-only session cookie or Authorization header.
    Returns None if unauthenticated without raising an exception.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)

    # Fallback to Authorization: Bearer <token> if cookie not sent (e.g. mobile/API clients)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return None

    payload = verify_session_jwt(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    session_id = payload.get("jti")
    if not user_id or not session_id:
        return None

    # Check that session is still active in database (revocation protection)
    session_record = user_repository.get_session(session_id)
    if not session_record:
        logger.info(f"Session {session_id} not found or revoked in DB")
        return None

    user = user_repository.get_user_by_id(user_id)
    if not user or user.get("account_status") != "active":
        return None

    # Update session last active time asynchronously
    user_repository.touch_session(session_id)

    return user

async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Enforces authentication.
    Raises HTTP 401 if unauthenticated.
    Raises HTTP 403 if email is not yet verified.
    """
    user = await get_current_user_optional(request)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to continue."
        )

    if not user.get("email_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Email verification required before accessing this workspace."
        )

    return user
