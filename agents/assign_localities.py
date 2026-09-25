"""Tag every live business with its neighbourhood, from OpenStreetMap.

For each city: fetch OSM place nodes (suburb / quarter / neighbourhood) inside
the city's area, then give each business with coordinates the name of the
nearest one. Cities with 5+ suburbs use suburbs only — they're the areas people
search ("dentist in Madhapur"); smaller cities fall back to neighbourhoods.
A business further than the cut-off from every place gets no locality.
Generic names ("Phase 3", "Sector 7", "Block A") are skipped.

Powers /[city]/area/[area] and /[city]/[category]/[area].

Usage:
  python agents/assign_localities.py --city hyderabad          # dry run: stats only
  python agents/assign_localities.py --all --apply             # every city, live
Env:
  LOCALINDIA_ADMIN_PASSWORD  — required for --apply
"""
import argparse
import json
import math
import re
import sys
import time
from collections import Counter

import httpx

from osm_business_import import (
    BACKEND_URL, OUTPUT_DIR, OVERPASS_URLS, USER_AGENT, admin_headers, fetch_live, load_regions,
)

MIN_SUBURBS = 5          # below this, a city's suburbs are too sparse — use neighbourhoods too
SUBURB_MAX_KM = 3.0
NEIGHBOURHOOD_MAX_KM = 1.5
BATCH = 1000
GENERIC = re.compile(r"^(phase|sector|block|stage|zone|ward|division|part|street|road|lane|layout)\b|^\d|^[a-z]$", re.I)


def fetch_places(bbox: list[float]) -> list[dict]:
    s, w, n, e = bbox
    query = f'[out:json][timeout:120];node["place"~"^(suburb|quarter|neighbourhood)$"]["name"]({s},{w},{n},{e});out;'
    last = None
    for attempt in range(4):
        for url in OVERPASS_URLS:
            try:
                r = httpx.post(url, data={"data": query}, headers={"User-Agent": USER_AGENT}, timeout=180)
                r.raise_for_status()
                return r.json()["elements"]
            except Exception as exc:
                last = exc
                print(f"  Overpass {url} failed (round {attempt + 1}): {exc}", file=sys.stderr)
        time.sleep(30 * (attempt + 1))
    raise SystemExit(f"All Overpass servers failed: {last}")


def place_name(tags: dict) -> str | None:
    """English name if OSM has one, else the name when it's in Latin script."""
    name = (tags.get("name:en") or tags.get("name") or "").strip()
    if len(name) < 3 or not re.search(r"[A-Za-z]", name) or re.search(r"[^\x00-\x7F]", name):
        return None
    if GENERIC.search(name):
        return None
    return name.title() if name == name.lower() else name


def km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return math.hypot((lat1 - lat2) * 111.0, (lon1 - lon2) * 111.0 * math.cos(math.radians(lat1)))


def places_for(city: str, regions: dict) -> tuple[list[tuple[str, float, float]], float, str]:
    elements = fetch_places(regions[city]["bbox"])
    named = [(place_name(el.get("tags", {})), el["tags"]["place"], el["lat"], el["lon"]) for el in elements]
    named = [p for p in named if p[0]]
    suburbs = [p for p in named if p[1] == "suburb"]
    if len(suburbs) >= MIN_SUBURBS:
        return [(n, la, lo) for n, _, la, lo in suburbs], SUBURB_MAX_KM, "suburbs"
    return [(n, la, lo) for n, _, la, lo in named], NEIGHBOURHOOD_MAX_KM, "neighbourhoods"


def assign(businesses: list[dict], places: list[tuple[str, float, float]], max_km: float) -> dict[str, str | None]:
    out = {}
    for b in businesses:
        lat, lon = float(b["latitude"]), float(b["longitude"])
        best = min(places, key=lambda p: km(lat, lon, p[1], p[2]), default=None)
        out[b["id"]] = best[0] if best and km(lat, lon, best[1], best[2]) <= max_km else None
    return out


def run_city(city: str, regions: dict, apply: bool) -> dict:
    places, max_km, level = places_for(city, regions)
    live = [b for b in fetch_live(city) if b.get("latitude") is not None and b.get("longitude") is not None]
    wanted = assign(live, places, max_km) if places else {b["id"]: None for b in live}
    changes = [{"id": b["id"], "locality": wanted[b["id"]]} for b in live if wanted[b["id"]] != b.get("locality")]
    counts = Counter(v for v in wanted.values() if v)
    stats = {
        "city": city, "level": level, "places": len(places), "businesses": len(live),
        "assigned": sum(counts.values()), "areas": len(counts),
        "areas_3plus": sum(1 for n in counts.values() if n >= 3), "changes": len(changes),
        "top": counts.most_common(8),
    }
    print(f"{city}: {stats['places']} {level}, {stats['assigned']}/{stats['businesses']} assigned, "
          f"{stats['areas_3plus']} areas with 3+, {len(changes)} changes. Top: {stats['top'][:5]}")
    if apply and changes:
        with httpx.Client(timeout=120) as client:
            headers = admin_headers(client)
            for i in range(0, len(changes), BATCH):
                r = client.post(f"{BACKEND_URL}/api/v1/admin/businesses/import/localities",
                                json={"city_slug": city, "items": changes[i:i + BATCH]}, headers=headers)
                r.raise_for_status()
    return stats


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--city")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    data = load_regions()
    regions = data["regions"]
    cities = data["order"] if args.all else [args.city]
    if not cities or cities == [None]:
        raise SystemExit("Give --city SLUG or --all")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    report = []
    for i, city in enumerate(cities):
        if city not in regions:
            print(f"{city}: no area data, skipped")
            continue
        report.append(run_city(city, regions, args.apply))
        (OUTPUT_DIR / "localities_summary.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
        if i < len(cities) - 1:
            time.sleep(8)   # be gentle with the public Overpass servers
    total = sum(r["assigned"] for r in report)
    pages = sum(r["areas_3plus"] for r in report)
    print(f"\nDone: {len(report)} cities, {total} businesses tagged, {pages} areas with 3+ businesses"
          f"{'' if args.apply else ' (dry run — nothing changed)'}")


if __name__ == "__main__":
    main()
