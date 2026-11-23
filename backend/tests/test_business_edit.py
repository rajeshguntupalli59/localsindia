"""Owners edit their own business (PATCH /businesses/{id}); changes go live at once."""
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.conftest import _make_engine


async def _business(city, category, **kw):
    from app.models.business import Business
    kw.setdefault("name", "Carewell Clinic")
    b = Business(city_id=city.id, category_id=category.id, **kw)
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        s.add(b)
        await s.commit()
    await engine.dispose()
    return b


@pytest.mark.asyncio
async def test_owner_updates_address_pin_and_hours(auth_client, city, category):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id, address="3/1 Sarjapur Main Road",
                        latitude=12.915158, longitude=77.69957)
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={
        "address": "386/99, beside Brick Oven, Doddakannelli, 560035",
        "latitude": 12.9105, "longitude": 77.6981,
        "opening_hours": "Mo-Sa 09:00-21:00; Su off",
    })
    assert r.status_code == 200, r.text
    shown = (await client.get(f"/api/v1/businesses/{b.id}")).json()
    assert shown["address"].startswith("386/99")
    assert (shown["latitude"], shown["longitude"]) == (12.9105, 77.6981)
    assert shown["opening_hours"] == "Mo-Sa 09:00-21:00; Su off"


@pytest.mark.asyncio
async def test_stranger_cannot_edit(auth_client, city, category):
    client, _ = auth_client
    b = await _business(city, category)  # unclaimed
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={"address": "Somewhere else"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_edit_any_business(admin_client, city, category):
    client, _ = admin_client
    b = await _business(city, category)
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={"address": "Fixed by admin"})
    assert r.status_code == 200 and r.json()["address"] == "Fixed by admin"


@pytest.mark.asyncio
@pytest.mark.parametrize("phone", ["9663122267", "+915663122267", "+91966312226", "+91 96631 22267"])
async def test_bad_phone_is_refused(auth_client, city, category, phone):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id)
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={"phone": phone})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_good_phone_is_saved(auth_client, city, category):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id)
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={"phone": "+919663122267"})
    assert r.status_code == 200 and r.json()["phone"] == "+919663122267"


@pytest.mark.asyncio
@pytest.mark.parametrize("pin", [{"latitude": 12.9}, {"longitude": 77.6},
                                 {"latitude": 51.5, "longitude": -0.12},   # London
                                 {"latitude": 12.9, "longitude": 120.0}])
async def test_bad_pin_is_refused(auth_client, city, category, pin):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id)
    r = await client.patch(f"/api/v1/businesses/{b.id}", json=pin)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_null_clears_a_field_but_unsent_fields_stay(auth_client, city, category):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id, website_url="https://old.example",
                        phone="+918041234567", description="Old text")
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={"website_url": None, "description": "New text"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["website_url"] is None
    assert data["description"] == "New text"
    assert data["phone"] == "+918041234567"   # landline from OSM, not sent → untouched


@pytest.mark.asyncio
@pytest.mark.parametrize("name", [None, "", "   "])
async def test_name_cannot_be_blank(auth_client, city, category, name):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id)
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={"name": name})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_null_category_is_ignored(auth_client, city, category):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id)
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={"category_id": None, "address": "New"})
    assert r.status_code == 200 and r.json()["category_id"] == str(category.id)


@pytest.mark.asyncio
async def test_hours_too_long_is_refused(auth_client, city, category):
    client, user = auth_client
    b = await _business(city, category, owner_id=user.id)
    r = await client.patch(f"/api/v1/businesses/{b.id}", json={"opening_hours": "Mo 09:00-10:00; " * 20})
    assert r.status_code == 422
