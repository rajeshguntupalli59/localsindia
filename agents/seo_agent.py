#!/usr/bin/env python3
"""
SEOAgent — Generates AI-varied SEO metadata (title/description/keywords/
JSON-LD) per city and writes it to frontend/src/content/seo/{slug}.json,
where [city]/page.tsx reads it at request time (falls back to the plain
template when no file exists yet — see regionalSeo.ts for that).

Usage:
  python agents/seo_agent.py --city "Vijayawada"          # single city, state/lang looked up from the DB
  python agents/seo_agent.py --auto 10                    # batch: next 10 cities that qualify (see below)

--auto N picks cities that are actually eligible for Google's index
(>= MIN_LISTINGS_FOR_INDEX active listings, same threshold [city]/page.tsx
itself uses — matches agents/seo_agent.py:MIN_LISTINGS_FOR_INDEX) and don't
already have a generated file, prioritizing the most-listed cities first
since those get real search traffic soonest. No separate rotation-state
file — self-correcting the same way city_launcher.py's --auto is: a city
just stops being a "candidate" once frontend/src/content/seo/{slug}.json
exists for it, or it drops below the listing threshold.

Output: frontend/src/content/seo/{city_slug}.json (git-committed, read by
the live site — NOT agents/output/, which is gitignored and would leave
this permanently disconnected from anything real).

Env vars required:
  ANTHROPIC_API_KEY
  LOCALINDIA_API_URL   — optional override (default: https://localsindia-backend-in.azurewebsites.net)
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from base_agent import generate, build_system_prompt

BACKEND_URL = os.getenv("LOCALINDIA_API_URL", "https://localsindia-backend-in.azurewebsites.net")
# Must match [city]/page.tsx's own MIN_LISTINGS_FOR_INDEX — generating rich
# SEO copy for a city Google won't even index yet is wasted API spend.
MIN_LISTINGS_FOR_INDEX = 3

SEO_DIR = Path(__file__).parent.parent / "frontend" / "src" / "content" / "seo"

LANG_NAMES = {
    "te": "Telugu", "hi": "Hindi", "ta": "Tamil", "kn": "Kannada",
    "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati", "pa": "Punjabi",
    "ml": "Malayalam", "or": "Odia", "en": "English",
}

SYSTEM_PROMPT = build_system_prompt("seo_agent")


# ─── API helpers ───────────────────────────────────────────────────────────

async def fetch_cities(client: httpx.AsyncClient) -> list[dict]:
    resp = await client.get(f"{BACKEND_URL}/api/v1/cities", timeout=30)
    resp.raise_for_status()
    return resp.json()


async def fetch_listing_count(client: httpx.AsyncClient, slug: str) -> int:
    resp = await client.get(
        f"{BACKEND_URL}/api/v1/cities/{slug}/listings",
        params={"page_size": 50, "status": "active"},
        timeout=30,
    )
    resp.raise_for_status()
    return len(resp.json())


def has_seo_file(slug: str) -> bool:
    return (SEO_DIR / f"{slug}.json").exists()


async def determine_candidates(client: httpx.AsyncClient) -> list[tuple[dict, int]]:
    """Cities eligible for Google's index that don't have generated SEO
    content yet, sorted by listing count descending (most-trafficked
    pages first)."""
    cities = await fetch_cities(client)
    candidates = []
    for c in cities:
        if has_seo_file(c["slug"]):
            continue
        count = await fetch_listing_count(client, c["slug"])
        if count >= MIN_LISTINGS_FOR_INDEX:
            candidates.append((c, count))
    candidates.sort(key=lambda pair: -pair[1])
    return candidates


# ─── Claude content generation ─────────────────────────────────────────────

def build_user_prompt(city: str, state: str, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    slug = city.lower().replace(" ", "-")
    return f"""Generate complete SEO metadata for the LocalsIndia city page: {city}, {state}
Regional language: {lang_name} (script code: {lang})

Return this exact JSON:
{{
  "title_tag": "under 60 chars, must include \\"{city}\\"",
  "meta_description": "under 155 chars, benefit-led, must include \\"{city}\\"",
  "og_title": "...",
  "og_description": "...",
  "h1": "...",
  "focus_keyword": "the single primary keyword phrase this page targets",
  "secondary_keywords": ["...", "...", "...", "..."],
  "long_tail_keywords": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
  "json_ld": {{
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "...",
    "description": "...",
    "url": "https://www.localsindia.com/{slug}",
    "inLanguage": ["{lang}", "en"],
    "about": {{
      "@type": "City",
      "name": "{city}",
      "containedInPlace": {{ "@type": "State", "name": "{state}" }}
    }}
  }}
}}

No fabricated stats, listing counts, or user counts — LocalsIndia is early-stage and actual inventory varies city to city. Never claim national/all-India coverage; this is South India only."""


def parse_claude_response(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]
    return json.loads(raw.strip())


def write_seo_file(city_obj: dict, seo: dict) -> Path:
    slug = city_obj["slug"]
    out = {
        "citySlug": slug,
        "city": city_obj["name"],
        "state": city_obj["state"],
        "lang": city_obj.get("lang_default") or "en",
        "titleTag": seo.get("title_tag", ""),
        "metaDescription": seo.get("meta_description", ""),
        "ogTitle": seo.get("og_title", ""),
        "ogDescription": seo.get("og_description", ""),
        "h1": seo.get("h1", ""),
        "focusKeyword": seo.get("focus_keyword", ""),
        "secondaryKeywords": seo.get("secondary_keywords", []),
        "longTailKeywords": seo.get("long_tail_keywords", []),
        "jsonLd": seo.get("json_ld", {}),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    SEO_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SEO_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def generate_for_city(city_obj: dict) -> dict:
    city, state = city_obj["name"], city_obj["state"]
    lang = city_obj.get("lang_default") or "en"
    print(f"\n[SEOAgent] {city}, {state} ({LANG_NAMES.get(lang, lang)})")
    print("-" * 50)

    raw = generate(SYSTEM_PROMPT, build_user_prompt(city, state, lang))
    try:
        seo = parse_claude_response(raw)
    except json.JSONDecodeError as e:
        print(f"  [FAIL] JSON parse error: {e}")
        return {"city": city, "status": "generation_failed"}

    out_path = write_seo_file(city_obj, seo)
    print(f"  [OK] {out_path}")
    print(f"  Title: {seo.get('title_tag', '')}")
    print(f"  Focus KW: {seo.get('focus_keyword', '')}")
    return {"city": city, "status": "ok"}


# ─── Entry points ───────────────────────────────────────────────────────────

async def run_single(city: str) -> None:
    async with httpx.AsyncClient() as client:
        cities = await fetch_cities(client)
        city_obj = next((c for c in cities if c["name"].lower() == city.lower()), None)
        if not city_obj:
            print(f"ERROR: City '{city}' not found in DB.")
            sys.exit(1)
        generate_for_city(city_obj)


async def run_batch(n: int) -> None:
    async with httpx.AsyncClient() as client:
        print(">> Finding cities eligible for SEO generation...")
        candidates = await determine_candidates(client)
        print(f"OK {len(candidates)} cities qualify (>= {MIN_LISTINGS_FOR_INDEX} listings, no SEO file yet)")

        if not candidates:
            print("Nothing to generate today.")
            return

        batch = candidates[:n]
        print(f"\n>> Generating for {len(batch)} cities: {', '.join(c['name'] for c, _ in batch)}")

        results = [generate_for_city(city_obj) for city_obj, _count in batch]

        remaining = len(candidates) - len(batch)
        print("\n" + "=" * 50)
        print("BATCH SUMMARY")
        for r in results:
            print(f"  {r['city']}: {r['status']}")
        print(f"\n{remaining} eligible cities still without generated SEO content.")


def main():
    parser = argparse.ArgumentParser(description="SEOAgent — generate AI-varied city SEO metadata")
    parser.add_argument("--city", help="City name exactly as in the DB — single-city mode")
    parser.add_argument("--auto", type=int, metavar="N", help="Auto mode: generate for the next N eligible cities")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    if not args.city and not args.auto:
        parser.error("either --city NAME or --auto N is required")
    if args.city and args.auto:
        parser.error("--city and --auto are mutually exclusive — pick one")

    env_path = Path(args.env_file)
    load_dotenv(env_path if env_path.exists() else None)

    if args.auto:
        asyncio.run(run_batch(args.auto))
    else:
        asyncio.run(run_single(args.city))


if __name__ == "__main__":
    main()
