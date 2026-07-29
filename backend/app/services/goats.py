"""Goat read-model helpers.

List endpoints need a few facts that do not live on the ``goats`` row itself —
age, whether the doe is currently pregnant, and how many kids she has produced.
Computing those per goat would mean a query per card, so everything here works
on a **batch** of goats and issues at most two extra queries regardless of page
size.
"""

from __future__ import annotations

from calendar import monthrange
from collections.abc import Sequence
from datetime import date
from uuid import UUID

from sqlalchemy import func, literal, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Crossing, CrossingStatus, Goat
from app.schemas import GoatDetail, GoatSummary


def age_in_months(date_of_birth: date | None, today: date | None = None) -> int | None:
    """Whole months lived. ``None`` when the birth date was never recorded."""
    if date_of_birth is None:
        return None
    today = today or date.today()
    if date_of_birth > today:
        return 0
    months = (today.year - date_of_birth.year) * 12 + (today.month - date_of_birth.month)
    if today.day < date_of_birth.day:
        months -= 1
    return max(0, months)


def months_before(anchor: date, months: int) -> date:
    """The date ``months`` whole months before ``anchor``.

    Used to turn an "age in months" filter into a birth-date bound, which lets
    the index on ``date_of_birth`` do the work.
    """
    total = anchor.year * 12 + (anchor.month - 1) - months
    year, month_index = divmod(total, 12)
    month = month_index + 1
    day = min(anchor.day, monthrange(year, month)[1])
    return date(year, month, day)


async def kids_counts(session: AsyncSession, goat_ids: Sequence[UUID]) -> dict[UUID, int]:
    """Offspring count per goat, counting each goat as dam *and* as sire."""
    if not goat_ids:
        return {}

    as_dam = select(Goat.dam_id.label("parent_id")).where(Goat.dam_id.in_(goat_ids))
    as_sire = select(Goat.sire_id.label("parent_id")).where(Goat.sire_id.in_(goat_ids))
    parents = union_all(as_dam, as_sire).subquery()

    rows = await session.execute(
        select(parents.c.parent_id, func.count()).group_by(parents.c.parent_id)
    )
    return {row[0]: row[1] for row in rows}


async def pregnant_ids(session: AsyncSession, goat_ids: Sequence[UUID]) -> set[UUID]:
    """Which of these does have an open (still pregnant) crossing."""
    if not goat_ids:
        return set()
    rows = await session.execute(
        select(Crossing.dam_id)
        .where(
            Crossing.dam_id.in_(goat_ids),
            Crossing.status == CrossingStatus.pregnant,
        )
        .distinct()
    )
    return {row[0] for row in rows}


class HerdFacts:
    """Kid counts and open pregnancies for a batch of goats.

    A page that shows several groups of goats at once — a doe, her kids and her
    crossing partners — would otherwise load these two facts once per group. The
    lookups are plain dictionary reads, so loading them once for every goat on
    the page gives byte-identical output for two round trips instead of two per
    group.
    """

    __slots__ = ("kids", "pregnant")

    def __init__(self, kids: dict[UUID, int], pregnant: set[UUID]) -> None:
        self.kids = kids
        self.pregnant = pregnant


async def load_facts(session: AsyncSession, goat_ids: Sequence[UUID]) -> HerdFacts:
    """Both derived facts for a batch of goats, in a single statement.

    Offspring counts and open pregnancies come from different tables, so they
    travel together as a tagged ``UNION ALL`` rather than as two round trips.
    """
    ids = list({goat_id for goat_id in goat_ids if goat_id is not None})
    if not ids:
        return HerdFacts(kids={}, pregnant=set())

    as_dam = select(Goat.dam_id.label("parent_id")).where(Goat.dam_id.in_(ids))
    as_sire = select(Goat.sire_id.label("parent_id")).where(Goat.sire_id.in_(ids))
    parents = union_all(as_dam, as_sire).subquery()

    kid_counts = select(
        literal("kids").label("kind"),
        parents.c.parent_id.label("goat_id"),
        func.count().label("value"),
    ).group_by(parents.c.parent_id)

    expecting = (
        select(literal("pregnant"), Crossing.dam_id, literal(0))
        .where(
            Crossing.dam_id.in_(ids),
            Crossing.status == CrossingStatus.pregnant,
        )
        .distinct()
    )

    kids: dict[UUID, int] = {}
    pregnant: set[UUID] = set()
    for kind, goat_id, value in await session.execute(kid_counts.union_all(expecting)):
        if kind == "kids":
            kids[goat_id] = value
        else:
            pregnant.add(goat_id)
    return HerdFacts(kids=kids, pregnant=pregnant)


async def to_summaries(
    session: AsyncSession,
    goats: Sequence[Goat],
    today: date | None = None,
    facts: HerdFacts | None = None,
) -> list[GoatSummary]:
    """Map ORM rows onto the card shape used by lists and pickers.

    Pass ``facts`` when the caller has already loaded them for a wider set of
    goats; otherwise they are loaded for exactly these ones.
    """
    if not goats:
        return []

    today = today or date.today()
    facts = facts or await load_facts(session, [goat.id for goat in goats])

    return [_summary(goat, facts.kids, facts.pregnant, today) for goat in goats]


async def to_detail(
    session: AsyncSession,
    goat: Goat,
    today: date | None = None,
    facts: HerdFacts | None = None,
) -> GoatDetail:
    """Full profile, including the (already loaded) parent links."""
    today = today or date.today()
    parents = [parent for parent in (goat.dam, goat.sire) if parent is not None]
    facts = facts or await load_facts(
        session, [goat.id, *(parent.id for parent in parents)]
    )

    parent_summaries = {
        parent.id: summary
        for parent, summary in zip(
            parents,
            await to_summaries(session, parents, today, facts),
            strict=True,
        )
    }

    detail = GoatDetail.model_validate(goat)
    _apply_derived(detail, goat, facts.kids, facts.pregnant, today)
    detail.dam = parent_summaries.get(goat.dam_id)
    detail.sire = parent_summaries.get(goat.sire_id)
    return detail


def _summary(
    goat: Goat,
    kids: dict[UUID, int],
    pregnant: set[UUID],
    today: date,
) -> GoatSummary:
    summary = GoatSummary.model_validate(goat)
    _apply_derived(summary, goat, kids, pregnant, today)
    return summary


def _apply_derived(
    target: GoatSummary,
    goat: Goat,
    kids: dict[UUID, int],
    pregnant: set[UUID],
    today: date,
) -> None:
    target.breed_name = goat.breed.name if goat.breed else None
    target.breed_code = goat.breed.code if goat.breed else None
    target.age_months = age_in_months(goat.date_of_birth, today)
    target.kids_count = kids.get(goat.id, 0)
    target.is_pregnant = goat.id in pregnant
