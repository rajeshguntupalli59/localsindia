#!/usr/bin/env python3
"""
Build agents/data/city_regions.json: a map bounding box + population for every
active LocalsIndia city, from OpenStreetMap's Nominatim geocoder, plus the
order the business import should go in.

Order = main city of every state first, then every state's 2nd city, then
3rd, ... (ranked by population within the state). So each state gets its
biggest city before any state gets its smaller ones.

Usage:  python agents/prepare_city_regions.py
Nominatim policy: identify ourselves, max 1 request/second — respected below.
"""
import json
import math
import re
import time
from pathlib import Path

import httpx

BACKEND_URL = "https://localsindia-backend-in.azurewebsites.net"
UA = {"User-Agent": "LocalsIndia-business-import/1.0 (support@localsindia.com)"}
OUT = Path(__file__).parent / "data" / "city_regions.json"
# A city's box is clipped to at most this many degrees per side (~45 km) so a
# district-sized boundary doesn't pull in a whole district's villages.
MAX_SPAN = 0.4


def population(extratags: dict) -> int:
    raw = (extratags or {}).get("population", "")
    digits = re.sub(r"[^\d]", "", raw.split(";")[0])
    return int(digits) if digits else 0


def geocode(client: httpx.Client, name: str, state: str) -> dict | None:
    r = client.get("https://nominatim.openstreetmap.org/search", params={
        "city": name, "state": state, "country": "India",
        "format": "jsonv2", "extratags": 1, "limit": 1,
    })
    r.raise_for_status()
    hits = r.json()
    if not hits:   # some towns aren't tagged as city — fall back to free text
        time.sleep(1.1)
        r = client.get("https://nominatim.openstreetmap.org/search", params={
            "q": f"{name}, {state}, India", "format": "jsonv2", "extratags": 1, "limit": 1,
        })
        r.raise_for_status()
        hits = r.json()
    if not hits:
        return None
    h = hits[0]
    s, n, w, e = (float(x) for x in h["boundingbox"])
    lat, lon = float(h["lat"]), float(h["lon"])
    half = MAX_SPAN / 2
    s, n = max(s, lat - half), min(n, lat + half)
    w, e = max(w, lon - half), min(e, lon + half)
    return {"bbox": [round(s, 4), round(w, 4), round(n, 4), round(e, 4)],
            "population": population(h.get("extratags")), "osm": f"{h.get('osm_type')}/{h.get('osm_id')}",
            "wikidata": (h.get("extratags") or {}).get("wikidata")}


def wikidata_population(client: httpx.Client, qid: str | None, name: str) -> int:
    """OSM often lacks a population tag for Indian towns; Wikidata has census
    figures. Use the place's own Wikidata id, else search by name."""
    # A name search (or even OSM's own link) can land on the *district*, whose
    # population is millions — only trust records that describe a city/town.
    def is_town(desc: str) -> bool:
        d = desc.lower()
        return "district" not in d and any(w in d for w in ("city", "town", "municipal", "corporation"))

    if not qid:
        r = client.get("https://www.wikidata.org/w/api.php", params={
            "action": "wbsearchentities", "search": name, "language": "en", "format": "json", "limit": 7})
        hits = [h for h in r.json().get("search", [])
                if "India" in (h.get("description") or "") and is_town(h.get("description") or "")]
        if not hits:
            return 0
        qid = hits[0]["id"]
    data = client.get(f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json",
                      follow_redirects=True).json()
    entity = next(iter(data.get("entities", {}).values()), {})   # redirected ids come back re-keyed
    desc = entity.get("descriptions", {}).get("en", {}).get("value", "")
    if not is_town(desc):
        return 0
    claims = entity.get("claims", {}).get("P1082", [])
    values = [int(float(c["mainsnak"]["datavalue"]["value"]["amount"])) for c in claims
              if c["mainsnak"].get("datavalue")]
    return max(values, default=0)


# Towns Wikidata can't match by name (spelling) — verified centre by hand.
MANUAL_CENTRES = {"gangavati": (15.431, 76.529)}
TOWN_HALF = 0.06   # ~13 km box around a corrected town centre
TOWN_WORDS = re.compile(r"\b(city|town|municipal|municipality|corporation|census|village|suburb|metropolis|capital|headquarters)\b")


def wikidata_town_coord(client: httpx.Client, name: str, state: str) -> tuple[float, float] | None:
    """Coordinates of the city/town itself (never the district) from Wikidata."""
    r = client.get("https://www.wikidata.org/w/api.php", params={
        "action": "wbsearchentities", "search": name, "language": "en", "format": "json", "limit": 10})
    for h in r.json().get("search", []):
        desc = (h.get("description") or "").lower()
        if not ("india" in desc and state.lower() in desc and not desc.startswith("district")
                and TOWN_WORDS.search(desc)):
            continue
        e = next(iter(client.get(f"https://www.wikidata.org/wiki/Special:EntityData/{h['id']}.json",
                                 follow_redirects=True).json()["entities"].values()))
        p625 = e.get("claims", {}).get("P625")
        if p625 and p625[0]["mainsnak"].get("datavalue"):
            v = p625[0]["mainsnak"]["datavalue"]["value"]
            return v["latitude"], v["longitude"]
    return None


def cross_check(client: httpx.Client, slug: str, name: str, g: dict, state: str) -> None:
    """Nominatim sometimes matches a building, a same-named village elsewhere,
    or a district. If Wikidata's town coordinates disagree by >5 km (or the box
    is tiny), re-centre on the real town."""
    centre = MANUAL_CENTRES.get(slug)
    if not centre:
        try:
            centre = wikidata_town_coord(client, name, state)
        except Exception as exc:
            print(f"  wikidata check failed for {name}: {exc}")
            return
    if not centre:
        return
    s_, w_, n_, e_ = g["bbox"]
    clat, clon = (s_ + n_) / 2, (w_ + e_) / 2
    km = math.hypot((centre[0] - clat) * 111, (centre[1] - clon) * 111 * math.cos(math.radians(clat)))
    if slug in MANUAL_CENTRES or km > 5 or max(n_ - s_, e_ - w_) < 0.03:
        lat, lon = centre
        g["bbox"] = [round(lat - TOWN_HALF, 4), round(lon - TOWN_HALF, 4),
                     round(lat + TOWN_HALF, 4), round(lon + TOWN_HALF, 4)]
        g["corrected"] = "manual" if slug in MANUAL_CENTRES else f"wikidata ({km:.0f} km off)"
        print(f"  corrected {name}: {g['corrected']}")


def main() -> None:
    cities = httpx.get(f"{BACKEND_URL}/api/v1/cities", timeout=30).json()
    regions, missing = {}, []
    with httpx.Client(headers=UA, timeout=30) as client:
        for c in cities:
            g = geocode(client, c["name"], c["state"])
            time.sleep(1.1)
            if not g:
                missing.append(c["slug"])
                print(f"  not found: {c['name']}, {c['state']}")
                continue
            cross_check(client, c["slug"], c["name"], g, c["state"])
            time.sleep(0.3)
            if g["population"] < 20000:
                try:
                    g["population"] = max(g["population"], wikidata_population(client, g["wikidata"], c["name"]))
                except Exception as exc:
                    print(f"  wikidata lookup failed for {c['name']}: {exc}")
            regions[c["slug"]] = {"name": c["name"], "state": c["state"], **g}
            print(f"  {c['name']:<22} pop {g['population']:>9,}  {g['bbox']}")

    by_state: dict[str, list[str]] = {}
    for slug, r in regions.items():
        by_state.setdefault(r["state"], []).append(slug)
    for slugs in by_state.values():
        slugs.sort(key=lambda s: -regions[s]["population"])
    order = []
    for rank in range(max(len(v) for v in by_state.values())):
        tier = [v[rank] for v in by_state.values() if rank < len(v)]
        tier.sort(key=lambda s: -regions[s]["population"])
        for s in tier:
            regions[s]["tier"] = rank + 1
        order += tier

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"order": order, "regions": regions, "not_found": missing},
                              indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\n{len(regions)} cities, {len(missing)} not found. First 12: {order[:12]}")


if __name__ == "__main__":
    main()
