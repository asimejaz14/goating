"""Settlements — the record of one partner paying the other back."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi import status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.core.filters import apply_sort, compact, date_range, equals
from app.core.pagination import Page, PageParams, build_page, paginate
from app.database import get_session
from app.models import Settlement
from app.schemas import SettlementOut

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    prefix="/settlements", tags=["expenses"],
    dependencies=[Depends(get_current_user)],
)

SORTABLE = {
    "settled_on": Settlement.settled_on,
    "amount": Settlement.amount,
    "created_at": Settlement.created_at,
}


class SettlementFilters:
    def __init__(
        self,
        date_from: date | None = Query(None),
        date_to: date | None = Query(None),
        from_user: UUID | None = Query(None),
        to_user: UUID | None = Query(None),
    ) -> None:
        self.date_from = date_from
        self.date_to = date_to
        self.from_user = from_user
        self.to_user = to_user

    def conditions(self) -> list:
        return compact(
            date_range(Settlement.settled_on, self.date_from, self.date_to),
            equals(Settlement.from_user, self.from_user),
            equals(Settlement.to_user, self.to_user),
        )


def _to_out(rows: list[Settlement]) -> list[SettlementOut]:
    items = []
    for row in rows:
        item = SettlementOut.model_validate(row)
        item.from_name = row.payer.display_name if row.payer else None
        item.to_name = row.payee.display_name if row.payee else None
        items.append(item)
    return items


@router.get("", response_model=Page[SettlementOut])
async def list_settlements(
    params: PageParams = Depends(),
    filters: SettlementFilters = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[SettlementOut]:
    stmt = select(Settlement).where(*filters.conditions())
    stmt = apply_sort(
        stmt, params, SORTABLE, default="settled_on", tiebreaker=Settlement.id
    )

    rows, total = await paginate(session, stmt, params)
    return build_page(_to_out(rows), total, params.page, params.page_size)


@router.delete(
    "/{settlement_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_settlement(
    settlement_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Undo a repayment entered by mistake; the balance reopens by that amount."""
    settlement = await session.get(Settlement, settlement_id)
    if settlement is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That settlement is not on record.",
        )
    await session.delete(settlement)
