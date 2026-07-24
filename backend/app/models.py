"""SQLAlchemy models mirroring supabase/migrations/0001_init.sql."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Enums (values must match the Postgres enum types)
# ---------------------------------------------------------------------------
class GoatSex(str, Enum):
    male = "male"
    female = "female"


class GoatStatus(str, Enum):
    active = "active"
    sold = "sold"
    expired = "expired"


class AcquisitionType(str, Enum):
    bred = "bred"
    purchased = "purchased"


class CrossingStatus(str, Enum):
    pregnant = "pregnant"
    kidded = "kidded"
    aborted = "aborted"
    failed = "failed"


class HealthRecordType(str, Enum):
    illness = "illness"
    treatment = "treatment"
    deworming = "deworming"
    checkup = "checkup"


def _enum(python_enum: type[Enum], name: str) -> SAEnum:
    return SAEnum(
        python_enum,
        name=name,
        values_callable=lambda members: [m.value for m in members],
        native_enum=True,
    )


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------
class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Breed(Base):
    __tablename__ = "breeds"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    next_seq: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Goat(Base):
    __tablename__ = "goats"

    id: Mapped[uuid.UUID] = _uuid_pk()
    tag_number: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(Text)
    breed_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("breeds.id"), nullable=False
    )
    sex: Mapped[GoatSex] = mapped_column(_enum(GoatSex, "goat_sex"), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date)

    acquisition_type: Mapped[AcquisitionType] = mapped_column(
        _enum(AcquisitionType, "acquisition_type"),
        nullable=False,
        default=AcquisitionType.bred,
    )
    purchase_date: Mapped[date | None] = mapped_column(Date)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    purchased_from: Mapped[str | None] = mapped_column(Text)

    status: Mapped[GoatStatus] = mapped_column(
        _enum(GoatStatus, "goat_status"), nullable=False, default=GoatStatus.active
    )
    expired_on: Mapped[date | None] = mapped_column(Date)
    death_cause: Mapped[str | None] = mapped_column(Text)

    dam_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("goats.id", ondelete="SET NULL")
    )
    sire_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("goats.id", ondelete="SET NULL")
    )
    crossing_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("crossings.id", ondelete="SET NULL")
    )

    color: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    breed: Mapped[Breed] = relationship(lazy="joined")
    dam: Mapped[Goat | None] = relationship(
        remote_side=[id], foreign_keys=[dam_id], lazy="selectin"
    )
    sire: Mapped[Goat | None] = relationship(
        remote_side=[id], foreign_keys=[sire_id], lazy="selectin"
    )


class Crossing(Base):
    __tablename__ = "crossings"

    id: Mapped[uuid.UUID] = _uuid_pk()
    dam_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("goats.id", ondelete="CASCADE"), nullable=False
    )
    sire_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("goats.id", ondelete="SET NULL")
    )
    crossing_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_kidding_date: Mapped[date] = mapped_column(Date, nullable=False)
    actual_kidding_date: Mapped[date | None] = mapped_column(Date)
    number_of_kids: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[CrossingStatus] = mapped_column(
        _enum(CrossingStatus, "crossing_status"),
        nullable=False,
        default=CrossingStatus.pregnant,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    dam: Mapped[Goat] = relationship(foreign_keys=[dam_id], lazy="joined")
    sire: Mapped[Goat | None] = relationship(foreign_keys=[sire_id], lazy="joined")


class Vaccination(Base):
    __tablename__ = "vaccinations"

    id: Mapped[uuid.UUID] = _uuid_pk()
    goat_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("goats.id", ondelete="CASCADE"), nullable=False
    )
    vaccine_name: Mapped[str] = mapped_column(Text, nullable=False)
    date_administered: Mapped[date] = mapped_column(Date, nullable=False)
    dose: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    goat: Mapped[Goat] = relationship(lazy="joined")


class Weight(Base):
    __tablename__ = "weights"

    id: Mapped[uuid.UUID] = _uuid_pk()
    goat_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("goats.id", ondelete="CASCADE"), nullable=False
    )
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    measured_on: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    goat: Mapped[Goat] = relationship(lazy="joined")


class HealthRecord(Base):
    __tablename__ = "health_records"

    id: Mapped[uuid.UUID] = _uuid_pk()
    goat_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("goats.id", ondelete="CASCADE"), nullable=False
    )
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    type: Mapped[HealthRecordType] = mapped_column(
        _enum(HealthRecordType, "health_record_type"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    medication: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    goat: Mapped[Goat] = relationship(lazy="joined")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = _uuid_pk()
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_by: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    goat_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("goats.id", ondelete="SET NULL")
    )
    category: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    payer: Mapped[Profile] = relationship(foreign_keys=[paid_by], lazy="joined")
    goat: Mapped[Goat | None] = relationship(lazy="joined")


class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[uuid.UUID] = _uuid_pk()
    from_user: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    to_user: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    settled_on: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    payer: Mapped[Profile] = relationship(foreign_keys=[from_user], lazy="joined")
    payee: Mapped[Profile] = relationship(foreign_keys=[to_user], lazy="joined")
