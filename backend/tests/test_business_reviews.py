"""One-tap ratings use POST /businesses/{id}/reviews with a rating and no text."""
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.conftest import _make_engine


async def _business(city, category, **kw):
    from app.models.business import Business
    b = Business(city_id=city.id, category_id=category.id, name="Rated Shop", **kw)
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        s.add(b)
        await s.commit()
    await engine.dispose()
    return b


@pytest.mark.asyncio
async def test_rating_without_text_updates_the_average(auth_client, city, category):
    client, _ = auth_client
    b = await _business(city, category)
    r = await client.post(f"/api/v1/businesses/{b.id}/reviews", json={"rating": 4})
    assert r.status_code == 201 and r.json()["body"] is None
    shown = (await client.get(f"/api/v1/businesses/{b.id}")).json()
    assert shown["review_count"] == 1 and shown["avg_rating"] == 4


@pytest.mark.asyncio
async def test_one_rating_per_person(auth_client, city, category):
    client, _ = auth_client
    b = await _business(city, category)
    assert (await client.post(f"/api/v1/businesses/{b.id}/reviews", json={"rating": 5})).status_code == 201
    assert (await client.post(f"/api/v1/businesses/{b.id}/reviews", json={"rating": 1})).status_code == 409


@pytest.mark.asyncio
async def test_owner_cannot_rate_their_own_business(auth_client, city, category):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id)
    r = await client.post(f"/api/v1/businesses/{b.id}/reviews", json={"rating": 5})
    assert r.status_code == 403
    assert (await client.get(f"/api/v1/businesses/{b.id}")).json()["review_count"] == 0
