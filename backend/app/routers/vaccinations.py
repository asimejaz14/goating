"""Vaccinations — a manual historical log.

Deliberately records only what was given and when. There are no due dates,
schedules or reminders anywhere in the system.
"""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi import status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.core.filters import apply_sort, compact, date_range, equals, text_search
from app.core.pagination import Page, PageParams, build_page, paginate
from app.database import get_session
from app.models import Goat, Vaccination
from app.schemas import VaccinationCreate, VaccinationOut
from app.services import goats as goat_service

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    prefix="/vaccinations",
    tags=["vaccinations"],
    dependencies=[Depends(get_current_user)],
)

SORTABLE = {
    "date_administered": Vaccination.date_administered,
    "vaccine_name": Vaccination.vaccine_name,
    "created_at": Vaccination.created_at,
}


class VaccinationFilters:
    def __init__(
        self,
        goat_id: UUID | None = Query(None),
        vaccine_name: str | None = Query(None),
        date_from: date | None = Query(None),
        date_to: date | None = Query(None),
    ) -> None:
        self.goat_id = goat_id
        self.vaccine_name = vaccine_name
        self.date_from = date_from
        self.date_to = date_to

    def conditions(self, query: str | None) -> list:
        return compact(
            text_search(query, Vaccination.vaccine_name, Vaccination.notes),
            equals(Vaccination.goat_id, self.goat_id),
            text_search(self.vaccine_name, Vaccination.vaccine_name),
            date_range(Vaccination.date_administered, self.date_from, self.date_to),
        )


async def _to_out(
    session: AsyncSession, records: list[Vaccination]
) -> list[VaccinationOut]:
    goats = [record.goat for record in records if record.goat is not None]
    summaries = {
        goat.id: summary
        for goat, summary in zip(
            goats, await goat_service.to_summaries(session, goats), strict=True
        )
    }
    items = []
    for record in records:
        item = VaccinationOut.model_validate(record)
        item.goat = summaries.get(record.goat_id)
        items.append(item)
    return items


@router.get("", response_model=Page[VaccinationOut])
async def list_vaccinations(
    params: PageParams = Depends(),
    filters: VaccinationFilters = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[VaccinationOut]:
    stmt = select(Vaccination).where(*filters.conditions(params.q))
    stmt = apply_sort(
        stmt, params, SORTABLE, default="date_administered", tiebreaker=Vaccination.id
    )

    rows, total = await paginate(session, stmt, params)
    return build_page(await _to_out(session, rows), total, params.page, params.page_size)


@router.get("/names", response_model=list[str])
async def vaccine_names(
    session: AsyncSession = Depends(get_session),
) -> list[str]:
    """Vaccines already used on this farm, to autocomplete the next entry."""
    rows = await session.execute(
        select(Vaccination.vaccine_name).distinct().order_by(Vaccination.vaccine_name)
    )
    return [row[0] for row in rows]


@router.post("", response_model=VaccinationOut, status_code=http_status.HTTP_201_CREATED)
async def create_vaccination(
    payload: VaccinationCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> VaccinationOut:
    if await session.get(Goat, payload.goat_id) is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="That goat is not in the herd records.",
        )

    record = Vaccination(**payload.model_dump(), created_by=user.id)
    session.add(record)
    await session.flush()
    await session.refresh(record)
    return (await _to_out(session, [record]))[0]


@router.delete(
    "/{vaccination_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_vaccination(
    vaccination_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    record = await session.get(Vaccination, vaccination_id)
    if record is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That vaccination record is not on file.",
        )
    await session.delete(record)
