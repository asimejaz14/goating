"""Crossing (mating) helpers — gestation maths and the read model."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Crossing, CrossingStatus, Goat
from app.schemas import CrossingOut
from app.services import goats as goat_service


def expected_kidding(crossing_date: date, gestation_days: int | None = None) -> date:
    """Estimated kidding date — 150 days after the crossing by default."""
    return crossing_date + timedelta(days=gestation_days or settings.gestation_days)


def days_remaining(expected: date, today: date | None = None) -> int:
    """Days until the doe is due. Negative once she is overdue."""
    return (expected - (today or date.today())).days


async def registered_kids(
    session: AsyncSession, crossing_ids: Sequence[UUID]
) -> dict[UUID, int]:
    """How many kids from each crossing have actually been added to the portal.

    Distinct from ``number_of_kids``, which is what the user reported at
    kidding — the gap between the two is what drives "3 kids born, 1 still to
    register".
    """
    if not crossing_ids:
        return {}
    rows = await session.execute(
        select(Goat.crossing_id, func.count())
        .where(Goat.crossing_id.in_(crossing_ids))
        .group_by(Goat.crossing_id)
    )
    return {row[0]: row[1] for row in rows}


async def to_out(
    session: AsyncSession, crossings: Sequence[Crossing], today: date | None = None
) -> list[CrossingOut]:
    if not crossings:
        return []

    today = today or date.today()
    kids = await registered_kids(session, [crossing.id for crossing in crossings])

    parents = [
        goat
        for crossing in crossings
        for goat in (crossing.dam, crossing.sire)
        if goat is not None
    ]
    summaries = {
        goat.id: summary
        for goat, summary in zip(
            parents, await goat_service.to_summaries(session, parents, today), strict=True
        )
    }

    items: list[CrossingOut] = []
    for crossing in crossings:
        item = CrossingOut.model_validate(crossing)
        item.dam = summaries.get(crossing.dam_id)
        item.sire = summaries.get(crossing.sire_id)
        item.kids_registered = kids.get(crossing.id, 0)

        if crossing.status == CrossingStatus.pregnant:
            remaining = days_remaining(crossing.expected_kidding_date, today)
            item.days_remaining = remaining
            item.is_overdue = remaining < 0
        items.append(item)

    return items
