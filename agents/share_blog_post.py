#!/usr/bin/env python3
"""
share_blog_post.py — Shares the most recently generated blog post to the
Facebook Page as a link post. Facebook crawls the URL itself and builds
the preview card (title/image/description) from the article's own OG
tags — no image generation or Cloudinary upload needed.

Must run AFTER the article is actually live (frontend redeployed) —
posting a link to a page that still 404s would break Facebook's preview
crawl and any visitor who clicks through immediately. This script polls
the real URL until it's live rather than guessing a sleep duration.

Usage:
  python agents/share_blog_post.py --publish
  python agents/share_blog_post.py                 # dry run: prints what would be posted

Requires (env vars, only needed with --publish):
  META_PAGE_ID, META_PAGE_ACCESS_TOKEN
"""
import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent))
from meta_client import post_to_facebook_link

BLOG_CONTENT_DIR = Path(__file__).parent.parent / "frontend" / "src" / "content" / "blog"
LOG_PATH = Path(__file__).parent / "output" / "social_posts_log.jsonl"
SITE_BASE = "https://www.localsindia.com"


def find_latest_post() -> dict:
    files = list(BLOG_CONTENT_DIR.glob("*/*.json"))
    if not files:
        raise SystemExit("No blog post JSON files found under frontend/src/content/blog/")
    latest = max(files, key=lambda p: p.stat().st_mtime)
    return json.loads(latest.read_text(encoding="utf-8"))


def wait_for_live(url: str, timeout_seconds: int = 480, interval_seconds: int = 15) -> bool:
    """Polls the real deployed URL instead of a blind sleep — deploy time
    varies run to run, and a wrong guess here means either posting a dead
    link or waiting longer than necessary."""
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            resp = httpx.get(url, timeout=10.0, follow_redirects=True)
            if resp.status_code == 200:
                return True
        except httpx.HTTPError:
            pass
        time.sleep(interval_seconds)
    return False


def log_post(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def run(publish: bool) -> None:
    post = find_latest_post()
    url = f"{SITE_BASE}/blog/{post['citySlug']}/{post['slug']}"
    message = f"{post['title']}\n\n{post['metaDescription']}"

    print(f"[ShareBlogPost] Title: {post['title']}")
    print(f"[ShareBlogPost] URL: {url}")

    if not publish:
        print("\n[ShareBlogPost] DRY RUN — nothing posted. Re-run with --publish.")
        return

    print("[ShareBlogPost] Waiting for the article to actually be live before posting...")
    if not wait_for_live(url):
        raise SystemExit(f"[ShareBlogPost] {url} never returned 200 within the timeout — not posting a broken link.")

    fb_id = post_to_facebook_link(message, url)
    print(f"[ShareBlogPost] Posted to Facebook Page: {fb_id}")

    log_post({
        "timestamp": datetime.now().isoformat(),
        "topic": post["title"],
        "format": "blog_link",
        "headline": post["title"],
        "caption": post["metaDescription"],
        "hashtags": [],
        "facebook_post_id": fb_id,
        "blog_url": url,
    })
    print(f"[ShareBlogPost] Logged to {LOG_PATH}")


def main():
    parser = argparse.ArgumentParser(description="Share the latest generated blog post to Facebook")
    parser.add_argument("--publish", action="store_true", help="Actually post live (default: dry run)")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    load_dotenv(env_path if env_path.exists() else None)

    run(args.publish)


if __name__ == "__main__":
    main()
