"""Goat Farm Portal API."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.config import settings
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

app = FastAPI(
    title=settings.api_title,
    version="1.0.0",
    description=(
        "Herd records, crossings and kidding, an auto-building pedigree, "
        "vaccination and health logs, and the shared expense ledger."
    ),
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
