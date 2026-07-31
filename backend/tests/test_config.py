"""Connection-string normalization.

The app is fully async and only installs asyncpg. A URL that does not name that
driver makes SQLAlchemy reach for psycopg2 and fail at the first query with
``ModuleNotFoundError``, which says nothing about the real cause — so the
string handed to the app is normalized on the way in.
"""

import pytest

from app.config import normalize_database_url

HOST = "postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres"


@pytest.mark.parametrize(
    "given",
    [
        f"postgresql://{HOST}",
        f"postgres://{HOST}",
        f"POSTGRESQL://{HOST}",
        f"  postgresql://{HOST}  ",
    ],
)
def test_any_plain_postgres_url_gets_the_async_driver(given):
    """This is the paste-from-Supabase case that produced the psycopg2 error."""
    assert normalize_database_url(given).startswith("postgresql+asyncpg://")


def test_a_url_that_already_names_asyncpg_is_left_alone():
    url = f"postgresql+asyncpg://{HOST}"

    assert normalize_database_url(url) == url


def test_an_explicitly_chosen_driver_is_respected():
    """Only the driverless schemes are claimed — a deliberate choice stands."""
    url = f"postgresql+psycopg://{HOST}"

    assert normalize_database_url(url) == url


def test_credentials_host_and_database_survive_normalization():
    result = normalize_database_url(f"postgresql://{HOST}")

    assert result == f"postgresql+asyncpg://{HOST}"


def test_sslmode_becomes_the_asyncpg_spelling():
    """asyncpg raises on `sslmode`; it wants `ssl`."""
    result = normalize_database_url(f"postgresql://{HOST}?sslmode=require")

    assert "sslmode" not in result
    assert "ssl=require" in result


def test_libpq_only_parameters_are_dropped():
    """asyncpg raises on an unexpected keyword rather than ignoring it."""
    result = normalize_database_url(
        f"postgresql://{HOST}?channel_binding=require&target_session_attrs=rw"
    )

    assert "channel_binding" not in result
    assert "target_session_attrs" not in result


def test_unrecognised_parameters_are_preserved():
    """Only the known-incompatible ones are touched."""
    result = normalize_database_url(f"postgresql://{HOST}?application_name=goatfarm")

    assert "application_name=goatfarm" in result


def test_an_empty_url_stays_empty():
    """`get_engine` reports the missing setting; normalization must not mask it."""
    assert normalize_database_url("") == ""
    assert normalize_database_url("   ") == ""
