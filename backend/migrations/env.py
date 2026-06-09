import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import Base
import app.models  # noqa: F401 — registers all models with Base.metadata

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    cfg = config.get_section(config.config_ini_section, {})

    # Allow DATABASE_URL env var to override alembic.ini (used for Azure migrations)
    db_url = os.getenv("DATABASE_URL") or cfg.get("sqlalchemy.url")

    # asyncpg requires ssl as connect_arg, not a URL query param
    connect_args = {}
    if db_url and "?" in db_url:
        base, qs = db_url.split("?", 1)
        params = dict(p.split("=", 1) for p in qs.split("&") if "=" in p)
        ssl_val = params.pop("ssl", None) or params.pop("sslmode", None)
        if ssl_val and ssl_val not in ("disable", "allow"):
            connect_args["ssl"] = True
        remaining = "&".join(f"{k}={v}" for k, v in params.items())
        db_url = f"{base}?{remaining}" if remaining else base

    cfg["sqlalchemy.url"] = db_url

    connectable = async_engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
