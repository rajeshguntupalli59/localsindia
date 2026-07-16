import pytest
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_register_device_token_requires_auth(client):
    resp = await client.post("/api/v1/notifications/device-token", json={"token": "ExponentPushToken[abc]"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_register_device_token_creates_row(client, db, auth_client):
    from sqlalchemy import select
    from app.models.device_token import DeviceToken

    ac, user = auth_client
    resp = await ac.post("/api/v1/notifications/device-token", json={"token": "ExponentPushToken[new-device]"})
    assert resp.status_code == 200

    result = await db.execute(select(DeviceToken).where(DeviceToken.token == "ExponentPushToken[new-device]"))
    row = result.scalar_one()
    assert row.user_id == user.id


@pytest.mark.asyncio
async def test_register_device_token_reassigns_to_new_user_on_same_device(client, db, auth_client, user_and_token):
    """Logging out and a different account logging in on the same phone should
    move the push token to the new account, not leave it stuck on the old one."""
    from sqlalchemy import select
    from app.models.device_token import DeviceToken
    from app.core.security import create_access_token

    ac, first_user = auth_client
    token = "ExponentPushToken[shared-device]"
    await ac.post("/api/v1/notifications/device-token", json={"token": token})

    second_user, _ = user_and_token
    second_access_token = create_access_token(str(second_user.id))
    resp = await client.post(
        "/api/v1/notifications/device-token",
        json={"token": token},
        headers={"Authorization": f"Bearer {second_access_token}"},
    )
    assert resp.status_code == 200

    db.expire_all()
    result = await db.execute(select(DeviceToken).where(DeviceToken.token == token))
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].user_id == second_user.id


@pytest.mark.asyncio
async def test_unregister_device_token_removes_it(client, db, auth_client):
    from sqlalchemy import select
    from app.models.device_token import DeviceToken

    ac, _user = auth_client
    token = "ExponentPushToken[logging-out]"
    await ac.post("/api/v1/notifications/device-token", json={"token": token})

    resp = await ac.delete(f"/api/v1/notifications/device-token?token={token}")
    assert resp.status_code == 200

    db.expire_all()
    result = await db.execute(select(DeviceToken).where(DeviceToken.token == token))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_notify_pushes_to_registered_device_tokens(db, user_and_token):
    from app.services.notification_svc import notify
    from app.models.device_token import DeviceToken

    user, _token = user_and_token
    db.add(DeviceToken(user_id=user.id, token="ExponentPushToken[push-me]"))
    await db.commit()

    with patch("app.services.push_svc.send_push", new_callable=AsyncMock) as mock_send:
        await notify(db, user.id, "listing_expiring", "Test title", "Test body")

    mock_send.assert_awaited_once()
    call_args = mock_send.call_args
    assert call_args.args[0] == ["ExponentPushToken[push-me]"]


@pytest.mark.asyncio
async def test_notify_skips_push_when_no_device_tokens(db, user_and_token):
    """Users with no registered devices must not error the whole notify() call."""
    from app.services.notification_svc import notify

    user, _token = user_and_token
    n = await notify(db, user.id, "listing_expiring", "Test title", "Test body")
    assert n.title == "Test title"
