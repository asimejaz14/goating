"""Crossings — which doe was crossed with which buck, and what came of it."""

from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi import status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.core.filters import apply_sort, compact, date_range, enum_in, equals, text_search
from app.core.pagination import Page, PageParams, build_page, paginate
from app.database import get_session
from app.models import Crossing, CrossingStatus, Goat, GoatSex, GoatStatus
from app.schemas import (
    CrossingCreate,
    CrossingOut,
    CrossingUpdate,
    RecordKiddingIn,
)
from app.services import crossings as crossing_service

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    prefix="/crossings", tags=["crossings"],
    dependencies=[Depends(get_current_user)],
)

SORTABLE = {
    "crossing_date": Crossing.crossing_date,
    "expected_kidding_date": Crossing.expected_kidding_date,
    "actual_kidding_date": Crossing.actual_kidding_date,
    "number_of_kids": Crossing.number_of_kids,
    "created_at": Crossing.created_at,
}


class CrossingFilters:
    def __init__(
        self,
        dam_id: UUID | None = Query(None),
        sire_id: UUID | None = Query(None),
        status: list[CrossingStatus] | None = Query(None),
        crossing_date_from: date | None = Query(None),
        crossing_date_to: date | None = Query(None),
        expected_kidding_from: date | None = Query(None),
        expected_kidding_to: date | None = Query(None),
        due_within_days: int | None = Query(
            None, ge=0, le=365, description="Open pregnancies due inside this window"
        ),
        year: int | None = Query(None, ge=1990, le=2200),
        goat_id: UUID | None = Query(
            None, description="Every crossing this goat took part in, either side"
        ),
    ) -> None:
        self.dam_id = dam_id
        self.sire_id = sire_id
        self.status = status
        self.crossing_date_from = crossing_date_from
        self.crossing_date_to = crossing_date_to
        self.expected_kidding_from = expected_kidding_from
        self.expected_kidding_to = expected_kidding_to
        self.due_within_days = due_within_days
        self.year = year
        self.goat_id = goat_id

    def conditions(self, query: str | None, today: date | None = None) -> list:
        today = today or date.today()

        expected_from = self.expected_kidding_from
        expected_to = self.expected_kidding_to
        due_soon = None
        if self.due_within_days is not None:
            # "Due soon" only makes sense for pregnancies still running, and
            # overdue does still count as due.
            expected_to = today + timedelta(days=self.due_within_days)
            due_soon = Crossing.status == CrossingStatus.pregnant

        year_bounds = []
        if self.year is not None:
            year_bounds = date_range(
                Crossing.crossing_date, date(self.year, 1, 1), date(self.year, 12, 31)
            )

        either_side = None
        if self.goat_id is not None:
            either_side = (Crossing.dam_id == self.goat_id) | (
                Crossing.sire_id == self.goat_id
            )

        return compact(
            text_search(query, Crossing.notes),
            equals(Crossing.dam_id, self.dam_id),
            equals(Crossing.sire_id, self.sire_id),
            enum_in(Crossing.status, [s.value for s in self.status or []]),
            date_range(
                Crossing.crossing_date, self.crossing_date_from, self.crossing_date_to
            ),
            date_range(Crossing.expected_kidding_date, expected_from, expected_to),
            year_bounds,
            due_soon,
            either_side,
        )


async def _get_crossing(session: AsyncSession, crossing_id: UUID) -> Crossing:
    crossing = await session.get(Crossing, crossing_id)
    if crossing is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That crossing is not on record.",
        )
    return crossing


async def _breeding_goat(
    session: AsyncSession, goat_id: UUID, expected_sex: GoatSex, label: str
) -> Goat:
    """Fetch a parent and confirm it can still be bred."""
    goat = await session.get(Goat, goat_id)
    if goat is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"The {label} you picked is not in the herd records.",
        )
    if goat.sex != expected_sex:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"{goat.tag_number} is not a {label}.",
        )
    if goat.status != GoatStatus.active:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{goat.tag_number} is marked as {goat.status.value} and cannot "
                "be part of a new crossing."
            ),
        )
    return goat


@router.get("", response_model=Page[CrossingOut])
async def list_crossings(
    params: PageParams = Depends(),
    filters: CrossingFilters = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[CrossingOut]:
    stmt = select(Crossing).where(*filters.conditions(params.q))
    stmt = apply_sort(
        stmt, params, SORTABLE, default="crossing_date", tiebreaker=Crossing.id
    )

    rows, total = await paginate(session, stmt, params)
    items = await crossing_service.to_out(session, rows)
    return build_page(items, total, params.page, params.page_size)


@router.get("/upcoming", response_model=list[CrossingOut])
async def upcoming_kiddings(
    within_days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[CrossingOut]:
    """Open pregnancies due inside the window, soonest (and overdue) first."""
    horizon = date.today() + timedelta(days=within_days)
    result = await session.execute(
        select(Crossing)
        .where(
            Crossing.status == CrossingStatus.pregnant,
            Crossing.expected_kidding_date <= horizon,
        )
        .order_by(Crossing.expected_kidding_date.asc())
        .limit(limit)
    )
    return await crossing_service.to_out(session, list(result.scalars().unique().all()))


@router.post("", response_model=CrossingOut, status_code=http_status.HTTP_201_CREATED)
async def create_crossing(
    payload: CrossingCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> CrossingOut:
    dam = await _breeding_goat(session, payload.dam_id, GoatSex.female, "doe")
    if payload.sire_id is not None:
        if payload.sire_id == payload.dam_id:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="A goat cannot be crossed with itself.",
            )
        await _breeding_goat(session, payload.sire_id, GoatSex.male, "buck")

    already_open = await session.scalar(
        select(Crossing.id).where(
            Crossing.dam_id == payload.dam_id,
            Crossing.status == CrossingStatus.pregnant,
        )
    )
    if already_open:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                f"{dam.tag_number} already has an open pregnancy. Record its "
                "kidding first, or mark that crossing as failed."
            ),
        )

    crossing = Crossing(
        dam_id=payload.dam_id,
        sire_id=payload.sire_id,
        crossing_date=payload.crossing_date,
        expected_kidding_date=payload.expected_kidding_date
        or crossing_service.expected_kidding(payload.crossing_date),
        notes=payload.notes,
        created_by=user.id,
    )
    session.add(crossing)
    await session.flush()
    await session.refresh(crossing)

    items = await crossing_service.to_out(session, [crossing])
    return items[0]


@router.get("/{crossing_id}", response_model=CrossingOut)
async def get_crossing(
    crossing_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> CrossingOut:
    crossing = await _get_crossing(session, crossing_id)
    items = await crossing_service.to_out(session, [crossing])
    return items[0]


@router.patch("/{crossing_id}", response_model=CrossingOut)
async def update_crossing(
    crossing_id: UUID,
    payload: CrossingUpdate,
    session: AsyncSession = Depends(get_session),
) -> CrossingOut:
    crossing = await _get_crossing(session, crossing_id)
    changes = payload.model_dump(exclude_unset=True)

    if changes.get("sire_id") is not None:
        if changes["sire_id"] == crossing.dam_id:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="A goat cannot be crossed with itself.",
            )
        await _breeding_goat(session, changes["sire_id"], GoatSex.male, "buck")

    for field, value in changes.items():
        setattr(crossing, field, value)

    # Moving the crossing date moves the estimate with it, unless the user set
    # the expected date by hand in the same edit.
    if "crossing_date" in changes and "expected_kidding_date" not in changes:
        crossing.expected_kidding_date = crossing_service.expected_kidding(
            crossing.crossing_date
        )

    await session.flush()
    await session.refresh(crossing)
    items = await crossing_service.to_out(session, [crossing])
    return items[0]


@router.post("/{crossing_id}/kidding", response_model=CrossingOut)
async def record_kidding(
    crossing_id: UUID,
    payload: RecordKiddingIn,
    session: AsyncSession = Depends(get_session),
) -> CrossingOut:
    """Record the birth by hand.

    The real kidding date routinely differs from the 150-day estimate, so it is
    always entered rather than inferred. Saving it closes the countdown.
    """
    crossing = await _get_crossing(session, crossing_id)

    if payload.actual_kidding_date < crossing.crossing_date:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="The kidding date cannot be before the crossing date.",
        )

    crossing.actual_kidding_date = payload.actual_kidding_date
    crossing.number_of_kids = payload.number_of_kids
    crossing.status = (
        CrossingStatus.kidded if payload.number_of_kids > 0 else CrossingStatus.aborted
    )
    if payload.notes is not None:
        crossing.notes = payload.notes

    await session.flush()
    await session.refresh(crossing)
    items = await crossing_service.to_out(session, [crossing])
    return items[0]


@router.delete(
    "/{crossing_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_crossing(
    crossing_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    crossing = await _get_crossing(session, crossing_id)

    registered = await crossing_service.registered_kids(session, [crossing_id])
    if registered.get(crossing_id):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                "Kids from this crossing are already registered. Unlink them "
                "first, or mark the crossing as failed instead of deleting it."
            ),
        )

    await session.delete(crossing)
