import pytest


async def _create_business(auth_client, city):
    ac, _user = auth_client
    res = await ac.post(
        "/api/v1/businesses",
        json={"name": "Test Business", "city_id": str(city.id)},
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest.mark.asyncio
async def test_view_and_wa_click_are_tracked(client, auth_client, city):
    business = await _create_business(auth_client, city)
    biz_id = business["id"]

    for _ in range(3):
        r = await client.post(f"/api/v1/businesses/{biz_id}/view")
        assert r.status_code == 204
    for _ in range(2):
        r = await client.post(f"/api/v1/businesses/{biz_id}/wa-click")
        assert r.status_code == 204

    ac, _user = auth_client
    res = await ac.get(f"/api/v1/analytics/business/{biz_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["views_30d"] == 3
    assert data["whatsapp_clicks_30d"] == 2
    assert data["review_count"] == 0
    assert data["avg_rating"] == 0.0
    assert len(data["daily_trend"]) >= 1
    today = data["daily_trend"][-1]
    assert today["views"] == 3
    assert today["whatsapp_clicks"] == 2


@pytest.mark.asyncio
async def test_view_wa_click_are_fire_and_forget_no_error_on_bad_id(client):
    r = await client.post("/api/v1/businesses/00000000-0000-0000-0000-000000000000/view")
    assert r.status_code == 204
    r = await client.post("/api/v1/businesses/00000000-0000-0000-0000-000000000000/wa-click")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_analytics_requires_owner(client, auth_client, db):
    """A second, unrelated user must not be able to view someone else's business analytics."""
    import uuid
    from app.models.user import User
    from app.models.city import City
    from app.core.security import create_access_token
    from sqlalchemy import select

    result = await db.execute(select(City).where(City.slug == "hyderabad"))
    hyd = result.scalar_one()

    business = await _create_business(auth_client, hyd)
    biz_id = business["id"]

    other = User(phone=f"+9190{uuid.uuid4().int % 10**9:09d}", name="Someone Else")
    db.add(other)
    await db.commit()
    await db.refresh(other)
    other_token = create_access_token(str(other.id))

    res = await client.get(
        f"/api/v1/analytics/business/{biz_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_analytics_admin_can_view_any_business(auth_client, admin_client, city):
    business = await _create_business(auth_client, city)
    biz_id = business["id"]

    admin_ac, _admin = admin_client
    res = await admin_ac.get(f"/api/v1/analytics/business/{biz_id}")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_analytics_nonexistent_business_404(auth_client):
    ac, _user = auth_client
    res = await ac.get("/api/v1/analytics/business/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_analytics_reflects_reviews_and_rating(client, auth_client, admin_client, city):
    business = await _create_business(auth_client, city)
    biz_id = business["id"]

    admin_ac, _admin = admin_client
    res = await admin_ac.post(
        f"/api/v1/businesses/{biz_id}/reviews",
        json={"rating": 4, "body": "Good service"},
    )
    assert res.status_code == 201, res.text

    ac, _user = auth_client
    res = await ac.get(f"/api/v1/analytics/business/{biz_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["review_count"] == 1
    assert data["avg_rating"] == 4.0
