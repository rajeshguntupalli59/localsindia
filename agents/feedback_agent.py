#!/usr/bin/env python3
"""
FeedbackAgent — Generates community management response templates for LocalIndia.

Usage:
  python agents/feedback_agent.py --city "Vijayawada" --lang "te"
  python agents/feedback_agent.py  # generates product-level templates only

Output (agents/output/{city_slug}/):
  feedback_templates_{date}.md  — response templates for:
    - WhatsApp group messages
    - "Why is my listing not showing?" complaints
    - Spam/abuse reports
    - Feature requests
    - Positive feedback (how to amplify)
    - Negative reviews (how to respond)
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

SYSTEM_PROMPT = build_system_prompt("feedback_agent")


def build_user_prompt(city: str, state: str, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    city_context = f"City: {city}, {state}. Regional language: {lang_name}." if city else "Generic template (no specific city)."
    return f"""{city_context}

Generate response templates for 8 common community situations.

Return this exact JSON:
{{
  "templates": [
    {{
      "situation": "listing_not_showing",
      "trigger": "User asks: 'I posted my listing but it's not showing on the site'",
      "english_response": "...",
      "regional_response": "...",
      "follow_up_action": "check admin panel for pending approval"
    }},
    {{
      "situation": "how_to_contact_seller",
      "trigger": "User asks: 'How do I contact the person who posted this?'",
      "english_response": "...",
      "regional_response": "...",
      "follow_up_action": "point to WhatsApp button on listing"
    }},
    {{
      "situation": "spam_listing_report",
      "trigger": "User reports: 'This listing looks fake/spam'",
      "english_response": "...",
      "regional_response": "...",
      "follow_up_action": "escalate to admin for review"
    }},
    {{
      "situation": "listing_expired",
      "trigger": "User says: 'My listing disappeared / got removed'",
      "english_response": "...",
      "regional_response": "...",
      "follow_up_action": "check expiry date, offer to repost"
    }},
    {{
      "situation": "feature_request",
      "trigger": "User suggests a new feature or improvement",
      "english_response": "...",
      "regional_response": "...",
      "follow_up_action": "log in feature tracker, follow up if implemented"
    }},
    {{
      "situation": "positive_feedback",
      "trigger": "User says the site helped them find something",
      "english_response": "...",
      "regional_response": "...",
      "follow_up_action": "ask if they'd share in their WhatsApp groups"
    }},
    {{
      "situation": "whatsapp_number_privacy",
      "trigger": "User is worried about sharing their phone number",
      "english_response": "...",
      "regional_response": "...",
      "follow_up_action": "explain WhatsApp link opens from their device"
    }},
    {{
      "situation": "how_to_post",
      "trigger": "User asks how to post a listing",
      "english_response": "...",
      "regional_response": "...",
      "follow_up_action": "send step-by-step guide link"
    }}
  ]
}}"""


def format_output(city: str, data: dict, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    city_label = city if city else "All Cities"
    lines = [
        f"# Community Response Templates — {city_label}",
        f"*Language: {lang_name} | Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}*\n",
        "Copy these templates and customize [PLACEHOLDERS] before sending.\n",
        "---\n"
    ]

    for tmpl in data.get("templates", []):
        situation = tmpl.get("situation", "").replace("_", " ").title()
        trigger = tmpl.get("trigger", "")
        lines.append(f"## {situation}")
        lines.append(f"*When:* {trigger}\n")
        lines.append("**English:**")
        lines.append(f"> {tmpl.get('english_response', '')}\n")
        lines.append(f"**{lang_name}:**")
        lines.append(f"> {tmpl.get('regional_response', '')}\n")
        action = tmpl.get("follow_up_action", "")
        if action:
            lines.append(f"*Action required: {action}*")
        lines.append("\n---\n")

    return "\n".join(lines)


def run(city: str, state: str, lang: str) -> None:
    city_slug = city.lower().replace(" ", "-") if city else "product"
    lang_name = LANG_NAMES.get(lang, lang)
    print(f"\n[FeedbackAgent] {city or 'Product-level'} ({lang_name})")
    print("-" * 50)

    print(">> Generating response templates with Claude...")
    raw = generate(SYSTEM_PROMPT, build_user_prompt(city, state, lang))

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

    content = format_output(city, data, lang)
    out = save_output("feedback_templates", city_slug, content, "md")
    print(f"[OK] Saved: {out}")
    templates = data.get("templates", [])
    print(f"     {len(templates)} response templates generated")


def main():
    parser = argparse.ArgumentParser(description="FeedbackAgent — generate community response templates")
    parser.add_argument("--city", default="", help="City name (optional — omit for generic templates)")
    parser.add_argument("--state", default="Andhra Pradesh")
    parser.add_argument("--lang", default="en", help="Language code for regional responses")
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    run(args.city, args.state, args.lang)


if __name__ == "__main__":
    main()
