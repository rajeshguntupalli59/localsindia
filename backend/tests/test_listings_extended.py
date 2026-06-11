"""
Extended listing tests — covers all fields, BL-02 (max listings), reviews,
renew, wa-click, categories, and non-owner access control.
"""
import uuid
import pytest


# ── Optional fields saved correctly ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_listing_with_area(auth_client, city, category):
    """area field is persisted and returned (migration b2c3d4e5f6a7)."""
    ac, _user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "Tiffin near Hitech City",
        "description": "Fresh homemade tiffin delivered daily",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
        "area": "Kondapur",
    })
    assert resp.status_code == 201
    assert resp.json()["area"] == "Kondapur"


@pytest.mark.asyncio
async def test_create_listing_with_optional_links(auth_client, city, category):
    """website_url and social_url are persisted and returned."""
    ac, _user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "My bakery",
        "description": "Fresh cakes every morning",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
        "website_url": "https://mybakery.in",
        "social_url": "https://instagram.com/mybakery",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["website_url"] == "https://mybakery.in"
    assert data["social_url"] == "https://instagram.com/mybakery"


@pytest.mark.asyncio
async def test_create_listing_area_none_by_default(auth_client, city, category):
    """area defaults to None when not provided."""
    ac, _user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "No area listing",
        "description": "Area field omitted",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    assert resp.status_code == 201
    assert resp.json()["area"] is None


# ── BL-02: max 10 active/pending listings per user per city ───────────────────

@pytest.mark.asyncio
async def test_bl02_max_active_listings(auth_client, city, category):
    """BL-02: 11th listing in same city returns HTTP 429."""
    ac, _user = auth_client
    base = {
        "description": "Standard item",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    }
    for i in range(10):
        r = await ac.post("/api/v1/listings", json={**base, "title": f"BL-02 Item {i + 1}"})
        assert r.status_code == 201, f"listing {i + 1} unexpectedly failed: {r.text}"

    eleventh = await ac.post("/api/v1/listings", json={**base, "title": "BL-02 Item 11"})
    assert eleventh.status_code == 429
    assert "10" in eleventh.json()["detail"]


# ── My listings ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_my_listings_returns_only_own(auth_client, city, category):
    """GET /listings/mine returns only the authenticated user's listings."""
    ac, user = auth_client
    await ac.post("/api/v1/listings", json={
        "title": "My personal listing",
        "description": "Only mine",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    resp = await ac.get("/api/v1/listings/mine")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list) and len(data) >= 1
    assert all(listing["user_id"] == str(user.id) for listing in data)


# ── Update non-owner forbidden ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_non_owner_forbidden(auth_client, admin_client, city, category):
    """PATCH by a different user (even admin) returns 403."""
    ac, _owner = auth_client
    admin_ac, _admin = admin_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Owner-only listing",
        "description": "Non-owner should be blocked",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await admin_ac.patch(f"/api/v1/listings/{listing_id}", json={"title": "Hijacked"})
    assert resp.status_code == 403


# ── Renew ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_renew_listing_resets_to_pending(auth_client, city, category):
    """Renewing a listing sets status='pending' and updates expires_at."""
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Stale listing",
        "description": "Will be renewed",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await ac.post(f"/api/v1/listings/{listing_id}/renew")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"
    assert data["expires_at"] is not None


@pytest.mark.asyncio
async def test_renew_non_owner_forbidden(auth_client, admin_client, city, category):
    """Non-owner cannot renew a listing."""
    ac, _owner = auth_client
    admin_ac, _admin = admin_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Renew non-owner test",
        "description": "Non-owner blocked",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await admin_ac.post(f"/api/v1/listings/{listing_id}/renew")
    assert resp.status_code == 403


# ── WA click ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_wa_click_pending_is_noop(auth_client, city, category):
    """wa-click on a pending listing returns 204 and is a no-op."""
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "WA click pending test",
        "description": "Pending listing",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await ac.post(f"/api/v1/listings/{listing_id}/wa-click")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_wa_click_marks_verified_when_active(auth_client, admin_client, city, category):
    """wa-click on an active listing sets wa_verified=True (verified via API GET)."""
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "WA verify test",
        "description": "Will be approved by admin then wa-clicked",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    assert create_resp.status_code == 201
    listing_id = create_resp.json()["id"]

    # Approve via admin so listing is active
    approve_resp = await admin_ac.patch(f"/api/v1/admin/listings/{listing_id}/approve")
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "active"

    # WA click
    resp = await ac.post(f"/api/v1/listings/{listing_id}/wa-click")
    assert resp.status_code == 204

    # wa_verified is in ListingOut — verify via API (no db fixture needed)
    get_resp = await ac.get(f"/api/v1/listings/{listing_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["wa_verified"] is True


# ── Reviews ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_reviews_empty_on_new_listing(auth_client, city, category):
    """New listing has an empty reviews list."""
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Review target",
        "description": "No reviews yet",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await ac.get(f"/api/v1/listings/{listing_id}/reviews")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_submit_review_persists_rating_and_body(auth_client, city, category):
    """Submitted review is returned with correct rating and body."""
    ac, user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Reviewable listing",
        "description": "Great product",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await ac.post(f"/api/v1/listings/{listing_id}/reviews", json={
        "rating": 5,
        "body": "Excellent seller, fast delivery!",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["rating"] == 5
    assert data["body"] == "Excellent seller, fast delivery!"
    assert data["listing_id"] == listing_id
    assert data["user_id"] == str(user.id)


@pytest.mark.asyncio
async def test_duplicate_review_returns_409(auth_client, city, category):
    """TC-019: same user cannot submit two reviews for the same listing."""
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "TC-019 listing",
        "description": "Uniqueness check",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    r1 = await ac.post(f"/api/v1/listings/{listing_id}/reviews", json={"rating": 4})
    assert r1.status_code == 201

    r2 = await ac.post(f"/api/v1/listings/{listing_id}/reviews", json={"rating": 3})
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_review_rating_out_of_range_returns_422(auth_client, city, category):
    """Ratings outside [1..5] must be rejected with HTTP 422."""
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Rating validation listing",
        "description": "Tests validation",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    for bad_rating in (0, 6, -1, 100):
        resp = await ac.post(
            f"/api/v1/listings/{listing_id}/reviews",
            json={"rating": bad_rating},
        )
        assert resp.status_code == 422, f"Expected 422 for rating={bad_rating}"


@pytest.mark.asyncio
async def test_review_without_body_is_valid(auth_client, city, category):
    """body is optional — a rating-only review is accepted."""
    ac, _user = auth_client
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Rating only listing",
        "description": "Body optional test",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await ac.post(f"/api/v1/listings/{listing_id}/reviews", json={"rating": 3})
    assert resp.status_code == 201
    assert resp.json()["body"] is None


# ── Categories ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_categories_list(client, category):
    """GET /categories returns a list; test category is present."""
    resp = await client.get("/api/v1/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Verify schema shape
    first = data[0]
    assert "id" in first
    assert "name" in first
    assert "slug" in first


@pytest.mark.asyncio
async def test_categories_no_auth_required(client):
    """Categories endpoint is public — no auth needed."""
    resp = await client.get("/api/v1/categories")
    assert resp.status_code == 200


# ── BL-04: 3 reports from distinct users → flagged ────────────────────────────

@pytest.mark.asyncio
async def test_three_reports_flag_listing(auth_client, city, category, db):
    """BL-04: exactly 3 distinct users reporting a listing sets status='flagged'."""
    from app.models.user import User
    from app.core.security import create_access_token
    from httpx import AsyncClient, ASGITransport
    from app.main import app as _app

    ac, _owner = auth_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Will be flagged",
        "description": "Three reporters incoming",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    # Create 3 reporter users directly in test DB and report
    for i in range(3):
        phone = f"+9195{i}{uuid.uuid4().int % 10**7:07d}"
        reporter = User(phone=phone, name=f"Reporter {i}")
        db.add(reporter)
        await db.commit()
        await db.refresh(reporter)
        token = create_access_token(str(reporter.id))

        async with AsyncClient(transport=ASGITransport(app=_app), base_url="http://test") as reporter_ac:
            reporter_ac.headers.update({"Authorization": f"Bearer {token}"})
            r = await reporter_ac.post(
                f"/api/v1/listings/{listing_id}/report",
                json={"reason": "spam"},
            )
            assert r.status_code == 201

    # After 3 reports listing must be flagged
    get_resp = await ac.get(f"/api/v1/listings/{listing_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["status"] == "flagged"
