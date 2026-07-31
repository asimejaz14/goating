"""Application settings, loaded from environment / .env."""

from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Parameters libpq understands but asyncpg does not — asyncpg raises on an
# unexpected keyword, so they have to be translated or dropped rather than
# passed through.
_SSL_MODE_TO_ASYNCPG = {
    "disable": "disable",
    "allow": "prefer",
    "prefer": "prefer",
    "require": "require",
    "verify-ca": "verify-ca",
    "verify-full": "verify-full",
}
_LIBPQ_ONLY_PARAMS = frozenset(
    {"channel_binding", "target_session_attrs", "options", "connect_timeout"}
)


def normalize_database_url(url: str) -> str:
    """Turn any Postgres connection string into one this app can actually open.

    Supabase hands you ``postgresql://…`` and hosting dashboards often store it
    exactly as copied. SQLAlchemy reads that scheme as "the default Postgres
    driver", which is psycopg2 — a driver this app does not install and could
    not use anyway, since everything here is async. The result is a
    ``ModuleNotFoundError: No module named 'psycopg2'`` at the first query, long
    after deploy, and the cause is invisible from the message.

    Rather than expect whoever sets ``DATABASE_URL`` to remember to rewrite the
    scheme, the string is normalized here: the async driver is selected, the
    legacy ``postgres://`` alias (which SQLAlchemy rejects outright) is
    accepted, and libpq-only query parameters are translated to their asyncpg
    equivalents or dropped.
    """
    url = url.strip()
    if not url:
        return url

    parts = urlsplit(url)
    scheme = parts.scheme.lower()

    # `postgres://` is the old Heroku-style alias; `postgresql://` means
    # "default driver". Both need pinning to asyncpg. A scheme that already
    # names a driver (`postgresql+asyncpg`, `postgresql+psycopg`) is left alone.
    if scheme in {"postgres", "postgresql"}:
        scheme = "postgresql+asyncpg"

    query = []
    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        lowered = key.lower()
        if lowered == "sslmode":
            translated = _SSL_MODE_TO_ASYNCPG.get(value.lower())
            if translated:
                query.append(("ssl", translated))
        elif lowered not in _LIBPQ_ONLY_PARAMS:
            query.append((key, value))

    return urlunsplit(
        (scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Supabase / database -------------------------------------------------
    # Postgres connection string from Supabase → Project Settings → Database.
    # Paste it as-is; the scheme is normalized to the async driver on load.
    # Prefer the *session* pooler URI (port 5432) over the transaction pooler.
    database_url: str = ""

    @field_validator("database_url")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        return normalize_database_url(value)

    # --- Auth -----------------------------------------------------------------
    # The API signs its own session tokens — there is no external identity
    # provider. Generate a real secret for anything beyond local dev, e.g.:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    jwt_secret: str = ""
    # How long a signed-in session lasts before a partner has to log in again.
    jwt_expire_days: int = 60

    # --- Farm rules ----------------------------------------------------------
    farm_prefix: str = "BGF"
    gestation_days: int = 150
    currency_code: str = "PKR"
    currency_symbol: str = "₨"

    # --- API -----------------------------------------------------------------
    cors_origins: str = "http://localhost:3000"
    api_title: str = "Goat Farm Portal API"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
