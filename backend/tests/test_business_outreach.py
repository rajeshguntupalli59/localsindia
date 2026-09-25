import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.conftest import _make_engine


async def _business(city, category, name, phone, owner_id=None):
    from app.models.business import Business
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        b = Business(city_id=city.id, category_id=category.id, name=name, phone=phone, owner_id=owner_id)
        s.add(b)
        await s.commit()
        await s.refresh(b)
    await engine.dispose()
    return b


def _ids(res):
    return [i["id"] for i in res.json()["items"]]


@pytest.mark.asyncio
async def test_queue_buckets_and_logging(admin_client, city, category):
    admin, admin_user = admin_client
    mobile = await _business(city, category, "B Mobile Tiffins", "+91 98480 22338")
    landline = await _business(city, category, "A Landline Stores", "040 2345 6789")
    await _business(city, category, "No Phone Shop", None)
    q = f"/api/v1/admin/outreach?city_slug={city.slug}&category_slug={category.slug}"

    todo = await admin.get(q)
    assert todo.status_code == 200
    # Only businesses with a phone; mobiles first even though "A…" sorts earlier
    assert _ids(todo) == [str(mobile.id), str(landline.id)]
    assert todo.json()["items"][0]["mobile"] == "+919848022338"
    assert todo.json()["items"][1]["mobile"] is None
    assert todo.json()["counts"] == {"todo": 2, "follow_up": 0, "closed": 0, "claimed": 0}

    assert (await admin.post(f"/api/v1/admin/outreach/{mobile.id}", json={"outcome": "whatsapp_sent"})).status_code == 201
    r = await admin.post(f"/api/v1/admin/outreach/{landline.id}", json={"outcome": "wrong_number", "note": "a pharmacy now"})
    assert r.json()["status"] == "closed"

    follow = await admin.get(q + "&status=follow_up")
    assert _ids(follow) == [str(mobile.id)]
    item = follow.json()["items"][0]
    assert item["last_outcome"] == "whatsapp_sent" and item["attempts"] == 1
    closed = await admin.get(q + "&status=closed")
    assert _ids(closed) == [str(landline.id)] and closed.json()["items"][0]["last_note"] == "a pharmacy now"

    # A second attempt: latest outcome wins, attempts count up
    await admin.post(f"/api/v1/admin/outreach/{mobile.id}", json={"outcome": "interested"})
    item = (await admin.get(q + "&status=follow_up")).json()["items"][0]
    assert item["last_outcome"] == "interested" and item["attempts"] == 2

    # Once the owner claims it, it moves to "claimed"
    from app.models.business import Business
    engine = _make_engine()
    async with async_sessionmaker(engine)() as s:
        (await s.get(Business, mobile.id)).owner_id = admin_user.id
        await s.commit()
    await engine.dispose()
    res = await admin.get(q + "&status=claimed")
    assert _ids(res) == [str(mobile.id)]
    assert res.json()["counts"] == {"todo": 0, "follow_up": 0, "closed": 1, "claimed": 1}


@pytest.mark.asyncio
async def test_owned_without_outreach_is_not_in_queue(admin_client, city, category):
    admin, admin_user = admin_client
    await _business(city, category, "Already Owned", "+91 98480 11111", owner_id=admin_user.id)
    res = await admin.get(f"/api/v1/admin/outreach?category_slug={category.slug}")
    assert res.json()["items"] == []
    assert sum(res.json()["counts"].values()) == 0


@pytest.mark.asyncio
async def test_validation_and_admin_only(auth_client, admin_client, city, category):
    client, _ = auth_client
    admin, _ = admin_client
    b = await _business(city, category, "Val Stores", "+91 98480 33333")
    assert (await client.get("/api/v1/admin/outreach")).status_code == 403
    assert (await client.post(f"/api/v1/admin/outreach/{b.id}", json={"outcome": "interested"})).status_code == 403
    assert (await admin.post(f"/api/v1/admin/outreach/{b.id}", json={"outcome": "sold"})).status_code == 422
    assert (await admin.get("/api/v1/admin/outreach?status=nope")).status_code == 422
    assert (await admin.post(f"/api/v1/admin/outreach/{uuid.uuid4()}", json={"outcome": "interested"})).status_code == 404
