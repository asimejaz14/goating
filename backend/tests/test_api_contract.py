"""API surface checks that need no database.

Auth is verified before any route touches the session, so these prove the whole
API is actually behind a login — and that the shared list contract really is
shared.
"""

import time
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.config import settings
from app.main import app

client = TestClient(app)


def signed_token(**claims) -> str:
    """Mint a token the way Supabase Auth would for a signed-in partner."""
    payload = {
        "sub": str(uuid4()),
        "email": "asim@example.com",
        "exp": int(time.time()) + 3600,
        **claims,
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


def auth(token: str | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {token or signed_token()}"}

LIST_ENDPOINTS = [
    "/goats",
    "/crossings",
    "/vaccinations",
    "/weights",
    "/health",
    "/expenses",
    "/settlements",
]


def test_liveness_probe_needs_no_login():
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize(
    "path",
    LIST_ENDPOINTS + ["/breeds", "/dashboard/summary", "/expenses/balance", "/me"],
)
def test_every_data_endpoint_requires_authentication(path):
    assert client.get(path).status_code == 401


def test_a_forged_token_is_rejected():
    response = client.get("/goats", headers=auth("not.a.real.token"))

    assert response.status_code == 401


def test_a_token_signed_with_the_wrong_key_is_rejected():
    forged = jwt.encode(
        {"sub": str(uuid4()), "exp": int(time.time()) + 3600},
        "some-other-secret",
        algorithm="HS256",
    )

    assert client.get("/goats", headers=auth(forged)).status_code == 401


def test_an_expired_session_is_rejected():
    stale = signed_token(exp=int(time.time()) - 60)

    response = client.get("/goats", headers=auth(stale))

    assert response.status_code == 401
    assert "sign in again" in response.json()["detail"]


def test_a_valid_token_identifies_the_signed_in_partner():
    """`/me` touches no database, so it proves the whole auth path works."""
    user_id = str(uuid4())
    token = signed_token(
        sub=user_id,
        email="asim@example.com",
        user_metadata={"display_name": "Asim"},
    )

    response = client.get("/me", headers=auth(token))

    assert response.status_code == 200
    assert response.json() == {
        "id": user_id,
        "email": "asim@example.com",
        "display_name": "Asim",
    }


def test_a_token_without_a_subject_is_rejected():
    malformed = jwt.encode(
        {"exp": int(time.time()) + 3600},
        settings.supabase_jwt_secret,
        algorithm="HS256",
    )

    assert client.get("/me", headers=auth(malformed)).status_code == 401


def test_openapi_schema_generates():
    """Guards the whole Pydantic layer — /docs breaks the moment this does."""
    schema = app.openapi()

    assert schema["paths"]
    assert "GoatDetail" in schema["components"]["schemas"]


@pytest.mark.parametrize("path", LIST_ENDPOINTS)
def test_every_list_endpoint_speaks_the_same_page_grammar(path):
    """One frontend hook serves every list — only if the params match."""
    params = {
        item["name"]
        for item in app.openapi()["paths"][path]["get"]["parameters"]
    }

    assert {"page", "page_size", "sort_by", "sort_dir"} <= params


@pytest.mark.parametrize("path", LIST_ENDPOINTS)
def test_every_list_endpoint_returns_the_same_envelope(path):
    schema = app.openapi()
    ref = schema["paths"][path]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]["$ref"]
    model = schema["components"]["schemas"][ref.rsplit("/", 1)[-1]]

    assert {
        "items",
        "page",
        "page_size",
        "total",
        "total_pages",
        "has_next",
        "has_prev",
    } <= set(model["properties"])


def test_expenses_list_adds_filtered_totals_to_the_envelope():
    """Totals must reflect the whole filtered set, not just the page."""
    schema = app.openapi()["components"]["schemas"]["ExpensePage"]

    assert "summary" in schema["properties"]


def test_goat_ids_are_not_editable_through_the_api():
    """Tags are generated once; nothing should be able to overwrite one."""
    schema = app.openapi()["components"]["schemas"]

    assert "tag_number" not in schema["GoatCreate"]["properties"]
    assert "tag_number" not in schema["GoatUpdate"]["properties"]


def test_no_vaccination_due_or_upcoming_endpoint_exists():
    """The user explicitly does not want reminders — only a manual log."""
    paths = app.openapi()["paths"]

    assert not [p for p in paths if "vaccination" in p and ("due" in p or "upcoming" in p)]


def test_the_360_view_is_one_request():
    """Clicking a goat must not fan out into a dozen calls."""
    assert "/goats/{goat_id}/history" in app.openapi()["paths"]


def test_pedigree_depth_is_capped_in_the_schema():
    params = {
        item["name"]: item
        for item in app.openapi()["paths"]["/goats/{goat_id}/pedigree"]["get"][
            "parameters"
        ]
    }
    generations = params["generations"]["schema"]

    assert generations.get("maximum") == 6
