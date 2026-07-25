"""Portal authentication.

Users live in the `users` table (seeded directly by SQL — see
supabase/migrations/0003_seed.sql — never through a signup flow), and the API
signs its own JWTs rather than delegating to an external identity provider.
A session lasts ``settings.jwt_expire_days`` (60 by default): long enough
that this behaves like "log in once, stay in" rather than something that
force-logs-out a partner mid-week.
"""

from __future__ import annotations

import time
from uuid import UUID

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"
SECONDS_PER_DAY = 86400


class CurrentUser(BaseModel):
    id: UUID
    email: str
    display_name: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # A malformed stored hash should just never match, not blow up the request.
        return False


def _require_secret() -> str:
    if not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth is not configured: set JWT_SECRET in backend/.env.",
        )
    return settings.jwt_secret


def create_access_token(user: CurrentUser) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "iat": now,
        "exp": now + settings.jwt_expire_days * SECONDS_PER_DAY,
    }
    return jwt.encode(payload, _require_secret(), algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Resolve the signed-in partner from the bearer token, or reject the request."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not signed in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = jwt.decode(
            credentials.credentials,
            _require_secret(),
            algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    subject = claims.get("sub")
    email = claims.get("email")
    if not subject or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token."
        )

    return CurrentUser(
        id=UUID(subject),
        email=email,
        display_name=claims.get("display_name") or email.split("@")[0],
    )
