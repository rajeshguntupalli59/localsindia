# LocalIndia — AI Marketing Agent System
> Fully autonomous. Zero marketing team. Agent-driven growth.
> Status: PLANNED — build after MSG91 OTP is live

---

## WHEN TO START
- MSG91 AUTH_KEY + TEMPLATE_ID set on Azure ✅
- OTP_DEBUG=false on Azure ✅
- At least 1 city page live with real listings ✅
- Then: run CityLauncher first, FeedbackAgent second

---

## HOW AGENTS USE SKILLS

Each agent reads a skill file from `.claude/skills/` before running.
Skills are markdown files that define the framework/approach for that task.
Claude reads the skill + the system prompt + live data → produces output.

```
agents/
  base_agent.py              ← shared runner (Anthropic SDK)
  city_launcher.py           ← Agent 1
  content_writer.py          ← Agent 2
  seo_agent.py               ← Agent 3
  reddit_agent.py            ← Agent 4
  whatsapp_agent.py          ← Agent 5
  cro_agent.py               ← Agent 6
  feedback_agent.py          ← Agent 7
  growth_tracker.py          ← Agent 8
  approval.py                ← Telegram approval queue
  output/                    ← agent outputs saved here by date
    {city}/
      launch_kit.md
    daily/
      {date}.md

.agents/
  product-marketing-context.md   ← read by ALL agents before running

.claude/skills/
  copywriting/SKILL.md
  content-strategy/SKILL.md
  seo-audit/SKILL.md
  community-marketing/SKILL.md
  cro/SKILL.md
  onboarding/SKILL.md
  analytics/SKILL.md
  marketing-plan/SKILL.md
  launch/SKILL.md
  customer-research/SKILL.md
```

---

## BASE AGENT RUNNER

```python
# agents/base_agent.py
import anthropic, os
from datetime import datetime
from pathlib import Path

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

def run_agent(agent_name: str, system_prompt: str, user_message: str, max_tokens=2000) -> str:
    print(f"[{datetime.now()}] Running {agent_name}...")
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )
    output = response.content[0].text
    save_output(agent_name, output)
    return output

def save_output(agent_name: str, content: str):
    date = datetime.now().strftime("%Y-%m-%d")
    path = Path(f"agents/output/{agent_name}/{date}.md")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"  Saved → {path}")
```

---

## PRODUCT MARKETING CONTEXT
> File: `.agents/product-marketing-context.md` — read by ALL agents

```markdown
# LocalIndia Product Marketing Context

## What we are
India's hyperlocal community platform — city-wise classifieds, events, services,
and business discovery in all Indian regional languages.
Think Craigslist + Nextdoor but built natively for India.

## Live URL
https://www.localsindia.com

## Who we serve
Indian urban and semi-urban residents in 700+ cities.
Primary: students (PG/roommate), homemakers (tiffin, domestic help),
young professionals (carpool, events), small business owners.

## Voice and tone
Warm. Community-first. Like a helpful neighbor, not a tech company.
Language: Conversational Indian English + regional languages.
Never use: "platform", "ecosystem", "seamless", "solution", "leverage".

## Current stage
Pre-revenue. Building user base. Free listings only.
Success metric: active listings per city per week.

## Key differentiators
- All 11 major Indian languages (Unicode script — not transliteration)
- WhatsApp contact button on every listing
- City-wise hyperlocal feel (not national like OLX/Quikr)
- India-specific categories: tiffin, carpool, cricket clubs, temple events
- Phone OTP + Google login (no password required)

## Channels that work for India
1. WhatsApp forwards (organic, regional language)
2. Reddit India communities (r/india, city subreddits)
3. Google SEO (city + category landing pages)
4. Instagram (Reels showing local discovery)

## What not to do
- No paid ads until post-traction
- No English-only content in regional cities
- No generic national campaigns — always city-specific
- Never promise features not yet built
```

---

## AGENT 1 — CityLauncher
**Skills used:** `copywriting` + `launch` + `content-strategy`
**Run:** `python agents/city_launcher.py --city "Vijayawada" --state "Andhra Pradesh" --lang "te"`
**Output:** `agents/output/{city}/launch_kit.md` + optional `--seed` to POST listings to live backend

### What it generates
- 20 seed listings (JSON) — realistic local listings (tiffin, PG, tuition, carpool, second-hand)
- WhatsApp broadcast message in Telugu/regional language (under 280 chars)
- 3 Instagram captions with hashtags
- Hero copy for city landing page (English + regional language)
- 10 seed businesses (JSON)

### Skill: copywriting
Principle: Simple over complex. Specific over vague. Active over passive.
Write for one person. Make it feel personal.

### Skill: launch
Framework: Make city look active before real users arrive.
Seed enough content that first visitor sees a live community, not an empty page.

### When to run
Before sharing any city page publicly. Run → seed → then promote.

---

## AGENT 2 — ContentWriter
**Skills used:** `copywriting` + `content-strategy`
**Schedule:** Railway Cron `0 7 * * *` (7am IST daily)
**Output:** `agents/output/daily/{date}.md`

### What it generates daily (per active city)
- 3 Instagram captions with image prompts
- 1 WhatsApp forward in regional language
- 1 SEO blog post (350 words)
- 5 seed listings in regional language

### Daily angle rotation (prevents repetition)
```python
ANGLES = [
    "tiffin_services", "pg_roommate", "tuition_teachers",
    "local_events", "second_hand_electronics", "carpooling",
    "domestic_help", "sports_clubs", "music_dance_classes",
    "festival_shopping", "local_food", "pet_services"
]
angle = ANGLES[day_of_year % len(ANGLES)]
```

### Skill: content-strategy
Framework: Every piece of content serves one of three goals:
1. Acquire (brings new users in)
2. Activate (helps new user post their first listing)
3. Retain (gives existing users reason to return)

---

## AGENT 3 — SEOAgent
**Skills used:** `seo-audit` + `ai-seo` + `content-strategy`
**Schedule:** Railway Cron `0 2 * * 1` (2am IST every Monday)
**Output:** Next.js static pages at `/[city]/[category]`

### Target URL pattern
`localsindia.com/hyderabad/tiffin-services`
`localsindia.com/bengaluru/pg-rooms`

### Priority queue
```python
PRIORITY_CITIES = ["mumbai", "delhi", "bengaluru", "hyderabad", "chennai", "pune", "ahmedabad", "kolkata"]
PRIORITY_CATS   = ["tiffin-services", "pg-rooms", "tuition", "events", "jobs", "second-hand"]
TIER2_CITIES    = ["vijayawada", "coimbatore", "nagpur", "jaipur", "lucknow", "chandigarh"]
```

### What it generates per page
- title tag (60 chars), meta description (155 chars), h1
- Hero content (2 paragraphs, local neighborhoods mentioned)
- FAQ section (5 items, JSON-LD schema)
- 15 long-tail keywords including Hinglish variants
- 1 paragraph in regional language script
- 5 internal links

### Skill: ai-seo
Optimize for both Google AND AI search engines (ChatGPT, Perplexity, Google SGE).
Write content AI engines quote as authoritative.
Every page must be demonstrably unique — no templated filler.
Content must pass E-E-A-T (Experience, Expertise, Authoritativeness, Trust).

---

## AGENT 4 — RedditAgent
**Skills used:** `community-marketing` + `copywriting`
**Schedule:** Railway Cron `0 10 * * 1,3,5` (10am IST Mon/Wed/Fri — drafts only)
**Approval:** Telegram bot → Raj approves before any post goes live
**Target:** r/india, r/hyderabad, r/bangalore, r/mumbai, r/Chennai, r/pune

### Skill: community-marketing
Rule: Add value first. Product mention is optional, never the point.
Reddit detects and destroys inauthentic promotion.

### Post structure
1. Relatable problem or story (2 paragraphs, genuine, specific)
2. What you tried that didn't work (builds credibility)
3. Solution — LocalIndia mentioned naturally here
4. What it does for this specific community
5. Honest limitations ("still sparse in some areas")
6. Open question to drive comments

### Telegram approval flow
```python
# Draft saved to Redis with 24hr TTL
# Telegram message sent: /approve_{post_id} or /reject_{post_id}
# Only approved posts go live — Raj stays in control
```

---

## AGENT 5 — WhatsAppAgent
**Skills used:** `copywriting` + `community-marketing`
**Schedule:** Railway Cron `0 8 * * *` (8am IST daily)
**Initial mode:** Raj forwards manually to WhatsApp groups (no bot needed at start)

### What it generates
- Informational message (English + regional language, under 280 chars)
- Community call-to-action (regional language only, "Bhai log..." tone)
- Festival tie-in message (checks if festival within 14 days)

### Skill: copywriting applied to WhatsApp
- Simple over complex: "find" not "discover"
- Specific: name actual areas in city
- Max 1 emoji per message
- Regional Unicode script mandatory (not romanized)
- Under 300 chars (WhatsApp previews cut off longer)
- Test: would your mom forward this? If not, rewrite.

---

## AGENT 6 — CROAgent
**Skills used:** `cro` + `signup` + `onboarding`
**Schedule:** Railway Cron `0 9 * * 3` (9am IST every Wednesday)
**Prerequisite:** PostHog or Mixpanel analytics must be set up first — agent is useless without data

### What it analyzes
- Landing page bounce rate
- City selector completion rate
- Listing post completion rate
- Day-7 retention rate
- Top exit pages

### Skill: cro
Framework: Identify the single highest-leverage friction point.
Fix one thing at a time. Measure. Then fix the next.
Output: hypothesis + specific fix + A/B test design + one quick win under 2 hours dev time.

---

## AGENT 7 — FeedbackAgent
**Skills used:** `customer-research` + `analytics`
**Schedule:** Railway Cron `0 0 * * *` (midnight IST — email arrives 6am)
**Delivery:** Email to rajeshguntupalli59@gmail.com via SendGrid

### What it reads
- New listings created today
- Reports filed
- Zero-result search queries (content gaps)
- City activity stats

### Output format (1 page max)
- 🚨 URGENT: same-day action items (spam, abuse, broken feature)
- 📊 NUMBERS: new listings, reports, top city, slowest city
- 🔍 CONTENT GAPS: top 5 zero-result searches (what to seed next)
- 💡 ONE ACTION: single highest-impact thing to do today
- 🏙️ CITY TO WATCH: one city showing early momentum

### Skill: customer-research
Surface patterns, not just numbers.
Every insight must tie to an action — if it doesn't, cut it.

---

## AGENT 8 — GrowthTracker
**Skills used:** `marketing-plan` (AARRR) + `analytics` + `churn-prevention`
**Schedule:** Railway Cron `0 1 * * 1` (1am IST Monday — ready for morning review)

### AARRR Framework
- Acquisition: new users this week
- Activation: users who posted a listing
- Retention: day-7 returning users
- Referral: WhatsApp shares tracked
- Revenue: N/A pre-monetization → track featured listing intent signals

### Output
- Weekly headline (one sentence)
- Top 3 cities by growth rate
- Bottom 3 cities + which agent to deploy
- What worked / what didn't
- Next week agent assignments for all 8 agents
- North star: total active listings vs monthly goal

---

## ZERO-COST CHANNEL STRATEGY

| Channel | Agent | Cost | Expected reach |
|---|---|---|---|
| WhatsApp organic | WhatsAppAgent | ₹0 | 50-500/message/city |
| Reddit India | RedditAgent | ₹0 | 100-5,000/post |
| Google SEO | SEOAgent | ₹0 | Compounds 3-6 months |
| Instagram organic | ContentWriter | ₹0 | 50-300/post |
| City seed content | CityLauncher | ₹0 | Makes cities look active |
| Daily digest | FeedbackAgent | ₹0 | Keeps founder focused |
| Weekly strategy | GrowthTracker | ₹0 | Directs all agents |
| **Claude API total** | All agents | **~$1/month** | — |

---

## 30-DAY LAUNCH SEQUENCE

```
Day 1   → CityLauncher: 5 AP cities (Vijayawada, Guntur, Visakhapatnam, Nellore, Tirupati)
Day 2   → ContentWriter: daily content starts for all 5 cities
Day 3   → WhatsAppAgent: drafts first batch → Raj forwards to 3 WhatsApp groups manually
Day 5   → RedditAgent: drafts r/hyderabad + r/india → Telegram approval → Raj posts
Day 7   → SEOAgent: first 50 landing pages → deploy to Next.js static pages
Day 10  → FeedbackAgent: first daily digest arrives at 6am
Day 14  → GrowthTracker: Week 1 report → which cities to expand to next
Day 20  → CityLauncher: 10 more cities based on GrowthTracker recommendation
Day 30  → 50 cities live, all 8 agents running, Raj spends 10 min/day on digest only
```

---

## PREREQUISITES CHECKLIST

Before starting agents:
- [ ] MSG91 live (real OTP working)
- [ ] OTP_DEBUG=false on Azure
- [ ] ANTHROPIC_API_KEY set in Railway env
- [ ] TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID set (for Reddit approval)
- [ ] SendGrid API key set (for FeedbackAgent email)
- [ ] PostHog/Mixpanel added to frontend (for CROAgent)
- [ ] At least 1 city with 5+ real user listings before CityLauncher runs

## BUILD ORDER
1. CityLauncher (most urgent — solves empty city problem)
2. FeedbackAgent (tells you what's working)
3. WhatsAppAgent (manual forward initially, automate later)
4. ContentWriter + SEOAgent (after first 100 users)
5. RedditAgent (needs Telegram approval bot first)
6. CROAgent (needs analytics tracking first)
7. GrowthTracker (last — needs all other agents running)
