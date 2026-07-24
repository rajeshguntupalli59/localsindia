#!/usr/bin/env python3
"""
BlogAgent — Generates an evergreen, city-specific how-to/guide article for
the LocalsIndia blog and writes it directly into the frontend's content
directory (frontend/src/content/blog/{city_slug}/{slug}.json), where the
Next.js /blog routes pick it up on the next build.

Usage:
  python agents/blog_agent.py --city "Hyderabad" --state "Telangana" --category pg-roommate
  python agents/blog_agent.py --city "Hyderabad" --state "Telangana" --category pg-roommate --topic-id avoid-scam
  python agents/blog_agent.py --auto-rotate   # picks city/category/topic itself, advances rotation state

Output:
  frontend/src/content/blog/{city_slug}/{slug}.json
"""

import argparse
import json
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

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

# Kept in sync manually with TOP_CITIES in
# frontend/src/app/[city]/[category]/page.tsx — no automatic import across
# the Python/TypeScript boundary, so this is a deliberate duplication.
TOP_CITIES = [
    ("Bangalore", "Karnataka"), ("Hyderabad", "Telangana"), ("Chennai", "Tamil Nadu"),
    ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Pune", "Maharashtra"),
    ("Kolkata", "West Bengal"), ("Ahmedabad", "Gujarat"), ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"), ("Surat", "Gujarat"), ("Kanpur", "Uttar Pradesh"),
    ("Nagpur", "Maharashtra"), ("Indore", "Madhya Pradesh"), ("Bhopal", "Madhya Pradesh"),
    ("Visakhapatnam", "Andhra Pradesh"), ("Vadodara", "Gujarat"), ("Noida", "Uttar Pradesh"),
    ("Thane", "Maharashtra"), ("Patna", "Bihar"),
]

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

    city_slug = slugify(city)
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
        city, cat_state = TOP_CITIES[city_idx]
        category = categories[cat_idx]
        if (slugify(city), category) not in recent:
            return city, cat_state, category
    # Exhausted the no-repeat window — just take whatever we landed on.
    city, cat_state = TOP_CITIES[state["lastCityIndex"]]
    return city, cat_state, categories[state["lastCategoryIndex"]]


def run_auto_rotate() -> None:
    state = load_rotation_state()
    city, city_state, category = pick_next_auto_rotate(state)
    post = generate_post(city, city_state, category, topic_id=None)
    path = save_post(post)
    print(f"[OK] Saved: {path}")

    state["history"].append({
        "citySlug": post["citySlug"], "category": category,
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
    parser.add_argument("--env-file", default=".env", help="Path to .env file")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    load_dotenv(env_path if env_path.exists() else None)

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
