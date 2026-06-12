"""
social_publisher.py — Generate social media posts for a city launch.
Run after city_launcher.py to create ready-to-post content.

Usage:
  python agents/social_publisher.py --city "Hyderabad" --lang "te" --state "Telangana"
  python agents/social_publisher.py --city "Chennai" --lang "ta" --state "Tamil Nadu"
"""

import argparse
import asyncio
import sys
import os
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── Add parent to path ──────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
from base_agent import BaseAgent


class SocialPublisher(BaseAgent):
    """Generates a full social media launch kit for a city."""

    def __init__(self):
        super().__init__("social_publisher")

    async def generate_kit(self, city: str, lang: str, state: str, city_slug: str) -> dict:
        prompt = f"""You are creating a social media launch kit for LocalsIndia in {city}, {state}.

LocalsIndia is India's free WhatsApp-first classifieds platform (like JustDial but free, no spam calls).

Generate ALL of the following in one response:

---
## TWITTER_THREAD
(3 tweets, each under 280 characters, tweet 1 is hook)

## REDDIT_POST
Title: (under 100 chars, for r/india and r/{city.lower().replace(' ', '')} subreddits)
Body: (authentic, not spammy, 200-300 words, includes call to action with URL)

## WHATSAPP_GROUP
(One message for dropping in local WhatsApp groups — friendly, in {('Telugu' if lang == 'te' else 'Tamil' if lang == 'ta' else 'Kannada' if lang == 'kn' else 'Hindi' if lang == 'hi' else 'English')}, max 100 words)

## WHATSAPP_PERSONAL
(Personal message to forward to contacts, max 80 words)

## LINKEDIN_POST
(Professional tone, 150-200 words, for a founder sharing their launch)
---

City URL: https://www.localsindia.com/{city_slug}
Key USPs: free forever, no spam calls, WhatsApp-only contact, 8 Indian languages
Competitors beaten: JustDial (charges Rs.5k-50k/yr, sells numbers), OLX (shut down)

Be authentic, conversational. No hashtag spam (max 3 hashtags per post).
"""
        return await self.generate(prompt, city=city)

    async def run(self, city: str, lang: str = "te", state: str = "Andhra Pradesh"):
        city_slug = city.lower().replace(" ", "-")
        print(f"\n[SocialPublisher] Generating launch kit for {city}...")

        result = await self.generate_kit(city, lang, state, city_slug)
        content = result.get("content", "")

        # Save output
        output_dir = Path(f"agents/output/{city_slug}")
        output_dir.mkdir(parents=True, exist_ok=True)

        date_str = datetime.now().strftime("%Y-%m-%d")
        output_path = output_dir / f"social_launch_{date_str}.md"

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"# Social Launch Kit — {city}\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
            f.write(f"City URL: https://www.localsindia.com/{city_slug}\n\n")
            f.write("---\n\n")
            f.write(content)

        print(f"[SocialPublisher] Saved to {output_path}")
        print(f"\n{'='*60}")
        print(f"LAUNCH KIT FOR {city.upper()}")
        print(f"{'='*60}")
        print(content[:2000])
        if len(content) > 2000:
            print(f"\n... (see {output_path} for full content)")

        return output_path


async def main():
    parser = argparse.ArgumentParser(description="Generate social media launch kit for a city")
    parser.add_argument("--city",  required=True, help="City name (e.g. Hyderabad)")
    parser.add_argument("--state", default="Andhra Pradesh", help="State name")
    parser.add_argument("--lang",  default="te", help="Language code (te/hi/ta/kn/ml/mr)")
    args = parser.parse_args()

    publisher = SocialPublisher()
    await publisher.run(city=args.city, lang=args.lang, state=args.state)


if __name__ == "__main__":
    asyncio.run(main())
