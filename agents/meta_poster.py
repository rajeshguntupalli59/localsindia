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
import random
import subprocess
import sys
from datetime import datetime
from pathlib import Path

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

TOPICS = ["app_feature", "category_tip", "safety_tip", "city_spotlight", "app_launch"]
SPOTLIGHT_CITIES = ["Hyderabad", "Bengaluru", "Chennai", "Kochi", "Vijayawada", "Coimbatore"]

OUTPUT_DIR = Path(__file__).parent / "output" / "social_posts"
LOG_PATH = Path(__file__).parent / "output" / "social_posts_log.jsonl"

BASE_SYSTEM = build_system_prompt("meta_poster")


def generate_post(topic: str) -> dict:
    extra = ""
    if topic == "city_spotlight":
        extra = f"\n\nCity for this spotlight: {random.choice(SPOTLIGHT_CITIES)}"

    prompt = f"""Generate one social post for topic: {topic}{extra}

Return ONLY the JSON object described in your instructions — no markdown fences, no explanation."""
    raw = generate(BASE_SYSTEM, prompt, max_tokens=500)

    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)


def render_image(headline: str, tag: str, fmt: str, out_path: Path) -> Path:
    result = subprocess.run(
        [
            "node",
            str(Path(__file__).parent / "render_post_image.js"),
            "--format", fmt,
            "--headline", headline,
            "--tag", tag,
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
    topic = topic or random.choice(TOPICS)
    print(f"[MetaPoster] Topic: {topic} | Format: {fmt}")

    post = generate_post(topic)
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

    tag = f"#{post['hashtags'][0]}" if post.get("hashtags") else "LocalsIndia"

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    square_path = OUTPUT_DIR / f"{stamp}_square.png"
    story_path = OUTPUT_DIR / f"{stamp}_story.png"

    render_image(post["headline"], tag, "square", square_path)
    render_image(post["headline"], tag, "story", story_path)
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
