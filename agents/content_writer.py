#!/usr/bin/env python3
"""
ContentWriter — Generates SEO blog content for LocalIndia city pages.

Usage:
  python agents/content_writer.py --city "Vijayawada" --lang "te" --type intro
  python agents/content_writer.py --city "Vijayawada" --lang "te" --type guide
  python agents/content_writer.py --city "Vijayawada" --lang "te" --type faq
  python agents/content_writer.py --city "Vijayawada" --lang "te" --type all

Types:
  intro  — 200-word city landing page intro paragraph
  guide  — 600-word "Top local services in {city}" article
  faq    — 6 Q&As for the city page (schema-ready)
  all    — generate all three
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

BASE_SYSTEM = build_system_prompt("content_writer")


def generate_intro(city: str, state: str, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    prompt = f"""Write a 200-word city landing page intro for {city}, {state}.

This intro appears at the top of the {city} page on LocalIndia.

Requirements:
- Mention 3-4 real neighborhoods in {city}
- Name 3-4 popular listing types locals actually search for (tiffin, PG, auto repair, etc.)
- Warm, community-first tone
- End with a soft CTA: "Post your listing free — it takes 2 minutes"
- DO NOT use subheadings — this is a flowing paragraph
- 180-220 words

Language: English (this is the main intro paragraph)"""
    return generate(BASE_SYSTEM, prompt, max_tokens=800)


def generate_guide(city: str, state: str, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    prompt = f"""Write a 600-word SEO article: "Find Everything You Need in {city} — For Free"

Structure:
## Find Everything You Need in {city} — For Free

Short intro (2-3 sentences about hyperlocal discovery in {city})

### Tiffin & Home-Cooked Food in {city}
2 paragraphs about finding home-cooked food locally. Mention real areas.

### PG Rooms & Flatmates in {city}
2 paragraphs about PG accommodation search. Common areas students/professionals look.

### Part-Time Jobs & Freelance Work in {city}
2 paragraphs about local job listings. What kinds are most common.

### Buy & Sell Near You in {city}
2 paragraphs about secondhand goods — electronics, furniture, vehicles.

### How to Post for Free on LocalIndia
Short practical paragraph: create account → fill details → WhatsApp contact added → live in minutes.

Closing sentence that mentions localsindia.com.

Requirements:
- Each section: 80-100 words
- 2-3 real {city} neighborhood names throughout
- Natural keyword use: "{city.lower()} classifieds", "free listings in {city.lower()}", "{city.lower()} tiffin service"
- Conversational Indian English"""
    return generate(BASE_SYSTEM, prompt, max_tokens=1500)


def generate_faq(city: str, state: str, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    prompt = f"""Generate a FAQ section for the {city} page on LocalIndia.

Return valid JSON only — no markdown, no explanation:

{{
  "faqs": [
    {{
      "question": "...",
      "answer": "...",
      "category": "general|posting|search|contact"
    }}
  ]
}}

Requirements:
- 6 questions total
- Questions must be real things people actually ask (how to post, is it free, how to contact seller, is it safe, etc.)
- Answers: 2-3 sentences each. Conversational, helpful, mention {city} specifically.
- Include 1 question in local context (e.g., "Can I find tiffin services near {city} Railway Station?")
- Schema.org FAQPage ready: questions and answers as strings"""
    raw = generate(BASE_SYSTEM, prompt, max_tokens=1200)

    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw)
        faqs = data.get("faqs", [])
        lines = [f"## Frequently Asked Questions — {city}\n"]
        for faq in faqs:
            lines.append(f"### {faq['question']}\n")
            lines.append(f"{faq['answer']}\n")
        return "\n".join(lines)
    except Exception:
        return raw  # fallback: return raw text


def run(city: str, state: str, lang: str, content_type: str) -> None:
    city_slug = city.lower().replace(" ", "-")
    lang_name = LANG_NAMES.get(lang, lang)
    print(f"\n[ContentWriter] {city}, {state} ({lang_name}) — type: {content_type}")
    print("-" * 50)

    types_to_run = ["intro", "guide", "faq"] if content_type == "all" else [content_type]

    for t in types_to_run:
        print(f">> Generating {t}...")
        if t == "intro":
            content = generate_intro(city, state, lang)
            suffix = "intro"
        elif t == "guide":
            content = generate_guide(city, state, lang)
            suffix = "guide"
        elif t == "faq":
            content = generate_faq(city, state, lang)
            suffix = "faq"
        else:
            print(f"[WARN] Unknown type: {t} — skipping")
            continue

        out = save_output(f"content_{suffix}", city_slug, content, "md")
        print(f"[OK] Saved: {out}")
        words = len(content.split())
        print(f"     {words} words")


def main():
    parser = argparse.ArgumentParser(description="ContentWriter — generate city landing page content")
    parser.add_argument("--city", required=True)
    parser.add_argument("--state", default="Andhra Pradesh")
    parser.add_argument("--lang", required=True)
    parser.add_argument("--type", default="all", choices=["intro", "guide", "faq", "all"])
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    run(args.city, args.state, args.lang, args.type)


if __name__ == "__main__":
    main()
