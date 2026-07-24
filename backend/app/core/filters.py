"""Reusable filter and sort builders shared by every list endpoint.

Routers compose these instead of hand-rolling `where` clauses, which keeps the
query grammar identical across resources and keeps `sort_by` safely bounded to a
per-resource whitelist.
"""

from __future__ import annotations

from calendar import monthrange
from collections.abc import Iterable, Sequence
from datetime import date
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, Select, or_

from app.core.pagination import PageParams

# ---------------------------------------------------------------------------
# Sorting
# ---------------------------------------------------------------------------


def apply_sort(
    stmt: Select,
    params: PageParams,
    sortable: dict[str, Any],
    default: str,
    tiebreaker: Any | None = None,
) -> Select:
    """Order ``stmt`` by a whitelisted column.

    An unknown ``sort_by`` is rejected with a 400 that names the valid options
    rather than silently falling back, so a typo in the UI surfaces immediately.

    ``tiebreaker`` (normally the primary key) is appended as a secondary sort:
    without it, paging over a non-unique column such as ``date_of_birth`` can
    repeat or skip rows between pages.
    """
    field = params.sort_by or default
    if field not in sortable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot sort by '{field}'. "
                f"Allowed: {', '.join(sorted(sortable))}."
            ),
        )

    column = sortable[field]
    ordering = column.desc() if params.sort_dir == "desc" else column.asc()
    stmt = stmt.order_by(ordering)
    if tiebreaker is not None:
        stmt = stmt.order_by(tiebreaker.desc())
    return stmt


# ---------------------------------------------------------------------------
# Filter builders — each returns conditions to be added to a `where`
# ---------------------------------------------------------------------------


def escape_like(term: str) -> str:
    """Neutralise LIKE wildcards typed by the user."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def text_search(term: str | None, *columns: Any) -> ColumnElement[bool] | None:
    """Case-insensitive contains-search across one or more columns."""
    term = term.strip() if term else ""
    # A whitespace-only term would otherwise compile to `ILIKE '%  %'` and hide
    # every row that has no double space in it.
    if not term or not columns:
        return None
    pattern = f"%{escape_like(term)}%"
    clauses = [column.ilike(pattern) for column in columns]
    return or_(*clauses) if len(clauses) > 1 else clauses[0]


def date_range(
    column: Any, start: date | None = None, end: date | None = None
) -> list[ColumnElement[bool]]:
    """Inclusive ``start``/``end`` bounds; either side may be omitted."""
    conditions: list[ColumnElement[bool]] = []
    if start is not None:
        conditions.append(column >= start)
    if end is not None:
        conditions.append(column <= end)
    return conditions


def numeric_range(
    column: Any,
    minimum: Decimal | float | int | None = None,
    maximum: Decimal | float | int | None = None,
) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if minimum is not None:
        conditions.append(column >= minimum)
    if maximum is not None:
        conditions.append(column <= maximum)
    return conditions


def enum_in(column: Any, values: Sequence[str] | None) -> ColumnElement[bool] | None:
    """Match any of ``values`` (multi-select filters such as goat status)."""
    cleaned = [v for v in (values or []) if v]
    if not cleaned:
        return None
    if len(cleaned) == 1:
        return column == cleaned[0]
    return column.in_(cleaned)


def equals(column: Any, value: Any | None) -> ColumnElement[bool] | None:
    return None if value is None else column == value


def is_null(column: Any, flag: bool | None) -> ColumnElement[bool] | None:
    """``flag=True`` keeps rows where the column *has* a value."""
    if flag is None:
        return None
    return column.isnot(None) if flag else column.is_(None)


def compact(
    *conditions: ColumnElement[bool] | Iterable[ColumnElement[bool]] | None,
) -> list[ColumnElement[bool]]:
    """Flatten builder output, dropping the ``None``s for inactive filters."""
    out: list[ColumnElement[bool]] = []
    for item in conditions:
        if item is None:
            continue
        if isinstance(item, (list, tuple)):
            out.extend(c for c in item if c is not None)
        else:
            out.append(item)
    return out


def month_bounds(month: str) -> tuple[date, date]:
    """Convert ``YYYY-MM`` into inclusive first/last day bounds."""
    try:
        year_str, month_str = month.split("-")
        year, month_num = int(year_str), int(month_str)
        if not 1 <= month_num <= 12:
            raise ValueError
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid month '{month}'. Expected format YYYY-MM.",
        ) from None

    last_day = monthrange(year, month_num)[1]
    return date(year, month_num, 1), date(year, month_num, last_day)
