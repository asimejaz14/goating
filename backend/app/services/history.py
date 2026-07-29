"""The goat 360 view — one goat's whole life in a single response.

Every section is a **capped preview** with its true total alongside, so the page
stays fast for a doe with years of history while the UI can still say
"5 of 23 — view all". The deep links from those buttons land on the matching
list page pre-filtered by ``goat_id``.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import gather_reads
from app.models import (
    AcquisitionType,
    Crossing,
    Expense,
    Goat,
    GoatStatus,
    HealthRecord,
    Vaccination,
    Weight,
)
from app.schemas import (
    CrossingOut,
    ExpenseOut,
    GoatHistoryOut,
    HealthRecordOut,
    TimelineEvent,
    VaccinationOut,
    WeightOut,
)
from app.services import crossings as crossing_service
from app.services import goats as goat_service
from app.services import pedigree

PREVIEW_LIMIT = 5
# Weights drive a growth chart, so a preview of five would make a stub of a
# curve — this section gets a longer window than the rest.
WEIGHT_LIMIT = 24
TIMELINE_LIMIT = 60
MINI_PEDIGREE_GENERATIONS = 3


def _total(stmt: Select):
    """A section's true total, as a scalar subquery rather than its own query."""
    return (
        select(func.count())
        .select_from(stmt.order_by(None).subquery())
        .scalar_subquery()
    )


async def build(session: AsyncSession, goat: Goat) -> GoatHistoryOut:
    today = date.today()

    kids_stmt = select(Goat).where(
        (Goat.dam_id == goat.id) | (Goat.sire_id == goat.id)
    )
    crossings_stmt = select(Crossing).where(
        (Crossing.dam_id == goat.id) | (Crossing.sire_id == goat.id)
    )
    vaccinations_stmt = select(Vaccination).where(Vaccination.goat_id == goat.id)
    weights_stmt = select(Weight).where(Weight.goat_id == goat.id)
    health_stmt = select(HealthRecord).where(HealthRecord.goat_id == goat.id)
    expenses_stmt = select(Expense).where(Expense.goat_id == goat.id)

    # Six section previews, the section totals and the mini pedigree — eight
    # unrelated reads of one goat's records. Issued together they cost about one
    # database wait instead of eight, which is most of this page's response time
    # once the database is across a network.
    def preview(stmt: Select):
        async def read(s: AsyncSession):
            return (await s.execute(stmt)).scalars().unique().all()

        return read

    async def read_totals(s: AsyncSession):
        # Seven numbers nothing else depends on, as scalar subqueries in one
        # statement rather than seven separate counts.
        return (
            await s.execute(
                select(
                    _total(kids_stmt).label("kids"),
                    _total(crossings_stmt).label("crossings"),
                    _total(vaccinations_stmt).label("vaccinations"),
                    _total(weights_stmt).label("weights"),
                    _total(health_stmt).label("health_records"),
                    _total(expenses_stmt).label("expenses"),
                    select(func.coalesce(func.sum(Expense.amount), 0))
                    .where(Expense.goat_id == goat.id)
                    .scalar_subquery()
                    .label("expenses_amount"),
                )
            )
        ).mappings().one()

    (
        kid_rows,
        crossing_rows,
        vaccination_rows,
        weight_rows,
        health_rows,
        expense_rows,
        totals,
        mini_pedigree,
    ) = await gather_reads(
        [
            preview(
                kids_stmt.order_by(
                    Goat.date_of_birth.desc().nulls_last(), Goat.id.desc()
                ).limit(PREVIEW_LIMIT)
            ),
            preview(
                crossings_stmt.order_by(Crossing.crossing_date.desc()).limit(
                    PREVIEW_LIMIT
                )
            ),
            preview(
                vaccinations_stmt.order_by(
                    Vaccination.date_administered.desc()
                ).limit(PREVIEW_LIMIT)
            ),
            preview(
                weights_stmt.order_by(Weight.measured_on.desc()).limit(WEIGHT_LIMIT)
            ),
            preview(
                health_stmt.order_by(HealthRecord.record_date.desc()).limit(
                    PREVIEW_LIMIT
                )
            ),
            preview(
                expenses_stmt.order_by(Expense.expense_date.desc()).limit(
                    PREVIEW_LIMIT
                )
            ),
            read_totals,
            lambda s: pedigree.build_tree(s, goat, MINI_PEDIGREE_GENERATIONS),
        ]
    )

    # Every goat this page will render: the subject, her kids, her parents and
    # both sides of each crossing. Loading their derived facts once keeps the
    # three read-model builders below from each going back for the same two.
    on_page = [
        goat.id,
        goat.dam_id,
        goat.sire_id,
        *(kid.id for kid in kid_rows),
        *(crossing.dam_id for crossing in crossing_rows),
        *(crossing.sire_id for crossing in crossing_rows),
    ]
    crossing_ids = [crossing.id for crossing in crossing_rows]

    # The last two reads. Both need the rows above, so they could not join the
    # batch before — but they do not need each other, so they go together.
    facts, registered = await gather_reads(
        [
            lambda s: goat_service.load_facts(s, on_page),
            lambda s: crossing_service.registered_kids(s, crossing_ids),
        ]
    )

    # Everything below is assembled from what is already in hand.
    kids = await goat_service.to_summaries(session, list(kid_rows), today, facts)
    crossings = await crossing_service.to_out(
        session, list(crossing_rows), today, facts, registered
    )
    vaccinations = [VaccinationOut.model_validate(row) for row in vaccination_rows]
    weights = [WeightOut.model_validate(row) for row in weight_rows]
    health_records = [HealthRecordOut.model_validate(row) for row in health_rows]

    expenses = []
    for row in expense_rows:
        item = ExpenseOut.model_validate(row)
        item.payer_name = row.payer.display_name if row.payer else None
        item.goat_tag = goat.tag_number
        expenses.append(item)

    return GoatHistoryOut(
        goat=await goat_service.to_detail(session, goat, today, facts),
        kids=kids,
        kids_total=totals["kids"],
        crossings=crossings,
        crossings_total=totals["crossings"],
        vaccinations=vaccinations,
        vaccinations_total=totals["vaccinations"],
        weights=weights,
        weights_total=totals["weights"],
        health_records=health_records,
        health_records_total=totals["health_records"],
        expenses=expenses,
        expenses_total=totals["expenses"],
        expenses_amount=Decimal(totals["expenses_amount"] or 0),
        timeline=build_timeline(
            goat, kids, crossings, vaccinations, weights, health_records, expenses
        ),
        pedigree=mini_pedigree.root,
    )


def build_timeline(
    goat: Goat,
    kids: list,
    crossings: list[CrossingOut],
    vaccinations: list[VaccinationOut],
    weights: list[WeightOut],
    health_records: list[HealthRecordOut],
    expenses: list[ExpenseOut],
) -> list[TimelineEvent]:
    """Merge every section into one reverse-chronological life story."""
    events: list[TimelineEvent] = []

    if goat.date_of_birth:
        events.append(
            TimelineEvent(
                date=goat.date_of_birth,
                kind="born",
                title="Born on the farm"
                if goat.acquisition_type == AcquisitionType.bred
                else "Date of birth",
            )
        )
    if goat.acquisition_type == AcquisitionType.purchased and goat.purchase_date:
        events.append(
            TimelineEvent(
                date=goat.purchase_date,
                kind="purchased",
                title="Purchased",
                detail=goat.purchased_from,
            )
        )

    for crossing in crossings:
        partner = crossing.sire if crossing.dam_id == goat.id else crossing.dam
        partner_tag = partner.tag_number if partner else "an unrecorded partner"
        events.append(
            TimelineEvent(
                date=crossing.crossing_date,
                kind="crossed",
                title=f"Crossed with {partner_tag}",
                detail=f"Due {crossing.expected_kidding_date:%d %b %Y}",
                ref_id=crossing.id,
            )
        )
        if crossing.actual_kidding_date:
            kid_count = crossing.number_of_kids or 0
            events.append(
                TimelineEvent(
                    date=crossing.actual_kidding_date,
                    kind="kidded",
                    title=f"Kidded — {kid_count} "
                    f"{'kid' if kid_count == 1 else 'kids'}",
                    ref_id=crossing.id,
                )
            )

    for kid in kids:
        if kid.date_of_birth:
            events.append(
                TimelineEvent(
                    date=kid.date_of_birth,
                    kind="kid_registered",
                    title=f"Kid {kid.tag_number} added to the herd",
                    detail=kid.name,
                    ref_id=kid.id,
                )
            )

    for vaccination in vaccinations:
        events.append(
            TimelineEvent(
                date=vaccination.date_administered,
                kind="vaccinated",
                title=f"Vaccinated — {vaccination.vaccine_name}",
                detail=vaccination.dose,
                ref_id=vaccination.id,
            )
        )

    for weight in weights:
        events.append(
            TimelineEvent(
                date=weight.measured_on,
                kind="weighed",
                title=f"Weighed {weight.weight_kg} kg",
                ref_id=weight.id,
            )
        )

    for record in health_records:
        events.append(
            TimelineEvent(
                date=record.record_date,
                kind="health",
                title=f"{record.type.value.title()} — {record.description}",
                detail=record.medication,
                ref_id=record.id,
            )
        )

    for expense in expenses:
        events.append(
            TimelineEvent(
                date=expense.expense_date,
                kind="expense",
                title=f"Expense — {expense.name}",
                detail=f"{expense.amount}",
                ref_id=expense.id,
            )
        )

    if goat.status == GoatStatus.expired and goat.expired_on:
        events.append(
            TimelineEvent(
                date=goat.expired_on,
                kind="expired",
                title="Marked as expired",
                detail=goat.death_cause,
            )
        )

    events.sort(key=lambda event: event.date, reverse=True)
    return events[:TIMELINE_LIMIT]
