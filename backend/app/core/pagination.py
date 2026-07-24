"""Shared pagination contract.

Every list endpoint in the API accepts the same query parameters and returns the
same envelope, so the frontend needs exactly one hook and one pager component.

Page math lives in :func:`build_page`, kept free of database access so it can be
unit tested directly.
"""

from collections.abc import Sequence
from math import ceil
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class PageParams:
    """Common list parameters, used as a FastAPI dependency.

    ``page_size`` is capped server-side so a malformed request can never pull an
    entire table.
    """

    def __init__(
        self,
        page: int = Query(1, ge=1, description="1-based page number"),
        page_size: int = Query(
            DEFAULT_PAGE_SIZE,
            ge=1,
            le=MAX_PAGE_SIZE,
            description=f"Rows per page (max {MAX_PAGE_SIZE})",
        ),
        sort_by: str | None = Query(
            None, description="Column to sort on; validated per resource"
        ),
        sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
        q: str | None = Query(None, description="Free-text search"),
    ) -> None:
        self.page = page
        self.page_size = min(page_size, MAX_PAGE_SIZE)
        self.sort_by = sort_by
        self.sort_dir = sort_dir
        self.q = q.strip() if q and q.strip() else None

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class Page(BaseModel, Generic[T]):
    """Envelope returned by every list endpoint."""

    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


def build_page(
    items: Sequence[T], total: int, page: int, page_size: int
) -> Page[T]:
    """Assemble the envelope. Pure function — no database involved."""
    page_size = max(1, page_size)
    total = max(0, total)
    total_pages = ceil(total / page_size) if total else 0
    return Page[T](
        items=list(items),
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1 and total > 0,
    )


async def count_query(session: AsyncSession, stmt: Select) -> int:
    """Count rows the statement would return, ignoring ordering."""
    subquery = stmt.order_by(None).options().subquery()
    return await session.scalar(select(func.count()).select_from(subquery)) or 0


async def paginate(
    session: AsyncSession, stmt: Select, params: PageParams
) -> tuple[list, int]:
    """Run the count + page queries for ``stmt``.

    Returns the rows for the requested page and the total across all pages, so
    callers can map rows to schemas before calling :func:`build_page`.
    """
    total = await count_query(session, stmt)
    if total == 0:
        return [], 0
    result = await session.execute(stmt.limit(params.limit).offset(params.offset))
    return list(result.scalars().unique().all()), total
