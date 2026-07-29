"""Goat Farm Portal API."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.config import settings
from app.database import get_engine, get_read_engine
from app.routers import (
    auth,
    breeds,
    crossings,
    dashboard,
    expenses,
    goats,
    health,
    settlements,
    vaccinations,
    weights,
)

logger = logging.getLogger("goatfarm")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Open a connection on each pool before the first request arrives.

    Opening a Postgres connection is a TCP, TLS and authentication handshake —
    several round trips, and painfully slow when the database sits far from the
    API. A host that scales to zero makes that the *normal* case rather than a
    one-off: whoever loads the app after an idle period pays it, and pays it
    again for every connection the page needs.

    Doing it here means the handshakes happen once at boot, in parallel, while
    the platform is already waiting for the app to come up — rather than one at
    a time on the critical path of somebody's first page.

    Best-effort on purpose. A database that is unreachable at boot must not stop
    the app from starting; the request path opens connections on demand anyway,
    and `/healthz` stays up to report the problem.
    """
    try:
        await asyncio.wait_for(
            asyncio.gather(
                _touch(get_engine()),
                _touch(get_read_engine()),
                return_exceptions=True,
            ),
            timeout=10,
        )
    except Exception as exc:  # noqa: BLE001 — a cold database must never block startup
        logger.warning("Could not pre-warm the database pools: %s", exc)
    yield


async def _touch(engine) -> None:
    async with engine.connect() as connection:
        await connection.execute(text("select 1"))


app = FastAPI(
    title=settings.api_title,
    version="1.0.0",
    description=(
        "Herd records, crossings and kidding, an auto-building pedigree, "
        "vaccination and health logs, and the shared expense ledger."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# List responses are repetitive JSON and compress by roughly 85% — a full page
# of crossings goes from ~110 KB to ~10 KB. That is the difference between a
# snappy and a sluggish list on a phone over mobile data. The threshold leaves
# small responses alone, where framing overhead would outweigh the saving.
app.add_middleware(GZipMiddleware, minimum_size=1024)


# Idempotent by definition, so replaying one is safe.
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


@app.middleware("http")
async def retry_dropped_connections(request: Request, call_next):
    """Replay a read whose database connection had been closed underneath it.

    The pool hands out connections without pinging them first, which keeps a
    round trip off every request. The trade is that a connection dropped by the
    pooler is discovered by the query that tries to use it. SQLAlchemy flags
    exactly that case as ``connection_invalidated`` and discards the dead
    connection, so retrying once picks up a fresh one and the caller never sees
    the blip.

    Only safe methods are replayed — a write may already have committed before
    the connection dropped, and running it twice is worse than reporting it.
    """
    try:
        return await call_next(request)
    except DBAPIError as exc:
        if not exc.connection_invalidated or request.method not in SAFE_METHODS:
            raise
        logger.warning("Retrying %s %s after a dropped connection", request.method, request.url.path)
        return await call_next(request)


for module in (
    auth,
    dashboard,
    breeds,
    goats,
    crossings,
    vaccinations,
    weights,
    health,
    expenses,
    settlements,
):
    app.include_router(module.router)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, exc: IntegrityError) -> JSONResponse:
    """Turn database constraint violations into something a person can act on."""
    logger.warning("Integrity error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "detail": (
                "That change conflicts with an existing record. Refresh the "
                "page and try again."
            )
        },
    )


# /health belongs to the health-records router, so the probe lives at /healthz.
@app.get("/healthz", tags=["meta"], summary="Liveness probe")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
