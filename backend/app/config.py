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

    supabase_url: str = ""
    supabase_anon_key: str = ""
    # Either set the JWT secret (HS256 projects) or leave it blank and the
    # backend will verify tokens against the project's JWKS endpoint.
    supabase_jwt_secret: str = ""

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
