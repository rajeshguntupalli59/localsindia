import pytest


@pytest.mark.asyncio
async def test_list_buyer_requests_empty(client, city):
    resp = await client.get(f"/api/v1/buyer-requests/cities/{city.slug}")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_buyer_requests_city_not_found(client):
    resp = await client.get("/api/v1/buyer-requests/cities/nowhere-land-xyz")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_buyer_request_requires_auth(client, city, category):
    resp = await client.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle",
        "contact_phone": "+919876543210",
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_buyer_request_success(auth_client, city, category):
    ac, user = auth_client
    resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle",
        "budget": 3000,
        "contact_phone": "+919876543210",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["description"] == "Looking for a used bicycle"
    assert data["status"] == "open"
    assert data["user_id"] == str(user.id)
    assert data["category_slug"] == category.slug


@pytest.mark.asyncio
async def test_create_buyer_request_short_description_rejected(auth_client, city, category):
    ac, _user = auth_client
    resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "too short",
        "contact_phone": "+919876543210",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_created_request_appears_in_city_list(auth_client, city, category):
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle, unique marker",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    resp = await ac.get(f"/api/v1/buyer-requests/cities/{city.slug}")
    assert resp.status_code == 200
    data = resp.json()
    match = next((r for r in data if r["id"] == request_id), None)
    assert match is not None
    assert match["description"] == "Looking for a used bicycle, unique marker"


@pytest.mark.asyncio
async def test_fulfill_buyer_request(auth_client, city, category):
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    fulfill_resp = await ac.patch(f"/api/v1/buyer-requests/{request_id}/fulfill")
    assert fulfill_resp.status_code == 200
    assert fulfill_resp.json()["status"] == "fulfilled"

    # Fulfilled requests drop out of the public city feed
    list_resp = await ac.get(f"/api/v1/buyer-requests/cities/{city.slug}")
    ids = [r["id"] for r in list_resp.json()]
    assert request_id not in ids


@pytest.mark.asyncio
async def test_fulfill_buyer_request_requires_owner(auth_client, client, city, category):
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    # A different, unauthenticated caller cannot fulfill someone else's request
    resp = await client.patch(f"/api/v1/buyer-requests/{request_id}/fulfill")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_buyer_request(auth_client, city, category):
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    delete_resp = await ac.delete(f"/api/v1/buyer-requests/{request_id}")
    assert delete_resp.status_code == 204

    list_resp = await ac.get(f"/api/v1/buyer-requests/cities/{city.slug}")
    ids = [r["id"] for r in list_resp.json()]
    assert request_id not in ids
