"""Tag-number format — `BGF-MC-01`, counter restarting per breed."""

import re
from pathlib import Path

import pytest

from app.services.ids import format_tag


def test_tag_matches_the_agreed_format():
    assert format_tag("BGF", "MC", 1) == "BGF-MC-01"


def test_counter_is_zero_padded_to_two_digits():
    assert format_tag("BGF", "MC", 2) == "BGF-MC-02"
    assert format_tag("BGF", "MC", 9) == "BGF-MC-09"


def test_counter_grows_past_two_digits_without_truncating():
    assert format_tag("BGF", "MC", 10) == "BGF-MC-10"
    assert format_tag("BGF", "MC", 137) == "BGF-MC-137"


def test_lowercase_input_is_uppercased():
    """The user asked for uppercase initials, always."""
    assert format_tag("bgf", "mc", 1) == "BGF-MC-01"


@pytest.mark.parametrize(
    "code,expected",
    [("MC", "BGF-MC-01"), ("TD", "BGF-TD-01"), ("RP", "BGF-RP-01")],
)
def test_each_seeded_breed_starts_its_own_sequence(code, expected):
    """Makhi Cheeni, Teddy and Rajan Puri each count from 01 independently."""
    assert format_tag("BGF", code, 1) == expected


def test_farm_prefix_is_configurable():
    assert format_tag("XYZ", "MC", 5) == "XYZ-MC-05"


def test_sequence_within_a_breed_is_unique_across_a_run():
    tags = [format_tag("BGF", "MC", n) for n in range(1, 51)]

    assert len(set(tags)) == 50


# ---------------------------------------------------------------------------
# The tag actually handed out in production comes from the Postgres function
# `allocate_goat_tag`, not from `format_tag` — so the two have to agree. They
# once did not: the SQL padded with `lpad(v_seq::text, 2, '0')`, and `lpad`
# truncates anything longer than its width. The hundredth goat of a breed was
# therefore issued '10' instead of '100', collided with the tenth goat's tag,
# and the insert was rejected — no goat could be added to that breed again.
#
# These tests read the migrations rather than a live database (the suite has
# none), which is enough to pin the defect: a fixed width of 2 must never
# reappear in that expression.
# ---------------------------------------------------------------------------
MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


def _tag_building_sql() -> str:
    """Every migration that defines the function, with comments stripped.

    The comments describe the old broken expression on purpose, so they have to
    go before matching or the explanation would trip the test.
    """
    sources = [
        re.sub(r"--[^\n]*", "", path.read_text(encoding="utf-8"))
        for path in sorted(MIGRATIONS.glob("*.sql"))
        if "allocate_goat_tag" in path.read_text(encoding="utf-8")
    ]
    assert sources, "no migration defines allocate_goat_tag"
    return "\n".join(sources)


def test_sql_never_pads_the_counter_to_a_fixed_width_of_two():
    """`lpad(x, 2, '0')` silently truncates once the counter reaches 100."""
    assert not re.search(r"lpad\s*\(\s*v_seq::text\s*,\s*2\s*,", _tag_building_sql())


def test_sql_pads_to_at_least_two_digits():
    """Small herds still read BGF-MC-01, so the two-digit minimum stays."""
    assert re.search(
        r"lpad\s*\(\s*v_seq::text\s*,\s*greatest\s*\(\s*2\s*,", _tag_building_sql()
    )
