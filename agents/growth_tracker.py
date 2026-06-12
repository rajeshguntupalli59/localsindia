#!/usr/bin/env python3
"""
GrowthTracker — Pulls live API data and generates a growth report for LocalIndia.

Usage:
  python agents/growth_tracker.py                    # report for all cities
  python agents/growth_tracker.py --city "Vijayawada" # single city deep-dive

Output: agents/output/growth/growth_report_{date}.md

What it tracks:
  - Listing count per city (total + by category)
  - Business count per city
  - Cities with zero or low listings (need seeding)
  - Top-performing cities by listing density
  - Category distribution across all cities
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from base_agent import save_output

BACKEND_URL = os.getenv("LOCALINDIA_API_URL", "https://localsindia-backend.azurewebsites.net")

# Minimum listings threshold — cities below this need seeding
MIN_LISTINGS_THRESHOLD = 5


async def fetch_all_cities(client: httpx.AsyncClient) -> list[dict]:
    resp = await client.get(f"{BACKEND_URL}/api/v1/cities", timeout=30)
    resp.raise_for_status()
    return resp.json()


async def fetch_city_listings(client: httpx.AsyncClient, city_slug: str) -> list[dict]:
    resp = await client.get(
        f"{BACKEND_URL}/api/v1/cities/{city_slug}/listings",
        params={"status": "active", "page_size": 100},
        timeout=30,
    )
    if resp.status_code in (404, 422):
        return []
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else data.get("items", [])


async def fetch_categories(client: httpx.AsyncClient) -> dict[str, str]:
    resp = await client.get(f"{BACKEND_URL}/api/v1/categories", timeout=30)
    resp.raise_for_status()
    return {c["id"]: c["slug"] for c in resp.json()}


async def collect_data(cities: list[dict]) -> dict:
    async with httpx.AsyncClient() as client:
        cat_id_to_slug = await fetch_categories(client)

        city_stats = []
        for city in cities:
            slug = city["slug"]
            listings = await fetch_city_listings(client, slug)
            await asyncio.sleep(0.5)  # gentle rate limiting

            cat_counts: dict[str, int] = {}
            for l in listings:
                cat_id = l.get("category_id") or ""
                cat_slug = cat_id_to_slug.get(cat_id, "unknown")
                cat_counts[cat_slug] = cat_counts.get(cat_slug, 0) + 1

            city_stats.append({
                "name": city["name"],
                "slug": slug,
                "state": city.get("state", ""),
                "listing_count": len(listings),
                "category_breakdown": cat_counts,
            })
            print(f"  [{len(listings):3d}] {city['name']}")

        return {"cities": city_stats, "fetched_at": datetime.now().isoformat()}


def build_report(data: dict) -> str:
    cities = data["cities"]
    fetched_at = data["fetched_at"]

    total_listings = sum(c["listing_count"] for c in cities)
    cities_with_listings = [c for c in cities if c["listing_count"] > 0]
    cities_needing_seed = [c for c in cities if c["listing_count"] < MIN_LISTINGS_THRESHOLD]

    # Sort by listing count desc
    sorted_cities = sorted(cities, key=lambda c: c["listing_count"], reverse=True)

    # Category totals
    all_cats: dict[str, int] = {}
    for c in cities:
        for cat, count in c["category_breakdown"].items():
            all_cats[cat] = all_cats.get(cat, 0) + count
    sorted_cats = sorted(all_cats.items(), key=lambda x: x[1], reverse=True)

    lines = [
        f"# LocalIndia Growth Report",
        f"*Generated: {fetched_at[:10]}*\n",
        "---\n",
        "## Summary\n",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total active listings | **{total_listings}** |",
        f"| Cities with listings | **{len(cities_with_listings)} / {len(cities)}** |",
        f"| Cities needing seed (<{MIN_LISTINGS_THRESHOLD}) | **{len(cities_needing_seed)}** |",
        f"| Top city | **{sorted_cities[0]['name']} ({sorted_cities[0]['listing_count']} listings)** |",
        "\n---\n",
        "## Top 20 Cities by Listings\n",
        "| City | State | Listings |",
        "|------|-------|----------|",
    ]

    for c in sorted_cities[:20]:
        lines.append(f"| {c['name']} | {c['state']} | {c['listing_count']} |")

    lines.append("\n---\n")
    lines.append("## Category Distribution (All Cities)\n")
    lines.append("| Category | Total Listings |")
    lines.append("|----------|---------------|")
    for cat, count in sorted_cats:
        lines.append(f"| {cat} | {count} |")

    lines.append("\n---\n")
    lines.append(f"## Cities Needing Seeding (< {MIN_LISTINGS_THRESHOLD} listings)\n")
    if cities_needing_seed:
        lines.append("Run `python agents/city_launcher.py --city \"CITY\" --lang LANG` for each:\n")
        # Group by state
        by_state: dict[str, list] = {}
        for c in cities_needing_seed:
            state = c["state"]
            by_state.setdefault(state, []).append(c)
        for state, state_cities in sorted(by_state.items()):
            lines.append(f"\n**{state}** ({len(state_cities)} cities)")
            for c in sorted(state_cities, key=lambda x: x["name"]):
                lines.append(f"- {c['name']} — {c['listing_count']} listings")
    else:
        lines.append("All cities have sufficient seed listings.")

    lines.append("\n---\n")
    lines.append("## Per-City Category Breakdown (Top 15 Cities)\n")
    for c in sorted_cities[:15]:
        if not c["category_breakdown"]:
            continue
        lines.append(f"\n### {c['name']} ({c['listing_count']} total)")
        breakdown = sorted(c["category_breakdown"].items(), key=lambda x: x[1], reverse=True)
        for cat, count in breakdown:
            bar = "#" * count
            lines.append(f"  {cat:<15} {count:3d} {bar}")

    return "\n".join(lines)


async def run(city_filter: str | None = None) -> None:
    print("\n[GrowthTracker] Fetching data from live API...")
    print("-" * 50)

    async with httpx.AsyncClient() as client:
        all_cities = await fetch_all_cities(client)

    if city_filter:
        target = [c for c in all_cities if city_filter.lower() in c["name"].lower()]
        if not target:
            print(f"[WARN] City '{city_filter}' not found. Showing all {len(all_cities)} cities.")
        else:
            all_cities = target

    print(f">> Checking {len(all_cities)} cities...")
    data = await collect_data(all_cities)

    report = build_report(data)
    out = save_output("growth_report", "growth", report, "md")
    print(f"\n[OK] Report saved: {out}")

    # Also save raw JSON
    out_json = save_output("growth_data", "growth", json.dumps(data, ensure_ascii=False, indent=2), "json")
    print(f"[OK] Raw data saved: {out_json}")

    total = sum(c["listing_count"] for c in data["cities"])
    with_listings = len([c for c in data["cities"] if c["listing_count"] > 0])
    print(f"\n-- Summary --")
    print(f"Total listings: {total}")
    print(f"Cities active: {with_listings}/{len(data['cities'])}")


def main():
    parser = argparse.ArgumentParser(description="GrowthTracker — generate city growth report")
    parser.add_argument("--city", default="", help="Filter to a specific city (optional)")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    asyncio.run(run(args.city or None))


if __name__ == "__main__":
    main()
