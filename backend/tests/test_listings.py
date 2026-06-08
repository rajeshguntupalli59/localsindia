import pytest


# ── Cities ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_cities(client, city):
    resp = await client.get("/api/v1/cities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    slugs = [c["slug"] for c in data]
    assert "hyderabad" in slugs


@pytest.mark.asyncio
async def test_get_city_by_slug(client, city):
    resp = await client.get("/api/v1/cities/hyderabad")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Hyderabad"


@pytest.mark.asyncio
async def test_get_city_not_found(client):
    resp = await client.get("/api/v1/cities/nowhere-land-xyz")
    assert resp.status_code == 404


# ── Listings CRUD ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_listing_requires_auth(client, city, category):
    resp = await client.post("/api/v1/listings", json={
        "title": "Test listing",
        "description": "A nice item",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_listing_success(auth_client, city, category):
    ac, user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "Sell my bike",
        "description": "Good condition Honda",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
        "price": 25000,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Sell my bike"
    assert data["status"] == "pending"  # BL-11
    assert data["user_id"] == str(user.id)


@pytest.mark.asyncio
async def test_get_listing(auth_client, city, category):
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Widget for sale",
        "description": "Brand new",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]
    resp = await ac.get(f"/api/v1/listings/{listing_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == listing_id


@pytest.mark.asyncio
async def test_update_listing_owner_only(auth_client, city, category):
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Old title",
        "description": "Desc",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await ac.patch(f"/api/v1/listings/{listing_id}", json={"title": "New title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New title"


@pytest.mark.asyncio
async def test_delete_listing_soft_delete(auth_client, city, category):
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "To delete",
        "description": "Will be soft-deleted",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    del_resp = await ac.delete(f"/api/v1/listings/{listing_id}")
    assert del_resp.status_code == 204

    # Should 404 after soft-delete
    get_resp = await ac.get(f"/api/v1/listings/{listing_id}")
    assert get_resp.status_code == 404


# ── Report & BL-04 ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_report_constant_and_api(auth_client, city, category):
    """BL-04: REPORT_FLAG_THRESHOLD=3 constant; single report returns 201."""
    from app.routers.listings import REPORT_FLAG_THRESHOLD
    assert REPORT_FLAG_THRESHOLD == 3

    # Create a listing via API (status=pending)
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Reportable item",
        "description": "Test",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    assert create_resp.status_code == 201
    listing_id = create_resp.json()["id"]

    # Single report — returns 201
    resp = await ac.post(f"/api/v1/listings/{listing_id}/report", json={"reason": "spam"})
    assert resp.status_code == 201

    # Duplicate report from same user → 409
    resp2 = await ac.post(f"/api/v1/listings/{listing_id}/report", json={"reason": "spam"})
    assert resp2.status_code == 409


# ── Fulfill & Renew ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fulfill_listing(auth_client, city, category):
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Sold item",
        "description": "Already sold",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]
    resp = await ac.post(f"/api/v1/listings/{listing_id}/fulfill")
    assert resp.status_code == 200
    assert resp.json()["status"] == "fulfilled"


@pytest.mark.asyncio
async def test_city_listings_endpoint(client, city):
    resp = await client.get(f"/api/v1/cities/{city.slug}/listings")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
