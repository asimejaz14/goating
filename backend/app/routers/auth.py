"""POST /auth/login — the only data route that doesn't require a token."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, check_password, create_access_token
from app.database import get_session
from app.models import User

router = APIRouter(tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUser


@router.post("/auth/login", response_model=LoginOut)
async def login(
    payload: LoginIn, session: AsyncSession = Depends(get_session)
) -> LoginOut:
    result = await session.execute(
        select(User).where(func.lower(User.email) == payload.email.strip().lower())
    )
    user = result.scalar_one_or_none()

    if user is None or not await check_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="That email and password do not match.",
        )

    current = CurrentUser(id=user.id, email=user.email, display_name=user.display_name)
    return LoginOut(access_token=create_access_token(current), user=current)
