#!/usr/bin/env python3
"""
crosspost_ig_reels.py — Copies Instagram reels to the Facebook Page.

Raj posts reels on Instagram by hand; they weren't reaching the Facebook
Page (last FB reel 2026-08-19 while IG had a reel a day). This finds IG
reels not yet on Facebook and posts them as Page videos, oldest first,
at most --max per run so a backlog doesn't flood the Page in one day.

"Already cross-posted" is tracked in agents/output/social_posts_log.jsonl
(format "ig_reel_crosspost", keyed by ig_media_id) — the same committed
log the other posters use, so it survives ephemeral CI runners.

Usage:
  python agents/crosspost_ig_reels.py                 # dry run: lists what would be posted
  python agents/crosspost_ig_reels.py --publish       # post up to --max (default 2)

Requires: META_PAGE_ID, META_PAGE_ACCESS_TOKEN, META_IG_BUSINESS_ID, META_IG_ACCESS_TOKEN
"""
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent))
from meta_client import GRAPH_API, post_to_facebook_video

LOG_PATH = Path(__file__).parent / "output" / "social_posts_log.jsonl"
FORMAT = "ig_reel_crosspost"


def already_crossposted() -> set[str]:
    if not LOG_PATH.exists():
        return set()
    done = set()
    for line in LOG_PATH.read_text(encoding="utf-8").splitlines():
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("format") == FORMAT and entry.get("ig_media_id"):
            done.add(entry["ig_media_id"])
    return done


def fetch_ig_reels(limit: int = 50) -> list[dict]:
    resp = httpx.get(
        f"{GRAPH_API}/{os.environ['META_IG_BUSINESS_ID']}/media",
        params={
            "fields": "id,media_type,media_product_type,media_url,caption,timestamp,permalink",
            "limit": limit,
            "access_token": os.environ["META_IG_ACCESS_TOKEN"],
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    return [m for m in resp.json().get("data", []) if m.get("media_type") == "VIDEO" and m.get("media_url")]


def log_post(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def run(publish: bool, max_posts: int) -> None:
    done = already_crossposted()
    pending = sorted((m for m in fetch_ig_reels() if m["id"] not in done), key=lambda m: m["timestamp"])
    print(f"[CrosspostReels] {len(pending)} IG reel(s) not yet on Facebook; posting up to {max_posts}")

    for reel in pending[:max_posts]:
        caption = reel.get("caption") or ""
        print(f"[CrosspostReels] {reel['timestamp'][:10]} {reel['permalink']} | {caption[:70]!r}")
        if not publish:
            continue
        fb_id = post_to_facebook_video(reel["media_url"], caption)
        print(f"[CrosspostReels] Posted to Facebook Page: {fb_id}")
        log_post({
            "timestamp": datetime.now().isoformat(),
            "topic": caption.split("\n")[0][:120],
            "format": FORMAT,
            "headline": caption.split("\n")[0][:120],
            "caption": caption,
            "hashtags": [],
            "facebook_post_id": fb_id,
            "ig_media_id": reel["id"],
            "ig_permalink": reel["permalink"],
        })

    if not publish:
        print("\n[CrosspostReels] DRY RUN — nothing posted. Re-run with --publish.")


def main():
    parser = argparse.ArgumentParser(description="Copy Instagram reels to the Facebook Page")
    parser.add_argument("--publish", action="store_true", help="Actually post (default: dry run)")
    parser.add_argument("--max", type=int, default=2, help="Max reels to post this run (default 2)")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    load_dotenv(env_path if env_path.exists() else None)
    run(args.publish, args.max)


if __name__ == "__main__":
    main()
