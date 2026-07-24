"""Breeds — seeded reference data (Makhi Cheeni, Teddy, Rajan Puri).

There are a handful of rows, so this list is deliberately unpaginated: the
frontend loads it once and reuses it in every picker and filter.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import Breed, Goat, GoatStatus
from app.schemas import BreedOut

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    prefix="/breeds", tags=["breeds"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[BreedOut])
async def list_breeds(
    session: AsyncSession = Depends(get_session),
) -> list[BreedOut]:
    """Every breed, with a live count of the goats still in the herd."""
    counts = dict(
        (
            await session.execute(
                select(Goat.breed_id, func.count())
                .where(Goat.status == GoatStatus.active)
                .group_by(Goat.breed_id)
            )
        ).all()
    )

    result = await session.execute(select(Breed).order_by(Breed.name))
    return [
        BreedOut(
            id=breed.id,
            name=breed.name,
            code=breed.code,
            description=breed.description,
            goat_count=counts.get(breed.id, 0),
        )
        for breed in result.scalars().all()
    ]
