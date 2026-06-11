#!/usr/bin/env python3
"""
run_all.py — Orchestrates all marketing agents for a city.

Usage:
  python agents/run_all.py --city "Vijayawada" --lang "te"
  python agents/run_all.py --city "Mumbai" --lang "mr" --skip seo,reddit
  python agents/run_all.py --city "Chennai" --lang "ta" --only whatsapp,content

Agents run (in order):
  1. seo_agent      — SEO metadata + JSON-LD
  2. content_writer — Blog intro + guide + FAQ
  3. whatsapp_agent — WA forward messages
  4. reddit_agent   — Reddit post drafts
  5. cro_agent      — CRO recommendations (product-level, run once)
  6. feedback_agent — Community response templates

NOT run here:
  - city_launcher  — one-time seed operation, run separately
  - growth_tracker — run separately to check all cities

Output: all files saved to agents/output/{city_slug}/
        index file: agents/output/{city_slug}/index.md
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from base_agent import save_output

LANG_NAMES = {
    "te": "Telugu", "hi": "Hindi", "ta": "Tamil", "kn": "Kannada",
    "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati", "pa": "Punjabi",
    "ml": "Malayalam", "or": "Odia", "en": "English",
}

AGENTS = ["seo", "content", "whatsapp", "reddit", "cro", "feedback"]

STATE_MAP = {
    "vijayawada": "Andhra Pradesh",
    "visakhapatnam": "Andhra Pradesh",
    "vizag": "Andhra Pradesh",
    "tirupati": "Andhra Pradesh",
    "guntur": "Andhra Pradesh",
    "nellore": "Andhra Pradesh",
    "kurnool": "Andhra Pradesh",
    "kakinada": "Andhra Pradesh",
    "rajamahendravaram": "Andhra Pradesh",
    "rajahmundry": "Andhra Pradesh",
    "anantapuram": "Andhra Pradesh",
    "ongole": "Andhra Pradesh",
    "hyderabad": "Telangana",
    "warangal": "Telangana",
    "nizamabad": "Telangana",
    "khammam": "Telangana",
    "bangalore": "Karnataka",
    "mysore": "Karnataka",
    "chennai": "Tamil Nadu",
    "coimbatore": "Tamil Nadu",
    "mumbai": "Maharashtra",
    "pune": "Maharashtra",
    "delhi": "Delhi",
    "kolkata": "West Bengal",
    "ahmedabad": "Gujarat",
    "surat": "Gujarat",
}


def run_agent(agent_name: str, city: str, state: str, lang: str) -> bool:
    """Runs a single agent. Returns True on success."""
    try:
        if agent_name == "seo":
            from seo_agent import run as seo_run
            seo_run(city, state, lang)

        elif agent_name == "content":
            from content_writer import run as content_run
            content_run(city, state, lang, "all")

        elif agent_name == "whatsapp":
            from whatsapp_agent import run as wa_run
            wa_run(city, state, lang)

        elif agent_name == "reddit":
            from reddit_agent import run as reddit_run
            reddit_run(city, state, lang, [])

        elif agent_name == "cro":
            cro_path = Path(__file__).parent / "output" / "product" / "cro_recommendations.md"
            if cro_path.exists():
                print(f"[CROAgent] Already exists at {cro_path} — skipping")
                return True
            from cro_agent import run as cro_run
            cro_run("all")

        elif agent_name == "feedback":
            from feedback_agent import run as feedback_run
            feedback_run(city, state, lang)

        return True

    except SystemExit as e:
        print(f"[FAIL] {agent_name} exited with code {e.code}")
        return False
    except Exception as e:
        print(f"[FAIL] {agent_name} error: {e}")
        return False


def build_index(city: str, city_slug: str, results: dict[str, bool]) -> str:
    lines = [
        f"# Marketing Content Index — {city}",
        f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n",
        "## Agents Run\n",
        "| Agent | Status | Output |",
        "|-------|--------|--------|",
    ]
    for agent, success in results.items():
        status = "[OK]" if success else "[FAIL]"
        output = f"agents/output/{city_slug}/" if success else "—"
        lines.append(f"| {agent} | {status} | {output} |")

    lines.append("\n## Next Steps\n")
    lines.append("1. Review Reddit posts in `reddit_posts_*.md` — customize before posting")
    lines.append("2. Pick best WhatsApp messages from `whatsapp_messages_*.md`")
    lines.append("3. Apply SEO metadata from `seo_agent_*.html` to the frontend city page")
    lines.append("4. Upload content guide to blog (if blog exists)")
    lines.append("5. Run `python agents/growth_tracker.py` weekly to track progress")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="run_all — run all marketing agents for a city")
    parser.add_argument("--city", required=True)
    parser.add_argument("--lang", required=True)
    parser.add_argument("--state", default="", help="State (auto-detected from city if omitted)")
    parser.add_argument("--skip", default="", help="Comma-separated agents to skip")
    parser.add_argument("--only", default="", help="Comma-separated agents to run (overrides skip)")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    city = args.city
    lang = args.lang
    lang_name = LANG_NAMES.get(lang, lang)
    city_slug = city.lower().replace(" ", "-")
    state = args.state or STATE_MAP.get(city_slug, "India")

    # Determine which agents to run
    if args.only:
        agents_to_run = [a.strip() for a in args.only.split(",") if a.strip() in AGENTS]
    elif args.skip:
        skip_set = {a.strip() for a in args.skip.split(",")}
        agents_to_run = [a for a in AGENTS if a not in skip_set]
    else:
        agents_to_run = AGENTS

    print(f"\n[run_all] {city}, {state} ({lang_name})")
    print(f"Agents: {', '.join(agents_to_run)}")
    print("=" * 60)

    results: dict[str, bool] = {}
    for agent in agents_to_run:
        success = run_agent(agent, city, state, lang)
        results[agent] = success

    # Save index
    index = build_index(city, city_slug, results)
    out = save_output("index", city_slug, index, "md")

    print("\n" + "=" * 60)
    print(f"[run_all] Complete")
    passed = sum(1 for v in results.values() if v)
    print(f"  {passed}/{len(results)} agents succeeded")
    print(f"  Index: {out}")

    if passed < len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
