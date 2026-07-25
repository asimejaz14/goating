"""Shared expense ledger — totals, the 50/50 split and settle-up.

The two partners share every cost equally. The balance answers one question:
*who owes whom, and how much?*

    net = paid − fair share + settlements paid out − settlements received

A positive net means the person is owed money. Nets always sum to exactly zero,
which is what makes "settle up" able to drive the balance to nothing.
"""

from __future__ import annotations

from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Expense, Settlement, User
from app.schemas import BalanceEntry, BalanceOut, PayerTotal

CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def money(value: Decimal | int | float | None) -> Decimal:
    """Round to whole cents, half up — the way a person would."""
    if value is None:
        return ZERO
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def fair_shares(total: Decimal, people: int) -> list[Decimal]:
    """Split ``total`` into ``people`` shares that add back up exactly.

    An odd number of cents cannot divide evenly, so the leftover cents go to the
    first people in the list. Without this the nets would drift and the balance
    could never reach zero.
    """
    if people <= 0:
        return []
    total = money(total)
    base = (total / people).quantize(CENT, rounding=ROUND_DOWN)
    shares = [base] * people
    leftover = int(((total - base * people) / CENT).to_integral_value())
    for index in range(leftover):
        shares[index % people] += CENT
    return shares


def compute_balance(
    participants: list[tuple[UUID, str]],
    paid: dict[UUID, Decimal],
    settlements_paid: dict[UUID, Decimal],
    settlements_received: dict[UUID, Decimal],
    currency_symbol: str = "₨",
) -> BalanceOut:
    """Work out who owes whom. Pure — no database, fully unit testable."""
    total = money(sum((money(v) for v in paid.values()), ZERO))
    shares = fair_shares(total, len(participants))

    entries: list[BalanceEntry] = []
    for (user_id, display_name), share in zip(participants, shares, strict=True):
        person_paid = money(paid.get(user_id))
        out = money(settlements_paid.get(user_id))
        back = money(settlements_received.get(user_id))
        entries.append(
            BalanceEntry(
                user_id=user_id,
                display_name=display_name,
                paid=person_paid,
                share=share,
                settlements_paid=out,
                settlements_received=back,
                net=person_paid - share + out - back,
            )
        )

    creditor = max(entries, key=lambda e: e.net, default=None)
    debtor = min(entries, key=lambda e: e.net, default=None)
    settled = not entries or all(abs(entry.net) < CENT for entry in entries)

    if settled or creditor is None or debtor is None or creditor is debtor:
        return BalanceOut(
            total_expenses=total,
            per_person=entries,
            settled=True,
            message=(
                "All square — nobody owes anybody."
                if entries
                else "No expenses recorded yet."
            ),
        )

    owed = money(creditor.net)
    return BalanceOut(
        total_expenses=total,
        per_person=entries,
        settled=False,
        debtor_id=debtor.user_id,
        debtor_name=debtor.display_name,
        creditor_id=creditor.user_id,
        creditor_name=creditor.display_name,
        amount_owed=owed,
        message=(
            f"{debtor.display_name} owes {creditor.display_name} "
            f"{currency_symbol}{owed:,.2f}"
        ),
    )


async def load_balance(
    session: AsyncSession, currency_symbol: str = "₨"
) -> BalanceOut:
    """Gather the ledger totals and hand them to :func:`compute_balance`."""
    profiles = (
        await session.execute(select(User).order_by(User.created_at, User.id))
    ).scalars().all()
    participants = [(profile.id, profile.display_name) for profile in profiles]

    paid = dict(
        (
            await session.execute(
                select(Expense.paid_by, func.sum(Expense.amount)).group_by(
                    Expense.paid_by
                )
            )
        ).all()
    )
    out = dict(
        (
            await session.execute(
                select(Settlement.from_user, func.sum(Settlement.amount)).group_by(
                    Settlement.from_user
                )
            )
        ).all()
    )
    back = dict(
        (
            await session.execute(
                select(Settlement.to_user, func.sum(Settlement.amount)).group_by(
                    Settlement.to_user
                )
            )
        ).all()
    )

    return compute_balance(participants, paid, out, back, currency_symbol)


async def payer_totals(
    session: AsyncSession, conditions: list
) -> list[PayerTotal]:
    """Per-payer totals for whatever filter the user currently has applied."""
    rows = await session.execute(
        select(Expense.paid_by, User.display_name, func.sum(Expense.amount))
        .join(User, User.id == Expense.paid_by)
        .where(*conditions)
        .group_by(Expense.paid_by, User.display_name)
        .order_by(func.sum(Expense.amount).desc())
    )
    return [
        PayerTotal(user_id=row[0], display_name=row[1], total=money(row[2]))
        for row in rows
    ]
