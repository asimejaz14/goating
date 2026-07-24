"""Age maths — used for the age badge and the age-in-months filter."""

from datetime import date

import pytest

from app.services.goats import age_in_months, months_before


def test_age_counts_whole_months_only():
    assert age_in_months(date(2026, 1, 15), today=date(2026, 7, 15)) == 6


def test_a_day_short_of_the_month_does_not_count_it():
    assert age_in_months(date(2026, 1, 15), today=date(2026, 7, 14)) == 5


def test_age_crosses_year_boundaries():
    assert age_in_months(date(2024, 7, 24), today=date(2026, 7, 24)) == 24


def test_a_goat_born_today_is_zero_months_old():
    assert age_in_months(date(2026, 7, 24), today=date(2026, 7, 24)) == 0


def test_missing_birth_date_reads_as_unknown_not_zero():
    """Purchased goats often arrive with no recorded DOB."""
    assert age_in_months(None) is None


def test_a_future_birth_date_never_goes_negative():
    assert age_in_months(date(2026, 12, 1), today=date(2026, 7, 24)) == 0


# ---------------------------------------------------------------------------
# months_before — turns an age filter into an indexed date bound
# ---------------------------------------------------------------------------


def test_months_before_walks_back_within_the_year():
    assert months_before(date(2026, 7, 24), 6) == date(2026, 1, 24)


def test_months_before_walks_back_across_years():
    assert months_before(date(2026, 7, 24), 24) == date(2024, 7, 24)


def test_months_before_clamps_to_the_last_day_of_a_shorter_month():
    """31 March minus one month is 28 February, not an invalid date."""
    assert months_before(date(2026, 3, 31), 1) == date(2026, 2, 28)


def test_months_before_respects_leap_years():
    assert months_before(date(2024, 3, 31), 1) == date(2024, 2, 29)


def test_months_before_zero_is_the_same_day():
    assert months_before(date(2026, 7, 24), 0) == date(2026, 7, 24)


@pytest.mark.parametrize("months", [1, 6, 12, 18, 36, 120])
def test_age_filter_bound_round_trips_back_to_the_same_age(months):
    """The filter is only correct if the bound and the badge agree."""
    today = date(2026, 7, 15)
    bound = months_before(today, months)

    assert age_in_months(bound, today) == months
