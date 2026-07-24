"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.pagination import Page
from app.models import (
    AcquisitionType,
    CrossingStatus,
    GoatSex,
    GoatStatus,
    HealthRecordType,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------
class BreedOut(ORMModel):
    id: UUID
    name: str
    code: str
    description: str | None = None
    goat_count: int = 0


class ProfileOut(ORMModel):
    id: UUID
    display_name: str
    email: str


# ---------------------------------------------------------------------------
# Goats
# ---------------------------------------------------------------------------
class GoatSummary(ORMModel):
    """Shape used by list cards, pickers and relationship links."""

    id: UUID
    tag_number: str
    name: str | None = None
    breed_id: UUID
    breed_name: str | None = None
    breed_code: str | None = None
    sex: GoatSex
    date_of_birth: date | None = None
    age_months: int | None = None
    status: GoatStatus
    acquisition_type: AcquisitionType
    photo_url: str | None = None
    color: str | None = None
    is_pregnant: bool = False
    kids_count: int = 0


class GoatDetail(GoatSummary):
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    purchased_from: str | None = None
    expired_on: date | None = None
    death_cause: str | None = None
    dam_id: UUID | None = None
    sire_id: UUID | None = None
    crossing_id: UUID | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    dam: GoatSummary | None = None
    sire: GoatSummary | None = None


class GoatCreate(BaseModel):
    breed_id: UUID
    sex: GoatSex
    name: str | None = Field(None, max_length=120)
    date_of_birth: date | None = None
    acquisition_type: AcquisitionType = AcquisitionType.bred
    purchase_date: date | None = None
    purchase_price: Decimal | None = Field(None, ge=0)
    purchased_from: str | None = Field(None, max_length=160)
    dam_id: UUID | None = None
    sire_id: UUID | None = None
    crossing_id: UUID | None = None
    color: str | None = Field(None, max_length=60)
    photo_url: str | None = None
    notes: str | None = None


class GoatUpdate(BaseModel):
    """Every field optional — the tag number is never editable."""

    name: str | None = Field(None, max_length=120)
    breed_id: UUID | None = None
    sex: GoatSex | None = None
    date_of_birth: date | None = None
    acquisition_type: AcquisitionType | None = None
    purchase_date: date | None = None
    purchase_price: Decimal | None = Field(None, ge=0)
    purchased_from: str | None = Field(None, max_length=160)
    status: GoatStatus | None = None
    dam_id: UUID | None = None
    sire_id: UUID | None = None
    color: str | None = Field(None, max_length=60)
    photo_url: str | None = None
    notes: str | None = None


class LinkParentsIn(BaseModel):
    dam_id: UUID | None = None
    sire_id: UUID | None = None


class ExpireGoatIn(BaseModel):
    expired_on: date | None = None
    death_cause: str | None = Field(None, max_length=250)


# ---------------------------------------------------------------------------
# Crossings
# ---------------------------------------------------------------------------
class CrossingOut(ORMModel):
    id: UUID
    dam_id: UUID
    sire_id: UUID | None = None
    crossing_date: date
    expected_kidding_date: date
    actual_kidding_date: date | None = None
    number_of_kids: int | None = None
    status: CrossingStatus
    notes: str | None = None
    created_at: datetime
    dam: GoatSummary | None = None
    sire: GoatSummary | None = None
    days_remaining: int | None = None
    is_overdue: bool = False
    kids_registered: int = 0


class CrossingCreate(BaseModel):
    dam_id: UUID
    sire_id: UUID | None = None
    crossing_date: date
    expected_kidding_date: date | None = None
    notes: str | None = None


class CrossingUpdate(BaseModel):
    sire_id: UUID | None = None
    crossing_date: date | None = None
    expected_kidding_date: date | None = None
    status: CrossingStatus | None = None
    notes: str | None = None


class RecordKiddingIn(BaseModel):
    """Actual kidding is entered by hand and may differ from the estimate."""

    actual_kidding_date: date
    number_of_kids: int = Field(..., ge=0)
    notes: str | None = None


# ---------------------------------------------------------------------------
# Health / husbandry records
# ---------------------------------------------------------------------------
class VaccinationOut(ORMModel):
    id: UUID
    goat_id: UUID
    vaccine_name: str
    date_administered: date
    dose: str | None = None
    notes: str | None = None
    created_at: datetime
    goat: GoatSummary | None = None


class VaccinationCreate(BaseModel):
    goat_id: UUID
    vaccine_name: str = Field(..., min_length=1, max_length=120)
    date_administered: date
    dose: str | None = Field(None, max_length=60)
    notes: str | None = None


class WeightOut(ORMModel):
    id: UUID
    goat_id: UUID
    weight_kg: Decimal
    measured_on: date
    notes: str | None = None
    created_at: datetime


class WeightCreate(BaseModel):
    goat_id: UUID
    weight_kg: Decimal = Field(..., gt=0, le=500)
    measured_on: date
    notes: str | None = None


class HealthRecordOut(ORMModel):
    id: UUID
    goat_id: UUID
    record_date: date
    type: HealthRecordType
    description: str
    medication: str | None = None
    notes: str | None = None
    created_at: datetime
    goat: GoatSummary | None = None


class HealthRecordCreate(BaseModel):
    goat_id: UUID
    record_date: date
    type: HealthRecordType
    description: str = Field(..., min_length=1)
    medication: str | None = Field(None, max_length=160)
    notes: str | None = None


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------
class ExpenseOut(ORMModel):
    id: UUID
    expense_date: date
    name: str
    amount: Decimal
    paid_by: UUID
    payer_name: str | None = None
    goat_id: UUID | None = None
    goat_tag: str | None = None
    category: str | None = None
    notes: str | None = None
    created_at: datetime


class ExpenseCreate(BaseModel):
    expense_date: date
    name: str = Field(..., min_length=1, max_length=160)
    amount: Decimal = Field(..., gt=0)
    paid_by: UUID | None = None  # defaults to the signed-in user
    goat_id: UUID | None = None
    category: str | None = Field(None, max_length=64)
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    expense_date: date | None = None
    name: str | None = Field(None, min_length=1, max_length=160)
    amount: Decimal | None = Field(None, gt=0)
    paid_by: UUID | None = None
    goat_id: UUID | None = None
    category: str | None = Field(None, max_length=64)
    notes: str | None = None


class PayerTotal(BaseModel):
    user_id: UUID
    display_name: str
    total: Decimal


class ExpenseSummary(BaseModel):
    """Totals for the *entire* filtered set, not just the visible page."""

    total_amount: Decimal
    count: int
    per_payer: list[PayerTotal] = []


class ExpensePage(Page[ExpenseOut]):
    summary: ExpenseSummary


class BalanceEntry(BaseModel):
    user_id: UUID
    display_name: str
    paid: Decimal
    share: Decimal
    settlements_paid: Decimal
    settlements_received: Decimal
    net: Decimal  # positive => this person is owed money


class BalanceOut(BaseModel):
    total_expenses: Decimal
    per_person: list[BalanceEntry]
    settled: bool
    debtor_id: UUID | None = None
    debtor_name: str | None = None
    creditor_id: UUID | None = None
    creditor_name: str | None = None
    amount_owed: Decimal = Decimal("0")
    message: str


class MonthlyBucket(BaseModel):
    month: str  # YYYY-MM
    label: str  # "Jul 2026"
    total: Decimal
    count: int
    per_payer: list[PayerTotal] = []


class SettleUpIn(BaseModel):
    amount: Decimal | None = Field(None, gt=0)  # defaults to the full balance
    settled_on: date | None = None
    note: str | None = Field(None, max_length=250)


class SettlementOut(ORMModel):
    id: UUID
    from_user: UUID
    from_name: str | None = None
    to_user: UUID
    to_name: str | None = None
    amount: Decimal
    settled_on: date
    note: str | None = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Pedigree
# ---------------------------------------------------------------------------
class PedigreeNode(BaseModel):
    """A node in the ancestor tree.

    Unknown ancestors are returned as placeholders carrying the descendant's
    breed name, so the tree renders complete instead of stopping short.
    """

    id: UUID | None = None
    tag_number: str | None = None
    name: str | None = None
    sex: GoatSex | None = None
    breed_name: str | None = None
    photo_url: str | None = None
    date_of_birth: date | None = None
    status: GoatStatus | None = None
    relation: str | None = None  # "dam" | "sire" | None for the root
    generation: int = 0
    is_placeholder: bool = False
    dam: PedigreeNode | None = None
    sire: PedigreeNode | None = None


PedigreeNode.model_rebuild()


class PedigreeOut(BaseModel):
    root: PedigreeNode
    generations: int
    known_ancestors: int
    total_slots: int


# ---------------------------------------------------------------------------
# Goat 360 history
# ---------------------------------------------------------------------------
class TimelineEvent(BaseModel):
    date: date
    kind: str  # born | purchased | crossed | kidded | vaccinated | weighed | health | expense | expired | sold
    title: str
    detail: str | None = None
    ref_id: UUID | None = None


class SectionPreview(BaseModel):
    """Capped preview of a related list, with the full count for 'View all'."""

    items: list
    total: int


class GoatHistoryOut(BaseModel):
    goat: GoatDetail
    kids: list[GoatSummary]
    kids_total: int
    crossings: list[CrossingOut]
    crossings_total: int
    vaccinations: list[VaccinationOut]
    vaccinations_total: int
    weights: list[WeightOut]
    weights_total: int
    health_records: list[HealthRecordOut]
    health_records_total: int
    expenses: list[ExpenseOut]
    expenses_total: int
    expenses_amount: Decimal
    timeline: list[TimelineEvent]
    pedigree: PedigreeNode | None = None


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class DashboardCards(BaseModel):
    total_goats: int
    does: int
    bucks: int
    kids_under_6_months: int
    bred_count: int
    purchased_count: int
    pregnant_now: int
    due_next_30_days: int
    kids_born_this_year: int
    expired_count: int
    sold_count: int


class NamedCount(BaseModel):
    label: str
    value: int


class TrendPoint(BaseModel):
    period: str
    label: str
    value: float


class UpcomingKidding(BaseModel):
    crossing_id: UUID
    goat_id: UUID
    tag_number: str
    name: str | None = None
    expected_kidding_date: date
    days_remaining: int
    is_overdue: bool


class TopDoe(BaseModel):
    goat_id: UUID
    tag_number: str
    name: str | None = None
    kids: int


class DashboardOut(BaseModel):
    cards: DashboardCards
    herd_growth: list[TrendPoint]
    births_per_month: list[TrendPoint]
    sex_distribution: list[NamedCount]
    breed_distribution: list[NamedCount]
    top_does: list[TopDoe]
    monthly_expenses: list[TrendPoint]
    upcoming_kiddings: list[UpcomingKidding]
    balance: BalanceOut | None = None
    currency_symbol: str


class FarmSettingsOut(BaseModel):
    farm_prefix: str
    gestation_days: int
    currency_code: str
    currency_symbol: str
