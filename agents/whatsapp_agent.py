#!/usr/bin/env python3
"""
WhatsAppAgent — Generates WhatsApp forward messages for LocalIndia city launches.

Usage:
  python agents/whatsapp_agent.py --city "Vijayawada" --lang "te"
  python agents/whatsapp_agent.py --city "Mumbai" --lang "mr"

Output (agents/output/{city_slug}/):
  whatsapp_{date}.md  — 5 message variants (English + regional)

Message types generated:
  1. Helpful tip (not promotional) — "Did you know..."
  2. Community launch announcement — founder voice
  3. Tiffin finder angle — specific use case
  4. PG/roommate angle — specific use case
  5. Jobs/freelance angle — specific use case
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

SYSTEM_PROMPT = build_system_prompt("whatsapp_agent")


def build_user_prompt(city: str, state: str, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, lang)
    return f"""Generate 5 WhatsApp forward messages for {city}, {state}.
Regional language: {lang_name} (script: {lang})

Return this exact JSON:
{{
  "messages": [
    {{
      "type": "helpful_tip",
      "english": "...",
      "regional": "... in {lang_name} Unicode script ...",
      "target_group": "general neighborhood group"
    }},
    {{
      "type": "launch_announcement",
      "english": "...",
      "regional": "...",
      "target_group": "city residents"
    }},
    {{
      "type": "tiffin_finder",
      "english": "...",
      "regional": "...",
      "target_group": "students and working professionals"
    }},
    {{
      "type": "pg_roommate",
      "english": "...",
      "regional": "...",
      "target_group": "students and job seekers"
    }},
    {{
      "type": "jobs_freelance",
      "english": "...",
      "regional": "...",
      "target_group": "working age adults"
    }}
  ]
}}

Requirements:
- Each message: 200-280 characters including URL
- URL: localsindia.com/{city.lower().replace(' ', '-')}
- Mention a real neighborhood or landmark in {city} to make it feel local
- helpful_tip type: starts with "Did you know..." or "If you're in {city}..."
- launch_announcement: mentions the free posting angle
- Do NOT use words: "platform", "app", "innovative", "seamless"
- Regional language: proper {lang_name} Unicode script"""


def format_output(city: str, data: dict) -> str:
    lines = [f"# WhatsApp Messages — {city}\n", f"Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}\n"]

    for msg in data.get("messages", []):
        msg_type = msg.get("type", "").replace("_", " ").title()
        target = msg.get("target_group", "")
        lines.append(f"## {msg_type}")
        lines.append(f"*Target group: {target}*\n")
        lines.append("**English:**")
        lines.append(f"> {msg.get('english', '')}\n")
        lines.append("**Regional:**")
        lines.append(f"> {msg.get('regional', '')}\n")
        lines.append("---\n")

    return "\n".join(lines)


def run(city: str, state: str, lang: str) -> None:
    city_slug = city.lower().replace(" ", "-")
    lang_name = LANG_NAMES.get(lang, lang)
    print(f"\n[WhatsAppAgent] {city}, {state} ({lang_name})")
    print("-" * 50)

    print(">> Generating WhatsApp messages with Claude...")
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

    content = format_output(city, data)
    out = save_output("whatsapp_messages", city_slug, content, "md")
    print(f"[OK] Saved: {out}")

    msgs = data.get("messages", [])
    print(f"\n-- Preview ({len(msgs)} messages) --")
    for msg in msgs:
        print(f"[{msg.get('type', '')}] {msg.get('english', '')[:100]}...")


def main():
    parser = argparse.ArgumentParser(description="WhatsAppAgent — generate WA forward messages")
    parser.add_argument("--city", required=True)
    parser.add_argument("--state", default="Andhra Pradesh")
    parser.add_argument("--lang", required=True)
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
