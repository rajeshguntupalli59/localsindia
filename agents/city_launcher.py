#!/usr/bin/env python3
"""
CityLauncher — Seeds a new LocalIndia city with AI-generated content.

Usage:
  python agents/city_launcher.py --city "Vijayawada"                # single city, lang from DB's lang_default
  python agents/city_launcher.py --city "Mumbai" --lang "mr" --dry-run
  python agents/city_launcher.py --auto 10                          # daily batch: next 10 empty cities
  python agents/city_launcher.py --auto 10 --dry-run

What it does:
  1. Asks Claude to generate 20 seed listings + 10 businesses + launch content
  2. POSTs listings to the live API (as admin, is_seed=true — exempt from the
     30-day expiry cron, see routers/cron.py) and auto-approves them
  3. POSTs businesses to the live API
  4. Saves all generated content to agents/output/{city_slug}/

--auto N finds the next N cities with zero active listings (queried live,
sorted state/name) and seeds each in turn — no separate rotation-state file,
so it's self-correcting: a city that got seeded (or picked up a real user
listing) just won't show up as "empty" again.

Env vars required (set in .env or environment):
  ANTHROPIC_API_KEY          — Claude API key
  LOCALINDIA_ADMIN_PASSWORD  — Admin password for the live site
  LOCALINDIA_API_URL         — Optional override (default: https://localsindia-backend-in.azurewebsites.net)
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from base_agent import generate, save_output, build_system_prompt as _build_sp

# ─── Config ────────────────────────────────────────────────────────────────────

BACKEND_URL = os.getenv("LOCALINDIA_API_URL", "https://localsindia-backend-in.azurewebsites.net")
ADMIN_USERNAME = "localsindia_admin"

LANG_NAMES = {
    "te": "Telugu", "hi": "Hindi", "ta": "Tamil", "kn": "Kannada",
    "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati", "pa": "Punjabi",
    "ml": "Malayalam", "or": "Odia", "en": "English",
}

# Seed phone numbers — valid format (+91[6-9]\d{9}) but clearly fictional
LISTING_PHONES = [f"+9163{str(i).zfill(8)}" for i in range(1, 21)]
BUSINESS_PHONES = [f"+9164{str(i).zfill(8)}" for i in range(1, 11)]

# ─── API helpers ───────────────────────────────────────────────────────────────

async def admin_login(client: httpx.AsyncClient, password: str) -> str:
    resp = await client.post(
        f"{BACKEND_URL}/api/v1/auth/admin-login",
        json={"username": ADMIN_USERNAME, "password": password},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


async def fetch_cities(client: httpx.AsyncClient) -> list[dict]:
    resp = await client.get(f"{BACKEND_URL}/api/v1/cities", timeout=30)
    resp.raise_for_status()
    return resp.json()


async def fetch_categories(client: httpx.AsyncClient) -> dict[str, str]:
    """Returns {slug: id} map."""
    resp = await client.get(f"{BACKEND_URL}/api/v1/categories", timeout=30)
    resp.raise_for_status()
    return {c["slug"]: c["id"] for c in resp.json()}


class TokenManager:
    """Re-authenticates automatically when the JWT expires during long rate-limit waits."""
    def __init__(self, client: httpx.AsyncClient, password: str):
        self._client = client
        self._password = password
        self._token: str | None = None

    async def get(self) -> str:
        if not self._token:
            self._token = await admin_login(self._client, self._password)
        return self._token

    async def refresh(self) -> str:
        self._token = await admin_login(self._client, self._password)
        print("    [OK] Re-authenticated — fresh token obtained")
        return self._token


async def post_listing(client: httpx.AsyncClient, tm: TokenManager, payload: dict) -> str | None:
    for attempt in range(3):
        try:
            token = await tm.get()
            resp = await client.post(
                f"{BACKEND_URL}/api/v1/listings",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            if resp.status_code == 429:
                print(f"    [WAIT] Rate limited — pausing 65s before retry...")
                await asyncio.sleep(65)
                continue
            if resp.status_code == 401:
                print(f"    [WAIT] Token expired — refreshing auth...")
                await tm.refresh()
                continue
            resp.raise_for_status()
            return resp.json()["id"]
        except httpx.HTTPStatusError:
            raise
        except Exception as e:
            print(f"    [WARN] listing POST attempt {attempt+1} failed: {e}")
            if attempt < 2:
                await asyncio.sleep(5)
    return None


async def approve_listing(client: httpx.AsyncClient, tm: TokenManager, listing_id: str) -> bool:
    for attempt in range(2):
        try:
            token = await tm.get()
            resp = await client.patch(
                f"{BACKEND_URL}/api/v1/admin/listings/{listing_id}/approve",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            if resp.status_code == 401:
                await tm.refresh()
                continue
            resp.raise_for_status()
            return True
        except Exception as e:
            print(f"    [WARN] approve failed for {listing_id}: {e}")
    return False


async def post_business(client: httpx.AsyncClient, tm: TokenManager, payload: dict) -> str | None:
    for attempt in range(3):
        try:
            token = await tm.get()
            resp = await client.post(
                f"{BACKEND_URL}/api/v1/businesses",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            if resp.status_code == 429:
                print(f"    [WAIT] Rate limited — pausing 65s before retry...")
                await asyncio.sleep(65)
                continue
            if resp.status_code == 401:
                print(f"    [WAIT] Token expired — refreshing auth...")
                await tm.refresh()
                continue
            resp.raise_for_status()
            return resp.json()["id"]
        except httpx.HTTPStatusError:
            raise
        except Exception as e:
            print(f"    [WARN] business POST attempt {attempt+1} failed: {e}")
            if attempt < 2:
                await asyncio.sleep(5)
    return None


# ─── Claude content generation ─────────────────────────────────────────────────

def build_system_prompt() -> str:
    return _build_sp("city_launcher")


def build_user_prompt(city: str, state: str, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    return f"""Generate a complete City Launch Kit for: {city}, {state}
Regional language: {lang_name} (script code: {lang})

Return this exact JSON structure:

{{
  "landing_copy": {{
    "hero_headline_en": "short benefit-led headline for {city} (under 10 words)",
    "hero_headline_lang": "same headline in {lang_name} Unicode script",
    "sub_headline_en": "who it's for and what they get (1 sentence)",
    "features_en": ["feature 1", "feature 2", "feature 3"],
    "cta_en": "Post Free Listing",
    "cta_lang": "Post Free Listing in {lang_name} Unicode script"
  }},
  "listings": [
    {{
      "title": "listing title IN ENGLISH ONLY",
      "description": "2-3 sentence description IN ENGLISH ONLY. Mention specific area in {city}.",
      "category": "one of: classifieds|services|pg-roommate|jobs|vehicles|electronics|tiffin|real-estate|furniture|fashion",
      "price": 1500,
      "area": "real neighborhood in {city}"
    }}
  ],
  "businesses": [
    {{
      "name": "business name IN ENGLISH ONLY",
      "description": "what they do, where they are in {city} — IN ENGLISH ONLY",
      "category": "businesses",
      "address": "street, area, {city}"
    }}
  ],
  "launch_content": {{
    "reddit_title": "honest founder-voice Reddit post title (no exclamation, no hype)",
    "reddit_body": "300-400 word authentic Reddit post. Relatable problem → what you built → honest limitations → open question.",
    "whatsapp_en": "under 280 chars. Helpful tip about finding things locally in {city}. Natural mention of LocalIndia.",
    "whatsapp_lang": "same in {lang_name} Unicode script, under 300 chars",
    "instagram_captions": [
      "caption 1: community-focused about {city} life. 6 hashtags.",
      "caption 2: problem-solution format. 6 hashtags.",
      "caption 3: social proof format. 6 hashtags."
    ]
  }}
}}

Generate exactly 20 listings covering these categories (mix them naturally):
- 4 tiffin (home-cooked meal delivery, tiffin services — use category "tiffin")
- 3 services (tuition, repair, beauty — NOT tiffin, use category "services")
- 4 pg-roommate (PG rooms, flatmates — use category "pg-roommate")
- 3 jobs (part-time, freelance — use category "jobs")
- 2 classifieds (used goods, books — use category "classifieds")
- 1 furniture (tables, chairs, sofas — use category "furniture")
- 2 vehicles (bikes, cars — use category "vehicles")
- 1 electronics (phones, laptops — use category "electronics")

Generate exactly 10 businesses (mix of restaurants, salons, clinics, coaching centres, shops).

Use real area names from {city}. All listing titles, descriptions, business names, and addresses must be in English.
Regional language is only for whatsapp_lang and instagram_captions."""


# ─── Content parsing ───────────────────────────────────────────────────────────

def parse_claude_response(raw: str) -> dict:
    raw = raw.strip()
    # Strip markdown code fences if Claude added them despite instructions
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]
    return json.loads(raw.strip())


# ─── Main ──────────────────────────────────────────────────────────────────────

async def determine_empty_cities(client: httpx.AsyncClient) -> list[dict]:
    """Cities with zero active listings right now, queried live rather than
    tracked in a state file — self-correcting as cities get seeded (or as
    real users post in a previously-empty city), immune to the kind of
    staleness that hit MARKETING_TASKS.md's hand-maintained seeding table."""
    cities = await fetch_cities(client)
    empty = []
    for c in cities:
        resp = await client.get(
            f"{BACKEND_URL}/api/v1/cities/{c['slug']}/listings",
            params={"page_size": 1, "status": "active"},
            timeout=30,
        )
        resp.raise_for_status()
        if len(resp.json()) == 0:
            empty.append(c)
    empty.sort(key=lambda c: (c["state"], c["name"]))
    return empty


async def seed_city(
    client: httpx.AsyncClient,
    tm: "TokenManager | None",
    cat_map: dict,
    fallback_cat_id: str | None,
    city_obj: dict,
    dry_run: bool,
    max_listings: int = 20,
) -> dict:
    """Generates + posts content for one city (already resolved to a DB row).
    Shared by both the single-city CLI path and the daily auto-batch."""
    city = city_obj["name"]
    state = city_obj["state"]
    lang = city_obj.get("lang_default") or "en"
    city_id = city_obj["id"]
    city_slug = city_obj["slug"]

    print(f"\n[CityLauncher] {city}, {state} ({LANG_NAMES.get(lang, lang)})")
    print("-" * 50)

    print(">> Generating content with Claude...")
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(city, state, lang)
    raw = generate(system_prompt, user_prompt, max_tokens=6000)

    try:
        data = parse_claude_response(raw)
    except json.JSONDecodeError as e:
        print(f"ERROR: Claude returned invalid JSON for {city}: {e}")
        Path("agents/output/debug_raw.txt").write_text(raw, encoding="utf-8")
        return {"city": city, "status": "generation_failed"}

    listings = data.get("listings", [])[:max_listings]
    businesses = data.get("businesses", [])
    print(f"OK Generated {len(listings)} listings, {len(businesses)} businesses")

    if dry_run:
        out_path = save_output("city_launcher", city_slug, json.dumps(data, ensure_ascii=False, indent=2), "json")
        print(f"\nDRY RUN -- content saved to {out_path}")
        _print_launch_preview(data)
        return {"city": city, "status": "dry_run"}

    # Post listings
    print(f"\n>> Posting {len(listings)} listings...")
    posted_listing_ids = []
    for i, listing in enumerate(listings):
        raw_cat = listing.get("category", "")
        cat_id = cat_map.get(raw_cat)
        if not cat_id:
            print(f"  [WARN] Unknown category slug '{raw_cat}' — using classifieds")
            cat_id = cat_map.get("classifieds", fallback_cat_id)
        phone = LISTING_PHONES[i % len(LISTING_PHONES)]
        phone_digits = phone.replace("+91", "")
        payload = {
            "title": listing["title"][:150],
            "description": listing.get("description", ""),
            "category_id": cat_id,
            "city_id": city_id,
            "contact_phone": phone,
            "whatsapp_url": f"https://wa.me/91{phone_digits}",
            "price": listing.get("price"),
            "area": listing.get("area"),
            "is_seed": True,  # exempt from the expiry cron — see routers/cron.py
        }
        listing_id = await post_listing(client, tm, payload)
        if listing_id:
            approved = await approve_listing(client, tm, listing_id)
            status = "OK" if approved else "WARN"
            posted_listing_ids.append(listing_id)
        else:
            status = "FAIL"
        title_preview = listing['title'][:55]
        print(f"  [{status}] [{raw_cat}] {title_preview}")
        await asyncio.sleep(1.0)

    print(f"\nOK {len(posted_listing_ids)}/{len(listings)} listings live")

    # Post businesses
    print(f"\n>> Posting {len(businesses)} businesses...")
    posted_biz_ids = []
    for i, biz in enumerate(businesses):
        cat_id = cat_map.get(biz.get("category", "businesses"), fallback_cat_id)
        phone = BUSINESS_PHONES[i % len(BUSINESS_PHONES)]
        payload = {
            "name": biz["name"],
            "description": biz.get("description"),
            "address": biz.get("address"),
            "phone": phone,
            "whatsapp_url": f"https://wa.me/91{phone.replace('+91', '')}",
            "city_id": city_id,
            "category_id": cat_id,
        }
        biz_id = await post_business(client, tm, payload)
        status = "OK" if biz_id else "FAIL"
        if biz_id:
            posted_biz_ids.append(biz_id)
        print(f"  [{status}] {biz['name']}")
        await asyncio.sleep(1.0)

    print(f"\nOK {len(posted_biz_ids)}/{len(businesses)} businesses posted")

    seed_data = {
        "city": city, "city_id": city_id, "city_slug": city_slug, "lang": lang,
        "listing_ids": posted_listing_ids, "business_ids": posted_biz_ids,
        "content": data,
    }
    out_json = save_output("city_launcher", city_slug, json.dumps(seed_data, ensure_ascii=False, indent=2), "json")
    out_md = save_output("city_launcher_launch", city_slug, _build_launch_doc(city, data), "md")
    print(f"\nSaved:")
    print(f"  Seed data:  {out_json}")
    print(f"  Launch kit: {out_md}")

    _print_launch_preview(data)
    return {"city": city, "status": "ok", "listings": len(posted_listing_ids), "businesses": len(posted_biz_ids)}


async def run(city: str, lang: str | None, dry_run: bool, password: str | None, max_listings: int = 20):
    """Single-city mode (--city X): resolve the named city, then seed it."""
    if not dry_run and not password:
        print("ERROR: LOCALINDIA_ADMIN_PASSWORD not set. Use --dry-run or set the env var.")
        sys.exit(1)

    async with httpx.AsyncClient() as client:
        tm = None
        cat_map = {}
        fallback_cat_id = None
        if not dry_run:
            print(">> Logging in as admin...")
            tm = TokenManager(client, password)
            await tm.get()  # validates credentials up-front
            print("OK Admin JWT obtained")
            cat_map = await fetch_categories(client)
            fallback_cat_id = next(iter(cat_map.values()))

        print(f"\n>> Looking up {city}...")
        cities = await fetch_cities(client)
        city_obj = next((c for c in cities if c["name"].lower() == city.lower()), None)
        if not city_obj:
            city_obj = next((c for c in cities if city.lower() in c["name"].lower()), None)
        if not city_obj:
            print(f"ERROR: City '{city}' not found in DB. Available: {[c['name'] for c in cities[:10]]}")
            sys.exit(1)
        if lang:
            city_obj = {**city_obj, "lang_default": lang}  # explicit --lang overrides the DB default
        print(f"OK Found: {city_obj['name']} ({city_obj['state']}) id: {city_obj['id']}")

        await seed_city(client, tm, cat_map, fallback_cat_id, city_obj, dry_run, max_listings)


async def run_batch(n: int, dry_run: bool, password: str | None, max_listings: int = 20):
    """Auto mode (--auto N): finds the next N cities with zero active
    listings (state/name order) and seeds each one in turn."""
    if not dry_run and not password:
        print("ERROR: LOCALINDIA_ADMIN_PASSWORD not set. Use --dry-run or set the env var.")
        sys.exit(1)

    async with httpx.AsyncClient() as client:
        tm = None
        cat_map = {}
        fallback_cat_id = None
        if not dry_run:
            print(">> Logging in as admin...")
            tm = TokenManager(client, password)
            await tm.get()
            print("OK Admin JWT obtained")
            cat_map = await fetch_categories(client)
            fallback_cat_id = next(iter(cat_map.values()))

        print(f"\n>> Scanning cities for empty ones...")
        empty = await determine_empty_cities(client)
        print(f"OK {len(empty)} cities currently have zero active listings")

        if not empty:
            print("All cities already have at least one active listing — nothing to seed today.")
            return

        batch = empty[:n]
        print(f"\n>> Seeding {len(batch)} cities today: {', '.join(c['name'] for c in batch)}")

        results = []
        for city_obj in batch:
            try:
                result = await seed_city(client, tm, cat_map, fallback_cat_id, city_obj, dry_run, max_listings)
            except Exception as e:
                print(f"ERROR seeding {city_obj['name']}: {e}")
                result = {"city": city_obj["name"], "status": "error", "error": str(e)}
            results.append(result)
            await asyncio.sleep(2.0)

        remaining = len(empty) - len(batch)
        print("\n" + "=" * 50)
        print("BATCH SUMMARY")
        for r in results:
            extra = f" ({r.get('listings', 0)} listings, {r.get('businesses', 0)} businesses)" if r["status"] == "ok" else ""
            print(f"  {r['city']}: {r['status']}{extra}")
        print(f"\n{remaining} cities still empty after this batch.")


def _build_launch_doc(city: str, data: dict) -> str:
    lc = data.get("landing_copy", {})
    launch = data.get("launch_content", {})
    lines = [
        f"# {city} Launch Kit",
        "",
        "## Landing Page Copy",
        f"**Headline (EN):** {lc.get('hero_headline_en', '')}",
        f"**Headline (Regional):** {lc.get('hero_headline_lang', '')}",
        f"**Sub-headline:** {lc.get('sub_headline_en', '')}",
        f"**CTA (EN):** {lc.get('cta_en', '')}",
        f"**CTA (Regional):** {lc.get('cta_lang', '')}",
        "",
        "## Reddit Post",
        f"**Title:** {launch.get('reddit_title', '')}",
        "",
        launch.get("reddit_body", ""),
        "",
        "## WhatsApp Forwards",
        f"**English:** {launch.get('whatsapp_en', '')}",
        "",
        f"**Regional:** {launch.get('whatsapp_lang', '')}",
        "",
        "## Instagram Captions",
    ]
    for i, cap in enumerate(launch.get("instagram_captions", []), 1):
        lines.append(f"\n**Caption {i}:**\n{cap}")
    return "\n".join(lines)


def _print_launch_preview(data: dict):
    launch = data.get("launch_content", {})
    lc = data.get("landing_copy", {})
    print("\n" + "-" * 50)
    print("LAUNCH KIT PREVIEW")
    print("-" * 50)
    print(f"Hero:    {lc.get('hero_headline_en', '')}")
    print(f"WA(EN):  {launch.get('whatsapp_en', '')[:120]}")
    print(f"Reddit:  {launch.get('reddit_title', '')}")
    print("-" * 50)


# ─── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="CityLauncher — seed a LocalIndia city with AI content")
    parser.add_argument("--city", help="City name exactly as in the DB (e.g. 'Vijayawada') — single-city mode")
    parser.add_argument("--auto", type=int, metavar="N", help="Auto mode: seed the next N cities with zero active listings")
    parser.add_argument("--lang", default=None, help="Language code override (default: the city's own lang_default from the DB)")
    parser.add_argument("--dry-run", action="store_true", help="Generate content only — skip API calls")
    parser.add_argument("--max-listings", type=int, default=20, help="Max listings to post per city (default: 20)")
    parser.add_argument("--env-file", default=".env", help="Path to .env file (default: .env)")
    args = parser.parse_args()

    if not args.city and not args.auto:
        parser.error("either --city NAME or --auto N is required")
    if args.city and args.auto:
        parser.error("--city and --auto are mutually exclusive — pick one")

    # Load env
    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    password = os.getenv("LOCALINDIA_ADMIN_PASSWORD")

    if args.auto:
        asyncio.run(run_batch(
            n=args.auto,
            dry_run=args.dry_run,
            password=password,
            max_listings=args.max_listings,
        ))
    else:
        asyncio.run(run(
            city=args.city,
            lang=args.lang,
            dry_run=args.dry_run,
            password=password,
            max_listings=args.max_listings,
        ))


if __name__ == "__main__":
    main()
