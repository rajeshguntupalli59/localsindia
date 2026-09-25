#!/usr/bin/env python3
"""
meta_poster.py — Generates and posts a branded LocalsIndia post to the
Facebook Page and Instagram (feed + story).

Usage:
  python agents/meta_poster.py                          # dry run: generate + render, no posting
  python agents/meta_poster.py --topic category_tip      # force a topic instead of rotating
  python agents/meta_poster.py --format text --publish   # Facebook-only text status, no image (IG has no equivalent)
  python agents/meta_poster.py --publish                 # actually post live to FB + IG

Requires (env vars, same names already set on Azure for the backend):
  ANTHROPIC_API_KEY
  META_PAGE_ID, META_PAGE_ACCESS_TOKEN
  META_IG_BUSINESS_ID, META_IG_ACCESS_TOKEN
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
    (only needed with --publish; dry runs skip Cloudinary entirely)
"""
import argparse
import json
import os
import random
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent))
from base_agent import generate, build_system_prompt
from meta_client import (
    upload_to_cloudinary,
    post_to_facebook_page,
    post_to_facebook_text,
    post_to_instagram_feed,
    post_to_instagram_story,
)

TOPICS = ["app_feature", "category_tip", "safety_tip", "city_spotlight", "app_launch", "referral", "seller_call", "area_directory"]
# app_launch is still selectable with --topic, but it's out of the automatic
# rotation: 15 of the first 80 posts were "the app is live" and the audience
# had already seen it.
ROTATION_TOPICS = [t for t in TOPICS if t not in ("app_launch", "area_directory")]
# area_directory alternates with the rest (every other post): it links to a
# real neighbourhood page, e.g. "12 Doctors, Clinics & Pharmacies in Madhapur".
# How many recent posts the model is shown so it doesn't repeat itself.
RECENT_POSTS_SHOWN = 20
SPOTLIGHT_CITIES = ["Hyderabad", "Bengaluru", "Chennai", "Kochi", "Vijayawada", "Coimbatore"]
# seller_call recruits real sellers in one launch city (Hyderabad has the most
# listings) instead of spreading thin across all 150. Swap the city here to move focus.
SELLER_CALL_CITY = "Hyderabad"
SELLER_TYPES = [
    "PG and hostel owners", "tiffin and home-food services", "tutors and coaching centres",
    "electricians, plumbers and repair services", "used-furniture and electronics sellers",
    "small shop and business owners", "event organisers", "bike and car sellers",
]
# area_directory: which cities it rotates through, and the label per business
# category (pages: /{city}/{page}/{area}). Text is built from live counts, not
# the model — a post can never claim something the page doesn't show.
BACKEND_URL = os.getenv("LOCALINDIA_API_URL", "https://localsindia-backend-in.azurewebsites.net")
AREA_CITIES = [("hyderabad", "Hyderabad"), ("bengaluru", "Bengaluru"), ("chennai", "Chennai"),
               ("vijayawada", "Vijayawada"), ("kochi", "Kochi"), ("coimbatore", "Coimbatore")]
AREA_CATEGORIES = {   # business category slug -> (page segment, label, hashtag)
    "doctors": ("doctors", "Doctors, Clinics & Pharmacies", "Doctors"),
    "tiffin": ("tiffin", "Restaurants & Tiffin Centres", "Food"),
    "education": ("tutors", "Schools, Tutors & Classes", "Education"),
    "businesses": ("shops", "Shops & Stores", "Shopping"),
    "fashion": ("fashion", "Fashion & Textile Shops", "Fashion"),
    "electronics": ("electronics", "Electronics & Mobile Shops", "Electronics"),
    "vehicles": ("vehicles", "Garages & Vehicle Dealers", "Garages"),
    "services": ("services", "Local Services", "LocalServices"),
    "events": ("event-venues", "Function Halls & Venues", "FunctionHalls"),
    "pg-roommate": ("pg-roommate", "PGs & Hostels", "PG"),
    "furniture": ("furniture", "Furniture Shops", "Furniture"),
    "real-estate": ("real-estate", "Real Estate Agents", "RealEstate"),
}
AREA_MIN_BUSINESSES = 5
# category_tip has no default — without one, the model always falls back to
# its "e.g. jobs" example in the instructions, so every category_tip post
# ends up being the same fake-job-listing warning. Pick one explicitly.
TIP_CATEGORIES = [
    "classifieds", "services", "pg-roommate", "jobs", "vehicles", "electronics",
    "events", "businesses", "tiffin", "real-estate", "furniture", "fashion",
]
# Visual layout, independent of topic — rotated the same way as topic so two
# consecutive posts don't look identical even when they land on the same
# topic. "quote" is deliberately a light background — the other 4 are dark,
# and value-contrast against the feed matters more than hue (see
# render_post_image.js STYLE_RENDERERS for what each one looks like).
STYLES = ["glass", "bold", "duotone", "quote", "spotlight"]

OUTPUT_DIR = Path(__file__).parent / "output" / "social_posts"
LOG_PATH = Path(__file__).parent / "output" / "social_posts_log.jsonl"
ROTATION_STATE_FILE = Path(__file__).parent / "state" / "meta_poster_rotation.json"

BASE_SYSTEM = build_system_prompt("meta_poster")


def load_rotation_state() -> dict:
    if ROTATION_STATE_FILE.exists():
        state = json.loads(ROTATION_STATE_FILE.read_text(encoding="utf-8"))
        state.setdefault("lastStyleIndex", -1)
        state.setdefault("styleHistory", [])
        return state
    return {
        "lastTopicIndex": -1, "lastTipCategoryIndex": -1, "lastStyleIndex": -1,
        "topicHistory": [], "tipCategoryHistory": [], "styleHistory": [],
    }


def save_rotation_state(state: dict) -> None:
    ROTATION_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    ROTATION_STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def pick_next(items: list[str], last_index: int, history: list[str], window: int) -> tuple[str, int]:
    """Round-robin through items, skipping anything used in the last `window` picks."""
    recent = set(history[-window:])
    for _ in range(len(items)):
        idx = (last_index + 1) % len(items)
        last_index = idx
        if items[idx] not in recent:
            return items[idx], idx
    # Every item was used recently (window >= len(items)) — take the next one anyway.
    return items[last_index], last_index


def pick_topic(state: dict) -> str:
    if (state["topicHistory"] or [None])[-1] != "area_directory":
        state["topicHistory"] = (state["topicHistory"] + ["area_directory"])[-10:]
        return "area_directory"
    topic, idx = pick_next(ROTATION_TOPICS, state["lastTopicIndex"], state["topicHistory"], window=3)
    state["lastTopicIndex"] = idx
    state["topicHistory"] = (state["topicHistory"] + [topic])[-10:]
    return topic


def pick_tip_category(state: dict) -> str:
    category, idx = pick_next(TIP_CATEGORIES, state["lastTipCategoryIndex"], state["tipCategoryHistory"], window=6)
    state["lastTipCategoryIndex"] = idx
    state["tipCategoryHistory"] = (state["tipCategoryHistory"] + [category])[-10:]
    return category


def pick_style(state: dict) -> str:
    style, idx = pick_next(STYLES, state["lastStyleIndex"], state["styleHistory"], window=2)
    state["lastStyleIndex"] = idx
    state["styleHistory"] = (state["styleHistory"] + [style])[-10:]
    return style


def recent_posts() -> list[str]:
    """Headline (or caption start, for text-only posts) of the last few posts, oldest first."""
    if not LOG_PATH.exists():
        return []
    lines = LOG_PATH.read_text(encoding="utf-8").splitlines()[-RECENT_POSTS_SHOWN:]
    seen = []
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        text = entry.get("headline") or (entry.get("caption") or "")[:90]
        if text:
            seen.append(text)
    return seen


def pick_area(state: dict) -> dict:
    """Next (city, category, neighbourhood) with enough real businesses that
    hasn't been posted yet, rotating through AREA_CITIES."""
    posted = set(state.get("areaPosted", []))
    start = state.get("lastAreaCityIndex", -1)
    with httpx.Client(base_url=f"{BACKEND_URL}/api/v1", timeout=60) as api:
        for step in range(1, len(AREA_CITIES) + 1):
            idx = (start + step) % len(AREA_CITIES)
            city_slug, city_name = AREA_CITIES[idx]
            pages = api.get("/businesses/locality-pages", params={"city_slug": city_slug}).json()
            candidates = [p for p in pages
                          if p["category_slug"] in AREA_CATEGORIES and p["count"] >= AREA_MIN_BUSINESSES
                          and f"{city_slug}/{p['category_slug']}/{p['locality_slug']}" not in posted]
            if not candidates:
                continue
            # Vary it: pick among the bigger ones, not always the single largest
            p = random.choice(sorted(candidates, key=lambda c: -c["count"])[:15])
            names = {l["slug"]: l["name"] for l in api.get(
                "/businesses/localities", params={"city_slug": city_slug, "category_slug": p["category_slug"]}).json()}
            state["lastAreaCityIndex"] = idx
            state["areaPosted"] = (state.get("areaPosted", []) + [f"{city_slug}/{p['category_slug']}/{p['locality_slug']}"])[-500:]
            return {"city_slug": city_slug, "city": city_name, "category": p["category_slug"],
                    "area_slug": p["locality_slug"], "area": names.get(p["locality_slug"], p["locality_slug"]),
                    "count": p["count"]}
    raise RuntimeError("No unposted neighbourhood with enough businesses in any AREA_CITIES city")


def area_post(state: dict) -> dict:
    a = pick_area(state)
    page, label, hashtag = AREA_CATEGORIES[a["category"]]
    url = f"https://www.localsindia.com/{a['city_slug']}/{page}/{a['area_slug']}"
    tag = lambda t: "".join(w.capitalize() for w in t.replace("&", " ").replace(",", " ").split())
    return {
        "headline": f"{a['count']} {label} in {a['area']}",
        "tag": f"{a['area']}, {a['city']}",
        "caption": (
            f"Looking for {label.lower()} in {a['area']}, {a['city']}? "
            f"We've listed {a['count']} of them with addresses and phone numbers — free to browse, no sign-up:\n{url}\n\n"
            "Run one of these businesses? Open the page and claim your free listing to add photos, timings and your WhatsApp number."
        ),
        "hashtags": [tag(a["city"]), tag(a["area"]), hashtag, "LocalsIndia"],
        "url": url,
    }


def generate_post(topic: str, state: dict) -> dict:
    if topic == "area_directory":
        return area_post(state)
    extra = ""
    if topic == "city_spotlight":
        extra = f"\n\nCity for this spotlight: {random.choice(SPOTLIGHT_CITIES)}"
    elif topic == "category_tip":
        extra = f"\n\nCategory for this tip: {pick_tip_category(state)}"
    elif topic == "seller_call":
        extra = f"\n\nCity: {SELLER_CALL_CITY}\nSeller type to invite: {random.choice(SELLER_TYPES)}"

    recent = recent_posts()
    if recent:
        extra += (
            "\n\nRecent posts already published - do NOT reuse or lightly reword any of these "
            "headlines, hooks or angles; take a clearly different one:\n"
            + "\n".join(f"- {r}" for r in recent)
        )

    prompt = f"""Generate one social post for topic: {topic}{extra}

Return ONLY the JSON object described in your instructions — no markdown fences, no explanation."""
    raw = generate(BASE_SYSTEM, prompt, max_tokens=500)

    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)


def render_image(headline: str, tag: str, topic: str, style: str, fmt: str, out_path: Path) -> Path:
    result = subprocess.run(
        [
            "node",
            str(Path(__file__).parent / "render_post_image.js"),
            "--format", fmt,
            "--headline", headline,
            "--tag", tag,
            "--topic", topic,
            "--style", style,
            "--out", str(out_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Image render failed:\n{result.stderr}")
    return out_path


def log_post(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def run(topic: str | None, publish: bool, fmt: str) -> None:
    state = load_rotation_state()
    topic = topic or pick_topic(state)
    style = pick_style(state)
    print(f"[MetaPoster] Topic: {topic} | Style: {style} | Format: {fmt}")

    post = generate_post(topic, state)
    save_rotation_state(state)
    print(f"[MetaPoster] Headline: {post['headline']}")
    print(f"[MetaPoster] Caption: {post['caption']}")

    full_caption = post["caption"] + "\n\n" + " ".join(f"#{h.lstrip('#')}" for h in post.get("hashtags", []))

    if fmt == "text":
        if not publish:
            print("\n[MetaPoster] DRY RUN (text format) — nothing posted. Re-run with --publish.")
            return
        fb_id = post_to_facebook_text(full_caption)
        print(f"[MetaPoster] Posted text-only status to Facebook Page: {fb_id}")
        print("[MetaPoster] Instagram skipped this run — its API has no text-only post type.")
        log_post({
            "timestamp": datetime.now().isoformat(),
            "topic": topic,
            "format": "text",
            "caption": post["caption"],
            "hashtags": post.get("hashtags", []),
            "facebook_post_id": fb_id,
        })
        print(f"[MetaPoster] Logged to {LOG_PATH}")
        return

    tag = post.get("tag") or (f"#{post['hashtags'][0]}" if post.get("hashtags") else "LocalsIndia")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    square_path = OUTPUT_DIR / f"{stamp}_square.png"
    story_path = OUTPUT_DIR / f"{stamp}_story.png"

    render_image(post["headline"], tag, topic, style, "square", square_path)
    render_image(post["headline"], tag, topic, style, "story", story_path)
    print(f"[MetaPoster] Rendered: {square_path}, {story_path}")

    if not publish:
        print("\n[MetaPoster] DRY RUN — nothing posted. Review the images above, then re-run with --publish.")
        return

    square_url = upload_to_cloudinary(square_path, f"post_{stamp}_square")
    story_url = upload_to_cloudinary(story_path, f"post_{stamp}_story")

    fb_id = post_to_facebook_page(square_url, full_caption)
    print(f"[MetaPoster] Posted to Facebook Page: {fb_id}")

    ig_feed_id = post_to_instagram_feed(square_url, full_caption)
    print(f"[MetaPoster] Posted to Instagram feed: {ig_feed_id}")

    ig_story_id = post_to_instagram_story(story_url)
    print(f"[MetaPoster] Posted to Instagram story: {ig_story_id}")

    log_post({
        "timestamp": datetime.now().isoformat(),
        "topic": topic,
        "format": "image",
        "headline": post["headline"],
        "caption": post["caption"],
        "hashtags": post.get("hashtags", []),
        "facebook_post_id": fb_id,
        "instagram_feed_id": ig_feed_id,
        "instagram_story_id": ig_story_id,
    })
    print(f"[MetaPoster] Logged to {LOG_PATH}")


def main():
    parser = argparse.ArgumentParser(description="Generate and post a LocalsIndia social post")
    parser.add_argument("--topic", choices=TOPICS, default=None, help="Force a topic instead of random rotation")
    parser.add_argument("--format", choices=["image", "text"], default="image", help="image = FB+IG with picture; text = Facebook-only status update, no image")
    parser.add_argument("--publish", action="store_true", help="Actually post live (default: dry run, render only)")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    run(args.topic, args.publish, args.format)


if __name__ == "__main__":
    main()
