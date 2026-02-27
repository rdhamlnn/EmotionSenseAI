from pydantic_settings import BaseSettings
import os
import socket
from urllib.parse import quote_plus


def _resolve_database_url(ref: str, password: str) -> str:
    """Return Supabase URL if host is reachable, otherwise fall back to SQLite."""
    supabase_db_url = (
        f"postgresql+psycopg2://postgres:"
        f"{quote_plus(password)}"
        f"@db.{ref}.supabase.co:5432/postgres"
    )
    sqlite_fallback = "sqlite:///./dev.db"

    host = f"db.{ref}.supabase.co"
    try:
        socket.getaddrinfo(host, 5432, socket.AF_UNSPEC, socket.SOCK_STREAM)
        print(f"[INFO] Supabase host '{host}' resolved OK → using PostgreSQL")
        return supabase_db_url
    except socket.gaierror:
        print(
            f"[WARNING] Cannot resolve '{host}' (DNS/network issue). "
            f"Falling back to local SQLite: {sqlite_fallback}"
        )
        return sqlite_fallback


class Settings(BaseSettings):
    # Secrets — loaded from .env
    SUPABASE_REF: str = "fbyayoiuyxargjmkipuo"
    SUPABASE_PASSWORD: str = "#TugasAkhir15"
    SECRET_KEY: str = "emotionsense-secret-key-change-in-production-2026"

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Supabase API
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Database URL — resolved after instantiation
    DATABASE_URL: str = ""

    # Paths
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    DATASET_PATH: str = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "EmotionSenseAi",
        "DatasetGabungan.csv",
    )
    KAMUS_PATH: str = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "EmotionSenseAi",
        "kamus_singkatan.csv",
    )
    MODEL_PATH: str = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "ml", "model.joblib"
    )

    class Config:
        env_file = ".env"


settings = Settings()

# Resolve DATABASE_URL from Supabase credentials (with SQLite fallback)
if not settings.DATABASE_URL:
    settings.DATABASE_URL = _resolve_database_url(
        settings.SUPABASE_REF, settings.SUPABASE_PASSWORD
    )
