"""Reusable filter and sort builders.

The builders return SQL fragments, so these tests assert on the compiled SQL —
enough to prove the right column and operator were used without a database.
"""

from datetime import date
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.core.filters import (
    apply_sort,
    compact,
    date_range,
    enum_in,
    equals,
    escape_like,
    is_null,
    month_bounds,
    numeric_range,
    text_search,
)
from app.core.pagination import PageParams
from app.models import Goat, GoatStatus

SORTABLE = {
    "tag_number": Goat.tag_number,
    "name": Goat.name,
    "date_of_birth": Goat.date_of_birth,
    "created_at": Goat.created_at,
}


def params(**overrides) -> PageParams:
    base = {"page": 1, "page_size": 20, "sort_by": None, "sort_dir": "desc", "q": None}
    return PageParams(**{**base, **overrides})


def sql(clause) -> str:
    """Render against Postgres — the dialect this API actually runs on."""
    return str(
        clause.compile(
            dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
        )
    )


# ---------------------------------------------------------------------------
# Sorting
# ---------------------------------------------------------------------------


def test_sort_defaults_when_none_requested():
    stmt = apply_sort(select(Goat), params(), SORTABLE, "tag_number")

    assert "ORDER BY goats.tag_number DESC" in str(stmt)


def test_sort_direction_is_honoured():
    stmt = apply_sort(
        select(Goat), params(sort_by="name", sort_dir="asc"), SORTABLE, "tag_number"
    )

    assert "ORDER BY goats.name ASC" in str(stmt)


def test_unknown_sort_column_is_rejected_not_silently_ignored():
    """`sort_by` reaches SQL, so anything off the whitelist must 400."""
    with pytest.raises(HTTPException) as excinfo:
        apply_sort(select(Goat), params(sort_by="password"), SORTABLE, "tag_number")

    assert excinfo.value.status_code == 400
    # The message names the valid options so a UI typo is obvious.
    assert "tag_number" in excinfo.value.detail


def test_sql_injection_attempt_via_sort_by_is_rejected():
    with pytest.raises(HTTPException):
        apply_sort(
            select(Goat),
            params(sort_by="name; drop table goats"),
            SORTABLE,
            "tag_number",
        )


def test_tiebreaker_is_appended_so_paging_cannot_repeat_rows():
    """Sorting on a non-unique column needs a stable secondary key."""
    stmt = apply_sort(
        select(Goat), params(sort_by="date_of_birth"), SORTABLE, "tag_number",
        tiebreaker=Goat.id,
    )

    assert "ORDER BY goats.date_of_birth DESC, goats.id DESC" in str(stmt)


# ---------------------------------------------------------------------------
# Text search
# ---------------------------------------------------------------------------


def test_text_search_spans_every_column_given():
    clause = text_search("shami", Goat.tag_number, Goat.name)
    rendered = sql(clause)

    assert "goats.tag_number ILIKE" in rendered
    assert "goats.name ILIKE" in rendered
    assert " OR " in rendered


def bound_values(clause) -> list:
    return list(clause.compile(dialect=postgresql.dialect()).params.values())


def test_text_search_is_a_contains_match():
    """Typing "MC-01" should find "BGF-MC-01", not just an exact match."""
    assert bound_values(text_search("MC-01", Goat.tag_number)) == ["%MC-01%"]


def test_blank_search_produces_no_condition():
    assert text_search(None, Goat.name) is None
    assert text_search("  ", Goat.name) is None


def test_like_wildcards_typed_by_the_user_are_escaped():
    """`%` should search for a literal percent, not match every goat."""
    assert escape_like("100%") == "100\\%"
    assert escape_like("a_b") == "a\\_b"
    assert escape_like("back\\slash") == "back\\\\slash"


def test_a_wildcard_in_the_search_box_reaches_sql_escaped():
    assert bound_values(text_search("50%", Goat.name)) == ["%50\\%%"]


# ---------------------------------------------------------------------------
# Ranges
# ---------------------------------------------------------------------------


def test_date_range_bounds_are_inclusive():
    conditions = date_range(Goat.date_of_birth, date(2026, 1, 1), date(2026, 12, 31))
    rendered = " ".join(sql(c) for c in conditions)

    assert ">= '2026-01-01'" in rendered
    assert "<= '2026-12-31'" in rendered


@pytest.mark.parametrize(
    "start,end,expected",
    [(date(2026, 1, 1), None, 1), (None, date(2026, 1, 1), 1), (None, None, 0)],
)
def test_date_range_sides_are_independent(start, end, expected):
    assert len(date_range(Goat.date_of_birth, start, end)) == expected


def test_numeric_range_builds_both_bounds():
    conditions = numeric_range(Goat.purchase_price, Decimal("100"), Decimal("500"))

    assert len(conditions) == 2


# ---------------------------------------------------------------------------
# Enums, equality, null checks
# ---------------------------------------------------------------------------


def test_single_enum_value_compiles_to_equality_not_in():
    assert " IN " not in sql(enum_in(Goat.status, [GoatStatus.active]))


def test_multiple_enum_values_compile_to_in():
    clause = enum_in(Goat.status, [GoatStatus.active, GoatStatus.sold])

    assert " IN " in sql(clause)


def test_empty_enum_selection_is_no_filter_at_all():
    assert enum_in(Goat.status, []) is None
    assert enum_in(Goat.status, None) is None


def test_equals_ignores_none_but_keeps_falsey_values():
    assert equals(Goat.name, None) is None
    assert equals(Goat.name, "") is not None


def test_is_null_flag_reads_as_has_a_value():
    assert "IS NOT NULL" in sql(is_null(Goat.photo_url, True))
    assert "IS NULL" in sql(is_null(Goat.photo_url, False))
    assert is_null(Goat.photo_url, None) is None


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------


def test_compact_flattens_lists_and_drops_inactive_filters():
    conditions = compact(
        equals(Goat.name, None),
        equals(Goat.name, "Shami"),
        date_range(Goat.date_of_birth, date(2026, 1, 1), date(2026, 6, 1)),
        None,
    )

    assert len(conditions) == 3


def test_compact_of_nothing_is_an_empty_where():
    assert compact(None, [], None) == []


# ---------------------------------------------------------------------------
# Month bounds — the expenses month filter
# ---------------------------------------------------------------------------


def test_month_bounds_covers_the_whole_month():
    assert month_bounds("2026-07") == (date(2026, 7, 1), date(2026, 7, 31))


def test_month_bounds_handles_february_in_a_leap_year():
    assert month_bounds("2024-02")[1] == date(2024, 2, 29)


@pytest.mark.parametrize("value", ["2026-13", "2026", "july", "2026-00", ""])
def test_malformed_month_is_a_clear_400(value):
    with pytest.raises(HTTPException) as excinfo:
        month_bounds(value)

    assert excinfo.value.status_code == 400
    assert "YYYY-MM" in excinfo.value.detail
