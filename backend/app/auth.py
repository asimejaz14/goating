"""Supabase JWT verification.

Supports both project styles: older projects sign with a shared HS256 secret,
newer ones use asymmetric keys published at the project's JWKS endpoint. Set
``SUPABASE_JWT_SECRET`` for the former; leave it blank for the latter.
"""

from __future__ import annotations

import time
from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

_JWKS_CACHE: dict[str, Any] = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 3600


class CurrentUser(BaseModel):
    id: UUID
    email: str | None = None
    display_name: str | None = None


async def _get_jwks() -> dict[str, Any]:
    """Fetch and cache the project's JWKS document."""
    now = time.time()
    if _JWKS_CACHE["keys"] and now - _JWKS_CACHE["fetched_at"] < _JWKS_TTL_SECONDS:
        return _JWKS_CACHE["keys"]

    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth is not configured: set SUPABASE_JWT_SECRET or SUPABASE_URL.",
        )

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url)
        response.raise_for_status()
        keys = response.json()

    _JWKS_CACHE.update(keys=keys, fetched_at=now)
    return keys


async def _decode(token: str) -> dict[str, Any]:
    options = {"verify_aud": False}
    if settings.supabase_jwt_secret:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options=options,
        )

    jwks = await _get_jwks()
    return jwt.decode(
        token,
        jwks,
        algorithms=["ES256", "RS256"],
        options=options,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Resolve the signed-in Supabase user, or reject the request."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not signed in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = await _decode(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    subject = claims.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token."
        )

    metadata = claims.get("user_metadata") or {}
    return CurrentUser(
        id=UUID(subject),
        email=claims.get("email"),
        display_name=metadata.get("display_name"),
    )
