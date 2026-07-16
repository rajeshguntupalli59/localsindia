import pytest


@pytest.mark.asyncio
async def test_search_requires_q_and_city(client):
    resp = await client.get("/api/v1/search?city_slug=hyderabad")
    assert resp.status_code == 422  # q is required


@pytest.mark.asyncio
async def test_search_city_not_found(client):
    resp = await client.get("/api/v1/search?q=tiffin&city_slug=nowhere-xyz")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_search_returns_results_structure(client):
    resp = await client.get("/api/v1/search?q=tiffin&city_slug=hyderabad")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_search_empty_results(client):
    resp = await client.get("/api/v1/search?q=xyznonexistentitem12345&city_slug=hyderabad")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


# TC-009: SQL injection must NOT crash the server — parameterized queries protect us
@pytest.mark.asyncio
async def test_search_sql_injection_safe(client):
    payloads = [
        "' OR '1'='1",
        "'; DROP TABLE listings; --",
        "1; SELECT * FROM users",
        "\" OR 1=1 --",
    ]
    for payload in payloads:
        from urllib.parse import quote
        resp = await client.get(f"/api/v1/search?q={quote(payload)}&city_slug=hyderabad")
        # Must return 200 with empty results, NEVER 500
        assert resp.status_code == 200, f"Injection payload crashed server: {payload!r}"
        assert resp.json()["items"] == []


@pytest.mark.asyncio
async def test_search_pagination(client):
    resp = await client.get("/api/v1/search?q=test&city_slug=hyderabad&page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert len(data["items"]) <= 5


# Regression test for a real bug: plainto_tsquery ANDs every word together, so
# adding one harmless extra word ("service") that isn't in the listing's own
# text used to make an otherwise-perfect match return zero results. Confirmed
# live against production before fixing: "dental service near me" returned
# nothing even though "dental" alone matched a real listing.
@pytest.mark.asyncio
async def test_search_extra_word_does_not_break_match(client, db, auth_client, city, category):
    ac, _user = auth_client
    resp = await ac.post("/api/v1/listings", json={
        "title": "Best Dentist Near Me",
        "description": "Advanced dental care for the whole family.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = resp.json()["id"]

    from sqlalchemy import select
    from app.models.listing import Listing
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"
    await db.commit()

    # "service" appears in neither the title nor the description.
    resp = await client.get(f"/api/v1/search?q=dental+service+near+me&city_slug={city.slug}")
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.json()["items"]]
    assert listing_id in ids


@pytest.mark.asyncio
async def test_search_orders_by_distance_when_location_given(client, db, auth_client, city, category):
    ac, _user = auth_client

    # Hyderabad-ish coordinates, ~1km apart, and one far-away (~5km) listing.
    near_resp = await ac.post("/api/v1/listings", json={
        "title": "Nearby Tiffin Service",
        "description": "Home-cooked meals delivered fresh daily.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543211",
    })
    far_resp = await ac.post("/api/v1/listings", json={
        "title": "Faraway Tiffin Service",
        "description": "Home-cooked meals delivered fresh daily.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543212",
    })
    unlocated_resp = await ac.post("/api/v1/listings", json={
        "title": "Unlocated Tiffin Service",
        "description": "Home-cooked meals delivered fresh daily.",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543213",
    })

    from sqlalchemy import select
    from app.models.listing import Listing

    near_id, far_id, unlocated_id = near_resp.json()["id"], far_resp.json()["id"], unlocated_resp.json()["id"]

    result = await db.execute(select(Listing).where(Listing.id == near_id))
    near = result.scalar_one()
    near.status = "active"
    near.latitude, near.longitude = 17.4000, 78.4800

    result = await db.execute(select(Listing).where(Listing.id == far_id))
    far = result.scalar_one()
    far.status = "active"
    far.latitude, far.longitude = 17.4450, 78.4800  # ~5km north

    result = await db.execute(select(Listing).where(Listing.id == unlocated_id))
    unlocated = result.scalar_one()
    unlocated.status = "active"
    # No latitude/longitude set — must still appear in results.

    await db.commit()

    resp = await client.get(
        f"/api/v1/search?q=tiffin&city_slug={city.slug}&lat=17.4010&lng=78.4800"
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    ids = [item["id"] for item in items]

    assert near_id in ids and far_id in ids and unlocated_id in ids

    # Nearest listing should rank ahead of the far one.
    assert ids.index(near_id) < ids.index(far_id)
