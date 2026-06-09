from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


def _make_engine():
    url = settings.DATABASE_URL
    connect_args = {}
    # asyncpg requires ssl as connect_arg, not a URL query param
    if "?" in url:
        base, qs = url.split("?", 1)
        params = dict(p.split("=", 1) for p in qs.split("&") if "=" in p)
        ssl_val = params.pop("ssl", None) or params.pop("sslmode", None)
        if ssl_val and ssl_val not in ("disable", "allow"):
            connect_args["ssl"] = True
        remaining = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{base}?{remaining}" if remaining else base
    return create_async_engine(url, echo=False, pool_pre_ping=True, connect_args=connect_args)


engine = _make_engine()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
