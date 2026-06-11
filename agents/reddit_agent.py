#!/usr/bin/env python3
"""
RedditAgent — Generates honest founder-voice Reddit posts for LocalIndia city launches.

Usage:
  python agents/reddit_agent.py --city "Vijayawada" --lang "te"
  python agents/reddit_agent.py --city "Mumbai" --lang "mr" --subreddits "india,mumbai"

Output (agents/output/{city_slug}/):
  reddit_posts_{date}.md  — posts for r/india + city-specific subreddits

Reddit strategy:
- r/india: general product launch (300-400 words, honest, no hype)
- r/{city}: city-specific post (200-250 words, hyperlocal angle)
- r/hyderabad / r/bangalore etc: only if relevant
- Never spam — one post per subreddit, spaced days apart
- Founder voice: honest limitations included, open question for feedback
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from base_agent import generate, save_output, build_system_prompt

LANG_NAMES = {
    "te": "Telugu", "hi": "Hindi", "ta": "Tamil", "kn": "Kannada",
    "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati", "pa": "Punjabi",
    "ml": "Malayalam", "or": "Odia", "en": "English",
}

# City → relevant subreddits mapping
CITY_SUBREDDITS = {
    "hyderabad": ["hyderabad", "telangana"],
    "bangalore": ["bangalore", "karnataka"],
    "chennai": ["chennai", "tamil"],
    "mumbai": ["mumbai", "maharashtra"],
    "delhi": ["delhi", "india"],
    "kolkata": ["kolkata", "westbengal"],
    "pune": ["pune", "maharashtra"],
    "ahmedabad": ["ahmedabad", "gujarat"],
    "vijayawada": ["andhrapradesh"],
    "visakhapatnam": ["andhrapradesh", "vizag"],
    "tirupati": ["andhrapradesh"],
    "guntur": ["andhrapradesh"],
}

SYSTEM_PROMPT = build_system_prompt("reddit_agent")


def build_user_prompt(city: str, state: str, lang: str, subreddits: list) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    sub_list = ", ".join([f"r/{s}" for s in subreddits])
    return f"""Generate Reddit posts for a LocalIndia city launch in {city}, {state}.
Target subreddits: {sub_list}

Return this exact JSON:
{{
  "posts": [
    {{
      "subreddit": "india",
      "title": "...",
      "body": "...",
      "post_timing": "Tuesday or Wednesday, 7-9am IST",
      "flair": "Discussion",
      "notes": "why this angle works for r/india"
    }},
    {{
      "subreddit": "{subreddits[-1] if subreddits else city.lower()}",
      "title": "...",
      "body": "...",
      "post_timing": "Thursday or Friday, 8-10pm IST",
      "flair": "Local",
      "notes": "hyperlocal angle for this subreddit"
    }}
  ]
}}

Requirements for r/india post:
- 300-400 words
- Relatable problem: "Every time I needed [X] in [city], I had to [Y]..."
- What you built: honest description, 1 paragraph
- Honest limitations: "It's early, the listings are thin right now..."
- Open question: ask about their experience with local discovery, NOT "would you use this?"

Requirements for city subreddit post:
- 200-250 words
- Start with a specific {city} reference (a real neighborhood, local problem, landmark)
- More casual tone — like talking to neighbors
- Mention localsindia.com/{city.lower().replace(' ', '-')}
- Question: ask for suggestions of local businesses/services to add

Both posts: no markdown bold/italic in the Reddit body — plain text only."""


def format_output(city: str, data: dict) -> str:
    lines = [f"# Reddit Posts — {city}\n"]
    lines.append(f"*Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}*\n")
    lines.append("**Posting schedule:** Space these at least 3 days apart. Never cross-post the same text.\n")
    lines.append("---\n")

    for post in data.get("posts", []):
        sub = post.get("subreddit", "")
        lines.append(f"## r/{sub}\n")
        lines.append(f"**Timing:** {post.get('post_timing', '')}")
        lines.append(f"**Flair:** {post.get('flair', '')}")
        lines.append(f"**Notes:** {post.get('notes', '')}\n")
        lines.append(f"**Title:**")
        lines.append(f"> {post.get('title', '')}\n")
        lines.append(f"**Body:**")
        for line in post.get("body", "").split("\n"):
            lines.append(f"> {line}")
        lines.append("\n---\n")

    return "\n".join(lines)


def run(city: str, state: str, lang: str, subreddits: list) -> None:
    city_slug = city.lower().replace(" ", "-")
    lang_name = LANG_NAMES.get(lang, lang)

    # Auto-detect city subreddits
    city_subs = CITY_SUBREDDITS.get(city_slug, [city_slug.replace("-", "")])
    all_subs = list(dict.fromkeys(["india"] + subreddits + city_subs))  # deduplicate, india first

    print(f"\n[RedditAgent] {city}, {state} ({lang_name})")
    print(f"   Subreddits: {', '.join(['r/' + s for s in all_subs])}")
    print("-" * 50)

    print(">> Generating Reddit posts with Claude...")
    raw = generate(SYSTEM_PROMPT, build_user_prompt(city, state, lang, all_subs))

    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[FAIL] JSON parse error: {e}")
        print(f"Raw: {raw[:200]}")
        sys.exit(1)

    content = format_output(city, data)
    out = save_output("reddit_posts", city_slug, content, "md")
    print(f"[OK] Saved: {out}")

    posts = data.get("posts", [])
    print(f"\n-- Preview ({len(posts)} posts) --")
    for post in posts:
        print(f"r/{post.get('subreddit', '')}: {post.get('title', '')}")


def main():
    parser = argparse.ArgumentParser(description="RedditAgent — generate city Reddit launch posts")
    parser.add_argument("--city", required=True)
    parser.add_argument("--state", default="Andhra Pradesh")
    parser.add_argument("--lang", required=True)
    parser.add_argument("--subreddits", default="", help="Additional subreddits (comma-separated, no r/)")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    extra_subs = [s.strip() for s in args.subreddits.split(",") if s.strip()]
    run(args.city, args.state, args.lang, extra_subs)


if __name__ == "__main__":
    main()
