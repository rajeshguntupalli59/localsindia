#!/usr/bin/env python3
"""
attach_reel_to_blog.py — Attaches one of our Instagram reels to a blog post.

Writes a `video` block into the post's JSON; the article page embeds the
reel and emits VideoObject JSON-LD (Google video results). The thumbnail
is copied to Cloudinary because Instagram's thumbnail_url is a signed CDN
link that expires — structured data needs a stable image URL.

Usage:
  python agents/attach_reel_to_blog.py --post hyderabad/<slug> --reel https://www.instagram.com/reel/<code>/
  python agents/attach_reel_to_blog.py --post hyderabad/<slug> --remove

Requires: META_IG_BUSINESS_ID, META_IG_ACCESS_TOKEN, CLOUDINARY_* (env)
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent))
from meta_client import GRAPH_API, upload_to_cloudinary

BLOG_CONTENT_DIR = Path(__file__).parent.parent / "frontend" / "src" / "content" / "blog"


def shortcode(url: str) -> str:
    m = re.search(r"instagram\.com/(?:reel|p)/([A-Za-z0-9_-]+)", url)
    if not m:
        raise SystemExit(f"Not an Instagram reel URL: {url}")
    return m.group(1)


def plain(text: str, limit: int) -> str:
    """Caption text without emoji/symbols (structured data and page titles
    read badly with them), cut at a word boundary."""
    text = ''.join(c for c in text if unicodedata.category(c) not in ('So', 'Sk', 'Me', 'Mn', 'Cs') and c != '️')
    text = ' '.join(text.split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(' ', 1)[0].rstrip(',;:-') + '…'


def find_reel(code: str) -> dict:
    url = f"{GRAPH_API}/{os.environ['META_IG_BUSINESS_ID']}/media"
    params = {
        "fields": "id,media_type,permalink,thumbnail_url,caption,timestamp",
        "limit": 50,
        "access_token": os.environ["META_IG_ACCESS_TOKEN"],
    }
    while url:
        resp = httpx.get(url, params=params, timeout=30.0)
        resp.raise_for_status()
        body = resp.json()
        for m in body.get("data", []):
            if m.get("media_type") == "VIDEO" and f"/{code}/" in m.get("permalink", ""):
                return m
        url, params = body.get("paging", {}).get("next"), None
    raise SystemExit(f"Reel {code} not found on our Instagram account")


def main():
    parser = argparse.ArgumentParser(description="Attach an Instagram reel to a blog post")
    parser.add_argument("--post", required=True, help='"<city>/<slug>"')
    parser.add_argument("--reel", help="Instagram reel URL")
    parser.add_argument("--remove", action="store_true", help="Remove the attached reel")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    load_dotenv(env_path if env_path.exists() else None)

    path = BLOG_CONTENT_DIR / f"{args.post}.json"
    if not path.exists():
        raise SystemExit(f"No blog post at {path}")
    post = json.loads(path.read_text(encoding="utf-8"))

    if args.remove:
        post.pop("video", None)
    else:
        if not args.reel:
            raise SystemExit("--reel is required (or use --remove)")
        code = shortcode(args.reel)
        reel = find_reel(code)
        thumb = httpx.get(reel["thumbnail_url"], timeout=30.0)
        thumb.raise_for_status()
        tmp = Path(__file__).parent / "output" / f"reel_thumb_{code}.jpg"
        tmp.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_bytes(thumb.content)
        thumb_url = upload_to_cloudinary(tmp, public_id=code, folder="localsindia/blog_reels")
        tmp.unlink()
        caption = (reel.get("caption") or "").strip()
        post["video"] = {
            "platform": "instagram",
            "url": f"https://www.instagram.com/reel/{code}/",
            "shortcode": code,
            "title": plain(caption.split("\n")[0], 110) or post["title"],
            "description": plain(caption, 300) or post["metaDescription"],
            "thumbnailUrl": thumb_url,
            "uploadDate": reel["timestamp"],
        }

    path.write_text(json.dumps(post, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[AttachReel] {'Removed reel from' if args.remove else 'Attached ' + post['video']['url'] + ' to'} {args.post}")


if __name__ == "__main__":
    main()
