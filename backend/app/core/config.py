import json
from functools import lru_cache
from typing import Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Quincaillerie ERP"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    database_url: str = "sqlite:///./erp_platform.db"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]
    cors_origin_regex: str = r"https://([a-z0-9-]+\.)*vercel\.app"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if value is None or value == "":
            return []

        if isinstance(value, list):
            return [str(item).strip().strip("\"'") for item in value if str(item).strip()]

        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("[") and raw.endswith("]"):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [str(item).strip().strip("\"'") for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass

            items = [part.strip().strip("\"'") for part in raw.split(",") if part.strip()]
            return items

        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.app_env.lower() == "production":
            if len(self.secret_key) < 32 or self.secret_key == "change-me-in-production":
                raise ValueError("SECRET_KEY must be a strong production secret")
            if self.database_url.startswith("sqlite"):
                raise ValueError("DATABASE_URL must use a server database in production")
            if self.debug:
                raise ValueError("DEBUG must be false in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
