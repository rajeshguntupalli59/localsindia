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
