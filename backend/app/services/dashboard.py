"""Dashboard aggregation.

Returns numbers only — never raw lists — so the landing page stays one small
response no matter how large the herd or the ledger grows.
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import gather_reads
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


def _tally(condition) -> object:
    """``count(*) FILTER (WHERE condition)`` — one card, no extra round trip."""
    return func.count().filter(condition)


async def _goat_cards(session: AsyncSession, today: date) -> dict[str, int]:
    """Every goat-derived headline number in a single pass over the table.

    These were once eleven separate ``SELECT count(*)`` statements. They all read
    the same rows with different predicates, so folding them into one aggregate
    with ``FILTER`` clauses returns identical numbers for a tenth of the round
    trips — which is what the page's response time is actually made of when the
    database is across a network.
    """
    active = Goat.status == GoatStatus.active
    row = (
        await session.execute(
            select(
                _tally(active).label("total_goats"),
                _tally(active & (Goat.sex == GoatSex.female)).label("does"),
                _tally(active & (Goat.sex == GoatSex.male)).label("bucks"),
                _tally(
                    active
                    & (
                        Goat.date_of_birth
                        >= goat_service.months_before(today, KID_AGE_MONTHS)
                    )
                ).label("kids_under_6_months"),
                _tally(
                    active & (Goat.acquisition_type == AcquisitionType.bred)
                ).label("bred_count"),
                _tally(
                    active & (Goat.acquisition_type == AcquisitionType.purchased)
                ).label("purchased_count"),
                _tally(Goat.date_of_birth >= date(today.year, 1, 1)).label(
                    "kids_born_this_year"
                ),
                _tally(Goat.status == GoatStatus.expired).label("expired_count"),
                _tally(Goat.status == GoatStatus.sold).label("sold_count"),
            ).select_from(Goat)
        )
    ).mappings().one()
    return {key: value or 0 for key, value in row.items()}


async def _crossing_cards(session: AsyncSession, today: date) -> dict[str, int]:
    """The two pregnancy numbers, likewise folded into one statement."""
    pregnant = Crossing.status == CrossingStatus.pregnant
    row = (
        await session.execute(
            select(
                func.count(func.distinct(Crossing.dam_id))
                .filter(pregnant)
                .label("pregnant_now"),
                _tally(
                    pregnant
                    & (
                        Crossing.expected_kidding_date
                        <= today + timedelta(days=UPCOMING_WINDOW_DAYS)
                    )
                ).label("due_next_30_days"),
            ).select_from(Crossing)
        )
    ).mappings().one()
    return {key: value or 0 for key, value in row.items()}


async def build() -> DashboardOut:
    """Assemble the landing page.

    Every part below reads a different slice of the farm and none depends on
    another, so they are issued together rather than in a queue — the page then
    waits once for the database instead of seven times.
    """
    today = date.today()
    months = recent_months(TREND_MONTHS, today)

    (
        goat_counts,
        crossing_counts,
        trends,
        top_does,
        monthly_expenses,
        upcoming,
        balance,
    ) = await gather_reads(
        [
            lambda s: _goat_cards(s, today),
            lambda s: _crossing_cards(s, today),
            lambda s: _goat_trends(s, months),
            _top_does,
            lambda s: _monthly_expenses(s, months),
            lambda s: _upcoming(s, today),
            lambda s: expense_service.load_balance(s, settings.currency_symbol),
        ]
    )

    cards = DashboardCards(**goat_counts, **crossing_counts)
    herd_growth, births_per_month, breed_distribution = trends

    return DashboardOut(
        cards=cards,
        herd_growth=herd_growth,
        births_per_month=births_per_month,
        # Identical to grouping the active herd by sex, but the card query has
        # already counted exactly that — no reason to ask the database twice.
        sex_distribution=[
            NamedCount(label=label, value=goat_counts[key])
            for label, key in (("Does", "does"), ("Bucks", "bucks"))
            if goat_counts[key]
        ],
        breed_distribution=breed_distribution,
        top_does=top_does,
        monthly_expenses=monthly_expenses,
        upcoming_kiddings=upcoming,
        balance=balance,
        currency_symbol=settings.currency_symbol,
    )


async def _goat_trends(
    session: AsyncSession, months: list[str]
) -> tuple[list[TrendPoint], list[TrendPoint], list[NamedCount]]:
    """Herd growth, births per month and the breed mix — one trip, three charts.

    All three group the same table, just on different keys, so they travel
    together as a ``UNION ALL`` tagged by ``kind`` and get split apart here.
    """
    created_period = func.to_char(Goat.created_at, "YYYY-MM")
    born_period = func.to_char(Goat.date_of_birth, "YYYY-MM")
    active = Goat.status == GoatStatus.active

    growth = select(
        literal("growth").label("kind"),
        created_period.label("bucket"),
        func.count().label("value"),
    ).group_by(created_period)

    births = (
        select(literal("birth"), born_period, func.count())
        .where(Goat.date_of_birth.isnot(None), born_period.in_(months))
        .group_by(born_period)
    )

    breeds = (
        select(literal("breed"), Breed.name, func.count(Goat.id))
        .select_from(Breed)
        .join(Goat, Goat.breed_id == Breed.id)
        .where(active)
        .group_by(Breed.name)
    )

    rows = (await session.execute(growth.union_all(births, breeds))).all()

    growth_rows: dict[str, int] = {}
    birth_rows: dict[str, int] = {}
    breed_rows: list[tuple[str, int]] = []
    for kind, bucket, value in rows:
        if kind == "growth":
            growth_rows[bucket] = value
        elif kind == "birth":
            birth_rows[bucket] = value
        else:
            breed_rows.append((bucket, value))

    # Everything added before the window still counts towards the running total.
    running = sum(count for month, count in growth_rows.items() if month < months[0])
    herd_growth = []
    for month in months:
        running += growth_rows.get(month, 0)
        herd_growth.append(
            TrendPoint(period=month, label=month_label(month), value=float(running))
        )

    births_per_month = [
        TrendPoint(
            period=month, label=month_label(month), value=float(birth_rows.get(month, 0))
        )
        for month in months
    ]

    breed_distribution = [
        NamedCount(label=name, value=count)
        for name, count in sorted(breed_rows, key=lambda row: (-row[1], row[0]))
    ]
    return herd_growth, births_per_month, breed_distribution


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
