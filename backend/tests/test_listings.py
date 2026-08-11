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


# Regression test: this is the endpoint the mobile Search screen actually
# calls (not /search) — the q-filter here used to require the whole typed
# phrase as one literal substring, so "dental service near me" found nothing
# even for a listing that obviously matches "dental" alone.
@pytest.mark.asyncio
async def test_city_listings_extra_word_does_not_break_match(client, db, auth_client, city, category):
    ac, _user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "Best Dentist Near Me",
        "description": "Advanced dental care for the whole family.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543214",
    })
    listing_id = resp.json()["id"]

    from sqlalchemy import select
    from app.models.listing import Listing
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"
    await db.commit()

    resp = await client.get(f"/api/v1/cities/{city.slug}/listings?q=dental+service+near+me")
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.json()]
    assert listing_id in ids


@pytest.mark.asyncio
async def test_city_listings_orders_by_distance_when_location_given(client, db, auth_client, city, category):
    ac, _user = auth_client

    near_resp = await ac.post("/api/v1/listings", json={
        "title": "Nearby Grocery Store",
        "description": "Fresh produce daily.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543215",
    })
    far_resp = await ac.post("/api/v1/listings", json={
        "title": "Faraway Grocery Store",
        "description": "Fresh produce daily.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543216",
    })

    from sqlalchemy import select
    from app.models.listing import Listing

    near_id, far_id = near_resp.json()["id"], far_resp.json()["id"]

    result = await db.execute(select(Listing).where(Listing.id == near_id))
    near = result.scalar_one()
    near.status = "active"
    near.latitude, near.longitude = 17.4000, 78.4800

    result = await db.execute(select(Listing).where(Listing.id == far_id))
    far = result.scalar_one()
    far.status = "active"
    far.latitude, far.longitude = 17.4450, 78.4800  # ~5km north

    await db.commit()

    resp = await client.get(
        f"/api/v1/cities/{city.slug}/listings?q=grocery&lat=17.4010&lng=78.4800"
    )
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.json()]
    assert ids.index(near_id) < ids.index(far_id)


@pytest.mark.asyncio
async def test_category_details_round_trip_for_vehicles(client, db, auth_client, city):
    """Category-specific structured fields (real typed columns per category,
    see models/listing_details.py) persist on create and come back on GET,
    for a category that has them."""
    from app.models.category import Category
    vehicles_cat = Category(name="Vehicles", slug="vehicles", sort_order=0)
    db.add(vehicles_cat)
    await db.commit()
    await db.refresh(vehicles_cat)

    ac, _user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "Honda Activa 6G 2022",
        "description": "Low mileage, single owner.",
        "category_id": str(vehicles_cat.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543215",
        "category_details": {
            "brand": "Honda",
            "model": "Activa 6G",
            "year": 2022,
            "km_driven": 4500,
            "fuel_type": "Petrol",
            "transmission": "Automatic",
            "owners_count": 1,
        },
    })
    assert resp.status_code == 201
    created = resp.json()
    assert created["category_details"]["brand"] == "Honda"
    assert created["category_details"]["year"] == 2022

    get_resp = await ac.get(f"/api/v1/listings/{created['id']}")
    assert get_resp.status_code == 200
    fetched = get_resp.json()
    assert fetched["category_details"]["model"] == "Activa 6G"
    assert fetched["category_details"]["km_driven"] == 4500


@pytest.mark.asyncio
async def test_category_details_absent_for_classifieds(auth_client, city, category):
    """Classifieds (and any category without a details table) returns
    category_details: null rather than an empty/error payload."""
    ac, _user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "Old sofa for sale",
        "description": "Good condition.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543216",
    })
    assert resp.status_code == 201
    assert resp.json()["category_details"] is None


# ── is_seed (city_launcher.py exemption from the expiry cron) ──────────────────

@pytest.mark.asyncio
async def test_regular_user_cannot_set_is_seed(auth_client, city, category):
    """A non-admin sending is_seed=True must be silently ignored — otherwise
    any user could mark their own listing as permanently non-expiring."""
    ac, _user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "Trying to self-mark as a seed listing",
        "description": "Should be forced back to is_seed=False server-side.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543217",
        "is_seed": True,
    })
    assert resp.status_code == 201
    assert resp.json()["is_seed"] is False


@pytest.mark.asyncio
async def test_admin_can_set_is_seed(admin_client, city, category):
    ac, _admin = admin_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "City launcher seed listing",
        "description": "Created by city_launcher.py as the admin user.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543218",
        "is_seed": True,
    })
    assert resp.status_code == 201
    assert resp.json()["is_seed"] is True
