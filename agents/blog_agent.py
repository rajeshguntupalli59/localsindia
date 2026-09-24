#!/usr/bin/env python3
"""
BlogAgent — Generates an evergreen, city-specific how-to/guide article for
the LocalsIndia blog and writes it directly into the frontend's content
directory (frontend/src/content/blog/{city_slug}/{slug}.json), where the
Next.js /blog routes pick it up on the next build.

Usage:
  python agents/blog_agent.py --city "Hyderabad" --state "Telangana" --category pg-roommate
  python agents/blog_agent.py --city "Hyderabad" --state "Telangana" --category pg-roommate --topic-id avoid-scam
  python agents/blog_agent.py --directory guntur doctors   # real-business directory article
  python agents/blog_agent.py --auto-rotate   # alternates directory articles and guides, real cities only

Two article types:
  - guide: evergreen how-to (topic templates below)
  - directory: "Dental Clinics in Guntur: Addresses & Phone Numbers" — the
    business list comes straight from the LocalsIndia API (real, mostly
    OpenStreetMap-imported businesses). The title is fixed by code and the
    LLM only writes general advice around it; it is told never to name,
    rank or describe specific businesses, so nothing about them is invented.

Output:
  frontend/src/content/blog/{city_slug}/{slug}.json
"""

import argparse
import json
import os
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from base_agent import generate, build_system_prompt

SYSTEM_PROMPT = build_system_prompt("blog_agent")

FRONTEND_CONTENT_DIR = Path(__file__).parent.parent / "frontend" / "src" / "content" / "blog"
ROTATION_STATE_FILE = Path(__file__).parent / "state" / "blog_rotation.json"

# The real 12 category slugs (backend/scripts/seed_categories.py) — only
# categories with a genuine everyday "how to" angle have topic templates below.
VALID_CATEGORIES = {
    "classifieds", "pg-roommate", "jobs", "vehicles", "electronics",
    "services", "events", "businesses", "tiffin", "real-estate",
    "furniture", "fashion",
}

BACKEND_URL = os.getenv("LOCALINDIA_API_URL", "https://localsindia-backend-in.azurewebsites.net")
REGIONS_FILE = Path(__file__).parent / "data" / "city_regions.json"


def load_cities() -> list[tuple[str, str, str]]:
    """(name, state, slug) for every city LocalsIndia actually serves, main
    city of every state first — the same priority order as the business
    import (agents/data/city_regions.json)."""
    data = json.loads(REGIONS_FILE.read_text(encoding="utf-8"))
    return [(data["regions"][s]["name"], data["regions"][s]["state"], s) for s in data["order"]]


TOP_CITIES = load_cities()

# Directory articles: business category -> (article label, SEO category page it links to)
DIRECTORY_CATEGORIES = {
    "doctors": ("Hospitals, Clinics & Pharmacies", "doctors"),
    "tiffin": ("Restaurants, Tiffin Centres & Bakeries", "tiffin"),
    "education": ("Schools, Colleges & Coaching Centres", "tutors"),
    "pg-roommate": ("PGs & Hostels", "pg-roommate"),
    "fashion": ("Clothing, Textile & Jewellery Shops", "fashion"),
    "services": ("Salons, Laundries & Local Services", "services"),
    "vehicles": ("Garages, Bike & Car Showrooms", "vehicles"),
    "electronics": ("Mobile & Electronics Shops", "electronics"),
    "events": ("Function Halls & Event Venues", "event-venues"),
    "businesses": ("Supermarkets, Kirana & General Stores", "shops"),
}
DIRECTORY_MIN_BUSINESSES = 6
DIRECTORY_MAX_BUSINESSES = 20

TOPIC_TEMPLATES = {
    "pg-roommate": [
        {"id": "avoid-scam", "angle": "How to Find a Reliable PG in {city} Without Getting Scammed"},
        {"id": "first-time-checklist", "angle": "PG Hunting Checklist for First-Time Movers to {city}"},
        {"id": "negotiate-rent", "angle": "How to Negotiate PG Rent and Deposit in {city}"},
    ],
    "tiffin": [
        {"id": "hygiene-check", "angle": "How to Vet a Tiffin Service in {city} for Hygiene and Reliability"},
        {"id": "cost-comparison", "angle": "Tiffin vs Cooking at Home: The Real Cost in {city}"},
        {"id": "dietary-needs", "angle": "Finding Tiffin Services in {city} That Handle Diabetic or Special Diets"},
    ],
    "jobs": [
        {"id": "spot-fake-listing", "angle": "How to Spot a Fake Job Listing in {city}"},
        {"id": "part-time-students", "angle": "Best Types of Part-Time Work for Students in {city}"},
    ],
    "vehicles": [
        {"id": "used-bike-checklist", "angle": "Checklist Before Buying a Used Bike in {city}"},
        {"id": "sell-vehicle-safely", "angle": "How to Sell Your Vehicle Safely in {city} Without Getting Lowballed"},
    ],
    "electronics": [
        {"id": "used-phone-check", "angle": "How to Check a Used Phone Before Buying It in {city}"},
    ],
    "services": [
        {"id": "hire-reliable-help", "angle": "How to Hire a Reliable Electrician or Plumber in {city}"},
    ],
    "real-estate": [
        {"id": "flat-vs-pg", "angle": "Renting a Flat vs a PG in {city}: What's Actually Cheaper"},
    ],
}


def slugify(text: str) -> str:
    text = re.sub(r"[^a-z0-9\s-]", "", text.lower())
    text = re.sub(r"[\s-]+", "-", text).strip("-")
    return text


def build_cta(city_slug: str, category: str) -> dict:
    return {
        "text": "Post your listing free on LocalsIndia — it takes 2 minutes",
        "href": f"/{city_slug}/search?category={category}",
    }


def build_user_prompt(city: str, state: str, category: str, angle: str) -> str:
    return f"""Write an evergreen how-to guide article for LocalsIndia.

City: {city}, {state}
Category: {category}
Article angle: {angle.format(city=city)}

Return ONLY the JSON described in your instructions — no markdown fences, no commentary."""


def validate_shape(data: dict) -> None:
    """Raises ValueError if the LLM's JSON doesn't match the expected shape —
    catches semantically-wrong-but-syntactically-valid JSON (e.g. an FAQ
    entry with a 'body' key instead of 'answer'), which json.loads alone
    can't detect."""
    if not data.get("title") or not data.get("metaDescription") or not data.get("intro"):
        raise ValueError("Missing or empty title/metaDescription/intro")
    sections = data.get("sections")
    if not sections or not isinstance(sections, list):
        raise ValueError("Missing or empty sections list")
    for s in sections:
        if not isinstance(s, dict) or not s.get("heading") or not s.get("body"):
            raise ValueError(f"Malformed section: {s}")
    for f in data.get("faqs", []):
        if not isinstance(f, dict) or not f.get("question") or not f.get("answer"):
            raise ValueError(f"Malformed FAQ entry: {f}")


def generate_post(city: str, state: str, category: str, topic_id: str | None) -> dict:
    if category not in VALID_CATEGORIES:
        raise ValueError(f"Unknown category: {category}")
    templates = TOPIC_TEMPLATES.get(category)
    if not templates:
        raise ValueError(f"No topic templates defined yet for category: {category}")
    if topic_id:
        template = next((t for t in templates if t["id"] == topic_id), None)
        if not template:
            raise ValueError(f"Unknown topic-id '{topic_id}' for category '{category}'")
    else:
        template = random.choice(templates)

    print(f"[BlogAgent] {city}, {state} — {category} — {template['id']}")

    max_attempts = 3
    data = None
    last_error = None
    for attempt in range(max_attempts):
        raw = generate(SYSTEM_PROMPT, build_user_prompt(city, state, category, template["angle"]))
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        try:
            parsed = json.loads(raw)
            validate_shape(parsed)
            data = parsed
            break
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            print(f"[RETRY {attempt + 1}/{max_attempts}] Invalid response: {e}")

    if data is None:
        print(f"[FAIL] Invalid response after {max_attempts} attempts: {last_error}")
        print(f"Raw response: {raw[:300]}")
        sys.exit(1)

    city_slug = next((c[2] for c in TOP_CITIES if c[0].lower() == city.lower()), slugify(city))
    slug = slugify(data["title"])
    word_count = len(data.get("intro", "").split()) + sum(
        len(s.get("body", "").split()) for s in data.get("sections", [])
    )

    return {
        "schemaVersion": 1,
        "city": city, "citySlug": city_slug, "state": state,
        "slug": slug, "category": category, "topicTemplateId": template["id"],
        "title": data["title"], "metaDescription": data["metaDescription"],
        "intro": data["intro"], "sections": data["sections"], "faqs": data.get("faqs", []),
        "cta": build_cta(city_slug, category),
        "publishedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "wordCount": word_count,
    }


def fetch_directory_businesses(city_slug: str, category: str) -> list[dict]:
    """Real businesses for the article, preferring ones people can actually
    find or call (address/phone). Skips anything already claimed-and-hidden."""
    r = httpx.get(f"{BACKEND_URL}/api/v1/businesses",
                  params={"city_slug": city_slug, "category_slug": category, "page_size": 50}, timeout=30)
    r.raise_for_status()
    # Contactable ones (phone + address) are picked first, then shown A-Z —
    # the article says "alphabetical, not a ranking", so keep it that way.
    items = [b for b in r.json() if b.get("address") or b.get("phone")]
    items.sort(key=lambda b: (not b.get("phone"), not b.get("address")))
    items = sorted(items[:DIRECTORY_MAX_BUSINESSES], key=lambda b: b["name"].lower())
    return [{"id": b["id"], "name": b["name"], "address": b.get("address"), "phone": b.get("phone"),
             "source": b.get("source")} for b in items]


def build_directory_prompt(city: str, state: str, label: str, count: int) -> str:
    return f"""Write a short, practical local guide for LocalsIndia.

City: {city}, {state}
Topic: choosing and visiting {label.lower()} in {city}.
The page will ALSO show a factual list of {count} real local businesses (name, address, phone)
taken from our directory — you do NOT write that list.

Strict rules:
- Do NOT name, rank, recommend, rate or describe ANY specific business, hospital, school or brand.
- Do NOT state facts about {city} you are not certain of (no street names, prices, statistics, rankings).
- Give general, genuinely useful advice: what to check, what to ask, documents/timings to confirm,
  how to compare options, safety tips. Mention calling ahead to confirm details, since listings may be out of date.
- 3-4 sections, 2-4 FAQs, plain language.

Return ONLY the JSON described in your instructions — no markdown fences, no commentary."""


def generate_directory_post(city_slug: str, category: str) -> dict | None:
    """Returns a post, or None when the city doesn't have enough real businesses."""
    city = next((c for c in TOP_CITIES if c[2] == city_slug), None)
    if not city or category not in DIRECTORY_CATEGORIES:
        raise ValueError(f"Unknown city/category: {city_slug}/{category}")
    name, state, _ = city
    label, seo_page = DIRECTORY_CATEGORIES[category]
    businesses = fetch_directory_businesses(city_slug, category)
    if len(businesses) < DIRECTORY_MIN_BUSINESSES:
        print(f"[SKIP] {name}/{category}: only {len(businesses)} businesses with address/phone")
        return None
    print(f"[BlogAgent] directory — {name} — {category} ({len(businesses)} businesses)")

    data, last_error = None, None
    for attempt in range(3):
        raw = generate(SYSTEM_PROMPT, build_directory_prompt(name, state, label, len(businesses)))
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        try:
            parsed = json.loads(raw)
            validate_shape(parsed)
            data = parsed
            break
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            print(f"[RETRY {attempt + 1}/3] Invalid response: {e}")
    if data is None:
        raise SystemExit(f"[FAIL] Invalid response: {last_error}")

    title = f"{label} in {name}: Addresses & Phone Numbers"
    word_count = len(data["intro"].split()) + sum(len(x["body"].split()) for x in data["sections"])
    return {
        "schemaVersion": 2,
        "kind": "directory",
        "city": name, "citySlug": city_slug, "state": state,
        "slug": slugify(title), "category": category, "topicTemplateId": f"directory-{category}",
        "title": title,
        "metaDescription": f"{len(businesses)} {label.lower()} in {name} with addresses and phone numbers, "
                           f"plus what to check before you visit."[:158],
        "intro": data["intro"], "sections": data["sections"], "faqs": data.get("faqs", []),
        "businesses": businesses,
        "cta": {"text": f"See all {label.lower()} in {name}", "href": f"/{city_slug}/{seo_page}"},
        "publishedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "wordCount": word_count,
    }


def save_post(post: dict) -> Path:
    folder = FRONTEND_CONTENT_DIR / post["citySlug"]
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{post['slug']}.json"
    path.write_text(json.dumps(post, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def load_rotation_state() -> dict:
    if ROTATION_STATE_FILE.exists():
        return json.loads(ROTATION_STATE_FILE.read_text(encoding="utf-8"))
    return {"lastCityIndex": -1, "lastCategoryIndex": -1, "history": []}


def save_rotation_state(state: dict) -> None:
    ROTATION_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    ROTATION_STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def pick_next_auto_rotate(state: dict) -> tuple[str, str, str]:
    categories = list(TOPIC_TEMPLATES.keys())
    recent = {(h["citySlug"], h["category"]) for h in state["history"][-10:]}

    for _ in range(len(TOP_CITIES) * len(categories)):
        city_idx = (state["lastCityIndex"] + 1) % len(TOP_CITIES)
        cat_idx = (state["lastCategoryIndex"] + 1) % len(categories)
        state["lastCityIndex"] = city_idx
        state["lastCategoryIndex"] = cat_idx
        city, cat_state, slug = TOP_CITIES[city_idx]
        category = categories[cat_idx]
        if (slug, category) not in recent:
            return city, cat_state, category
    # Exhausted the no-repeat window — just take whatever we landed on.
    city, cat_state, _ = TOP_CITIES[state["lastCityIndex"]]
    return city, cat_state, categories[state["lastCategoryIndex"]]


def next_directory_target(state: dict) -> tuple[str, str] | None:
    """Next (city, category) directory article not yet published: every
    category for the biggest cities first, walking down the priority order."""
    done = {(h["citySlug"], h["category"]) for h in state["history"] if h.get("kind") == "directory"}
    done |= set(tuple(x) for x in state.get("directorySkipped", []))
    for _, _, slug in TOP_CITIES:
        for category in DIRECTORY_CATEGORIES:
            if (slug, category) not in done:
                return slug, category
    return None


def run_auto_rotate() -> None:
    """Alternates: directory article (real businesses) on even runs, guide on odd."""
    state = load_rotation_state()
    post = None
    if len(state["history"]) % 2 == 0:
        while post is None:
            target = next_directory_target(state)
            if not target:
                break
            post = generate_directory_post(*target)
            if post is None:
                state.setdefault("directorySkipped", []).append(list(target))
    if post is None:
        city, city_state, category = pick_next_auto_rotate(state)
        post = generate_post(city, city_state, category, topic_id=None)
    path = save_post(post)
    print(f"[OK] Saved: {path}")

    state["history"].append({
        "citySlug": post["citySlug"], "category": post["category"], "kind": post.get("kind", "guide"),
        "topicTemplateId": post["topicTemplateId"], "publishedAt": post["publishedAt"],
    })
    save_rotation_state(state)
    print(f"[OK] Rotation state updated: {ROTATION_STATE_FILE}")


def main():
    parser = argparse.ArgumentParser(description="BlogAgent — generate an evergreen city guide article")
    parser.add_argument("--city", help="City name (e.g. 'Hyderabad')")
    parser.add_argument("--state", help="State name (e.g. 'Telangana')")
    parser.add_argument("--category", choices=sorted(VALID_CATEGORIES), help="Category slug")
    parser.add_argument("--topic-id", default=None, help="Force a specific topic template id")
    parser.add_argument("--auto-rotate", action="store_true", help="Pick city/category/topic automatically and advance rotation state")
    parser.add_argument("--directory", nargs=2, metavar=("CITY_SLUG", "BUSINESS_CATEGORY"),
                        help="Real-business directory article, e.g. --directory guntur doctors")
    parser.add_argument("--env-file", default=".env", help="Path to .env file")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    load_dotenv(env_path if env_path.exists() else None)

    if args.directory:
        post = generate_directory_post(*args.directory)
        if post:
            print(f"[OK] Saved: {save_post(post)}")
        return

    if args.auto_rotate:
        run_auto_rotate()
        return

    if not args.city or not args.state or not args.category:
        parser.error("--city, --state, and --category are required unless --auto-rotate is set")

    post = generate_post(args.city, args.state, args.category, args.topic_id)
    path = save_post(post)
    print(f"[OK] Saved: {path}")
    print(f"\nTitle: {post['title']}")
    print(f"Word count: {post['wordCount']}")


if __name__ == "__main__":
    main()
