#!/usr/bin/env python3
"""
CROAgent — Generates conversion rate optimization recommendations for LocalIndia.

Usage:
  python agents/cro_agent.py
  python agents/cro_agent.py --focus homepage
  python agents/cro_agent.py --focus listing_detail
  python agents/cro_agent.py --focus post_flow

Focus areas:
  homepage       — City selector, hero, CTAs
  listing_detail — WhatsApp button, image gallery, contact flow
  post_flow      — 3-step posting wizard, form friction
  search         — Filters, empty states, results page
  all            — All four areas (default)

Output: agents/output/product/cro_recommendations_{date}.md
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from base_agent import generate, save_output, build_system_prompt

SYSTEM_PROMPT = build_system_prompt("cro_agent")

FOCUS_PROMPTS = {
    "homepage": """Analyze and generate CRO recommendations for the LocalIndia homepage (city selector + city landing page).

Routes: / (city selector), /{city} (city home page)

Analyze:
1. City selector UX — how do users pick their city? What friction exists?
2. City landing page hero — is the value prop clear in 3 seconds?
3. Category chips — are they scannable on mobile?
4. CTA to post a listing — is it prominent enough?
5. Trust signals — does a new user trust the site?

Generate 5-7 specific recommendations with copy variants.""",

    "listing_detail": """Analyze and generate CRO recommendations for the listing detail page.

Route: /{city}/classifieds/{id}

Analyze:
1. WhatsApp button placement and copy — is it above the fold on mobile?
2. Image gallery — does it load fast enough? Is it swipeable?
3. Price display — clear enough?
4. Seller trust signals — what makes a user feel safe contacting?
5. Report/share options — friction vs safety balance
6. Related listings — keeping users engaged

Generate 5-7 specific recommendations with copy variants.""",

    "post_flow": """Analyze and generate CRO recommendations for the 3-step listing post flow.

Route: /{city}/classifieds/post

Analyze:
1. Step 1 (Details) — category selection, title, description friction
2. Step 2 (Photos) — is photo upload a drop-off point? Why?
3. Step 3 (Contact) — phone number entry trust issues
4. Progress bar — does it motivate completion?
5. Error states — are they helpful or frustrating?
6. Success screen — does it drive next action?

Generate 5-7 specific recommendations with copy variants.""",

    "search": """Analyze and generate CRO recommendations for the search/browse page.

Route: /{city}/search?q=...&category=...

Analyze:
1. Filter UI — bottom sheet vs sidebar, which converts better on mobile?
2. Empty state — what drives re-engagement vs bounce?
3. Results grid — card design, info hierarchy, WhatsApp button placement
4. No-results experience — suggested alternatives, related categories
5. Search-to-contact funnel — how many taps from search to WhatsApp?

Generate 5-7 specific recommendations with copy variants.""",
}


def run(focus: str) -> None:
    print(f"\n[CROAgent] Focus: {focus}")
    print("-" * 50)

    city_slug = "product"
    focuses = list(FOCUS_PROMPTS.keys()) if focus == "all" else [focus]

    all_content = [f"# CRO Recommendations — LocalIndia\n",
                   f"*Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}*\n",
                   "## Priority Matrix\n",
                   "Quick wins (low effort, high impact) are listed first in each section.\n",
                   "---\n"]

    for f in focuses:
        print(f">> Analyzing {f}...")
        content = generate(SYSTEM_PROMPT, FOCUS_PROMPTS[f], max_tokens=2000)
        all_content.append(f"# {f.replace('_', ' ').title()}\n")
        all_content.append(content)
        all_content.append("\n---\n")

    full_content = "\n".join(all_content)
    out = save_output("cro_recommendations", city_slug, full_content, "md")
    print(f"\n[OK] Saved: {out}")
    lines = full_content.count("\n")
    print(f"     {lines} lines of recommendations")


def main():
    parser = argparse.ArgumentParser(description="CROAgent — generate conversion optimization recommendations")
    parser.add_argument("--focus", default="all",
                        choices=["homepage", "listing_detail", "post_flow", "search", "all"])
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    run(args.focus)


if __name__ == "__main__":
    main()
