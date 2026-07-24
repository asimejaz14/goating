"""Tag-number format — `BGF-MC-01`, counter restarting per breed."""

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
