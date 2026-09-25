import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.routers import business_claims
from app.routers.business_claims import normalize_indian_mobile
from tests.conftest import _make_engine

FAKE_JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100  # Cloudinary is mocked in tests


async def _unclaimed_business(city, phone="+91 98480 22338"):
    """Directory business with no owner, as an import would create it."""
    from app.models.business import Business
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        b = Business(city_id=city.id, name=f"Sri Balaji Tiffins {uuid.uuid4().hex[:4]}", phone=phone)
        s.add(b)
        await s.commit()
        await s.refresh(b)
    await engine.dispose()
    return b


async def _owner_of(business_id):
    from app.models.business import Business
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        owner = (await s.execute(select(Business.owner_id).where(Business.id == business_id))).scalar_one()
    await engine.dispose()
    return owner


def _doc_files(card=False):
    files = {
        "document": ("gst.jpg", FAKE_JPEG, "image/jpeg"),
        "shop_photo": ("shop.jpg", FAKE_JPEG, "image/jpeg"),
    }
    if card:
        files["visiting_card"] = ("card.jpg", FAKE_JPEG, "image/jpeg")
    return files


def test_normalize_indian_mobile():
    assert normalize_indian_mobile("+91 98480 22338") == "+919848022338"
    assert normalize_indian_mobile("098480-22338") == "+919848022338"
    assert normalize_indian_mobile("919848022338") == "+919848022338"
    assert normalize_indian_mobile("040 2345 6789") is None     # landline
    assert normalize_indian_mobile(None) is None


@pytest.mark.asyncio
async def test_old_instant_claim_endpoint_is_gone(auth_client, city):
    client, _ = auth_client
    b = await _unclaimed_business(city)
    res = await client.post(f"/api/v1/businesses/{b.id}/claim")
    assert res.status_code in (404, 405)
    assert await _owner_of(b.id) is None


@pytest.mark.asyncio
async def test_otp_claim_happy_path(auth_client, city, monkeypatch):
    client, user = auth_client
    monkeypatch.setattr(business_claims, "generate_otp", lambda: "482913")
    b = await _unclaimed_business(city)

    opts = (await client.get(f"/api/v1/businesses/{b.id}/claim-options")).json()
    assert opts["otp_available"] is True
    assert opts["masked_phone"] == "+91 ••••• 2338"

    send = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/send")
    assert send.status_code == 200
    assert "otp" not in send.json()  # never leaked outside OTP_DEBUG

    ok = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/verify", json={"otp": "482913"})
    assert ok.status_code == 200
    assert await _owner_of(b.id) == user.id


@pytest.mark.asyncio
async def test_otp_wrong_code_locks_after_three(auth_client, city, monkeypatch):
    client, _ = auth_client
    monkeypatch.setattr(business_claims, "generate_otp", lambda: "482913")
    b = await _unclaimed_business(city)
    await client.post(f"/api/v1/businesses/{b.id}/claim/otp/send")

    for _ in range(3):
        r = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/verify", json={"otp": "000000"})
        assert r.status_code == 400
    # 4th attempt is refused even with the right code
    r = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/verify", json={"otp": "482913"})
    assert r.status_code == 429
    assert await _owner_of(b.id) is None


@pytest.mark.asyncio
async def test_otp_not_offered_for_landline(auth_client, city):
    client, _ = auth_client
    b = await _unclaimed_business(city, phone="040 2345 6789")
    opts = (await client.get(f"/api/v1/businesses/{b.id}/claim-options")).json()
    assert opts["otp_available"] is False
    r = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/send")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_documents_claim_then_admin_approves(auth_client, admin_client, city):
    client, user = auth_client
    admin, _ = admin_client
    b = await _unclaimed_business(city, phone=None)

    r = await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "fssai", "contact_phone": "9848022338", "note": "Owner since 2015"},
        files=_doc_files(card=True),
    )
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
    assert await _owner_of(b.id) is None  # nothing changes until an admin approves

    dup = await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "fssai", "contact_phone": "9848022338"}, files=_doc_files(),
    )
    assert dup.status_code == 409

    queue = (await admin.get("/api/v1/admin/business-claims")).json()
    mine = next(c for c in queue if c["business"]["id"] == str(b.id))
    assert mine["contact_phone"] == "+919848022338"
    assert mine["doc_label"].startswith("FSSAI")
    assert mine["document_url"] and mine["shop_photo_url"] and mine["visiting_card_url"]

    ok = await admin.post(f"/api/v1/admin/business-claims/{mine['id']}/approve")
    assert ok.status_code == 200
    assert await _owner_of(b.id) == user.id


@pytest.mark.asyncio
async def test_reject_needs_reason_and_non_admin_blocked(auth_client, admin_client, city):
    client, _ = auth_client
    admin, _ = admin_client
    b = await _unclaimed_business(city)
    await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "electricity_bill", "contact_phone": "+919848022338"}, files=_doc_files(),
    )
    assert (await client.get("/api/v1/admin/business-claims")).status_code == 403

    queue = (await admin.get("/api/v1/admin/business-claims")).json()
    claim_id = next(c["id"] for c in queue if c["business"]["id"] == str(b.id))
    assert (await admin.post(f"/api/v1/admin/business-claims/{claim_id}/reject", json={"reason": " "})).status_code == 400
    r = await admin.post(f"/api/v1/admin/business-claims/{claim_id}/reject", json={"reason": "Bill name doesn't match"})
    assert r.status_code == 200
    assert await _owner_of(b.id) is None


@pytest.mark.asyncio
async def test_admin_approves_email_claim(auth_client, admin_client, city):
    from app.models.user import User
    client, _ = auth_client
    admin, _ = admin_client
    b = await _unclaimed_business(city)

    # Shared fixture phones have 11 digits after +91; the claimant needs a real-format mobile
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    phone = f"+917{uuid.uuid4().int % 10**9:09d}"
    async with Session() as s:
        user = User(phone=phone, name="Email Claimant")
        s.add(user)
        await s.commit()
        await s.refresh(user)
    await engine.dispose()

    body = {"business_id": str(b.id), "phone": phone[3:], "note": "GST cert by email"}
    assert (await client.post("/api/v1/admin/business-claims/email", json=body)).status_code == 403

    missing = await admin.post("/api/v1/admin/business-claims/email", json={**body, "phone": "9000000001"})
    assert missing.status_code == 404

    ok = await admin.post("/api/v1/admin/business-claims/email", json=body)
    assert ok.status_code == 200
    assert await _owner_of(b.id) == user.id


@pytest.mark.asyncio
async def test_documents_reject_bad_input(auth_client, city):
    client, _ = auth_client
    b = await _unclaimed_business(city)
    bad_type = await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "aadhaar", "contact_phone": "9848022338"}, files=_doc_files(),
    )
    assert bad_type.status_code == 400
    bad_phone = await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "gst", "contact_phone": "12345"}, files=_doc_files(),
    )
    assert bad_phone.status_code == 400


@pytest.mark.asyncio
async def test_admin_import_creates_unclaimed_and_is_idempotent(auth_client, admin_client, city):
    from app.models.category import Category
    client, _ = auth_client
    admin, _ = admin_client

    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    slug = f"imp-{uuid.uuid4().hex[:6]}"
    async with Session() as s:
        s.add(Category(name="Import Cat", slug=slug, sort_order=0))
        await s.commit()
    await engine.dispose()

    ref = f"node/{uuid.uuid4().int % 10**9}"
    payload = {"city_slug": "hyderabad", "businesses": [
        {"name": "Ramu Tiffins", "category_slug": slug, "source_ref": ref, "phone": "+919848022338",
         "latitude": 17.4, "longitude": 78.5},
        {"name": "Bad Cat", "category_slug": "no-such-cat", "source_ref": ref + "x"},
    ]}
    assert (await client.post("/api/v1/admin/businesses/import", json=payload)).status_code == 403

    first = (await admin.post("/api/v1/admin/businesses/import", json=payload)).json()
    assert first == {"created": 1, "skipped_existing": 0, "unknown_category": 1}
    again = (await admin.post("/api/v1/admin/businesses/import", json=payload)).json()
    assert again["created"] == 0 and again["skipped_existing"] == 1

    listed = (await client.get("/api/v1/businesses", params={"city_slug": "hyderabad", "page_size": 50})).json()
    mine = [b for b in listed if b["name"] == "Ramu Tiffins" and b["source"] == "osm"]
    assert mine and mine[0]["owner_id"] is None and mine[0]["latitude"] == 17.4
    assert mine[0]["category_slug"] == slug


@pytest.mark.asyncio
async def test_list_businesses_by_category_slug(auth_client, admin_client, city):
    from app.models.category import Category
    client, _ = auth_client
    admin, _ = admin_client
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    slugs = [f"c1-{uuid.uuid4().hex[:6]}", f"c2-{uuid.uuid4().hex[:6]}"]
    async with Session() as s:
        for sl in slugs:
            s.add(Category(name=sl, slug=sl, sort_order=0))
        await s.commit()
    await engine.dispose()
    await admin.post("/api/v1/admin/businesses/import", json={"city_slug": "hyderabad", "businesses": [
        {"name": "Only In One", "category_slug": slugs[0], "source_ref": f"node/{uuid.uuid4().int % 10**9}"},
        {"name": "Only In Two", "category_slug": slugs[1], "source_ref": f"node/{uuid.uuid4().int % 10**9}"},
    ]})
    res = await client.get("/api/v1/businesses", params={"city_slug": "hyderabad", "category_slug": slugs[0]})
    assert [b["name"] for b in res.json()] == ["Only In One"]


@pytest.mark.asyncio
async def test_remove_imported_only_touches_unclaimed_imports(auth_client, admin_client, city):
    from app.models.category import Category
    client, _ = auth_client
    admin, _ = admin_client
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    slug = f"rm-{uuid.uuid4().hex[:6]}"
    async with Session() as s:
        s.add(Category(name=slug, slug=slug, sort_order=0))
        await s.commit()
    await engine.dispose()
    await admin.post("/api/v1/admin/businesses/import", json={"city_slug": "hyderabad", "businesses": [
        {"name": "Bakery", "category_slug": slug, "source_ref": f"node/{uuid.uuid4().int % 10**9}"},
    ]})
    imported = (await client.get("/api/v1/businesses", params={"city_slug": "hyderabad", "category_slug": slug})).json()[0]
    own = (await client.post("/api/v1/businesses", json={"name": "My Own Shop", "city_id": str(city.id)})).json()

    body = {"business_ids": [imported["id"], own["id"]], "reason": "generic name"}
    assert (await client.post("/api/v1/admin/businesses/import/remove", json=body)).status_code == 403
    res = (await admin.post("/api/v1/admin/businesses/import/remove", json=body)).json()
    assert res["removed"] == 1 and res["skipped"] == 1
    assert (await client.get(f"/api/v1/businesses/{own['id']}")).status_code == 200
    assert (await client.get(f"/api/v1/businesses/{imported['id']}")).status_code == 404


@pytest.mark.asyncio
async def test_owner_can_change_business_category(auth_client, city):
    from app.models.category import Category
    client, _ = auth_client
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    slug = f"cat-{uuid.uuid4().hex[:6]}"
    async with Session() as s:
        c = Category(name=slug, slug=slug, sort_order=0)
        s.add(c)
        await s.commit()
        await s.refresh(c)
    await engine.dispose()
    own = (await client.post("/api/v1/businesses", json={"name": "Das Motors", "city_id": str(city.id)})).json()
    res = await client.patch(f"/api/v1/businesses/{own['id']}", json={"category_id": str(c.id)})
    assert res.status_code == 200 and res.json()["category_slug"] == slug


@pytest.mark.asyncio
async def test_business_keyword_search_and_sitemap(auth_client, city):
    client, _ = auth_client
    tag = uuid.uuid4().hex[:6]
    await client.post("/api/v1/businesses", json={"name": f"Paradise Biryani {tag}", "city_id": str(city.id)})
    await client.post("/api/v1/businesses", json={"name": f"Dental Care {tag}", "city_id": str(city.id)})
    hits = (await client.get("/api/v1/businesses", params={"city_slug": "hyderabad", "q": f"biryani {tag}"})).json()
    assert [b["name"] for b in hits] == [f"Paradise Biryani {tag}"]
    entries = (await client.get("/api/v1/businesses/sitemap-entries")).json()
    assert entries and {"id", "city_slug", "updated_at"} <= set(entries[0])


@pytest.mark.asyncio
async def test_move_imported_business_to_nearest_city(auth_client, admin_client, city):
    from app.models.category import Category
    from app.models.city import City
    client, _ = auth_client
    admin, _ = admin_client
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    slug, cslug = f"mv-{uuid.uuid4().hex[:6]}", f"town-{uuid.uuid4().hex[:6]}"
    async with Session() as s:
        s.add(Category(name=slug, slug=slug, sort_order=0))
        s.add(City(name="Town", state="Telangana", slug=cslug, lang_default="te"))
        await s.commit()
    await engine.dispose()
    await admin.post("/api/v1/admin/businesses/import", json={"city_slug": "hyderabad", "businesses": [
        {"name": "Edge Clinic", "category_slug": slug, "source_ref": f"node/{uuid.uuid4().int % 10**9}"}]})
    b = (await client.get("/api/v1/businesses", params={"city_slug": "hyderabad", "category_slug": slug})).json()[0]
    res = (await admin.post("/api/v1/admin/businesses/import/move",
                            json={"business_ids": [b["id"]], "city_slug": cslug})).json()
    assert res["moved"] == 1
    moved = (await client.get("/api/v1/businesses", params={"city_slug": cslug, "category_slug": slug})).json()
    assert [x["name"] for x in moved] == ["Edge Clinic"]


@pytest.mark.asyncio
async def test_business_counts_by_category(auth_client, admin_client, city):
    from app.models.category import Category
    client, _ = auth_client
    admin, _ = admin_client
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    slug = f"cnt-{uuid.uuid4().hex[:6]}"
    async with Session() as s:
        s.add(Category(name=slug, slug=slug, sort_order=0))
        await s.commit()
    await engine.dispose()
    await admin.post("/api/v1/admin/businesses/import", json={"city_slug": "hyderabad", "businesses": [
        {"name": f"Counted {i}", "category_slug": slug, "source_ref": f"node/{uuid.uuid4().int % 10**9}"} for i in range(3)]})
    counts = (await client.get("/api/v1/businesses/counts", params={"city_slug": "hyderabad"})).json()
    assert counts[slug] == 3


@pytest.mark.asyncio
async def test_localities_set_list_and_pages(auth_client, admin_client, city, category):
    from app.models.business import Business
    client, _ = auth_client
    admin, _ = admin_client
    tag = uuid.uuid4().hex[:6]
    area, other = f"Madhapur {tag}", f"Ameerpet {tag}"
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        biz = [Business(city_id=city.id, category_id=category.id, name=f"Loc {tag} {i}") for i in range(4)]
        s.add_all(biz)
        await s.commit()
    await engine.dispose()
    ids = [str(b.id) for b in biz]

    items = [{"id": ids[0], "locality": area}, {"id": ids[1], "locality": area},
             {"id": ids[2], "locality": area}, {"id": ids[3], "locality": other}]
    assert (await client.post("/api/v1/admin/businesses/import/localities",
                              json={"city_slug": city.slug, "items": items})).status_code == 403
    r = await admin.post("/api/v1/admin/businesses/import/localities", json={"city_slug": city.slug, "items": items})
    assert r.json() == {"updated": 4, "skipped": 0}

    slug = f"madhapur-{tag}"
    one = await client.get(f"/api/v1/businesses/{ids[0]}")
    assert one.json()["locality"] == area and one.json()["locality_slug"] == slug

    listed = await client.get(f"/api/v1/businesses?city_slug={city.slug}&locality_slug={slug}")
    assert sorted(b["id"] for b in listed.json()) == sorted(ids[:3])

    locs = (await client.get(f"/api/v1/businesses/localities?city_slug={city.slug}&category_slug={category.slug}")).json()
    assert locs == [{"slug": slug, "name": area, "count": 3}, {"slug": f"ameerpet-{tag}", "name": other, "count": 1}]

    pages = (await client.get("/api/v1/businesses/locality-pages")).json()
    mine = [p for p in pages if p["locality_slug"].endswith(tag)]
    # Only the area with 3+ businesses gets pages: city-wide + in its category
    assert {(p["locality_slug"], p["category_slug"]) for p in mine} == {(slug, None), (slug, category.slug)}

    scoped = (await client.get(f"/api/v1/businesses/locality-pages?city_slug={city.slug}")).json()
    assert {(p["locality_slug"], p["category_slug"]) for p in scoped if p["locality_slug"].endswith(tag)} == {
        (slug, None), (slug, category.slug)}
    assert (await client.get("/api/v1/businesses/locality-pages?city_slug=nowhere")).json() == []

    # Clearing a locality
    await admin.post("/api/v1/admin/businesses/import/localities",
                     json={"city_slug": city.slug, "items": [{"id": ids[3], "locality": None}]})
    assert (await client.get(f"/api/v1/businesses/{ids[3]}")).json()["locality_slug"] is None


@pytest.mark.asyncio
async def test_opening_hours_import_and_backfill(auth_client, admin_client, city, category):
    from app.models.business import Business
    client, _ = auth_client
    admin, _ = admin_client
    tag = uuid.uuid4().hex[:8]
    r = await admin.post("/api/v1/admin/businesses/import", json={"city_slug": city.slug, "businesses": [
        {"name": f"Hours A {tag}", "category_slug": category.slug, "source_ref": f"node/ha{tag}",
         "address": "Road 1", "opening_hours": "Mo-Sa 09:00-21:00"},
        {"name": f"Hours B {tag}", "category_slug": category.slug, "source_ref": f"node/hb{tag}", "address": "Road 2"},
    ]})
    assert r.json()["created"] == 2

    # Backfill fills only empty hours — never overwrites existing ones
    items = [{"source_ref": f"node/ha{tag}", "opening_hours": "24/7"},
             {"source_ref": f"node/hb{tag}", "opening_hours": "Mo-Su 10:00-22:00"}]
    assert (await client.post("/api/v1/admin/businesses/import/hours", json={"items": items})).status_code == 403
    res = await admin.post("/api/v1/admin/businesses/import/hours", json={"items": items})
    assert res.json() == {"updated": 1, "skipped": 1}

    engine = _make_engine()
    async with async_sessionmaker(engine)() as s:
        hours = dict((await s.execute(
            select(Business.source_ref, Business.opening_hours).where(Business.source_ref.like(f"node/h_{tag}"))
        )).all())
    await engine.dispose()
    assert hours == {f"node/ha{tag}": "Mo-Sa 09:00-21:00", f"node/hb{tag}": "Mo-Su 10:00-22:00"}


@pytest.mark.asyncio
async def test_new_owner_gets_review_nudge(auth_client, city, monkeypatch):
    client, _ = auth_client
    monkeypatch.setattr(business_claims, "generate_otp", lambda: "551177")
    b = await _unclaimed_business(city, phone="+91 98480 55117")
    await client.post(f"/api/v1/businesses/{b.id}/claim/otp/send")
    assert (await client.post(f"/api/v1/businesses/{b.id}/claim/otp/verify", json={"otp": "551177"})).status_code == 200

    notes = (await client.get("/api/v1/notifications")).json()
    items = notes if isinstance(notes, list) else notes.get("items", notes.get("notifications", []))
    mine = [n for n in items if n["title"] == f"You now manage {b.name}"]
    assert len(mine) == 1
    assert "ask for a review" in mine[0]["body"]
    assert mine[0]["action_url"] == f"/{city.slug}/businesses/{b.id}"
