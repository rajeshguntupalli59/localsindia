import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.conftest import _make_engine


async def _business(city, category, name, phone, owner_id=None):
    from app.models.business import Business
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        b = Business(city_id=city.id, category_id=category.id, name=name, phone=phone, owner_id=owner_id)
        s.add(b)
        await s.commit()
        await s.refresh(b)
    await engine.dispose()
    return b


def _ids(res):
    return [i["id"] for i in res.json()["items"]]


@pytest.mark.asyncio
async def test_queue_buckets_and_logging(admin_client, city, category):
    admin, admin_user = admin_client
    mobile = await _business(city, category, "B Mobile Tiffins", "+91 98480 22338")
    landline = await _business(city, category, "A Landline Stores", "040 2345 6789")
    await _business(city, category, "No Phone Shop", None)
    q = f"/api/v1/admin/outreach?city_slug={city.slug}&category_slug={category.slug}"

    todo = await admin.get(q)
    assert todo.status_code == 200
    # Only businesses with a phone; mobiles first even though "A…" sorts earlier
    assert _ids(todo) == [str(mobile.id), str(landline.id)]
    assert todo.json()["items"][0]["mobile"] == "+919848022338"
    assert todo.json()["items"][1]["mobile"] is None
    assert todo.json()["counts"] == {"todo": 2, "follow_up": 0, "closed": 0, "claimed": 0}

    assert (await admin.post(f"/api/v1/admin/outreach/{mobile.id}", json={"outcome": "whatsapp_sent"})).status_code == 201
    r = await admin.post(f"/api/v1/admin/outreach/{landline.id}", json={"outcome": "wrong_number", "note": "a pharmacy now"})
    assert r.json()["status"] == "closed"

    follow = await admin.get(q + "&status=follow_up")
    assert _ids(follow) == [str(mobile.id)]
    item = follow.json()["items"][0]
    assert item["last_outcome"] == "whatsapp_sent" and item["attempts"] == 1
    closed = await admin.get(q + "&status=closed")
    assert _ids(closed) == [str(landline.id)] and closed.json()["items"][0]["last_note"] == "a pharmacy now"

    # A second attempt: latest outcome wins, attempts count up
    await admin.post(f"/api/v1/admin/outreach/{mobile.id}", json={"outcome": "interested"})
    item = (await admin.get(q + "&status=follow_up")).json()["items"][0]
    assert item["last_outcome"] == "interested" and item["attempts"] == 2

    # Once the owner claims it, it moves to "claimed"
    from app.models.business import Business
    engine = _make_engine()
    async with async_sessionmaker(engine)() as s:
        (await s.get(Business, mobile.id)).owner_id = admin_user.id
        await s.commit()
    await engine.dispose()
    res = await admin.get(q + "&status=claimed")
    assert _ids(res) == [str(mobile.id)]
    assert res.json()["counts"] == {"todo": 0, "follow_up": 0, "closed": 1, "claimed": 1}


@pytest.mark.asyncio
async def test_owned_without_outreach_is_not_in_queue(admin_client, city, category):
    admin, admin_user = admin_client
    await _business(city, category, "Already Owned", "+91 98480 11111", owner_id=admin_user.id)
    res = await admin.get(f"/api/v1/admin/outreach?category_slug={category.slug}")
    assert res.json()["items"] == []
    assert sum(res.json()["counts"].values()) == 0


@pytest.mark.asyncio
async def test_validation_and_admin_only(auth_client, admin_client, city, category):
    client, _ = auth_client
    admin, _ = admin_client
    b = await _business(city, category, "Val Stores", "+91 98480 33333")
    assert (await client.get("/api/v1/admin/outreach")).status_code == 403
    assert (await client.post(f"/api/v1/admin/outreach/{b.id}", json={"outcome": "interested"})).status_code == 403
    assert (await admin.post(f"/api/v1/admin/outreach/{b.id}", json={"outcome": "sold"})).status_code == 422
    assert (await admin.get("/api/v1/admin/outreach?status=nope")).status_code == 422
    assert (await admin.post(f"/api/v1/admin/outreach/{uuid.uuid4()}", json={"outcome": "interested"})).status_code == 404


@pytest.mark.asyncio
async def test_email_outreach_flow(client, admin_client, city, category, monkeypatch):
    admin, _ = admin_client
    sent = []

    async def fake_send(**kw):
        sent.append(kw)
        return True
    monkeypatch.setattr("app.routers.business_outreach.send_claim_invite_email", fake_send)

    # A business with only an email (no phone) still shows up in the queue
    b = await _business(city, category, "Email Only Stores", None)
    base = f"/api/v1/admin/outreach/{b.id}"
    assert (await admin.post(f"{base}/send-email")).status_code == 400          # no email yet
    assert (await admin.put(f"{base}/email", json={"email": "not-an-email"})).status_code == 422
    r = await admin.put(f"{base}/email", json={"email": " mailto:Owner@Shop.IN "})
    assert r.json()["email"] == "owner@shop.in"
    q = f"/api/v1/admin/outreach?city_slug={city.slug}&category_slug={category.slug}"
    item = (await admin.get(q)).json()["items"][0]
    assert item["email"] == "owner@shop.in" and item["mobile"] is None

    assert (await admin.post(f"{base}/send-email")).status_code == 201
    assert sent[0]["to"] == "owner@shop.in" and "/unsubscribe?b=" in sent[0]["unsubscribe_url"]
    follow = (await admin.get(q + "&status=follow_up")).json()["items"][0]
    assert follow["last_outcome"] == "email_sent"
    assert (await admin.post(f"{base}/send-email")).status_code == 429          # 30-day cooldown

    # Unsubscribe: bad token rejected; good token closes it and blocks further email
    from app.routers.business_outreach import unsubscribe_token
    assert (await client.get(f"/api/v1/outreach/unsubscribe?b={b.id}&t=bad")).status_code == 400
    r = await client.get(f"/api/v1/outreach/unsubscribe?b={b.id}&t={unsubscribe_token(b.id)}")
    assert r.status_code == 200 and "unsubscribed" in r.text
    assert (await admin.get(q + "&status=closed")).json()["items"][0]["id"] == str(b.id)
    assert (await admin.post(f"{base}/send-email")).status_code == 409
    assert len(sent) == 1


@pytest.mark.asyncio
async def test_backfill_emails_never_overwrites(admin_client, city, category):
    admin, _ = admin_client
    from app.models.business import Business
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        a = Business(city_id=city.id, category_id=category.id, name="OSM A", source="osm", source_ref="node/1")
        b = Business(city_id=city.id, category_id=category.id, name="OSM B", source="osm", source_ref="node/2",
                     email="kept@shop.in")
        s.add_all([a, b])
        await s.commit()
    await engine.dispose()
    r = await admin.post("/api/v1/admin/businesses/import/emails", json={"items": [
        {"source_ref": "node/1", "email": "info@a.in; other@a.in"},
        {"source_ref": "node/2", "email": "new@b.in"},
        {"source_ref": "node/3", "email": "junk"},
    ]})
    assert r.json() == {"updated": 1, "skipped": 2}
    engine = _make_engine()
    async with async_sessionmaker(engine)() as s:
        assert (await s.get(Business, a.id)).email == "info@a.in"
        assert (await s.get(Business, b.id)).email == "kept@shop.in"
    await engine.dispose()


@pytest.mark.asyncio
async def test_claim_invite_sent_from_support(monkeypatch):
    from app.services import email_svc
    calls = []

    async def fake_send(to, subject, html, text="", from_email=None):
        calls.append(from_email)
        return True
    monkeypatch.setattr(email_svc, "send_email", fake_send)
    await email_svc.send_claim_invite_email("o@shop.in", "Shop", "Hyderabad", "https://x", "https://u")
    assert calls == ["support@localsindia.com"]


@pytest.mark.asyncio
async def test_send_email_uses_own_mailbox_smtp(monkeypatch):
    import smtplib
    from app.services import email_svc
    sent = {}

    class FakeSMTP:
        def __init__(self, host, port, context=None, timeout=None):
            sent["host"] = (host, port)
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def login(self, user, pw): sent["login"] = user
        def send_message(self, msg): sent["msg"] = msg

    monkeypatch.setattr(email_svc, "SMTP_PASSWORD", "x")
    monkeypatch.setattr(smtplib, "SMTP_SSL", FakeSMTP)
    assert await email_svc.send_email("o@shop.in", "Hi", "<p>hi</p>", "hi") is True
    assert sent["host"] == ("smtpout.secureserver.net", 465)
    assert sent["login"] == "support@localsindia.com"
    assert sent["msg"]["From"] == "LocalsIndia <support@localsindia.com>"
    assert sent["msg"]["To"] == "o@shop.in"

    def boom(*a, **k): raise OSError("auth failed")
    monkeypatch.setattr(smtplib, "SMTP_SSL", boom)
    assert await email_svc.send_email("o@shop.in", "Hi", "<p>hi</p>") is False


@pytest.mark.asyncio
async def test_shared_email_one_invite_per_address(client, admin_client, city, category, monkeypatch):
    admin, _ = admin_client
    sent = []

    async def fake_send(**kw):
        sent.append(kw)
        return True
    monkeypatch.setattr("app.routers.business_outreach.send_claim_invite_email", fake_send)
    a = await _business(city, category, "Chain Branch A", None)
    b = await _business(city, category, "Chain Branch B", None)
    c = await _business(city, category, "Other Shop", None)
    for x, e in ((a, "info@chain.in"), (b, "info@chain.in"), (c, "owner@other.in")):
        await admin.put(f"/api/v1/admin/outreach/{x.id}/email", json={"email": e})

    q = f"/api/v1/admin/outreach?city_slug={city.slug}&category_slug={category.slug}"
    shared = {i["name"]: i["email_shared_with"] for i in (await admin.get(q)).json()["items"]}
    assert shared == {"Chain Branch A": 1, "Chain Branch B": 1, "Other Shop": 0}

    assert (await admin.post(f"/api/v1/admin/outreach/{a.id}/send-email")).status_code == 201
    # Same address on another listing: no second invite inside 30 days
    assert (await admin.post(f"/api/v1/admin/outreach/{b.id}/send-email")).status_code == 429

    # Unsubscribing from the other address blocks only that address
    from app.routers.business_outreach import unsubscribe_token
    await client.get(f"/api/v1/outreach/unsubscribe?b={c.id}&t={unsubscribe_token(c.id)}")
    d = await _business(city, category, "Other Shop Duplicate", None)
    await admin.put(f"/api/v1/admin/outreach/{d.id}/email", json={"email": "owner@other.in"})
    r = await admin.post(f"/api/v1/admin/outreach/{d.id}/send-email")
    assert r.status_code == 409 and "unsubscribed" in r.json()["detail"]
    assert [s["to"] for s in sent] == ["info@chain.in"]
