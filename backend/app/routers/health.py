"""Health records — illnesses, treatments, dewormings and check-ups."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi import status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.core.filters import apply_sort, compact, date_range, enum_in, equals, text_search
from app.core.pagination import Page, PageParams, build_page, paginate
from app.database import get_session
from app.models import Goat, HealthRecord, HealthRecordType
from app.schemas import HealthRecordCreate, HealthRecordOut
from app.services import goats as goat_service

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    prefix="/health",
    tags=["health"],
    dependencies=[Depends(get_current_user)],
)

SORTABLE = {
    "record_date": HealthRecord.record_date,
    "type": HealthRecord.type,
    "created_at": HealthRecord.created_at,
}


class HealthFilters:
    def __init__(
        self,
        goat_id: UUID | None = Query(None),
        type: list[HealthRecordType] | None = Query(None),
        date_from: date | None = Query(None),
        date_to: date | None = Query(None),
    ) -> None:
        self.goat_id = goat_id
        self.type = type
        self.date_from = date_from
        self.date_to = date_to

    def conditions(self, query: str | None) -> list:
        return compact(
            text_search(
                query,
                HealthRecord.description,
                HealthRecord.medication,
                HealthRecord.notes,
            ),
            equals(HealthRecord.goat_id, self.goat_id),
            enum_in(HealthRecord.type, [t.value for t in self.type or []]),
            date_range(HealthRecord.record_date, self.date_from, self.date_to),
        )


async def _to_out(
    session: AsyncSession, records: list[HealthRecord]
) -> list[HealthRecordOut]:
    goats = [record.goat for record in records if record.goat is not None]
    summaries = {
        goat.id: summary
        for goat, summary in zip(
            goats, await goat_service.to_summaries(session, goats), strict=True
        )
    }
    items = []
    for record in records:
        item = HealthRecordOut.model_validate(record)
        item.goat = summaries.get(record.goat_id)
        items.append(item)
    return items


@router.get("", response_model=Page[HealthRecordOut])
async def list_health_records(
    params: PageParams = Depends(),
    filters: HealthFilters = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[HealthRecordOut]:
    stmt = select(HealthRecord).where(*filters.conditions(params.q))
    stmt = apply_sort(
        stmt, params, SORTABLE, default="record_date", tiebreaker=HealthRecord.id
    )

    rows, total = await paginate(session, stmt, params)
    return build_page(await _to_out(session, rows), total, params.page, params.page_size)


@router.post("", response_model=HealthRecordOut, status_code=http_status.HTTP_201_CREATED)
async def create_health_record(
    payload: HealthRecordCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> HealthRecordOut:
    if await session.get(Goat, payload.goat_id) is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="That goat is not in the herd records.",
        )

    record = HealthRecord(**payload.model_dump(), created_by=user.id)
    session.add(record)
    await session.flush()
    await session.refresh(record)
    return (await _to_out(session, [record]))[0]


@router.delete(
    "/{record_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_health_record(
    record_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    record = await session.get(HealthRecord, record_id)
    if record is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That health record is not on file.",
        )
    await session.delete(record)
