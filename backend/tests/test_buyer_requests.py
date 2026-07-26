import pytest
from app.models.user import User
from app.core.security import create_access_token


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


# ── Reporting + moderation ──────────────────────────────────────────────────

async def _second_user_client(client, db):
    """A second real, distinct authenticated caller — auth_client only gives
    one user, but reporting needs someone other than the request's owner."""
    import uuid as uuid_module
    phone = f"+9191{uuid_module.uuid4().int % 10**9:09d}"
    other = User(phone=phone, name="Reporter User")
    db.add(other)
    await db.commit()
    await db.refresh(other)
    token = create_access_token(str(other.id))
    client.headers.update({"Authorization": f"Bearer {token}"})
    return other


@pytest.mark.asyncio
async def test_report_buyer_request(auth_client, client, db, city, category):
    ac, _owner = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    await _second_user_client(client, db)
    resp = await client.post(f"/api/v1/buyer-requests/{request_id}/report", json={"reason": "spam"})
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_report_buyer_request_twice_by_same_user_rejected(auth_client, client, db, city, category):
    ac, _owner = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    await _second_user_client(client, db)
    first = await client.post(f"/api/v1/buyer-requests/{request_id}/report", json={"reason": "spam"})
    assert first.status_code == 201
    second = await client.post(f"/api/v1/buyer-requests/{request_id}/report", json={"reason": "other"})
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_three_reports_flag_and_hide_buyer_request(auth_client, client, db, city, category):
    ac, _owner = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle, flag test",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    for _ in range(3):
        await _second_user_client(client, db)
        resp = await client.post(f"/api/v1/buyer-requests/{request_id}/report", json={"reason": "spam"})
        assert resp.status_code == 201

    # Flagged requests drop out of the public city feed, same as listings (BL-04)
    list_resp = await ac.get(f"/api/v1/buyer-requests/cities/{city.slug}")
    ids = [r["id"] for r in list_resp.json()]
    assert request_id not in ids


@pytest.mark.asyncio
async def test_admin_sees_flagged_buyer_request_with_reports(auth_client, client, admin_client, db, city, category):
    ac, _owner = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle, admin visibility test",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    for _ in range(3):
        await _second_user_client(client, db)
        await client.post(f"/api/v1/buyer-requests/{request_id}/report", json={"reason": "inappropriate"})

    admin_ac, _admin = admin_client
    resp = await admin_ac.get("/api/v1/admin/buyer-requests?status=flagged")
    assert resp.status_code == 200
    data = resp.json()
    match = next((r for r in data if r["id"] == request_id), None)
    assert match is not None
    assert match["report_count"] == 3
    assert len(match["reports"]) == 3
    assert match["contact_phone"] == "+919876543210"  # admin needs this to actually moderate


@pytest.mark.asyncio
async def test_admin_restore_buyer_request(auth_client, client, admin_client, db, city, category):
    ac, _owner = auth_client
    create_resp = await ac.post("/api/v1/buyer-requests", json={
        "city_slug": city.slug,
        "category_slug": category.slug,
        "description": "Looking for a used bicycle, restore test",
        "contact_phone": "+919876543210",
    })
    request_id = create_resp.json()["id"]

    for _ in range(3):
        await _second_user_client(client, db)
        await client.post(f"/api/v1/buyer-requests/{request_id}/report", json={"reason": "spam"})

    admin_ac, _admin = admin_client
    resp = await admin_ac.patch(f"/api/v1/admin/buyer-requests/{request_id}/restore")
    assert resp.status_code == 200

    list_resp = await ac.get(f"/api/v1/buyer-requests/cities/{city.slug}")
    ids = [r["id"] for r in list_resp.json()]
    assert request_id in ids
