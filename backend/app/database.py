"""Async SQLAlchemy engine and session wiring."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, Awaitable, Callable, Sequence
from typing import TypeVar

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

T = TypeVar("T")

# Connections reserved for the parallel reads in `gather_reads`, in their own
# pool rather than borrowed from the request pool.
#
# Sharing one pool deadlocks: a request holds its own connection for the whole
# response and then asks that same pool for several more, so once enough
# requests are in flight every connection is held by someone waiting for a
# connection nobody can give up. Under a burst that turned into failed requests
# rather than slow ones. A separate pool breaks the cycle — the readers never
# need a connection from the request pool, so they always finish and hand theirs
# back.
#
# Sized to the widest fan-out any single response performs (the goat history
# page, with eight). Anything above `pool_size` is an overflow connection, and
# overflow connections are closed the moment they are handed back — so a pool
# narrower than the fan-out would reconnect on every request, and a fresh
# connection costs a TCP and authentication handshake worth several round trips.
# Keeping the steady-state fan-out inside the pool is what makes these reads
# cheap; the overflow above it is only there so a burst queues instead of
# failing.
READ_POOL_SIZE = 8


class Base(DeclarativeBase):
    """Declarative base for every ORM model."""


_engine: AsyncEngine | None = None
_read_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None
_read_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Create the engine on first use.

    Built lazily so the app (and the unit tests) can be imported without a
    DATABASE_URL present.
    """
    global _engine
    if _engine is None:
        if not settings.database_url:
            raise RuntimeError(
                "DATABASE_URL is not set. Copy backend/.env.example to "
                "backend/.env and paste your Supabase connection string."
            )
        _engine = create_async_engine(
            settings.database_url,
            # Roomy enough that the aggregate pages can fan their independent
            # reads out over several connections at once (see `gather_reads`)
            # while other callers are still served.
            pool_size=10,
            max_overflow=10,
            # Surface a saturated pool as a prompt error rather than a request
            # that appears to hang.
            pool_timeout=10,
            # Stale connections are retired on age rather than by pinging the
            # database before every checkout. `pool_pre_ping` sounds cheap, but
            # its round trip lands on the critical path of *every* request —
            # measured against a database 50 ms away it added roughly 200 ms to
            # each one, more than the queries themselves.
            #
            # The recycle window is a local age check, so it is free, but it has
            # to be generous: opening a replacement connection costs a TCP and
            # authentication handshake, several round trips that a short window
            # would keep paying for. Half an hour keeps connections comfortably
            # fresh, and the retry in `app.main` covers a drop that slips
            # through in between.
            pool_recycle=1800,
            pool_pre_ping=False,
            # Supabase sits behind pgbouncer, which cannot replay prepared
            # statements across pooled connections.
            connect_args={"statement_cache_size": 0},
        )
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(
            bind=get_engine(), expire_on_commit=False, class_=AsyncSession
        )
    return _sessionmaker


def get_read_engine() -> AsyncEngine:
    """The separate, small pool used only by :func:`gather_reads`.

    Autocommit, because each reader runs exactly one self-contained SELECT: a
    transaction would add a ``BEGIN`` and a ``COMMIT`` around it, three round
    trips to fetch one result set instead of one.

    The overflow gives a burst somewhere to go — these are short single
    statements, so borrowed connections come back quickly — while the pool size
    is what it settles back to once the burst passes.
    """
    global _read_engine
    if _read_engine is None:
        get_engine()  # reuse its validation of DATABASE_URL
        _read_engine = create_async_engine(
            settings.database_url,
            pool_size=READ_POOL_SIZE,
            max_overflow=READ_POOL_SIZE,
            pool_timeout=10,
            pool_recycle=1800,
            pool_pre_ping=False,
            isolation_level="AUTOCOMMIT",
            connect_args={"statement_cache_size": 0},
        )
    return _read_engine


def _get_read_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _read_sessionmaker
    if _read_sessionmaker is None:
        _read_sessionmaker = async_sessionmaker(
            bind=get_read_engine(), expire_on_commit=False, class_=AsyncSession
        )
    return _read_sessionmaker


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a transactional session."""
    async with get_sessionmaker()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def gather_reads(
    readers: Sequence[Callable[[AsyncSession], Awaitable[T]]],
) -> list[T]:
    """Run independent read-only queries side by side, each on its own session.

    A page built from several unrelated aggregates — the dashboard, a goat's
    full history — spends nearly all of its time waiting for the database rather
    than working. Run one after another those waits add up; run together they
    overlap, so the page costs about as much as its slowest query instead of the
    sum of all of them.

    Strictly for reads. Each reader gets its own connection in autocommit, so
    this must not be used where the parts have to see one another's writes or
    commit as a unit.
    """
    sessionmaker = _get_read_sessionmaker()

    async def run(reader: Callable[[AsyncSession], Awaitable[T]]) -> T:
        async with sessionmaker() as session:
            return await reader(session)

    return list(await asyncio.gather(*(run(reader) for reader in readers)))
