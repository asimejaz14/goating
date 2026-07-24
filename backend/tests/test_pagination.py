"""The shared pagination contract every list endpoint is built on."""

import pytest

from app.core.pagination import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    PageParams,
    build_page,
)


def test_page_math_middle_page():
    page = build_page(items=["a"] * 20, total=137, page=4, page_size=20)

    assert page.total_pages == 7  # 137 / 20 rounds up
    assert page.has_next is True
    assert page.has_prev is True


def test_first_and_last_pages_bound_navigation():
    first = build_page(["a"], total=137, page=1, page_size=20)
    last = build_page(["a"], total=137, page=7, page_size=20)

    assert (first.has_prev, first.has_next) == (False, True)
    assert (last.has_prev, last.has_next) == (True, False)


def test_empty_result_has_no_pages_and_no_navigation():
    page = build_page([], total=0, page=1, page_size=20)

    assert page.total_pages == 0
    assert page.has_next is False
    assert page.has_prev is False


def test_exact_multiple_does_not_add_a_trailing_empty_page():
    page = build_page(["a"] * 20, total=40, page=2, page_size=20)

    assert page.total_pages == 2
    assert page.has_next is False


def test_page_size_is_capped_server_side():
    """A malformed request must never be able to pull an entire table."""
    params = PageParams(page=1, page_size=10_000, sort_by=None, sort_dir="desc", q=None)

    assert params.page_size == MAX_PAGE_SIZE
    assert params.limit == MAX_PAGE_SIZE


def test_offset_follows_from_page_and_size():
    params = PageParams(page=4, page_size=25, sort_by=None, sort_dir="desc", q=None)

    assert params.offset == 75


def test_blank_search_is_normalised_away():
    """Whitespace-only search must not become a `%   %` LIKE pattern."""
    params = PageParams(page=1, page_size=20, sort_by=None, sort_dir="desc", q="   ")

    assert params.q is None


def test_search_term_is_trimmed():
    params = PageParams(page=1, page_size=20, sort_by=None, sort_dir="desc", q="  MC-01 ")

    assert params.q == "MC-01"


@pytest.mark.parametrize("total,size,expected", [(1, 20, 1), (21, 20, 2), (100, 7, 15)])
def test_total_pages_rounds_up(total, size, expected):
    assert build_page([], total=total, page=1, page_size=size).total_pages == expected


def test_documented_defaults_match_the_openapi_schema():
    """The README and the frontend both assume these numbers."""
    from app.main import app

    params = {
        item["name"]: item
        for item in app.openapi()["paths"]["/goats"]["get"]["parameters"]
    }

    assert params["page_size"]["schema"]["default"] == DEFAULT_PAGE_SIZE
    assert params["page_size"]["schema"]["maximum"] == MAX_PAGE_SIZE
    assert params["page"]["schema"]["default"] == 1
