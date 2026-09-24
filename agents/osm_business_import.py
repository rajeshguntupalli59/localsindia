#!/usr/bin/env python3
"""
Import real local businesses from OpenStreetMap into the LocalsIndia
business directory, as UNCLAIMED listings owners can claim later.

Usage:
  python agents/osm_business_import.py --city hyderabad            # dry run: writes preview CSV/JSON, no upload
  python agents/osm_business_import.py --city hyderabad --apply    # uploads via POST /admin/businesses/import
  python agents/osm_business_import.py --auto 5 --apply            # next 5 cities in priority order
  python agents/osm_business_import.py --city guntur --verify      # only the live cleanliness checks

After each city is uploaded, verify() checks the live data (junk/generic
names, duplicates, missing categories, leftover placeholder businesses,
pages load) and the run STOPS on any problem. Progress is kept in
agents/state/osm_import_state.json.

Env:
  LOCALINDIA_ADMIN_PASSWORD  — required for --apply
  LOCALINDIA_API_URL         — optional, defaults to the production backend

Data licence: OpenStreetMap data is © OpenStreetMap contributors, available
under the ODbL. The site shows that attribution on every imported business.

Category rule: every business must land in one of OUR categories via an
explicit tag mapping below (AMENITY_MAP / SHOP_MAP / OFFICE_MAP / TOURISM_MAP).
The script refuses to run if a mapping points at a category the site doesn't
have, and the summary lists our categories that got no businesses so gaps get
a new mapping rather than being ignored. When adding a new category to the
site, add its OSM tags here too.

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

# City boxes + import order come from agents/data/city_regions.json, built by
# prepare_city_regions.py (main city of every state first, then 2nd, 3rd ...).
REGIONS_FILE = Path(__file__).parent / "data" / "city_regions.json"
STATE_FILE = Path(__file__).parent / "state" / "osm_import_state.json"
SITE_URL = "https://www.localsindia.com"


def load_regions() -> dict:
    return json.loads(REGIONS_FILE.read_text(encoding="utf-8"))


def load_state() -> dict:
    return json.loads(STATE_FILE.read_text(encoding="utf-8")) if STATE_FILE.exists() else {}


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=1, sort_keys=True), encoding="utf-8")

# OSM tag → our category slug. First match wins.
AMENITY_MAP = {
    "restaurant": "tiffin", "cafe": "tiffin", "fast_food": "tiffin", "food_court": "tiffin",
    "clinic": "doctors", "doctors": "doctors", "dentist": "doctors", "hospital": "doctors", "pharmacy": "doctors",
    "school": "education", "college": "education", "kindergarten": "education",
    "driving_school": "education", "language_school": "education", "training": "education",
    "veterinary": "services", "car_wash": "vehicles",
    "events_venue": "events", "community_centre": "events", "conference_centre": "events",
}
TOURISM_MAP = {"hostel": "pg-roommate", "guest_house": "pg-roommate"}
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
OFFICE_MAP = {
    "estate_agent": "real-estate", "property_management": "real-estate",
    "educational_institution": "education", "employment_agency": "jobs",
}
DEFAULT_SHOP_CATEGORY = "businesses"   # supermarket, hardware, stationery, general, ...
PHONE_KEYS = ("phone", "contact:phone", "mobile", "contact:mobile")


def overpass_query(bbox: tuple) -> str:
    s, w, n, e = bbox
    b = f"({s},{w},{n},{e})"
    amenities = "|".join(AMENITY_MAP)
    offices = "|".join(OFFICE_MAP)
    tourism = "|".join(TOURISM_MAP)
    return f"""[out:json][timeout:180];
(
  nwr["name"]["shop"]{b};
  nwr["name"]["amenity"~"^({amenities})$"]{b};
  nwr["name"]["office"~"^({offices})$"]{b};
  nwr["name"]["tourism"~"^({tourism})$"]{b};
);
out tags center;"""


def fetch_osm(bbox: tuple) -> list[dict]:
    query = overpass_query(bbox)
    last_err = None
    # Public Overpass servers are often overloaded (504s, timeouts) — retry
    # both servers for a few rounds with growing waits before giving up.
    for attempt in range(4):
        for url in OVERPASS_URLS:
            try:
                r = httpx.post(url, data={"data": query}, headers={"User-Agent": USER_AGENT}, timeout=240)
                r.raise_for_status()
                return r.json()["elements"]
            except Exception as exc:
                last_err = exc
                print(f"  Overpass {url} failed (round {attempt + 1}): {exc}", file=sys.stderr)
        time.sleep(30 * (attempt + 1))
    raise SystemExit(f"All Overpass servers failed: {last_err}")


# Shops tagged vaguely (shop=yes, variety_store, ...) fall into the generic
# "businesses" category; when the NAME clearly says what they are, use that.
# Only applied on top of the generic fallback — a specific OSM tag always wins
# (e.g. "Asian Institute of Gastroenterology" stays a hospital, not education).
NAME_KEYWORDS = [
    ("events", r"function hall|convention|banquet|kalyana? ?mandap|marriage hall"),
    ("doctors", r"hospital|clinic|dental|dentist|pharmacy|diagnostic|nursing home|physiotherap|medicals?\b(?!.*book)"),
    ("education", r"school|college|academy|institute|coaching|tuition|vidyalaya|university"),
    ("pg-roommate", r"\bhostel\b|\bp\.?g\b|paying guest|co-?living"),
    ("tiffin", r"restaurant|tiffin|bakery|bakers|sweets?\b|biryani|\bmess\b|\bcafe\b|dhaba|bhojan|\bfoods?\b|kitchen"),
    ("vehicles", r"motors|automobiles?|garage|tyres?\b|two wheeler|car wash|auto ?mobiles?"),
    ("fashion", r"textiles?|boutique|jewell|silks?\b|sarees?\b|tailors?\b|fashions?\b|footwear|collections\b|garments"),
    ("electronics", r"mobiles?\b|electronics|computers?\b|laptops?\b"),
    ("furniture", r"furnitures?\b"),
    ("real-estate", r"real estate|properties|realty|builders|developers"),
]


def category_from_name(name: str) -> str | None:
    n = name.lower()
    return next((cat for cat, pat in NAME_KEYWORDS if re.search(pat, n)), None)


def category_for(tags: dict) -> str | None:
    cat = category_from_tags(tags)
    if cat == DEFAULT_SHOP_CATEGORY:
        return category_from_name(tags.get("name:en") or tags.get("name") or "") or cat
    return cat


def category_from_tags(tags: dict) -> str | None:
    if tags.get("amenity") in AMENITY_MAP:
        return AMENITY_MAP[tags["amenity"]]
    if tags.get("office") in OFFICE_MAP:
        return OFFICE_MAP[tags["office"]]
    if tags.get("tourism") in TOURISM_MAP:
        return TOURISM_MAP[tags["tourism"]]
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


# Only real, specifically-named businesses. OSM mappers sometimes type the
# kind of place as its name ("Medical Shop", "Tea Stall") — that's not a
# business anyone can find or claim, so it's rejected, as is test/junk text.
GENERIC_WORDS = {
    "shop", "shops", "store", "stores", "medical", "medicals", "hotel", "restaurant", "clinic",
    "hospital", "school", "college", "tea", "stall", "kirana", "general", "provision", "provisions",
    "bakery", "pharmacy", "xerox", "mobile", "mobiles", "hair", "salon", "saloon", "tiffin", "tiffins",
    "center", "centre", "the", "and", "&", "fancy", "super", "market", "supermarket", "mart", "wine",
    "bar", "pan", "cafe", "canteen", "mess", "hostel", "pg", "ladies", "gents", "boys", "girls",
    "chemist", "chemists", "dental", "doctor", "govt", "government", "private", "primary", "high",
    "public", "new", "old", "local", "small", "big", "fruit", "fruits", "vegetable", "vegetables",
    "meat", "chicken", "mutton", "fish", "egg", "milk", "dairy", "juice", "sweet", "sweets", "tailor",
    "tailors", "bike", "car", "repair", "service", "services", "workshop", "garage", "petrol", "bunk",
    "atm", "bank", "office", "agency", "agencies", "traders", "enterprises", "hardware", "electricals",
    "electronics", "textiles", "cloth", "clothes", "footwear", "jewellery", "jewellers", "furniture",
    "bakers", "cool", "drinks", "stationery", "book", "books",
}
# "test" alone is junk, but "Test Tube Baby Centre" (IVF clinics) is real
JUNK_RE = re.compile(r"\b(test(?!\s*tube)|demo|sample|placeholder|dummy|unknown|unnamed|no name|xxx+|asdf)\b", re.I)
CHAIN_MIN_BRANCHES = 3   # same name 3+ times in one city = a chain (brand tag missing) — skip it


def junk_reason(name: str) -> str | None:
    words = re.findall(r"[a-z&]+", name.lower())
    if len(name.strip()) < 3 or not re.search(r"[A-Za-z]", name):
        return "junk name"
    if JUNK_RE.search(name):
        return "junk name"
    if words and all(w in GENERIC_WORDS for w in words):
        return "generic name"
    return None


def to_business(el: dict) -> tuple[dict | None, str]:
    """Returns (business, '') or (None, reason_skipped)."""
    tags = el.get("tags", {})
    name = (tags.get("name:en") or tags.get("name") or "").strip()
    if not name:
        return None, "no name"
    if junk_reason(name):
        return None, junk_reason(name)
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


def check_category_mapping() -> list[str]:
    """Every mapping target must be a real LocalsIndia category — stop before
    importing anything into a category that doesn't exist. Returns the live
    category slugs so the summary can flag categories left empty."""
    targets = set(AMENITY_MAP.values()) | set(SHOP_MAP.values()) | set(OFFICE_MAP.values())         | set(TOURISM_MAP.values()) | {DEFAULT_SHOP_CATEGORY}
    r = httpx.get(f"{BACKEND_URL}/api/v1/categories", timeout=30)
    r.raise_for_status()
    live = [c["slug"] for c in r.json()]
    missing = sorted(targets - set(live))
    if missing:
        raise SystemExit(f"Mapping points at categories that don't exist on the site: {missing} — fix the maps first.")
    return live


def write_preview(city: str, rows: list[dict], skipped: Counter, live_categories: list[str]) -> None:
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
        # Listing-only categories (classifieds) are expected to be empty
        "Our categories with NO businesses found: "
        + (", ".join(c for c in live_categories if c not in by_cat and c != "classifieds") or "none"),
    ]
    (OUTPUT_DIR / f"{city}_summary.txt").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print("\n".join(summary))
    print(f"\nPreview written to {OUTPUT_DIR}")


def apply(city: str, rows: list[dict]) -> dict:
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
    return dict(totals)


def verify(city: str) -> list[str]:
    """Check what's live for this city looks clean. Returns a list of problems
    (empty = clean). Run after every city; a batch stops on any problem."""
    problems = []
    live = fetch_live(city)
    osm = [b for b in live if b.get("source") == "osm"]
    for reason, items in bad_live_businesses(osm).items():
        if items:
            problems.append(f"{len(items)} {reason} live, e.g. {[b['name'] for b in items[:4]]}")
    miscat = [b["name"] for b in osm if b.get("category_slug") == DEFAULT_SHOP_CATEGORY
              and category_from_name(b["name"]) and not b.get("owner_id")]
    if miscat:
        problems.append(f"{len(miscat)} in the generic category though the name says otherwise, e.g. {miscat[:4]}")
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        no_cat = [b["name"] for b in osm if not b.get("category_slug")]
        if no_cat:
            problems.append(f"{len(no_cat)} without a category")
        fake = [b["name"] for b in live if (b.get("phone") or "").startswith("+9164000000")]
        if fake:
            problems.append(f"placeholder-phone businesses still live: {fake[:3]}")
        pages = [f"/{city}/businesses"] + [f"/{city}/businesses/{b['id']}" for b in osm[:3]]
        if osm:
            pages.append(f"/{city}/businesses?category={osm[0]['category_slug']}")
        for p in pages:
            code = client.get(SITE_URL + p).status_code
            if code != 200:
                problems.append(f"{p} returned {code}")
    claimed = sum(1 for b in osm if b.get("owner_id"))
    print(f"Verify {city}: {len(osm)} imported businesses live ({claimed} claimed), "
          f"{len(live) - len(osm)} others; sample: {[b['name'] for b in osm[:6]]}")
    return problems


def build_rows(bbox: list) -> tuple[list[dict], Counter]:
    elements = fetch_osm(tuple(bbox))
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
    counts = Counter(r["name"].lower() for r in rows)
    chains = {n for n, c in counts.items() if c >= CHAIN_MIN_BRANCHES}
    if chains:
        skipped["chain (3+ branches)"] += sum(counts[n] for n in chains)
        rows = [r for r in rows if r["name"].lower() not in chains]
    return rows, skipped


def bad_live_businesses(osm: list[dict]) -> dict[str, list[dict]]:
    """Imported businesses that shouldn't be live: junk/generic names, chain
    branches, and true duplicates (same name, phone AND address — extras only)."""
    counts = Counter(b["name"].lower() for b in osm)
    seen, dupes = set(), []
    for b in osm:
        key = (b["name"].lower(), b.get("phone"), b.get("address"))
        if key in seen:
            dupes.append(b)
        seen.add(key)
    return {
        "junk/generic name": [b for b in osm if junk_reason(b["name"])],
        "chain branch": [b for b in osm if counts[b["name"].lower()] >= CHAIN_MIN_BRANCHES],
        "duplicate": dupes,
    }


def fetch_live(city: str) -> list[dict]:
    live, page = [], 1
    with httpx.Client(timeout=60) as client:
        while True:
            r = client.get(f"{BACKEND_URL}/api/v1/businesses",
                           params={"city_slug": city, "page_size": 50, "page": page})
            r.raise_for_status()
            data = r.json()
            live += data
            if len(data) < 50:
                return live
            page += 1


def admin_headers(client: httpx.Client) -> dict:
    password = os.getenv("LOCALINDIA_ADMIN_PASSWORD")
    if not password:
        raise SystemExit("LOCALINDIA_ADMIN_PASSWORD not set — needed to change live data.")
    r = client.post(f"{BACKEND_URL}/api/v1/auth/admin-login",
                    json={"username": ADMIN_USERNAME, "password": password})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def clean_city(city: str) -> int:
    """Soft-delete this city's imported businesses that fail the quality rules
    (the server only ever removes unclaimed imports), and move unclaimed
    imports out of the generic "businesses" category when the name says what
    they are. Returns how many were removed."""
    osm = [b for b in fetch_live(city) if b.get("source") == "osm"]
    removed = 0
    with httpx.Client(timeout=60) as client:
        headers = None
        cat_ids = {c["slug"]: c["id"] for c in client.get(f"{BACKEND_URL}/api/v1/categories").json()}
        moved = []
        for b in osm:
            better = category_from_name(b["name"]) if b.get("category_slug") == DEFAULT_SHOP_CATEGORY else None
            if better and not b.get("owner_id") and better in cat_ids:
                headers = headers or admin_headers(client)
                r = client.patch(f"{BACKEND_URL}/api/v1/businesses/{b['id']}", headers=headers,
                                 json={"category_id": cat_ids[better]})
                r.raise_for_status()
                moved.append(f"{b['name']} -> {better}")
        if moved:
            print(f"  re-categorised {len(moved)}: {moved[:6]}")
        for reason, items in bad_live_businesses(osm).items():
            ids = list({b["id"] for b in items})
            for i in range(0, len(ids), 500):
                headers = headers or admin_headers(client)
                r = client.post(f"{BACKEND_URL}/api/v1/admin/businesses/import/remove", headers=headers,
                                json={"business_ids": ids[i:i + 500], "reason": reason})
                r.raise_for_status()
                removed += r.json()["removed"]
                print(f"  removed {r.json()['removed']} ({reason}), e.g. {[b['name'] for b in items[:3]]}")
    return removed


def run_city(city: str, regions: dict, live_categories: list[str], do_apply: bool, state: dict) -> None:
    print(f"\n=== {regions[city]['name']} (tier {regions[city].get('tier')}) ===")
    rows, skipped = build_rows(regions[city]["bbox"])
    write_preview(city, rows, skipped, live_categories)
    if not do_apply:
        return
    totals = apply(city, rows) if rows else {"created": 0}
    totals["removed_by_cleanup"] = clean_city(city)
    problems = verify(city)
    state[city] = {"date": time.strftime("%Y-%m-%d"), "found": len(rows), **totals, "clean": not problems}
    save_state(state)
    if problems:
        raise SystemExit(f"STOPPING — {city} needs a look:\n  - " + "\n  - ".join(problems))
    print(f"{city}: clean")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--city", help="one city slug")
    ap.add_argument("--auto", type=int, help="the next N not-yet-imported cities, in priority order")
    ap.add_argument("--apply", action="store_true", help="upload to the live site (default: dry run)")
    ap.add_argument("--verify", action="store_true", help="only run the live checks for --city")
    ap.add_argument("--fix", action="store_true", help="with --verify: soft-delete imports that fail the checks first")
    args = ap.parse_args()

    data = load_regions()
    regions, order = data["regions"], data["order"]
    if args.verify:
        if args.fix:
            clean_city(args.city)
        problems = verify(args.city)
        raise SystemExit("\n".join(problems) if problems else 0)

    live_categories = check_category_mapping()
    state = load_state()
    if args.city:
        if args.city not in regions:
            raise SystemExit(f"Unknown city '{args.city}' — rebuild agents/data/city_regions.json?")
        cities = [args.city]
    elif args.auto:
        cities = [c for c in order if c not in state][:args.auto]
    else:
        raise SystemExit("Pass --city SLUG or --auto N")
    print(f"Cities this run: {cities}")
    for city in cities:
        run_city(city, regions, live_categories, args.apply, state)
        time.sleep(10)   # be gentle with the public Overpass servers


if __name__ == "__main__":
    main()
