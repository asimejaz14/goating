"""Expenses — the shared ledger, monthly history and settle-up."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi import status as http_status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.config import settings
from app.core.filters import (
    apply_sort,
    compact,
    date_range,
    equals,
    month_bounds,
    numeric_range,
    text_search,
)
from app.core.pagination import PageParams, build_page, paginate
from app.database import get_session
from app.models import Expense, Goat, Settlement, User
from app.schemas import (
    BalanceOut,
    ExpenseCreate,
    ExpenseOut,
    ExpensePage,
    ExpenseSummary,
    ExpenseUpdate,
    MonthlyBucket,
    PayerTotal,
    SettlementOut,
    SettleUpIn,
)
from app.services import expenses as expense_service

# Auth is declared on the router so it resolves before the endpoint's own
# dependencies — an anonymous request is rejected without ever opening a
# database session, and a new route here cannot accidentally be public.
router = APIRouter(
    prefix="/expenses", tags=["expenses"],
    dependencies=[Depends(get_current_user)],
)

MONTH_LABELS = (
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
)

SORTABLE = {
    "expense_date": Expense.expense_date,
    "amount": Expense.amount,
    "name": Expense.name,
    "created_at": Expense.created_at,
}


class ExpenseFilters:
    def __init__(
        self,
        month: str | None = Query(None, description="YYYY-MM"),
        date_from: date | None = Query(None),
        date_to: date | None = Query(None),
        paid_by: UUID | None = Query(None),
        category: str | None = Query(None),
        goat_id: UUID | None = Query(None),
        min_amount: Decimal | None = Query(None, ge=0),
        max_amount: Decimal | None = Query(None, ge=0),
    ) -> None:
        self.month = month
        self.date_from = date_from
        self.date_to = date_to
        self.paid_by = paid_by
        self.category = category
        self.goat_id = goat_id
        self.min_amount = min_amount
        self.max_amount = max_amount

    def conditions(self, query: str | None) -> list:
        start, end = self.date_from, self.date_to
        if self.month:
            # The month picker is the primary control, so it wins over any
            # stale date range left in the URL.
            start, end = month_bounds(self.month)

        return compact(
            text_search(query, Expense.name, Expense.notes),
            date_range(Expense.expense_date, start, end),
            equals(Expense.paid_by, self.paid_by),
            equals(Expense.category, self.category),
            equals(Expense.goat_id, self.goat_id),
            numeric_range(Expense.amount, self.min_amount, self.max_amount),
        )


def month_label(month: str) -> str:
    """``2026-07`` → ``Jul 2026``."""
    year, _, month_number = month.partition("-")
    index = int(month_number) - 1
    return f"{MONTH_LABELS[index]} {year}"


async def _to_out(session: AsyncSession, rows: list[Expense]) -> list[ExpenseOut]:
    items = []
    for row in rows:
        item = ExpenseOut.model_validate(row)
        item.payer_name = row.payer.display_name if row.payer else None
        item.goat_tag = row.goat.tag_number if row.goat else None
        items.append(item)
    return items


# ---------------------------------------------------------------------------
# Aggregates — declared before /{expense_id} so the paths do not collide
# ---------------------------------------------------------------------------
@router.get("/balance", response_model=BalanceOut)
async def get_balance(
    session: AsyncSession = Depends(get_session),
) -> BalanceOut:
    """Who owes whom, across the whole ledger."""
    return await expense_service.load_balance(session, settings.currency_symbol)


@router.get("/monthly", response_model=list[MonthlyBucket])
async def monthly_history(
    months: int = Query(12, ge=1, le=60, description="How far back to go"),
    session: AsyncSession = Depends(get_session),
) -> list[MonthlyBucket]:
    """Month-by-month totals with the per-payer split, newest first."""
    month_column = func.to_char(Expense.expense_date, "YYYY-MM").label("month")

    totals = (
        await session.execute(
            select(month_column, func.sum(Expense.amount), func.count())
            .group_by(month_column)
            .order_by(month_column.desc())
            .limit(months)
        )
    ).all()
    if not totals:
        return []

    wanted = [row[0] for row in totals]
    splits = (
        await session.execute(
            select(
                month_column,
                Expense.paid_by,
                User.display_name,
                func.sum(Expense.amount),
            )
            .join(User, User.id == Expense.paid_by)
            .where(month_column.in_(wanted))
            .group_by(month_column, Expense.paid_by, User.display_name)
        )
    ).all()

    by_month: dict[str, list[PayerTotal]] = {}
    for month, user_id, display_name, amount in splits:
        by_month.setdefault(month, []).append(
            PayerTotal(
                user_id=user_id,
                display_name=display_name,
                total=expense_service.money(amount),
            )
        )

    return [
        MonthlyBucket(
            month=month,
            label=month_label(month),
            total=expense_service.money(total),
            count=count,
            per_payer=sorted(
                by_month.get(month, []), key=lambda p: p.total, reverse=True
            ),
        )
        for month, total, count in totals
    ]


@router.get("/categories", response_model=list[str])
async def expense_categories(
    session: AsyncSession = Depends(get_session),
) -> list[str]:
    """Categories already in use, to autocomplete the next entry."""
    rows = await session.execute(
        select(Expense.category)
        .where(Expense.category.isnot(None))
        .distinct()
        .order_by(Expense.category)
    )
    return [row[0] for row in rows]


@router.post(
    "/settle", response_model=SettlementOut, status_code=http_status.HTTP_201_CREATED
)
async def settle_up(
    payload: SettleUpIn,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> SettlementOut:
    """Record a repayment, driving the balance back towards zero."""
    balance = await expense_service.load_balance(session, settings.currency_symbol)
    if balance.settled or balance.debtor_id is None or balance.creditor_id is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Nothing to settle — you are already square.",
        )

    amount = expense_service.money(payload.amount or balance.amount_owed)
    if amount > balance.amount_owed:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=(
                f"That is more than is owed. The outstanding balance is "
                f"{settings.currency_symbol}{balance.amount_owed:,.2f}."
            ),
        )

    settlement = Settlement(
        from_user=balance.debtor_id,
        to_user=balance.creditor_id,
        amount=amount,
        settled_on=payload.settled_on or date.today(),
        note=payload.note,
        created_by=user.id,
    )
    session.add(settlement)
    await session.flush()
    await session.refresh(settlement)

    out = SettlementOut.model_validate(settlement)
    out.from_name = balance.debtor_name
    out.to_name = balance.creditor_name
    return out


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
@router.get("", response_model=ExpensePage)
async def list_expenses(
    params: PageParams = Depends(),
    filters: ExpenseFilters = Depends(),
    session: AsyncSession = Depends(get_session),
) -> ExpensePage:
    """Paginated ledger.

    The ``summary`` block is computed over the **whole filtered set**, so the
    totals on screen answer "what did we spend in July" rather than "what is on
    this page".
    """
    conditions = filters.conditions(params.q)

    stmt = select(Expense).where(*conditions)
    stmt = apply_sort(
        stmt, params, SORTABLE, default="expense_date", tiebreaker=Expense.id
    )
    rows, total = await paginate(session, stmt, params)

    total_amount = await session.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(*conditions)
    )
    summary = ExpenseSummary(
        total_amount=expense_service.money(total_amount),
        count=total,
        per_payer=await expense_service.payer_totals(session, conditions),
    )

    base = build_page(
        await _to_out(session, rows), total, params.page, params.page_size
    )
    return ExpensePage(
        **base.model_dump(exclude={"items"}), items=base.items, summary=summary
    )


@router.post("", response_model=ExpenseOut, status_code=http_status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ExpenseOut:
    """Log a cost. The payer defaults to whoever is signed in."""
    data = payload.model_dump()
    data["paid_by"] = data.get("paid_by") or user.id

    if await session.get(User, data["paid_by"]) is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="That payer is not a portal user.",
        )
    if data.get("goat_id") and await session.get(Goat, data["goat_id"]) is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="That goat is not in the herd records.",
        )

    expense = Expense(**data, created_by=user.id)
    session.add(expense)
    await session.flush()
    await session.refresh(expense)
    return (await _to_out(session, [expense]))[0]


@router.get("/{expense_id}", response_model=ExpenseOut)
async def get_expense(
    expense_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> ExpenseOut:
    return (await _to_out(session, [await _get_expense(session, expense_id)]))[0]


@router.patch("/{expense_id}", response_model=ExpenseOut)
async def update_expense(
    expense_id: UUID,
    payload: ExpenseUpdate,
    session: AsyncSession = Depends(get_session),
) -> ExpenseOut:
    expense = await _get_expense(session, expense_id)
    changes = payload.model_dump(exclude_unset=True)

    if changes.get("paid_by") and await session.get(User, changes["paid_by"]) is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="That payer is not a portal user.",
        )

    for field, value in changes.items():
        setattr(expense, field, value)

    await session.flush()
    await session.refresh(expense)
    return (await _to_out(session, [expense]))[0]


@router.delete(
    "/{expense_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_expense(
    expense_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    await session.delete(await _get_expense(session, expense_id))


async def _get_expense(session: AsyncSession, expense_id: UUID) -> Expense:
    expense = await session.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That expense is not in the ledger.",
        )
    return expense
