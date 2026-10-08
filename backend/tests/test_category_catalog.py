"""Subcategories + per-subcategory posting questions (app/core/category_catalog.py)."""
import uuid

import pytest
from sqlalchemy import select

from app.core import category_catalog as cc


async def _cat(db, slug: str, name: str):
    from app.models.category import Category
    cat = (await db.execute(select(Category).where(Category.slug == slug))).scalar_one_or_none()
    if not cat:
        cat = Category(name=name, slug=slug, sort_order=0)
        db.add(cat)
        await db.commit()
        await db.refresh(cat)
    return cat


def _listing(cat, city, **extra):
    return {
        "title": "Test listing title",
        "description": "Test description.",
        "category_id": str(cat.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543215",
        **extra,
    }


# ── The catalog itself ─────────────────────────────────────────────────────────

def test_catalog_slugs_and_keys_are_unique():
    slugs = [c["slug"] for c in cc.CATALOG] + [s["slug"] for c in cc.CATALOG for s in c["subcategories"]]
    assert len(slugs) == len(set(slugs))
    for c in cc.CATALOG:
        for qs in [c["questions"]] + [s["questions"] for s in c["subcategories"]]:
            keys = [q["key"] for q in qs]
            assert len(keys) == len(set(keys)), (c["slug"], keys)
            for q in qs:
                assert q["type"] in {"text", "number", "select", "multiselect", "switch"}
                if q["type"] in {"select", "multiselect"}:
                    assert q["options"], q


def test_questions_stay_short_and_tappable():
    """Few questions per type, mostly pick-an-option — never a long form."""
    for c in cc.CATALOG:
        for s in c["subcategories"]:
            assert len(s["questions"]) <= 7, s["slug"]
            texts = [q["key"] for q in s["questions"] if q["type"] == "text"]
            assert len(texts) <= 1, (s["slug"], texts)


def test_a_key_is_numeric_everywhere_or_nowhere():
    """Number filters cast the stored answer — a key can't be a number in one
    list and text/choice in another."""
    types = {}
    for c in cc.CATALOG:
        for qs in [c["questions"]] + [s["questions"] for s in c["subcategories"]]:
            for q in qs:
                types.setdefault(q["key"], set()).add(q["type"])
    assert not [k for k, t in types.items() if "number" in t and len(t) > 1]


def test_every_listing_category_has_specific_questions():
    """Each category that takes listings asks its own questions — no category
    or subcategory falls back to an empty or shared-by-all list."""
    no_listing_questions = {"events", "businesses"}  # use their own Event / Business forms
    lists = []
    for c in cc.CATALOG:
        if c["slug"] in no_listing_questions:
            continue
        assert c["questions"], c["slug"]
        assert c["subcategories"], c["slug"]
        for s in c["subcategories"]:
            assert s["questions"], s["slug"]
            lists.append(tuple(q["key"] for q in s["questions"]))
    # Subcategories in different categories never share an identical question list
    by_cat = {}
    for c in cc.CATALOG:
        for s in c["subcategories"]:
            by_cat.setdefault(tuple(q["key"] for q in s["questions"]), set()).add(c["slug"])
    assert all(len(cats) == 1 for keys, cats in by_cat.items() if keys)


def test_legacy_category_questions_keep_old_keys_and_options():
    """The installed mobile app sends these exact keys/values with no
    subcategory — they must keep validating."""
    legacy = {
        "vehicles": {"brand": "Honda", "model": "Activa", "year": 2022, "km_driven": 4500,
                     "fuel_type": "Petrol", "transmission": "Automatic", "owners_count": 1},
        "jobs": {"company_name": "Acme", "salary_min": 15000, "salary_max": 25000, "job_type": "Full-time",
                 "experience_required": "1-2 years", "work_mode": "On-site"},
        "pg-roommate": {"room_type": "Sharing", "gender_preference": "Female", "deposit_amount": 10000,
                        "amenities": ["WiFi", "Food"]},
        "real-estate": {"property_type": "Plot", "bhk": 2, "sqft": 1200, "furnishing": "Unfurnished",
                        "listing_type": "Sale"},
        "electronics": {"brand": "Samsung", "model": "S23", "condition": "Good", "warranty_remaining": "6 months"},
        "furniture": {"material": "Wood", "dimensions": "6x4", "condition": "Fair"},
        "fashion": {"brand": "Nike", "size": "M", "gender": "Kids"},
        "education": {"course_type": "Spoken English", "mode": "Online", "duration": "3 months"},
        "doctors": {"specialization": "Dentist", "consultation_fee": 500, "available_timings": "10-6"},
        "services": {"service_type": "Plumber", "experience_years": 5},
        "tiffin": {"meal_type": "Veg", "delivery_area": "KPHB", "subscription_available": True},
    }
    for slug, answers in legacy.items():
        assert cc.validate_answers(slug, None, answers) == answers, slug


def test_validate_answers_rules():
    with pytest.raises(cc.AnswerError, match="required"):
        cc.validate_answers("vehicles", "cars", {"brand": "Maruti Suzuki"})
    with pytest.raises(cc.AnswerError, match="one of"):
        cc.validate_answers("vehicles", "cars", {"brand": "Maruti"})  # not one of the brand options
    with pytest.raises(cc.AnswerError, match="one of"):
        cc.validate_answers("vehicles", None, {"fuel_type": "Kerosene"})
    with pytest.raises(cc.AnswerError, match="between"):
        cc.validate_answers("vehicles", None, {"year": 3000})
    with pytest.raises(cc.AnswerError, match="Unknown"):
        cc.validate_answers("vehicles", None, {"bhk": 2})
    with pytest.raises(cc.AnswerError, match="Min Salary"):
        cc.validate_answers("jobs", None, {"salary_min": 30000, "salary_max": 20000})
    with pytest.raises(cc.AnswerError, match="yes or no"):
        cc.validate_answers("tiffin", None, {"subscription_available": "maybe"})
    # PG & Hostels asks about food on its own — "Food" isn't an amenity there
    with pytest.raises(cc.AnswerError, match="chosen from"):
        cc.validate_answers("pg-roommate", "pg-hostels", {
            "gender_preference": "Male", "sharing": "Single", "food_included": "No food", "amenities": ["Food"]})
    # A family hiring a cook isn't asked for a company or a work mode
    maid = {q["key"] for q in cc.questions_for("jobs", "domestic-help-jobs")}
    assert "company_name" not in maid and "work_mode" not in maid
    # Blank answers are dropped; numeric strings become numbers
    assert cc.validate_answers("vehicles", None, {"brand": "", "year": "2019", "model": None}) == {"year": 2019}


def test_display_rows_labels_and_formats():
    rows = cc.display_rows("pg-roommate", "pg-hostels", {
        "gender_preference": "Female", "sharing": "2 Sharing", "food_included": "3 meals",
        "deposit_amount": 10000.0, "amenities": ["WiFi", "AC"],
    })
    by_key = {r["key"]: r for r in rows}
    assert by_key["deposit_amount"]["value"] == "₹10,000"
    assert by_key["amenities"]["value"] == "WiFi, AC"
    assert by_key["sharing"]["label"] == "Sharing"
    assert [r["key"] for r in rows][:3] == ["gender_preference", "sharing", "food_included"]
    year = cc.display_rows("vehicles", None, {"year": 2019, "km_driven": 45000})
    assert {r["key"]: r["value"] for r in year} == {"year": "2019", "km_driven": "45,000 km"}


# ── API ───────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_catalog_endpoint(client, db):
    await _cat(db, "vehicles", "Vehicles")
    resp = await client.get("/api/v1/categories/catalog")
    assert resp.status_code == 200
    vehicles = next(c for c in resp.json() if c["slug"] == "vehicles")
    assert vehicles["name"] == "Vehicles"
    cars = next(s for s in vehicles["subcategories"] if s["slug"] == "cars")
    assert any(q["key"] == "fuel_type" and q.get("required") for q in cars["questions"])
    # The plain category list stays top-level only (the installed app renders it as-is)
    flat = (await client.get("/api/v1/categories")).json()
    assert not any(c["slug"] == "cars" for c in flat)


@pytest.mark.asyncio
async def test_create_with_subcategory_validates_and_labels(auth_client, db, city):
    cat = await _cat(db, "vehicles", "Vehicles")
    ac, _ = auth_client

    missing = await ac.post("/api/v1/listings", json=_listing(cat, city, subcategory_slug="cars",
                                                              category_details={"brand": "Maruti"}))
    assert missing.status_code == 422

    wrong_parent = await ac.post("/api/v1/listings", json=_listing(cat, city, subcategory_slug="pg-hostels"))
    assert wrong_parent.status_code == 422

    resp = await ac.post("/api/v1/listings", json=_listing(cat, city, subcategory_slug="cars", category_details={
        "brand": "Maruti Suzuki", "model": "Swift VXI", "year": 2019, "km_driven": 45000,
        "fuel_type": "Petrol", "transmission": "Manual", "owner": "1st owner",
    }))
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["subcategory_slug"] == "cars"
    assert body["subcategory_name"] == "Cars"
    rows = {r["key"]: r["value"] for r in body["detail_rows"]}
    assert rows["km_driven"] == "45,000 km"
    assert rows["owner"] == "1st owner"

    fetched = (await ac.get(f"/api/v1/listings/{body['id']}")).json()
    assert fetched["category_details"]["fuel_type"] == "Petrol"
    assert len(fetched["detail_rows"]) == 7


@pytest.mark.asyncio
async def test_update_answers(auth_client, db, city):
    cat = await _cat(db, "electronics", "Electronics")
    ac, _ = auth_client
    created = (await ac.post("/api/v1/listings", json=_listing(cat, city, category_details={"brand": "Samsung"}))).json()

    bad = await ac.patch(f"/api/v1/listings/{created['id']}", json={
        "subcategory_slug": "mobiles-tablets", "category_details": {"brand": "Apple"}})
    assert bad.status_code == 422  # model + condition are required for Mobiles

    ok = await ac.patch(f"/api/v1/listings/{created['id']}", json={
        "subcategory_slug": "mobiles-tablets",
        "category_details": {"brand": "Apple", "model": "iPhone 13", "condition": "Good", "storage": "128GB"}})
    assert ok.status_code == 200, ok.text
    assert ok.json()["subcategory_name"] == "Mobiles & Tablets"
    assert ok.json()["category_details"] == {"brand": "Apple", "model": "iPhone 13", "condition": "Good", "storage": "128GB"}

    # A plain field edit keeps the answers
    title_only = await ac.patch(f"/api/v1/listings/{created['id']}", json={"title": "iPhone 13 128GB Blue"})
    assert title_only.json()["category_details"]["storage"] == "128GB"


@pytest.mark.asyncio
async def test_listing_answer_filters(auth_client, db, city):
    from app.models.listing import Listing
    cat = await _cat(db, "real-estate", "Real Estate")
    ac, _ = auth_client
    tag = uuid.uuid4().hex[:6]
    homes = [
        ("homes-for-rent", {"property_type": "Apartment", "bhk": 2, "furnishing": "Furnished", "posted_by": "Owner", "tenant_preference": "Family"}),
        ("homes-for-rent", {"property_type": "Apartment", "bhk": 3, "furnishing": "Unfurnished", "posted_by": "Agent"}),
        ("homes-for-sale", {"property_type": "Villa", "bhk": 4, "sqft": 3000, "construction_status": "Ready to move", "posted_by": "Builder"}),
    ]
    ids = []
    for sub, answers in homes:
        r = await ac.post("/api/v1/listings", json=_listing(cat, city, title=f"Home {tag}", subcategory_slug=sub, category_details=answers))
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])
    for lid in ids:
        listing = (await db.execute(select(Listing).where(Listing.id == uuid.UUID(lid)))).scalar_one()
        listing.status = "active"
    await db.commit()

    async def titles(**params):
        r = await ac.get("/api/v1/cities/hyderabad/listings", params={"category_slug": "real-estate", "q": tag, **params})
        assert r.status_code == 200, r.text
        return sorted(x["category_details"]["bhk"] for x in r.json())

    assert await titles() == [2, 3, 4]
    assert await titles(subcategory_slug="homes-for-rent") == [2, 3]
    assert await titles(f_furnishing="Furnished") == [2]
    assert await titles(f_bhk_min="3") == [3, 4]
    assert await titles(f_bhk_min="3", f_bhk_max="3") == [3]
    assert await titles(f_tenant_preference="Family") == [2]
    assert await titles(f_furnishing="Not-an-option") == [2, 3, 4]  # ignored, not an error
    bad = await ac.get("/api/v1/cities/hyderabad/listings", params={"category_slug": "real-estate", "f_bhk_min": "two"})
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_multiselect_filter(auth_client, db, city):
    from app.models.listing import Listing
    cat = await _cat(db, "pg-roommate", "PG / Roommate")
    ac, _ = auth_client
    tag = uuid.uuid4().hex[:6]
    for amenities in (["WiFi", "AC"], ["Laundry"]):
        r = await ac.post("/api/v1/listings", json=_listing(cat, city, title=f"PG {tag}", subcategory_slug="pg-hostels", category_details={
            "gender_preference": "Female", "sharing": "2 Sharing", "food_included": "3 meals", "amenities": amenities,
            "electricity_included": "AC" in amenities}))
        assert r.status_code == 201, r.text
        listing = (await db.execute(select(Listing).where(Listing.id == uuid.UUID(r.json()["id"])))).scalar_one()
        listing.status = "active"
    await db.commit()
    r = await ac.get("/api/v1/cities/hyderabad/listings", params={"category_slug": "pg-roommate", "q": tag, "f_amenities": "AC"})
    assert [x["category_details"]["amenities"] for x in r.json()] == [["WiFi", "AC"]]
    # Yes/no filter
    r = await ac.get("/api/v1/cities/hyderabad/listings", params={
        "category_slug": "pg-roommate", "subcategory_slug": "pg-hostels", "q": tag, "f_electricity_included": "true"})
    assert [x["category_details"]["amenities"] for x in r.json()] == [["WiFi", "AC"]]


@pytest.mark.asyncio
async def test_business_subcategories(auth_client, client, db, city):
    from app.models.business import Business
    doctors = await _cat(db, "doctors", "Doctors")
    vehicles = await _cat(db, "vehicles", "Vehicles")
    ac, _ = auth_client
    tag = uuid.uuid4().hex[:6]

    wrong = await ac.post("/api/v1/businesses", json={
        "name": f"Bad {tag}", "city_id": str(city.id), "category_id": str(vehicles.id), "subcategory_slug": "hospitals"})
    assert wrong.status_code == 422

    created = await ac.post("/api/v1/businesses", json={
        "name": f"Care Hospital {tag}", "city_id": str(city.id), "category_id": str(doctors.id), "subcategory_slug": "hospitals"})
    assert created.status_code == 201, created.text
    assert created.json()["subcategory_name"] == "Hospitals"
    db.add(Business(name=f"Apollo Pharmacy {tag}", city_id=city.id, category_id=doctors.id, subcategory_slug="pharmacies"))
    await db.commit()

    r = await client.get("/api/v1/businesses", params={"city_slug": "hyderabad", "category_slug": "doctors",
                                                        "subcategory_slug": "hospitals", "q": tag})
    assert [b["name"] for b in r.json()] == [f"Care Hospital {tag}"]
    counts = (await client.get("/api/v1/businesses/subcategory-counts",
                               params={"city_slug": "hyderabad", "category_slug": "doctors"})).json()
    assert counts["hospitals"] >= 1 and counts["pharmacies"] >= 1

    # Moving to another category drops the subcategory that no longer fits
    moved = await ac.patch(f"/api/v1/businesses/{created.json()['id']}", json={"category_id": str(vehicles.id)})
    assert moved.status_code == 200, moved.text
    assert moved.json()["subcategory_slug"] is None


@pytest.mark.asyncio
async def test_import_and_backfill_subcategories(admin_client, client, db, city):
    """OSM import sets a fitting subcategory; the backfill only fills empty
    ones, only with a subcategory of the business's own category."""
    await _cat(db, "doctors", "Doctors")
    admin, _ = admin_client
    n = uuid.uuid4().int % 10**9
    refs = [f"node/{n}", f"node/{n + 1}", f"node/{n + 2}"]
    created = await admin.post("/api/v1/admin/businesses/import", json={"city_slug": "hyderabad", "businesses": [
        {"name": f"Care Hospital {n}", "category_slug": "doctors", "source_ref": refs[0], "subcategory_slug": "hospitals"},
        {"name": f"Mismatch {n}", "category_slug": "doctors", "source_ref": refs[1], "subcategory_slug": "cars"},
        {"name": f"Plain {n}", "category_slug": "doctors", "source_ref": refs[2]},
    ]})
    assert created.json()["created"] == 3

    async def subs():
        rows = (await client.get("/api/v1/businesses", params={
            "city_slug": "hyderabad", "category_slug": "doctors", "q": str(n), "page_size": 50})).json()
        return {b["name"].split()[0]: b["subcategory_slug"] for b in rows}

    assert await subs() == {"Care": "hospitals", "Mismatch": None, "Plain": None}

    filled = await admin.post("/api/v1/admin/businesses/import/subcategories", json={"items": [
        {"source_ref": refs[0], "subcategory_slug": "pharmacies"},   # already set → untouched
        {"source_ref": refs[1], "subcategory_slug": "cars"},         # wrong category → refused
        {"source_ref": refs[2], "subcategory_slug": "pharmacies"},
    ]})
    assert filled.json() == {"updated": 1, "skipped": 2}
    assert await subs() == {"Care": "hospitals", "Mismatch": None, "Plain": "pharmacies"}
    assert (await client.post("/api/v1/admin/businesses/import/subcategories", json={"items": []})).status_code in (401, 403)
