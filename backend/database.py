import asyncpg
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    allow_write_queries: bool = False
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

settings = Settings()

pool: Optional[asyncpg.Pool] = None


async def connect_db():
    global pool

    pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=1,
        max_size=10,
    )


async def disconnect_db():
    global pool

    if pool:
        await pool.close()
        pool = None


async def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("Database pool has not been initialized")

    return pool
