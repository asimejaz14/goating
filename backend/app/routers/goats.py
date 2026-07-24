"""Goats — CRUD, filtered listing, parent linking, expiry and pedigree."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi import status as http_status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.core.filters import (
    apply_sort,
    compact,
    date_range,
    enum_in,
    equals,
    is_null,
    text_search,
)
from app.core.pagination import Page, PageParams, build_page, paginate
from app.database import get_session
from app.models import (
    AcquisitionType,
    Crossing,
    CrossingStatus,
    Goat,
    GoatSex,
    GoatStatus,
)
from app.schemas import (
    ExpireGoatIn,
    GoatCreate,
    GoatDetail,
    GoatHistoryOut,
    GoatSummary,
    GoatUpdate,
    LinkParentsIn,
    PedigreeOut,
)
from app.services import goats as goat_service
from app.services import history, ids, pedigree

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    prefix="/goats", tags=["goats"],
    dependencies=[Depends(get_current_user)],
)

SORTABLE = {
    "tag_number": Goat.tag_number,
    "name": Goat.name,
    "date_of_birth": Goat.date_of_birth,
    "created_at": Goat.created_at,
}


class GoatFilters:
    """The full goat filter set, shared by the list endpoint and its count."""

    def __init__(
        self,
        breed_id: UUID | None = Query(None),
        sex: GoatSex | None = Query(None),
        status: list[GoatStatus] | None = Query(
            None,
            description="Repeatable. Defaults to active so sold and expired "
            "goats stay out of the way.",
        ),
        acquisition_type: AcquisitionType | None = Query(None),
        is_pregnant: bool | None = Query(None),
        dob_from: date | None = Query(None),
        dob_to: date | None = Query(None),
        age_min_months: int | None = Query(None, ge=0, le=600),
        age_max_months: int | None = Query(None, ge=0, le=600),
        has_photo: bool | None = Query(None),
        dam_id: UUID | None = Query(None, description="List this doe's offspring"),
        sire_id: UUID | None = Query(None, description="List this buck's offspring"),
        has_parents: bool | None = Query(
            None, description="false finds goats still waiting for parent links"
        ),
    ) -> None:
        self.breed_id = breed_id
        self.sex = sex
        self.status = status or [GoatStatus.active]
        self.acquisition_type = acquisition_type
        self.is_pregnant = is_pregnant
        self.dob_from = dob_from
        self.dob_to = dob_to
        self.age_min_months = age_min_months
        self.age_max_months = age_max_months
        self.has_photo = has_photo
        self.dam_id = dam_id
        self.sire_id = sire_id
        self.has_parents = has_parents

    def conditions(self, query: str | None, today: date | None = None) -> list:
        today = today or date.today()

        # Age reads more naturally than a birth date, but the index lives on
        # date_of_birth — so convert rather than compute age per row.
        dob_from, dob_to = self.dob_from, self.dob_to
        if self.age_max_months is not None:
            floor = goat_service.months_before(today, self.age_max_months)
            dob_from = max(dob_from, floor) if dob_from else floor
        if self.age_min_months is not None:
            ceiling = goat_service.months_before(today, self.age_min_months)
            dob_to = min(dob_to, ceiling) if dob_to else ceiling

        pregnancy = None
        if self.is_pregnant is not None:
            open_crossing = (
                select(Crossing.id)
                .where(
                    Crossing.dam_id == Goat.id,
                    Crossing.status == CrossingStatus.pregnant,
                )
                .exists()
            )
            pregnancy = open_crossing if self.is_pregnant else ~open_crossing

        parents = None
        if self.has_parents is not None:
            both_linked = Goat.dam_id.isnot(None) & Goat.sire_id.isnot(None)
            parents = both_linked if self.has_parents else ~both_linked

        return compact(
            text_search(query, Goat.tag_number, Goat.name),
            equals(Goat.breed_id, self.breed_id),
            equals(Goat.sex, self.sex),
            enum_in(Goat.status, [s.value for s in self.status]),
            equals(Goat.acquisition_type, self.acquisition_type),
            date_range(Goat.date_of_birth, dob_from, dob_to),
            is_null(Goat.photo_url, self.has_photo),
            equals(Goat.dam_id, self.dam_id),
            equals(Goat.sire_id, self.sire_id),
            pregnancy,
            parents,
        )


async def _get_goat(session: AsyncSession, goat_id: UUID) -> Goat:
    goat = await session.get(Goat, goat_id)
    if goat is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That goat is not in the herd records.",
        )
    return goat


@router.get("", response_model=Page[GoatSummary])
async def list_goats(
    params: PageParams = Depends(),
    filters: GoatFilters = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[GoatSummary]:
    stmt = select(Goat).where(*filters.conditions(params.q))
    stmt = apply_sort(stmt, params, SORTABLE, default="tag_number", tiebreaker=Goat.id)

    rows, total = await paginate(session, stmt, params)
    items = await goat_service.to_summaries(session, rows)
    return build_page(items, total, params.page, params.page_size)


@router.post("", response_model=GoatDetail, status_code=http_status.HTTP_201_CREATED)
async def create_goat(
    payload: GoatCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> GoatDetail:
    """Add a goat. The tag number is allocated here and never editable after."""
    data = payload.model_dump()
    dam_id = data.pop("dam_id")
    sire_id = data.pop("sire_id")
    crossing_id = data.pop("crossing_id")

    # A kid registered against a crossing already knows both its parents.
    if crossing_id is not None:
        crossing = await session.get(Crossing, crossing_id)
        if crossing is None:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="That crossing no longer exists.",
            )
        dam_id = dam_id or crossing.dam_id
        sire_id = sire_id or crossing.sire_id

    goat = Goat(
        **data,
        tag_number=await ids.allocate_tag(session, payload.breed_id),
        created_by=user.id,
    )
    session.add(goat)
    await session.flush()

    if dam_id or sire_id:
        await _apply_parents(session, goat, dam_id, sire_id)
    goat.crossing_id = crossing_id

    await session.flush()
    await session.refresh(goat)
    return await goat_service.to_detail(session, goat)


@router.get("/{goat_id}", response_model=GoatDetail)
async def get_goat(
    goat_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> GoatDetail:
    return await goat_service.to_detail(session, await _get_goat(session, goat_id))


@router.patch("/{goat_id}", response_model=GoatDetail)
async def update_goat(
    goat_id: UUID,
    payload: GoatUpdate,
    session: AsyncSession = Depends(get_session),
) -> GoatDetail:
    goat = await _get_goat(session, goat_id)
    changes = payload.model_dump(exclude_unset=True)

    dam_id = changes.pop("dam_id", ...)
    sire_id = changes.pop("sire_id", ...)
    for field, value in changes.items():
        setattr(goat, field, value)

    if dam_id is not ... or sire_id is not ...:
        await _apply_parents(
            session,
            goat,
            goat.dam_id if dam_id is ... else dam_id,
            goat.sire_id if sire_id is ... else sire_id,
        )

    if goat.status != GoatStatus.expired:
        goat.expired_on = None
        goat.death_cause = None

    await session.flush()
    await session.refresh(goat)
    return await goat_service.to_detail(session, goat)


@router.delete(
    "/{goat_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_goat(
    goat_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Remove a goat entered by mistake.

    Refused once the goat is part of the herd's history — deleting it would tear
    holes in the pedigree. "Mark as expired" is the right move there.
    """
    goat = await _get_goat(session, goat_id)

    kids = await session.scalar(
        select(func.count())
        .select_from(Goat)
        .where((Goat.dam_id == goat_id) | (Goat.sire_id == goat_id))
    )
    crossings = await session.scalar(
        select(func.count())
        .select_from(Crossing)
        .where((Crossing.dam_id == goat_id) | (Crossing.sire_id == goat_id))
    )
    if kids or crossings:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                f"{goat.tag_number} has breeding history on record, so deleting "
                "it would break the pedigree. Mark it as expired or sold instead."
            ),
        )

    await session.delete(goat)


@router.post("/{goat_id}/link-parents", response_model=GoatDetail)
async def link_parents(
    goat_id: UUID,
    payload: LinkParentsIn,
    session: AsyncSession = Depends(get_session),
) -> GoatDetail:
    """Attach a kid to its mother and father — this is what grows the tree."""
    goat = await _get_goat(session, goat_id)
    await _apply_parents(session, goat, payload.dam_id, payload.sire_id)
    await session.flush()
    await session.refresh(goat)
    return await goat_service.to_detail(session, goat)


@router.post("/{goat_id}/expire", response_model=GoatDetail)
async def expire_goat(
    goat_id: UUID,
    payload: ExpireGoatIn,
    session: AsyncSession = Depends(get_session),
) -> GoatDetail:
    """Mark a goat as dead.

    It keeps every record it had — history and pedigree stay intact — but drops
    out of active lists, pickers and counts.
    """
    goat = await _get_goat(session, goat_id)
    goat.status = GoatStatus.expired
    goat.expired_on = payload.expired_on or date.today()
    goat.death_cause = payload.death_cause

    # Any pregnancy she was carrying ends with her.
    open_crossings = await session.execute(
        select(Crossing).where(
            Crossing.dam_id == goat_id, Crossing.status == CrossingStatus.pregnant
        )
    )
    for crossing in open_crossings.scalars().all():
        crossing.status = CrossingStatus.failed

    await session.flush()
    await session.refresh(goat)
    return await goat_service.to_detail(session, goat)


@router.get("/{goat_id}/history", response_model=GoatHistoryOut)
async def get_history(
    goat_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> GoatHistoryOut:
    """Everything ever recorded about this goat, in one call.

    Sections come back as capped previews with their real totals, so the page
    can offer "view all" without ever loading years of records up front.
    """
    return await history.build(session, await _get_goat(session, goat_id))


@router.get("/{goat_id}/pedigree", response_model=PedigreeOut)
async def get_pedigree(
    goat_id: UUID,
    generations: int = Query(
        pedigree.DEFAULT_GENERATIONS, ge=1, le=pedigree.MAX_GENERATIONS
    ),
    session: AsyncSession = Depends(get_session),
) -> PedigreeOut:
    goat = await _get_goat(session, goat_id)
    return await pedigree.build_tree(session, goat, generations)


# ---------------------------------------------------------------------------
# Shared parent-link validation
# ---------------------------------------------------------------------------
async def _apply_parents(
    session: AsyncSession,
    goat: Goat,
    dam_id: UUID | None,
    sire_id: UUID | None,
) -> None:
    """Validate and set both parent links.

    Guards the three ways a link can be wrong: pointing at a goat that isn't
    there, pointing at the wrong sex, or closing a loop in the family tree.
    """
    for relation, parent_id, expected_sex, label in (
        ("dam_id", dam_id, GoatSex.female, "mother"),
        ("sire_id", sire_id, GoatSex.male, "father"),
    ):
        if parent_id is None:
            setattr(goat, relation, None)
            continue

        if parent_id == goat.id:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"A goat cannot be its own {label}.",
            )

        parent = await session.get(Goat, parent_id)
        if parent is None:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"The {label} you picked is not in the herd records.",
            )
        if parent.sex != expected_sex:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"{parent.tag_number} is a "
                    f"{'doe' if parent.sex == GoatSex.female else 'buck'}, "
                    f"so it cannot be the {label}."
                ),
            )
        if await pedigree.would_create_cycle(session, goat.id, parent_id):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"{parent.tag_number} already descends from "
                    f"{goat.tag_number}, so this link would loop the family tree."
                ),
            )

        setattr(goat, relation, parent_id)
