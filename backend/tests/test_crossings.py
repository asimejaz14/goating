"""Gestation maths and the days-to-birth countdown."""

from datetime import date

import pytest

from app.config import settings
from app.services.crossings import days_remaining, expected_kidding


def test_expected_kidding_is_150_days_after_the_crossing():
    assert expected_kidding(date(2026, 1, 1)) == date(2026, 5, 31)


def test_gestation_length_is_configurable():
    assert expected_kidding(date(2026, 1, 1), gestation_days=145) == date(2026, 5, 26)


def test_default_gestation_matches_the_configured_value():
    crossing = date(2026, 3, 1)

    assert (expected_kidding(crossing) - crossing).days == settings.gestation_days


def test_estimate_crosses_a_leap_day_correctly():
    assert expected_kidding(date(2024, 1, 1)) == date(2024, 5, 30)


def test_countdown_counts_down():
    expected = date(2026, 5, 31)

    assert days_remaining(expected, today=date(2026, 5, 1)) == 30


def test_due_today_is_zero_days_remaining():
    assert days_remaining(date(2026, 5, 31), today=date(2026, 5, 31)) == 0


def test_overdue_goes_negative():
    """Negative is what the UI renders as "3 days overdue"."""
    assert days_remaining(date(2026, 5, 31), today=date(2026, 6, 3)) == -3


@pytest.mark.parametrize("offset", [1, 7, 30, 150])
def test_countdown_tracks_the_calendar(offset):
    from datetime import timedelta

    today = date(2026, 4, 10)

    assert days_remaining(today + timedelta(days=offset), today) == offset
