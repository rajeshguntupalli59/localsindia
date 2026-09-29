"""
IndexNow submitter — tells Bing (and Yandex, Seznam, Naver…, which share
IndexNow) about new/changed pages right away, instead of waiting for a crawl.
Google doesn't use IndexNow; it keeps reading the sitemaps.

URLs come from the live sitemaps, so this submits exactly what the site says
is indexable:
    python agents/indexnow_submit.py                # pages changed in the last 2 days (daily run)
    python agents/indexnow_submit.py --since-days 7
    python agents/indexnow_submit.py --all          # every page in both sitemaps (one-off)
    python agents/indexnow_submit.py --all --dry-run

The key is public by design: IndexNow checks that
https://www.localsindia.com/<KEY>.txt (frontend/public/) contains it.
Only pages with a real <lastmod> (businesses, classified ads, blog posts) are
"changed" candidates; --all also covers city/category/area pages.
Stdlib only — no pip install needed.
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

HOST = "www.localsindia.com"
SITE = f"https://{HOST}"
KEY = "74eb53be13b9a9e4700e7fe12f121081"
KEY_LOCATION = f"{SITE}/{KEY}.txt"
SITEMAPS = [f"{SITE}/sitemap.xml", f"{SITE}/sitemap-areas.xml"]
ENDPOINT = "https://api.indexnow.org/indexnow"
BATCH = 10_000  # IndexNow's per-request limit

UA = {"User-Agent": "LocalsIndia-IndexNow/1.0"}


def fetch(url: str, timeout: int = 120) -> str:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read().decode("utf-8")


def sitemap_entries(url: str) -> list[tuple[str, datetime | None]]:
    """(loc, lastmod) for every <url> in a sitemap."""
    out = []
    for block in re.findall(r"<url>(.*?)</url>", fetch(url), flags=re.S):
        loc = re.search(r"<loc>(.*?)</loc>", block)
        if not loc:
            continue
        mod = re.search(r"<lastmod>(.*?)</lastmod>", block)
        when = None
        if mod:
            try:
                when = datetime.fromisoformat(mod.group(1).strip().replace("Z", "+00:00"))
            except ValueError:
                pass
        out.append((loc.group(1).strip(), when))
    return out


def key_is_live() -> bool:
    try:
        return fetch(KEY_LOCATION, timeout=30).strip() == KEY
    except (urllib.error.URLError, TimeoutError):
        return False


def submit(urls: list[str]) -> int:
    body = json.dumps({"host": HOST, "key": KEY, "keyLocation": KEY_LOCATION, "urlList": urls}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, method="POST",
                                 headers={**UA, "Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


# What IndexNow's status codes mean
MEANING = {
    200: "OK — URLs received",
    202: "Accepted — key validation pending",
    400: "Bad request",
    403: "Key not valid (key file missing or wrong)",
    422: "URLs don't belong to the host, or key mismatch",
    429: "Too many requests — try later",
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--all", action="store_true", help="submit every sitemap URL, not just recently changed ones")
    ap.add_argument("--since-days", type=float, default=2, help="changed within this many days (default 2)")
    ap.add_argument("--dry-run", action="store_true", help="show what would be sent, send nothing")
    args = ap.parse_args()

    entries: list[tuple[str, datetime | None]] = []
    for sm in SITEMAPS:
        got = sitemap_entries(sm)
        print(f"{sm}: {len(got)} URLs")
        entries += got

    if args.all:
        urls = [u for u, _ in entries]
    else:
        cutoff = datetime.now(timezone.utc) - timedelta(days=args.since_days)
        urls = [u for u, when in entries if when and when >= cutoff]
    urls = list(dict.fromkeys(u for u in urls if u.startswith(SITE)))  # dedupe, own host only
    print(f"{len(urls)} URLs to submit ({'all' if args.all else f'changed in last {args.since_days:g} days'})")

    if args.dry_run or not urls:
        for u in urls[:10]:
            print("  ", u)
        return 0

    if not key_is_live():
        print(f"ERROR: key file {KEY_LOCATION} is not live yet (deploy the frontend first).")
        return 1

    failed = False
    for i in range(0, len(urls), BATCH):
        batch = urls[i:i + BATCH]
        code = submit(batch)
        print(f"batch {i // BATCH + 1}: {len(batch)} URLs -> {code} {MEANING.get(code, '')}")
        failed |= code not in (200, 202)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
