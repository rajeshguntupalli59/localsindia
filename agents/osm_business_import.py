#!/usr/bin/env python3
"""
Import real local businesses from OpenStreetMap into the LocalsIndia
business directory, as UNCLAIMED listings owners can claim later.

Usage:
  python agents/osm_business_import.py --city hyderabad            # dry run: writes preview CSV/JSON, no upload
  python agents/osm_business_import.py --city hyderabad --apply    # uploads via POST /admin/businesses/import

Env:
  LOCALINDIA_ADMIN_PASSWORD  — required for --apply
  LOCALINDIA_API_URL         — optional, defaults to the production backend

Data licence: OpenStreetMap data is © OpenStreetMap contributors, available
under the ODbL. The site shows that attribution on every imported business.

What gets imported (quality filter):
  - has a name, maps to one of our categories
  - has a phone number OR an address (a bare name isn't findable/contactable)
  - is NOT a chain/brand (brand / brand:wikidata tag) — a KFC or Apollo
    branch shouldn't be claimable by whoever gets there first
"""
import argparse
import csv
import json
import os
import re
import sys
import time
from collections import Counter
from pathlib import Path

import httpx

BACKEND_URL = os.getenv("LOCALINDIA_API_URL", "https://localsindia-backend-in.azurewebsites.net")
ADMIN_USERNAME = "localsindia_admin"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
USER_AGENT = "LocalsIndia-business-import/1.0 (support@localsindia.com)"
OUTPUT_DIR = Path(__file__).parent / "output" / "osm"
BATCH = 200

# (south, west, north, east) — add cities here as we expand
CITY_BBOX = {
    "hyderabad": (17.28, 78.30, 17.56, 78.62),
}

# OSM tag → our category slug. First match wins.
AMENITY_MAP = {
    "restaurant": "tiffin", "cafe": "tiffin", "fast_food": "tiffin", "food_court": "tiffin",
    "clinic": "doctors", "doctors": "doctors", "dentist": "doctors", "hospital": "doctors", "pharmacy": "doctors",
    "school": "education", "college": "education", "kindergarten": "education",
    "driving_school": "education", "language_school": "education", "training": "education",
    "veterinary": "services", "car_wash": "vehicles",
}
SHOP_MAP = {
    "bakery": "tiffin", "confectionery": "tiffin", "sweets": "tiffin", "pastry": "tiffin", "deli": "tiffin",
    "electronics": "electronics", "mobile_phone": "electronics", "computer": "electronics",
    "appliance": "electronics",
    "car": "vehicles", "car_repair": "vehicles", "car_parts": "vehicles", "motorcycle": "vehicles",
    "motorcycle_repair": "vehicles", "tyres": "vehicles", "bicycle": "vehicles",
    "furniture": "furniture", "interior_decoration": "furniture",
    "clothes": "fashion", "shoes": "fashion", "jewelry": "fashion", "tailor": "fashion",
    "boutique": "fashion", "bag": "fashion", "fabric": "fashion", "watches": "fashion",
    "hairdresser": "services", "beauty": "services", "laundry": "services", "dry_cleaning": "services",
    "optician": "services", "copyshop": "services", "photo": "services",
    "medical_supply": "doctors", "chemist": "doctors",
}
OFFICE_MAP = {"estate_agent": "real-estate", "educational_institution": "education"}
DEFAULT_SHOP_CATEGORY = "businesses"   # supermarket, hardware, stationery, general, ...
PHONE_KEYS = ("phone", "contact:phone", "mobile", "contact:mobile")


def overpass_query(bbox: tuple) -> str:
    s, w, n, e = bbox
    b = f"({s},{w},{n},{e})"
    amenities = "|".join(AMENITY_MAP)
    offices = "|".join(OFFICE_MAP)
    return f"""[out:json][timeout:180];
(
  nwr["name"]["shop"]{b};
  nwr["name"]["amenity"~"^({amenities})$"]{b};
  nwr["name"]["office"~"^({offices})$"]{b};
);
out tags center;"""


def fetch_osm(bbox: tuple) -> list[dict]:
    query = overpass_query(bbox)
    last_err = None
    for url in OVERPASS_URLS:
        try:
            r = httpx.post(url, data={"data": query}, headers={"User-Agent": USER_AGENT}, timeout=240)
            r.raise_for_status()
            return r.json()["elements"]
        except Exception as exc:   # Overpass servers fail transiently — try the mirror
            last_err = exc
            print(f"  Overpass {url} failed: {exc}", file=sys.stderr)
            time.sleep(5)
    raise SystemExit(f"All Overpass servers failed: {last_err}")


def category_for(tags: dict) -> str | None:
    if tags.get("amenity") in AMENITY_MAP:
        return AMENITY_MAP[tags["amenity"]]
    if tags.get("office") in OFFICE_MAP:
        return OFFICE_MAP[tags["office"]]
    if "shop" in tags:
        return SHOP_MAP.get(tags["shop"], DEFAULT_SHOP_CATEGORY)
    return None


def normalize_phone(raw: str | None) -> str | None:
    """First number in the tag, as +91XXXXXXXXXX (mobile or landline with STD code)."""
    if not raw:
        return None
    for part in re.split(r"[;,/]", raw):
        digits = re.sub(r"\D", "", part)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if len(digits) == 10:
            return f"+91{digits}"
    return None


def address_for(tags: dict) -> str | None:
    if tags.get("addr:full") and re.search(r"[A-Za-z]{3,}", tags["addr:full"]):
        return tags["addr:full"].strip()
    parts = [tags.get(k) for k in ("addr:housenumber", "addr:street", "addr:suburb", "addr:city", "addr:postcode")]
    parts = [p.strip() for p in parts if p and p.strip()]
    address = ", ".join(parts)
    # A bare PIN code or house number doesn't help anyone find the place
    return address if re.search(r"[A-Za-z]{3,}", address) else None


def to_business(el: dict) -> tuple[dict | None, str]:
    """Returns (business, '') or (None, reason_skipped)."""
    tags = el.get("tags", {})
    name = (tags.get("name:en") or tags.get("name") or "").strip()
    if not name:
        return None, "no name"
    if tags.get("brand") or tags.get("brand:wikidata"):
        return None, "chain/brand"
    category = category_for(tags)
    if not category:
        return None, "no category"
    phone = next((normalize_phone(tags.get(k)) for k in PHONE_KEYS if normalize_phone(tags.get(k))), None)
    address = address_for(tags)
    if not phone and not address:
        return None, "no phone or address"
    lat = el.get("lat") or el.get("center", {}).get("lat")
    lon = el.get("lon") or el.get("center", {}).get("lon")
    website = tags.get("website") or tags.get("contact:website")
    return {
        "name": name[:150],
        "category_slug": category,
        "source_ref": f"{el['type']}/{el['id']}",
        "address": address,
        "phone": phone,
        "website_url": website if website and website.startswith("http") else None,
        "latitude": round(lat, 6) if lat else None,
        "longitude": round(lon, 6) if lon else None,
    }, ""


def write_preview(city: str, rows: list[dict], skipped: Counter) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / f"{city}_preview.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(OUTPUT_DIR / f"{city}_preview.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["name"])
        w.writeheader()
        w.writerows(rows)
    by_cat = Counter(r["category_slug"] for r in rows)
    mobiles = sum(1 for r in rows if r["phone"] and r["phone"][3] in "6789")
    summary = [
        f"City: {city}",
        f"Would import: {len(rows)}",
        f"  with a mobile (can claim by SMS code): {mobiles}",
        f"  with any phone: {sum(1 for r in rows if r['phone'])}",
        f"  with an address: {sum(1 for r in rows if r['address'])}",
        "By category: " + ", ".join(f"{k} {v}" for k, v in by_cat.most_common()),
        "Skipped: " + ", ".join(f"{k} {v}" for k, v in skipped.most_common()),
    ]
    (OUTPUT_DIR / f"{city}_summary.txt").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print("\n".join(summary))
    print(f"\nPreview written to {OUTPUT_DIR}")


def apply(city: str, rows: list[dict]) -> None:
    password = os.getenv("LOCALINDIA_ADMIN_PASSWORD")
    if not password:
        raise SystemExit("LOCALINDIA_ADMIN_PASSWORD not set — run without --apply for a dry run.")
    with httpx.Client(timeout=60) as client:
        r = client.post(f"{BACKEND_URL}/api/v1/auth/admin-login",
                        json={"username": ADMIN_USERNAME, "password": password})
        r.raise_for_status()
        headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
        totals = Counter()
        for i in range(0, len(rows), BATCH):
            batch = rows[i:i + BATCH]
            r = client.post(f"{BACKEND_URL}/api/v1/admin/businesses/import", headers=headers,
                            json={"city_slug": city, "source": "osm", "businesses": batch})
            r.raise_for_status()
            totals.update(r.json())
            print(f"  batch {i // BATCH + 1}: {r.json()}")
    print(f"Done: {dict(totals)}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--city", required=True, choices=sorted(CITY_BBOX))
    ap.add_argument("--apply", action="store_true", help="upload to the live site (default: dry run)")
    args = ap.parse_args()

    print(f"Fetching OpenStreetMap businesses for {args.city}…")
    elements = fetch_osm(CITY_BBOX[args.city])
    rows, skipped, seen_names = [], Counter(), set()
    for el in elements:
        biz, reason = to_business(el)
        if not biz:
            skipped[reason] += 1
            continue
        # Same place mapped twice (e.g. a node and a building outline)
        key = (biz["name"].lower(), biz["phone"] or biz["address"])
        if key in seen_names:
            skipped["duplicate"] += 1
            continue
        seen_names.add(key)
        rows.append(biz)

    write_preview(args.city, rows, skipped)
    if args.apply:
        apply(args.city, rows)


if __name__ == "__main__":
    main()
