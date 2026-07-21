from datetime import datetime, timedelta, timezone

import pytest

FAKE_JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100  # minimal bytes; Cloudinary is mocked in tests


async def _create_business(client, city):
    res = await client.post("/api/v1/businesses", json={
        "name": "Test Business",
        "city_id": str(city.id),
    })
    assert res.status_code == 201
    return res.json()


async def _create_event(client, city):
    event_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    res = await client.post("/api/v1/events", json={
        "title": "Test Event",
        "description": "A test event",
        "venue": "Test Venue",
        "event_date": event_date,
        "city_id": str(city.id),
    })
    assert res.status_code == 201
    return res.json()


@pytest.mark.asyncio
async def test_business_image_upload_and_delete_round_trip(auth_client, city):
    client, _user = auth_client
    business = await _create_business(client, city)

    upload_res = await client.post(
        f"/api/v1/upload/business-image/{business['id']}",
        files={"file": ("photo.jpg", FAKE_JPEG, "image/jpeg")},
    )
    assert upload_res.status_code == 201
    image = upload_res.json()
    assert image["url"]
    assert image["id"]

    get_res = await client.get(f"/api/v1/businesses/{business['id']}")
    assert get_res.status_code == 200
    images = get_res.json()["images"]
    assert len(images) == 1
    assert images[0]["id"] == image["id"]

    del_res = await client.delete(f"/api/v1/upload/business-image/{image['id']}")
    assert del_res.status_code == 204

    get_res2 = await client.get(f"/api/v1/businesses/{business['id']}")
    assert get_res2.json()["images"] == []


@pytest.mark.asyncio
async def test_business_image_upload_enforces_max_five(auth_client, city):
    client, _user = auth_client
    business = await _create_business(client, city)

    for i in range(5):
        res = await client.post(
            f"/api/v1/upload/business-image/{business['id']}",
            files={"file": (f"photo{i}.jpg", FAKE_JPEG, "image/jpeg")},
        )
        assert res.status_code == 201

    sixth = await client.post(
        f"/api/v1/upload/business-image/{business['id']}",
        files={"file": ("photo5.jpg", FAKE_JPEG, "image/jpeg")},
    )
    assert sixth.status_code == 400


@pytest.mark.asyncio
async def test_business_image_upload_rejects_non_owner(auth_client, city):
    client, _user = auth_client
    business = await _create_business(client, city)

    # A second, independent regular (non-admin) user — created directly rather
    # than via the user_and_token fixture, since requesting that fixture again
    # in the same test would just return auth_client's own cached user.
    import uuid as uuid_mod
    from app.models.user import User
    from app.core.security import create_access_token
    from tests.conftest import _make_engine
    from sqlalchemy.ext.asyncio import async_sessionmaker

    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    phone = f"+9191{uuid_mod.uuid4().int % 10**9:09d}"
    async with Session() as session:
        other = User(phone=phone, name="Other User")
        session.add(other)
        await session.commit()
        await session.refresh(other)
        other_id = str(other.id)
    await engine.dispose()
    other_token = create_access_token(other_id)

    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as other_client:
        other_client.headers.update({"Authorization": f"Bearer {other_token}"})
        res = await other_client.post(
            f"/api/v1/upload/business-image/{business['id']}",
            files={"file": ("photo.jpg", FAKE_JPEG, "image/jpeg")},
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_event_image_upload_and_delete_round_trip(auth_client, city):
    client, _user = auth_client
    event = await _create_event(client, city)

    upload_res = await client.post(
        f"/api/v1/upload/event-image/{event['id']}",
        files={"file": ("photo.jpg", FAKE_JPEG, "image/jpeg")},
    )
    assert upload_res.status_code == 201
    image = upload_res.json()

    get_res = await client.get(f"/api/v1/events/{event['id']}")
    assert get_res.status_code == 200
    images = get_res.json()["images"]
    assert len(images) == 1
    assert images[0]["id"] == image["id"]

    del_res = await client.delete(f"/api/v1/upload/event-image/{image['id']}")
    assert del_res.status_code == 204

    get_res2 = await client.get(f"/api/v1/events/{event['id']}")
    assert get_res2.json()["images"] == []


@pytest.mark.asyncio
async def test_event_image_upload_rejects_wrong_file_type(auth_client, city):
    client, _user = auth_client
    event = await _create_event(client, city)

    res = await client.post(
        f"/api/v1/upload/event-image/{event['id']}",
        files={"file": ("doc.pdf", b"not an image", "application/pdf")},
    )
    assert res.status_code == 400
