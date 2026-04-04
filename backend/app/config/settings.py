from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

# Resolves to backend/.env regardless of where uvicorn is invoked from
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    gemini_api_key: str

    class Config:
        env_file = str(_ENV_FILE)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
