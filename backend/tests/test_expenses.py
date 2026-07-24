"""The 50/50 split and settle-up.

The property that matters: **nets always sum to exactly zero**. If they drift by
even a cent, "settle up" can never bring the balance to nothing.
"""

from decimal import Decimal
from uuid import uuid4

import pytest

from app.services.expenses import CENT, ZERO, compute_balance, fair_shares, money

ASIM = uuid4()
FRIEND = uuid4()
PARTNERS = [(ASIM, "Asim"), (FRIEND, "Friend")]


def d(value: str) -> Decimal:
    return Decimal(value)


# ---------------------------------------------------------------------------
# Rounding and splitting
# ---------------------------------------------------------------------------


def test_money_rounds_half_up_like_a_person_would():
    assert money(d("10.005")) == d("10.01")
    assert money(None) == ZERO


def test_even_total_splits_cleanly():
    assert fair_shares(d("100.00"), 2) == [d("50.00"), d("50.00")]


def test_odd_cent_is_given_to_the_first_partner_not_lost():
    shares = fair_shares(d("100.01"), 2)

    assert shares == [d("50.01"), d("50.00")]
    assert sum(shares) == d("100.01")


@pytest.mark.parametrize("total", ["0.01", "0.03", "7.77", "1234.57", "99999.99"])
def test_shares_always_add_back_to_the_total(total):
    """Any leftover cents must land somewhere — never rounded into thin air."""
    assert sum(fair_shares(d(total), 2)) == d(total)


def test_split_extends_to_more_than_two_partners():
    """The user may add people later; the maths must not assume two."""
    shares = fair_shares(d("100.00"), 3)

    assert sum(shares) == d("100.00")
    assert shares == [d("33.34"), d("33.33"), d("33.33")]


def test_no_partners_means_no_shares():
    assert fair_shares(d("100.00"), 0) == []


# ---------------------------------------------------------------------------
# Balance
# ---------------------------------------------------------------------------


def test_one_partner_paying_everything_is_owed_half():
    balance = compute_balance(PARTNERS, {ASIM: d("1000.00")}, {}, {})

    assert balance.settled is False
    assert balance.debtor_id == FRIEND
    assert balance.creditor_id == ASIM
    assert balance.amount_owed == d("500.00")


def test_equal_spending_is_all_square():
    balance = compute_balance(
        PARTNERS, {ASIM: d("500.00"), FRIEND: d("500.00")}, {}, {}
    )

    assert balance.settled is True
    assert "All square" in balance.message


def test_nets_always_sum_to_zero():
    balance = compute_balance(
        PARTNERS, {ASIM: d("1234.57"), FRIEND: d("765.44")}, {}, {}
    )

    assert sum(entry.net for entry in balance.per_person) == ZERO


def test_message_names_both_people_and_the_amount():
    balance = compute_balance(PARTNERS, {ASIM: d("1000.00")}, {}, {}, "₨")

    assert balance.message == "Friend owes Asim ₨500.00"


def test_settling_up_drives_the_balance_to_zero():
    """The whole point of the settle-up button."""
    paid = {ASIM: d("1000.00")}
    before = compute_balance(PARTNERS, paid, {}, {})
    assert before.amount_owed == d("500.00")

    after = compute_balance(
        PARTNERS,
        paid,
        settlements_paid={FRIEND: before.amount_owed},
        settlements_received={ASIM: before.amount_owed},
    )

    assert after.settled is True
    assert all(entry.net == ZERO for entry in after.per_person)


def test_settling_an_odd_amount_still_reaches_zero():
    paid = {ASIM: d("333.33"), FRIEND: d("100.00")}
    before = compute_balance(PARTNERS, paid, {}, {})

    after = compute_balance(
        PARTNERS,
        paid,
        settlements_paid={FRIEND: before.amount_owed},
        settlements_received={ASIM: before.amount_owed},
    )

    assert after.settled is True


def test_partial_settlement_leaves_the_remainder_owing():
    balance = compute_balance(
        PARTNERS,
        {ASIM: d("1000.00")},
        settlements_paid={FRIEND: d("200.00")},
        settlements_received={ASIM: d("200.00")},
    )

    assert balance.settled is False
    assert balance.amount_owed == d("300.00")
    assert balance.debtor_id == FRIEND


def test_overpaying_a_settlement_flips_who_owes_whom():
    balance = compute_balance(
        PARTNERS,
        {ASIM: d("1000.00")},
        settlements_paid={FRIEND: d("700.00")},
        settlements_received={ASIM: d("700.00")},
    )

    assert balance.debtor_id == ASIM
    assert balance.creditor_id == FRIEND
    assert balance.amount_owed == d("200.00")


def test_empty_ledger_says_so_plainly():
    balance = compute_balance(PARTNERS, {}, {}, {})

    assert balance.settled is True
    assert balance.total_expenses == ZERO


def test_no_profiles_yet_does_not_explode():
    balance = compute_balance([], {}, {}, {})

    assert balance.settled is True
    assert balance.per_person == []


def test_a_sub_cent_drift_still_counts_as_settled():
    """Guards the tolerance used to decide the "all square" state."""
    balance = compute_balance(PARTNERS, {ASIM: d("0.01")}, {}, {})

    assert all(abs(entry.net) < CENT for entry in balance.per_person)
    assert balance.settled is True


def test_total_expenses_is_the_sum_of_everything_paid():
    balance = compute_balance(
        PARTNERS, {ASIM: d("120.50"), FRIEND: d("79.50")}, {}, {}
    )

    assert balance.total_expenses == d("200.00")
