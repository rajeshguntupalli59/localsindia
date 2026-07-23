#!/usr/bin/env python3
"""
ecosystem_poster.py — Generates and posts the LocalsIndia "ecosystem"
explainer poster (two-sided Searching/Offering layout) to the Facebook
Page and Instagram (feed + story). Layout is fixed; the tagline, which
4 benefits are featured, and the caption vary each run so repeat posts
don't look/read identical.

Usage:
  python agents/ecosystem_poster.py                # dry run: generate + render, no posting
  python agents/ecosystem_poster.py --publish       # actually post live to FB + IG

Requires (env vars, same names already set on Azure for the backend):
  ANTHROPIC_API_KEY
  META_PAGE_ID, META_PAGE_ACCESS_TOKEN
  META_IG_BUSINESS_ID, META_IG_ACCESS_TOKEN
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
    (only needed with --publish; dry runs skip Cloudinary entirely)
"""
import argparse
import json
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
    post_to_instagram_feed,
    post_to_instagram_story,
)

OUTPUT_DIR = Path(__file__).parent.parent / "marketing" / "generated"
LOG_PATH = Path(__file__).parent / "output" / "ecosystem_posts_log.jsonl"

BASE_SYSTEM = build_system_prompt("ecosystem_poster")


def generate_post() -> dict:
    prompt = """Generate one ecosystem-poster post per your instructions.

Return ONLY the JSON object described in your instructions — no markdown fences, no explanation."""
    raw = generate(BASE_SYSTEM, prompt, max_tokens=500)

    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)


def render_poster(tagline: str, benefit_keys: list[str], out_path: Path) -> Path:
    result = subprocess.run(
        [
            "node",
            str(Path(__file__).parent / "render_ecosystem_poster.js"),
            "--tagline", tagline,
            "--benefits", ",".join(benefit_keys),
            "--out", str(out_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Poster render failed:\n{result.stderr}")
    return out_path


def log_post(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def run(publish: bool) -> None:
    post = generate_post()
    print(f"[EcosystemPoster] Tagline: {post['tagline']}")
    print(f"[EcosystemPoster] Benefits: {post['benefit_keys']}")
    print(f"[EcosystemPoster] Caption: {post['caption']}")

    full_caption = post["caption"] + "\n\n" + " ".join(f"#{h.lstrip('#')}" for h in post.get("hashtags", []))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    poster_path = OUTPUT_DIR / f"ecosystem_{stamp}.png"

    render_poster(post["tagline"], post["benefit_keys"], poster_path)
    print(f"[EcosystemPoster] Rendered: {poster_path}")

    if not publish:
        print("\n[EcosystemPoster] DRY RUN — nothing posted. Review the image above, then re-run with --publish.")
        return

    image_url = upload_to_cloudinary(poster_path, f"ecosystem_{stamp}", folder="localsindia/ecosystem_posters")

    fb_id = post_to_facebook_page(image_url, full_caption)
    print(f"[EcosystemPoster] Posted to Facebook Page: {fb_id}")

    ig_feed_id = post_to_instagram_feed(image_url, full_caption)
    print(f"[EcosystemPoster] Posted to Instagram feed: {ig_feed_id}")

    ig_story_id = post_to_instagram_story(image_url)
    print(f"[EcosystemPoster] Posted to Instagram story: {ig_story_id}")

    log_post({
        "timestamp": datetime.now().isoformat(),
        "tagline": post["tagline"],
        "benefit_keys": post["benefit_keys"],
        "caption": post["caption"],
        "hashtags": post.get("hashtags", []),
        "facebook_post_id": fb_id,
        "instagram_feed_id": ig_feed_id,
        "instagram_story_id": ig_story_id,
    })
    print(f"[EcosystemPoster] Logged to {LOG_PATH}")


def main():
    parser = argparse.ArgumentParser(description="Generate and post the LocalsIndia ecosystem poster")
    parser.add_argument("--publish", action="store_true", help="Actually post live (default: dry run, render only)")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    run(args.publish)


if __name__ == "__main__":
    main()
