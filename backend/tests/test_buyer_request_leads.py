"""A new Buyer Request is sent to claimed owners of matching businesses (same city,
category and type). Unclaimed businesses are never contacted."""
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.conftest import _make_engine


async def _add(*objs):
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        for o in objs:
            s.add(o)
        await s.commit()
    await engine.dispose()
    return objs[0] if len(objs) == 1 else objs


async def _services():
    """The real 'services' category (has types like plumbers/electricians)."""
    from app.models.category import Category
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        cat = (await s.execute(select(Category).where(Category.slug == "services"))).scalar_one_or_none()
        if not cat:
            cat = Category(name="Services", slug="services", sort_order=0)
            s.add(cat)
            await s.commit()
    await engine.dispose()
    return cat


async def _owner(email=True):
    from app.models.user import User
    tag = uuid.uuid4().hex[:8]
    return await _add(User(phone=f"+9198{uuid.uuid4().int % 10**8:08d}", name=f"Owner {tag}",
                           email=f"owner-{tag}@example.com" if email else None))


async def _biz(city, cat, owner=None, sub=None, **kw):
    from app.models.business import Business
    return await _add(Business(city_id=city.id, category_id=cat.id, subcategory_slug=sub,
                               owner_id=owner.id if owner else None, name=kw.pop("name", "Shop"), **kw))


async def _request(city, cat, user, sub=None, text="Need a plumber for a leaking kitchen tap"):
    from app.models.buyer_request import BuyerRequest
    return await _add(BuyerRequest(city_id=city.id, category_id=cat.id, subcategory_slug=sub, user_id=user.id,
                                   description=text, budget=500, contact_phone="+919876543210"))


@pytest_asyncio.fixture
async def town():
    """A fresh city per test — the test DB is shared across the session, and
    businesses/requests left in 'hyderabad' would match other tests."""
    from app.models.city import City
    tag = uuid.uuid4().hex[:6]
    return await _add(City(name=f"Town {tag}", state="Test", slug=f"town-{tag}", lang_default="en"))


@pytest.fixture
def sent(monkeypatch):
    """Capture emails instead of sending them."""
    out = []

    async def fake_send(to, subject, html, text="", from_email=None):
        out.append({"to": to, "subject": subject, "html": html})
        return True

    monkeypatch.setattr("app.services.buyer_request_leads.send_email", fake_send)
    return out


async def _run(request_id):
    from app.services.buyer_request_leads import notify_matching_owners
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        n = await notify_matching_owners(s, request_id)
    await engine.dispose()
    return n


async def _notices(user):
    from app.models.user_notification import UserNotification
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        rows = (await s.execute(select(UserNotification).where(UserNotification.user_id == user.id))).scalars().all()
    await engine.dispose()
    return rows


@pytest.mark.asyncio
async def test_owner_of_matching_type_gets_notice_and_email(town, sent):
    cat = await _services()
    buyer, plumber_owner, tutor_owner = await _owner(), await _owner(), await _owner()
    await _biz(town, cat, plumber_owner, sub="plumbers", name="Ravi Plumbing")
    await _biz(town, cat, tutor_owner, sub="electricians")
    req = await _request(town, cat, buyer, sub="plumbers")

    assert await _run(req.id) == 1
    notes = await _notices(plumber_owner)
    assert len(notes) == 1 and notes[0].type == "buyer_request_match"
    assert "Plumbers" in notes[0].title and notes[0].action_url == f"/{town.slug}#buyer-requests"
    assert await _notices(tutor_owner) == []
    assert [m["to"] for m in sent] == [plumber_owner.email]
    assert "+919876543210" in sent[0]["html"] and "wa.me/919876543210" in sent[0]["html"]


@pytest.mark.asyncio
async def test_unclaimed_other_city_and_deleted_are_skipped(town, sent):
    from datetime import datetime, timezone
    from app.models.city import City
    cat = await _services()
    buyer, deleted_owner, far_owner = await _owner(), await _owner(), await _owner()
    other = await _add(City(name="Testpur", state="X", slug=f"testpur-{uuid.uuid4().hex[:6]}", lang_default="en"))
    await _biz(town, cat, None, sub="plumbers")                                  # unclaimed
    await _biz(other, cat, far_owner, sub="plumbers")                           # other city
    await _biz(town, cat, deleted_owner, sub="plumbers", deleted_at=datetime.now(timezone.utc))
    req = await _request(town, cat, buyer, sub="plumbers")
    assert await _run(req.id) == 0
    assert sent == []


@pytest.mark.asyncio
async def test_buyer_is_not_told_about_their_own_business(town, sent):
    cat = await _services()
    buyer = await _owner()
    await _biz(town, cat, buyer, sub="plumbers")
    req = await _request(town, cat, buyer, sub="plumbers")
    assert await _run(req.id) == 0


@pytest.mark.asyncio
async def test_untyped_request_in_typed_category_notifies_nobody(town, sent):
    cat = await _services()
    buyer, owner = await _owner(), await _owner()
    await _biz(town, cat, owner, sub="plumbers")
    req = await _request(town, cat, buyer, sub=None)   # e.g. an old app build
    assert await _run(req.id) == 0


@pytest.mark.asyncio
async def test_category_without_types_matches_on_category(town, category, sent):
    buyer, owner = await _owner(), await _owner()
    await _biz(town, category, owner)
    req = await _request(town, category, buyer)
    assert await _run(req.id) == 1


@pytest.mark.asyncio
async def test_one_notice_per_owner_and_email_only_when_known(town, sent):
    cat = await _services()
    buyer, multi, no_email = await _owner(), await _owner(), await _owner(email=False)
    await _biz(town, cat, multi, sub="plumbers", name="Branch 1")
    await _biz(town, cat, multi, sub="plumbers", name="Branch 2")
    await _biz(town, cat, no_email, sub="plumbers")
    req = await _request(town, cat, buyer, sub="plumbers")
    assert await _run(req.id) == 2
    assert len(await _notices(multi)) == 1 and len(await _notices(no_email)) == 1
    assert [m["to"] for m in sent] == [multi.email]


@pytest.mark.asyncio
async def test_capped_at_20_owners(town, category, sent):
    buyer = await _owner()
    for _ in range(23):
        await _biz(town, category, await _owner(email=False))
    req = await _request(town, category, buyer)
    assert await _run(req.id) == 20


@pytest.mark.asyncio
async def test_buyer_text_is_escaped_in_email(town, category, sent):
    buyer, owner = await _owner(), await _owner()
    await _biz(town, category, owner)
    req = await _request(town, category, buyer, text="Need <script>alert(1)</script> help")
    await _run(req.id)
    assert "<script>" not in sent[0]["html"] and "&lt;script&gt;" in sent[0]["html"]


# ── API: type picker on create ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_with_type_saves_and_shows_it(auth_client, town, monkeypatch):
    calls = []
    monkeypatch.setattr("app.routers.buyer_requests._notify_in_background", lambda rid: calls.append(rid))
    client, _ = auth_client
    await _services()
    r = await client.post("/api/v1/buyer-requests", json={
        "city_slug": town.slug, "category_slug": "services", "subcategory_slug": "plumbers",
        "description": "Need a plumber for a leaking tap", "contact_phone": "+919876543210"})
    assert r.status_code == 201, r.text
    assert r.json()["subcategory_slug"] == "plumbers" and r.json()["subcategory_name"] == "Plumbers"
    assert calls == [uuid.UUID(r.json()["id"])]


@pytest.mark.asyncio
async def test_type_must_belong_to_the_category(auth_client, town, monkeypatch):
    monkeypatch.setattr("app.routers.buyer_requests._notify_in_background", lambda rid: None)
    client, _ = auth_client
    await _services()
    for sub in ("dentists", "not-a-type"):
        r = await client.post("/api/v1/buyer-requests", json={
            "city_slug": town.slug, "category_slug": "services", "subcategory_slug": sub,
            "description": "Need a plumber for a leaking tap", "contact_phone": "+919876543210"})
        assert r.status_code == 422, (sub, r.text)
