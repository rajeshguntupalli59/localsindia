import pytest


@pytest.mark.asyncio
async def test_report_error_accepted_without_auth(client):
    resp = await client.post("/api/v1/errors/report", json={
        "platform": "mobile",
        "message": "TypeError: Cannot read property 'id' of undefined",
        "context": "ListingDetailScreen",
        "app_version": "1.0.0",
    })
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_report_error_rejects_invalid_platform(client):
    resp = await client.post("/api/v1/errors/report", json={
        "platform": "desktop",
        "message": "Some error",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_report_error_rejects_empty_message(client):
    resp = await client.post("/api/v1/errors/report", json={
        "platform": "web",
        "message": "   ",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_admin_can_list_grouped_errors(client, admin_client):
    admin_ac, _admin = admin_client

    for _ in range(3):
        await client.post("/api/v1/errors/report", json={
            "platform": "mobile",
            "message": "Network request failed",
            "context": "PostScreen",
        })
    await client.post("/api/v1/errors/report", json={
        "platform": "web",
        "message": "Unhandled rejection: fetch failed",
        "context": "/listing/[id]",
    })

    resp = await admin_ac.get("/api/v1/admin/errors")
    assert resp.status_code == 200
    data = resp.json()
    grouped = {row["message"]: row for row in data}
    assert grouped["Network request failed"]["count"] == 3
    assert grouped["Network request failed"]["platform"] == "mobile"
    assert grouped["Unhandled rejection: fetch failed"]["count"] == 1


@pytest.mark.asyncio
async def test_regular_user_cannot_list_errors(auth_client):
    ac, _user = auth_client
    resp = await ac.get("/api/v1/admin/errors")
    assert resp.status_code == 403
