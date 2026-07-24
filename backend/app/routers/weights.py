"""Weights — the measurements behind each goat's growth chart."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi import status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.core.filters import apply_sort, compact, date_range, equals
from app.core.pagination import Page, PageParams, build_page, paginate
from app.database import get_session
from app.models import Goat, Weight
from app.schemas import WeightCreate, WeightOut

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    prefix="/weights", tags=["weights"],
    dependencies=[Depends(get_current_user)],
)

SORTABLE = {
    "measured_on": Weight.measured_on,
    "weight_kg": Weight.weight_kg,
    "created_at": Weight.created_at,
}


class WeightFilters:
    def __init__(
        self,
        goat_id: UUID | None = Query(None),
        date_from: date | None = Query(None),
        date_to: date | None = Query(None),
    ) -> None:
        self.goat_id = goat_id
        self.date_from = date_from
        self.date_to = date_to

    def conditions(self) -> list:
        return compact(
            equals(Weight.goat_id, self.goat_id),
            date_range(Weight.measured_on, self.date_from, self.date_to),
        )


@router.get("", response_model=Page[WeightOut])
async def list_weights(
    params: PageParams = Depends(),
    filters: WeightFilters = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[WeightOut]:
    stmt = select(Weight).where(*filters.conditions())
    stmt = apply_sort(
        stmt, params, SORTABLE, default="measured_on", tiebreaker=Weight.id
    )

    rows, total = await paginate(session, stmt, params)
    items = [WeightOut.model_validate(row) for row in rows]
    return build_page(items, total, params.page, params.page_size)


@router.post("", response_model=WeightOut, status_code=http_status.HTTP_201_CREATED)
async def create_weight(
    payload: WeightCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> WeightOut:
    if await session.get(Goat, payload.goat_id) is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="That goat is not in the herd records.",
        )

    record = Weight(**payload.model_dump(), created_by=user.id)
    session.add(record)
    await session.flush()
    await session.refresh(record)
    return WeightOut.model_validate(record)


@router.delete(
    "/{weight_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_weight(
    weight_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    record = await session.get(Weight, weight_id)
    if record is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That weight record is not on file.",
        )
    await session.delete(record)
