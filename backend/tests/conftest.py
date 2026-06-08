import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.core.database import Base, get_db

TEST_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/localindia_test"


def _make_engine():
    return create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client():
    engine = _make_engine()
    TestSession = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with TestSession() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def db():
    engine = _make_engine()
    TestSession = async_sessionmaker(engine, expire_on_commit=False)
    async with TestSession() as session:
        yield session
    await engine.dispose()


# ── Shared data fixtures ───────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def city():
    """Ensure hyderabad city exists; uses its own session."""
    from app.models.city import City
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        result = await session.execute(select(City).where(City.slug == "hyderabad"))
        c = result.scalar_one_or_none()
        if not c:
            c = City(name="Hyderabad", state="Telangana", slug="hyderabad", lang_default="te")
            session.add(c)
            await session.commit()
            await session.refresh(c)
    await engine.dispose()
    return c


@pytest_asyncio.fixture
async def category():
    """Create a test category; uses its own session."""
    from app.models.category import Category
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    slug = f"test-cat-{uuid.uuid4().hex[:6]}"
    async with Session() as session:
        cat = Category(name="Test Category", slug=slug, sort_order=0)
        session.add(cat)
        await session.commit()
        await session.refresh(cat)
    await engine.dispose()
    return cat


@pytest_asyncio.fixture
async def user_and_token():
    """Returns (user, access_token) for a fresh test user; uses its own session."""
    from app.models.user import User
    from app.core.security import create_access_token
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    phone = f"+9190{uuid.uuid4().int % 10**9:09d}"
    async with Session() as session:
        user = User(phone=phone, name="Test User")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        uid = str(user.id)
        u = user
    await engine.dispose()
    token = create_access_token(uid)
    return u, token


@pytest_asyncio.fixture
async def auth_client(user_and_token):
    """AsyncClient pre-configured with a valid Bearer token."""
    _user, token = user_and_token
    engine = _make_engine()
    TestSession = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with TestSession() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        ac.headers.update({"Authorization": f"Bearer {token}"})
        yield ac, _user
    app.dependency_overrides.clear()
    await engine.dispose()
