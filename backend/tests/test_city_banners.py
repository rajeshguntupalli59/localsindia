import pytest


def _payload(city, **overrides):
    payload = {
        "city_id": str(city.id),
        "advertiser_name": "Test Sponsor",
        "image_url": "https://res.cloudinary.com/test/banner.png",
        "link_url": "https://example.com",
        "start_date": "2020-01-01",
        "end_date": "2099-12-31",
    }
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_admin_create_and_list_banner(admin_client, city):
    admin_ac, _admin = admin_client
    resp = await admin_ac.post("/api/v1/admin/banners", json=_payload(city))
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["advertiser_name"] == "Test Sponsor"
    assert data["city_id"] == str(city.id)

    listed = await admin_ac.get("/api/v1/admin/banners")
    assert listed.status_code == 200
    assert any(b["id"] == data["id"] for b in listed.json())


@pytest.mark.asyncio
async def test_admin_create_rejects_end_before_start(admin_client, city):
    admin_ac, _admin = admin_client
    resp = await admin_ac.post(
        "/api/v1/admin/banners",
        json=_payload(city, start_date="2026-01-10", end_date="2026-01-01"),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_admin_create_requires_admin_role(auth_client, city):
    ac, _user = auth_client
    resp = await ac.post("/api/v1/admin/banners", json=_payload(city))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_delete_banner(admin_client, city):
    admin_ac, _admin = admin_client
    created = (await admin_ac.post("/api/v1/admin/banners", json=_payload(city))).json()

    resp = await admin_ac.delete(f"/api/v1/admin/banners/{created['id']}")
    assert resp.status_code == 200

    listed = await admin_ac.get("/api/v1/admin/banners")
    assert all(b["id"] != created["id"] for b in listed.json())


@pytest.mark.asyncio
async def test_public_get_active_banner_for_city(client, admin_client, city):
    admin_ac, _admin = admin_client
    await admin_ac.post("/api/v1/admin/banners", json=_payload(city))

    resp = await client.get(f"/api/v1/cities/{city.slug}/banner")
    assert resp.status_code == 200
    data = resp.json()
    assert data is not None
    assert data["advertiser_name"] == "Test Sponsor"


@pytest.mark.asyncio
async def test_public_get_banner_returns_null_when_none_active(client, admin_client, db):
    from app.models.city import City

    other_city = City(name="Test City No Banner", state="Telangana", slug="test-city-no-banner", lang_default="te")
    db.add(other_city)
    await db.commit()
    await db.refresh(other_city)

    admin_ac, _admin = admin_client
    await admin_ac.post(
        "/api/v1/admin/banners",
        json=_payload(other_city, start_date="2020-01-01", end_date="2020-01-31"),
    )

    resp = await client.get(f"/api/v1/cities/{other_city.slug}/banner")
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.asyncio
async def test_public_get_banner_404_for_unknown_city(client):
    resp = await client.get("/api/v1/cities/not-a-real-city/banner")
    assert resp.status_code == 404
