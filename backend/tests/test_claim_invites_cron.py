"""Daily claim-invite cron: each address once ever, skips claimed / unsubscribed /
under-review, respects the daily cap.

The test DB is shared across the session, so each test first drains invites for
businesses other tests left behind, then checks only its own (uuid-tagged) addresses."""
import asyncio
import uuid
from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import settings
from tests.conftest import _make_engine

SECRET = "test_cron_secret"


async def _add(*objs):
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        s.add_all(objs)
        await s.commit()
    await engine.dispose()


@pytest.fixture
def sent(monkeypatch):
    out = []

    async def fake_send(**kw):
        out.append(kw)
        return True

    async def no_sleep(_):
        return None
    monkeypatch.setattr("app.routers.business_outreach.send_claim_invite_email", fake_send)
    monkeypatch.setattr(asyncio, "sleep", no_sleep)
    return out


async def _run(client, limit=25):
    with patch.object(settings, "CRON_SECRET", SECRET):
        r = await client.post(f"/api/v1/cron/claim-invites?secret={SECRET}&limit={limit}")
    assert r.status_code == 200, r.text
    return r.json()


async def _drain(client, sent, monkeypatch) -> int:
    """Invite everything already in the DB; returns today's automatic count."""
    monkeypatch.setattr("app.routers.business_outreach.DAILY_AUTO_INVITES", 10 ** 6)
    while True:
        r = await _run(client, limit=50)
        if r["addresses_left"] == 0 or r["sent"] == 0:
            sent.clear()
            return r["sent_today"]


@pytest.mark.asyncio
async def test_each_address_once_and_skips(client, admin_client, city, category, sent, monkeypatch):
    _, admin_user = admin_client
    from app.models.business import Business
    from app.models.business_claim import BusinessClaim
    from app.models.business_outreach import BusinessOutreach
    from app.routers.business_outreach import UNSUBSCRIBED
    await _drain(client, sent, monkeypatch)
    t = uuid.uuid4().hex[:8]

    def biz(name, email, owner=None):
        return Business(city_id=city.id, category_id=category.id, name=name, email=f"{email}.{t}.in", owner_id=owner)

    chain_a, chain_b = biz("Chain A", "info@chain"), biz("Chain B", "info@chain")
    fresh = biz("Fresh Shop", "owner@fresh")
    claimed = biz("Claimed Shop", "me@claimed", owner=admin_user.id)
    claimed_sibling = biz("Claimed Sibling", "me@claimed")   # same address as a claimed business
    emailed, unsub, review = biz("Emailed", "x@emailed"), biz("Unsub", "x@unsub"), biz("Review", "x@review")
    await _add(chain_a, chain_b, fresh, claimed, claimed_sibling, emailed, unsub, review)
    await _add(
        BusinessOutreach(business_id=emailed.id, outcome="email_sent", note="old"),
        BusinessOutreach(business_id=unsub.id, outcome="not_interested", note=UNSUBSCRIBED),
        BusinessClaim(business_id=review.id, user_id=admin_user.id, method="documents", status="pending"),
    )

    first = await _run(client)
    assert sorted(k["to"] for k in sent) == [f"info@chain.{t}.in", f"owner@fresh.{t}.in"]
    assert first["sent"] == 2 and first["failed"] == 0 and first["addresses_left"] == 0
    assert all(k["business_url"].endswith("?claim=1") for k in sent)

    # Run again: nobody gets a second email, ever
    again = await _run(client)
    assert again["sent"] == 0 and len(sent) == 2


@pytest.mark.asyncio
async def test_daily_cap(client, city, category, sent, monkeypatch):
    from app.models.business import Business
    today = await _drain(client, sent, monkeypatch)
    monkeypatch.setattr("app.routers.business_outreach.DAILY_AUTO_INVITES", today + 2)
    t = uuid.uuid4().hex[:8]
    await _add(*[Business(city_id=city.id, category_id=category.id, name=f"Shop {i}", email=f"s{i}@{t}.in")
                 for i in range(4)])
    assert (await _run(client, limit=50))["sent"] == 2
    capped = await _run(client, limit=50)
    assert capped["sent"] == 0 and capped["sent_today"] == today + 2 and capped["addresses_left"] == 2


@pytest.mark.asyncio
async def test_stops_after_three_failures(client, city, category, sent, monkeypatch):
    from app.models.business import Business
    await _drain(client, sent, monkeypatch)
    calls = []

    async def failing(**kw):
        calls.append(kw)
        return False
    monkeypatch.setattr("app.routers.business_outreach.send_claim_invite_email", failing)
    t = uuid.uuid4().hex[:8]
    await _add(*[Business(city_id=city.id, category_id=category.id, name=f"Shop {i}", email=f"f{i}@{t}.in")
                 for i in range(6)])
    r = await _run(client)
    assert r["sent"] == 0 and r["failed"] == 3 and len(calls) == 3


@pytest.mark.asyncio
async def test_needs_cron_secret(client):
    with patch.object(settings, "CRON_SECRET", SECRET):
        assert (await client.post("/api/v1/cron/claim-invites?secret=wrong")).status_code == 403


@pytest.mark.asyncio
async def test_email_progress_summary(client, admin_client, city, category, sent, monkeypatch):
    admin, _ = admin_client
    from sqlalchemy import select
    from app.models.business import Business
    from app.models.business_outreach import BusinessOutreach
    await _drain(client, sent, monkeypatch)
    before = (await admin.get("/api/v1/admin/outreach/email-progress")).json()
    assert before["addresses_left"] == 0
    t = uuid.uuid4().hex[:8]
    shops = [Business(city_id=city.id, category_id=category.id, name=f"P{i}", email=f"p{i}@{t}.in") for i in range(2)]
    await _add(*shops)
    assert (await admin.get("/api/v1/admin/outreach/email-progress")).json()["addresses_left"] == 2

    await _run(client)
    after = (await admin.get("/api/v1/admin/outreach/email-progress")).json()
    assert after["addresses_left"] == 0
    assert after["sent_total"] == before["sent_total"] + 2
    assert after["auto_sent_today"] == before["auto_sent_today"] + 2
    assert after["last_sent_at"] is not None

    # The Follow up tab shows these as automatic
    engine = _make_engine()
    async with async_sessionmaker(engine)() as s:
        notes = (await s.execute(select(BusinessOutreach.note).where(
            BusinessOutreach.business_id.in_([b.id for b in shops])))).scalars().all()
    await engine.dispose()
    assert sorted(notes) == [f"Auto claim email to p0@{t}.in", f"Auto claim email to p1@{t}.in"]


@pytest.mark.asyncio
async def test_email_progress_admin_only(auth_client):
    user_client, _ = auth_client
    assert (await user_client.get("/api/v1/admin/outreach/email-progress")).status_code == 403


DSN = (b"From: Mail Delivery System <MAILER-DAEMON@p3plibsmtp.secureserver.net>\r\n"
       b"Subject: Message Delivery Failure\r\n\r\n"
       b"Final-Recipient: rfc822; Gone@Dead.IN\r\nStatus: 5.1.1\r\n"
       b"Diagnostic-Code: smtp; 550 5.1.1 does not exist\r\n")


def test_bounced_recipients_parses_dsn_only():
    from app.services.email_svc import bounced_recipients
    reply = (b"From: Owner <owner@shop.in>\r\nSubject: Re: claim\r\n\r\n"
             b"Final-Recipient: rfc822; not@bounce.in\r\n")   # a normal reply is ignored
    gmail = (b"From: postmaster@gmail.com\r\nSubject: Delivery Status Notification (Failure)\r\n\r\n"
             b"X-Failed-Recipients: x@gm.in\r\nFinal-Recipient: rfc822; support@localsindia.com\r\n")
    assert bounced_recipients([DSN, reply, gmail]) == {"gone@dead.in", "x@gm.in"}


@pytest.mark.asyncio
async def test_email_bounces_removes_dead_addresses(client, city, category, sent, monkeypatch):
    from sqlalchemy import select
    from app.models.business import Business
    from app.models.business_outreach import BusinessOutreach
    await _drain(client, sent, monkeypatch)
    t = uuid.uuid4().hex[:8]
    dead, alive = f"gone@{t}.in", f"ok@{t}.in"
    a, b2, keep = (Business(city_id=city.id, category_id=category.id, name=n, email=e)
                   for n, e in (("A", dead), ("A2", dead), ("Keep", alive)))
    await _add(a, b2, keep)
    await _run(client)                     # invites go out (one per address)

    async def fake_fetch(days):
        return {dead}
    monkeypatch.setattr("app.services.email_svc.fetch_bounced_addresses", fake_fetch)
    with patch.object(settings, "CRON_SECRET", SECRET):
        r = await client.post(f"/api/v1/cron/email-bounces?secret={SECRET}")
        again = await client.post(f"/api/v1/cron/email-bounces?secret={SECRET}")
    assert r.json() == {"bounced_addresses": 1, "businesses_updated": 2}
    assert again.json()["businesses_updated"] == 0          # idempotent

    engine = _make_engine()
    async with async_sessionmaker(engine)() as s:
        emails = dict((await s.execute(select(Business.name, Business.email).where(
            Business.id.in_([a.id, b2.id, keep.id])))).all())
        notes = (await s.execute(select(BusinessOutreach.note).where(
            BusinessOutreach.business_id.in_([a.id, b2.id])))).scalars().all()
    await engine.dispose()
    assert emails == {"A": None, "A2": None, "Keep": alive}
    assert len(notes) == 1 and notes[0].endswith("email removed)")
