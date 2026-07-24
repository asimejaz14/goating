"""Goat tag-number allocation.

Tags look like ``BGF-MC-01``: a configurable farm prefix, the breed's initials,
and a counter that **restarts for every breed**. They are generated once at
creation and never editable afterwards.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings


def format_tag(prefix: str, breed_code: str, sequence: int) -> str:
    """Render one tag number.

    Pure and dependency-free so the format contract can be unit tested without a
    database; the Postgres ``allocate_goat_tag`` function produces the same
    string.
    """
    return f"{prefix.upper()}-{breed_code.upper()}-{sequence:02d}"


async def allocate_tag(
    session: AsyncSession, breed_id: UUID, prefix: str | None = None
) -> str:
    """Reserve the next tag for ``breed_id``.

    Delegates to the Postgres function, whose ``update ... returning`` takes a
    row lock — two goats added at the same moment can never land on the same
    number.
    """
    try:
        tag = await session.scalar(
            text(
                "select allocate_goat_tag("
                "  cast(:breed_id as uuid), cast(:prefix as text)"
                ")"
            ),
            {"breed_id": str(breed_id), "prefix": prefix or settings.farm_prefix},
        )
    except DBAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That breed no longer exists. Pick a breed from the list.",
        ) from exc

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That breed no longer exists. Pick a breed from the list.",
        )
    return tag
