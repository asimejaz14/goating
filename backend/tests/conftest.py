"""Shared test fixtures.

These tests are deliberately cloud-free: everything here exercises pure logic or
compiled SQL, so the suite runs with no Supabase project and no network.
"""

import os

# Set before anything imports app.config. A throwaway signing secret lets the
# auth tests exercise real signature verification; DATABASE_URL is deliberately
# left unset so any route that reaches the database before checking auth fails
# loudly instead of quietly passing.
os.environ.setdefault("JWT_SECRET", "test-secret-not-a-real-key")

from datetime import date  # noqa: E402
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.models import AcquisitionType, GoatSex, GoatStatus


class FakeGoat(SimpleNamespace):
    """A stand-in for the ORM row, carrying only what the services read."""


def make_goat(
    tag_number: str = "BGF-MC-01",
    *,
    goat_id: UUID | None = None,
    name: str | None = None,
    sex: GoatSex = GoatSex.female,
    breed_name: str | None = "Makhi Cheeni",
    dam_id: UUID | None = None,
    sire_id: UUID | None = None,
    date_of_birth: date | None = None,
    status: GoatStatus = GoatStatus.active,
    acquisition_type: AcquisitionType = AcquisitionType.bred,
) -> FakeGoat:
    return FakeGoat(
        id=goat_id or uuid4(),
        tag_number=tag_number,
        name=name,
        sex=sex,
        breed=SimpleNamespace(name=breed_name) if breed_name else None,
        photo_url=None,
        date_of_birth=date_of_birth,
        status=status,
        acquisition_type=acquisition_type,
        dam_id=dam_id,
        sire_id=sire_id,
    )


class FakeResult:
    """Mimics the slice of SQLAlchemy's Result the services actually touch."""

    def __init__(self, rows):
        self._rows = list(rows)

    def scalars(self):
        return self

    def unique(self):
        return self

    def all(self):
        return list(self._rows)

    def __iter__(self):
        return iter(self._rows)


class FakeSession:
    """Serves goats from an in-memory dict, and counts the round-trips.

    The query count is part of the contract under test: the pedigree walk must
    cost one query per generation, not one per node.
    """

    def __init__(self, goats: dict[UUID, FakeGoat] | None = None):
        self.goats = goats or {}
        self.queries = 0

    async def execute(self, stmt):
        self.queries += 1
        wanted = self._wanted_ids(stmt)
        # `select(Goat)` selects one entity; `select(Goat.dam_id, Goat.sire_id)`
        # — the cycle check — selects two columns.
        if len(stmt.column_descriptions) == 2:
            return FakeResult(
                (self.goats[gid].dam_id, self.goats[gid].sire_id)
                for gid in wanted
                if gid in self.goats
            )
        return FakeResult(self.goats[gid] for gid in wanted if gid in self.goats)

    @staticmethod
    def _wanted_ids(stmt) -> list[UUID]:
        """Pull the ``id IN (...)`` values back out of the compiled statement.

        ``in_`` compiles to an expanding bind parameter, so the bound value is a
        sequence rather than a scalar — flatten either shape.
        """
        wanted: list[UUID] = []
        for value in stmt.compile().params.values():
            candidates = value if isinstance(value, (list, tuple, set)) else [value]
            wanted.extend(item for item in candidates if isinstance(item, UUID))
        return wanted


@pytest.fixture
def make_session():
    def _make(*goats: FakeGoat) -> FakeSession:
        return FakeSession({goat.id: goat for goat in goats})

    return _make
