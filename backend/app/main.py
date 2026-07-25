"""Goat Farm Portal API."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

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
