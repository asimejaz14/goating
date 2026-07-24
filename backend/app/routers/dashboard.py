"""Dashboard — aggregates and farm settings for the landing page."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.config import settings
from app.database import get_session
from app.models import Profile
from app.schemas import DashboardOut, FarmSettingsOut, ProfileOut
from app.services import dashboard as dashboard_service

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/dashboard/summary", response_model=DashboardOut)
async def dashboard_summary(
    session: AsyncSession = Depends(get_session),
) -> DashboardOut:
    return await dashboard_service.build(session)


@router.get("/settings", response_model=FarmSettingsOut)
async def farm_settings(
) -> FarmSettingsOut:
    """Values the frontend needs to format and label things consistently."""
    return FarmSettingsOut(
        farm_prefix=settings.farm_prefix,
        gestation_days=settings.gestation_days,
        currency_code=settings.currency_code,
        currency_symbol=settings.currency_symbol,
    )


@router.get("/profiles", response_model=list[ProfileOut])
async def list_profiles(
    session: AsyncSession = Depends(get_session),
) -> list[ProfileOut]:
    """The portal's users — powers the payer picker and the split."""
    result = await session.execute(
        select(Profile).order_by(Profile.created_at, Profile.id)
    )
    return [ProfileOut.model_validate(row) for row in result.scalars().all()]


@router.get("/me", response_model=CurrentUser)
async def whoami(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    return user
