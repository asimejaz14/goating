"""Dashboard aggregation.

Returns numbers only — never raw lists — so the landing page stays one small
response no matter how large the herd or the ledger grows.
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import (
    AcquisitionType,
    Breed,
    Crossing,
    CrossingStatus,
    Expense,
    Goat,
    GoatSex,
    GoatStatus,
)
from app.schemas import (
    DashboardCards,
    DashboardOut,
    NamedCount,
    TopDoe,
    TrendPoint,
    UpcomingKidding,
)
from app.services import crossings as crossing_service
from app.services import expenses as expense_service
from app.services import goats as goat_service

TREND_MONTHS = 12
KID_AGE_MONTHS = 6
UPCOMING_WINDOW_DAYS = 30
TOP_DOES = 5

MONTH_LABELS = (
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
)


def month_label(period: str) -> str:
    """``2026-07`` → ``Jul 2026``."""
    year, _, month = period.partition("-")
    return f"{MONTH_LABELS[int(month) - 1]} {year}"


def recent_months(count: int, today: date | None = None) -> list[str]:
    """The last ``count`` months as ``YYYY-MM``, oldest first.

    Generated rather than read from the data so a quiet month still shows up on
    the chart as a zero instead of silently collapsing the axis.
    """
    today = today or date.today()
    months = []
    for offset in range(count - 1, -1, -1):
        anchor = goat_service.months_before(date(today.year, today.month, 1), offset)
        months.append(f"{anchor.year:04d}-{anchor.month:02d}")
    return months


async def _scalar(session: AsyncSession, *conditions) -> int:
    return await session.scalar(
        select(func.count()).select_from(Goat).where(*conditions)
    ) or 0


async def build(session: AsyncSession) -> DashboardOut:
    today = date.today()
    active = Goat.status == GoatStatus.active
    months = recent_months(TREND_MONTHS, today)

    cards = DashboardCards(
        total_goats=await _scalar(session, active),
        does=await _scalar(session, active, Goat.sex == GoatSex.female),
        bucks=await _scalar(session, active, Goat.sex == GoatSex.male),
        kids_under_6_months=await _scalar(
            session,
            active,
            Goat.date_of_birth >= goat_service.months_before(today, KID_AGE_MONTHS),
        ),
        bred_count=await _scalar(
            session, active, Goat.acquisition_type == AcquisitionType.bred
        ),
        purchased_count=await _scalar(
            session, active, Goat.acquisition_type == AcquisitionType.purchased
        ),
        pregnant_now=await session.scalar(
            select(func.count(func.distinct(Crossing.dam_id))).where(
                Crossing.status == CrossingStatus.pregnant
            )
        )
        or 0,
        due_next_30_days=await session.scalar(
            select(func.count())
            .select_from(Crossing)
            .where(
                Crossing.status == CrossingStatus.pregnant,
                Crossing.expected_kidding_date
                <= today + timedelta(days=UPCOMING_WINDOW_DAYS),
            )
        )
        or 0,
        kids_born_this_year=await _scalar(
            session, Goat.date_of_birth >= date(today.year, 1, 1)
        ),
        expired_count=await _scalar(session, Goat.status == GoatStatus.expired),
        sold_count=await _scalar(session, Goat.status == GoatStatus.sold),
    )

    return DashboardOut(
        cards=cards,
        herd_growth=await _herd_growth(session, months),
        births_per_month=await _births_per_month(session, months),
        sex_distribution=await _sex_distribution(session),
        breed_distribution=await _breed_distribution(session),
        top_does=await _top_does(session),
        monthly_expenses=await _monthly_expenses(session, months),
        upcoming_kiddings=await _upcoming(session, today),
        balance=await expense_service.load_balance(session, settings.currency_symbol),
        currency_symbol=settings.currency_symbol,
    )


async def _herd_growth(session: AsyncSession, months: list[str]) -> list[TrendPoint]:
    """Running total of goats added to the portal, month by month."""
    period = func.to_char(Goat.created_at, "YYYY-MM")
    rows = dict(
        (await session.execute(select(period, func.count()).group_by(period))).all()
    )

    # Everything added before the window still counts towards the running total.
    running = sum(count for month, count in rows.items() if month < months[0])
    points = []
    for month in months:
        running += rows.get(month, 0)
        points.append(
            TrendPoint(period=month, label=month_label(month), value=float(running))
        )
    return points


async def _births_per_month(
    session: AsyncSession, months: list[str]
) -> list[TrendPoint]:
    period = func.to_char(Goat.date_of_birth, "YYYY-MM")
    rows = dict(
        (
            await session.execute(
                select(period, func.count())
                .where(Goat.date_of_birth.isnot(None), period.in_(months))
                .group_by(period)
            )
        ).all()
    )
    return [
        TrendPoint(
            period=month, label=month_label(month), value=float(rows.get(month, 0))
        )
        for month in months
    ]


async def _monthly_expenses(
    session: AsyncSession, months: list[str]
) -> list[TrendPoint]:
    period = func.to_char(Expense.expense_date, "YYYY-MM")
    rows = dict(
        (
            await session.execute(
                select(period, func.sum(Expense.amount))
                .where(period.in_(months))
                .group_by(period)
            )
        ).all()
    )
    return [
        TrendPoint(
            period=month,
            label=month_label(month),
            value=float(rows.get(month) or 0),
        )
        for month in months
    ]


async def _sex_distribution(session: AsyncSession) -> list[NamedCount]:
    rows = (
        await session.execute(
            select(Goat.sex, func.count())
            .where(Goat.status == GoatStatus.active)
            .group_by(Goat.sex)
        )
    ).all()
    labels = {GoatSex.female: "Does", GoatSex.male: "Bucks"}
    return [NamedCount(label=labels.get(sex, str(sex)), value=count) for sex, count in rows]


async def _breed_distribution(session: AsyncSession) -> list[NamedCount]:
    rows = (
        await session.execute(
            select(Breed.name, func.count(Goat.id))
            .join(Goat, Goat.breed_id == Breed.id)
            .where(Goat.status == GoatStatus.active)
            .group_by(Breed.name)
            .order_by(func.count(Goat.id).desc())
        )
    ).all()
    return [NamedCount(label=name, value=count) for name, count in rows]


async def _top_does(session: AsyncSession) -> list[TopDoe]:
    """The most productive mothers, by kids registered in the portal."""
    kid_count = func.count(Goat.id).label("kids")
    dam = Goat.__table__.alias("dam")

    rows = (
        await session.execute(
            select(dam.c.id, dam.c.tag_number, dam.c.name, kid_count)
            .join(Goat, Goat.dam_id == dam.c.id)
            .group_by(dam.c.id, dam.c.tag_number, dam.c.name)
            .order_by(kid_count.desc(), dam.c.tag_number)
            .limit(TOP_DOES)
        )
    ).all()
    return [
        TopDoe(goat_id=goat_id, tag_number=tag, name=name, kids=kids)
        for goat_id, tag, name, kids in rows
    ]


async def _upcoming(session: AsyncSession, today: date) -> list[UpcomingKidding]:
    horizon = today + timedelta(days=UPCOMING_WINDOW_DAYS)
    rows = (
        await session.execute(
            select(Crossing)
            .where(
                Crossing.status == CrossingStatus.pregnant,
                Crossing.expected_kidding_date <= horizon,
            )
            .order_by(Crossing.expected_kidding_date.asc())
            .limit(10)
        )
    ).scalars().unique().all()

    upcoming = []
    for crossing in rows:
        remaining = crossing_service.days_remaining(
            crossing.expected_kidding_date, today
        )
        upcoming.append(
            UpcomingKidding(
                crossing_id=crossing.id,
                goat_id=crossing.dam_id,
                tag_number=crossing.dam.tag_number if crossing.dam else "—",
                name=crossing.dam.name if crossing.dam else None,
                expected_kidding_date=crossing.expected_kidding_date,
                days_remaining=remaining,
                is_overdue=remaining < 0,
            )
        )
    return upcoming
