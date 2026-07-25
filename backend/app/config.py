"""Application settings, loaded from environment / .env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Supabase / database -------------------------------------------------
    # Postgres connection string from Supabase → Project Settings → Database.
    # Use the *session* pooler URI and swap the scheme for asyncpg, e.g.
    #   postgresql+asyncpg://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres
    database_url: str = ""

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
