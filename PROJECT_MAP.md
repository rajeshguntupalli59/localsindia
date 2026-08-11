# PROJECT_MAP.md — Read This First

> **Purpose:** one-stop orientation for LocalsIndia. Answers "what is this, where does X live, which doc do I trust." Not a copy of the architecture docs — it points to them. Check this file before searching the repo cold.
>
> **For code-level questions** ("where is X defined", "what calls Y", "what's the call path between A and B") — use `.codegraph/` (via the codegraph MCP tool / `codegraph explore`) or `graphify-out/GRAPH_REPORT.md` first. Both are already indexed for this repo. This file is for orientation and doc-trust status, not a code index.

---

## 1. What This Is

LocalsIndia (localsindia.com) — India's hyperlocal community classifieds platform. City-wise listings, business directory, events, PG/roommate, jobs — 140 South Indian cities (Telangana, AP, Karnataka, Tamil Nadu, Kerala, Puducherry), 5 languages, WhatsApp-native contact, free to post. Live in production on Azure.

- Web: https://www.localsindia.com (Next.js 14, Azure Static Web Apps, hybrid SSR)
- Backend: https://localsindia-backend-in.azurewebsites.net (FastAPI, Azure App Service)
- Mobile: React Native + Expo 56, EAS builds, not yet on Play Store (internal testing)
- GitHub: https://github.com/rajeshguntupalli59/localsindia

---

## 2. Directory Map

| Path | What it is |
|---|---|
| `backend/app/` | FastAPI backend — `routers/` (endpoints), `models/` (SQLAlchemy tables), `schemas/` (Pydantic), `services/` (MSG91, Cloudinary, search), `core/` (config, db, auth) |
| `backend/migrations/` | Alembic schema versions |
| `frontend/src/` | Next.js 14 App Router — `app/` (pages), `components/`, `lib/api.ts` (typed API client), `messages/*.json` (11-language i18n) |
| `mobile/` | React Native + Expo app — `src/screens/`, `src/lib/`, EAS build config |
| `agents/` | **Marketing automation** — Python scripts that generate + post content (social, blog) via Claude API. See §4. |
| `.github/workflows/` | CI/CD + all cron-scheduled automation (deploys, social posting, digests, reminders). See §5 for ground truth on what's actually scheduled. |
| `.codegraph/`, `graphify-out/` | Pre-built code graph indexes — use these for "where is X" code questions instead of re-reading files |
| `.claude/skills/phase1-mvp/2-community/3-monetize/` | Build-phase task lists (see §3 — these describe a build order that's now far behind actual progress) |

---

## 3. Which Docs to Trust (read this before quoting any doc as current fact)

Several root docs describe the *original plan*, not current reality. Don't cite these as current state without cross-checking the code/live site first.

| Doc | Status | Notes |
|---|---|---|
| **CLAUDE.md** | ✅ Current | Live build rules, commands, hard business-logic constraints. Trust this. |
| **ARCHITECTURE.md** | ✅ Current, detailed | Full schema/API/frontend reference, actively updated (entries dated up to 2026-07-28). Long (1878 lines) — use ARCHITECTURE_INDEX.md to find the right section first. |
| **ARCHITECTURE_INDEX.md** | ✅ Current, best "where is X" lookup | Feature Map + File Index + Endpoint Index, actively maintained alongside every feature. **Check here before grepping the codebase for "what handles feature Y".** |
| **PRODUCT.md** | ✅ Current | Brand/design principles, still accurate |
| **UI_STACK.md** | ✅ Current | Component/animation/font stack decisions |
| **TESTING.md** | ✅ Current | Real test setup (Vitest frontend, pytest backend) |
| **AZURE_DEPLOY.md** | ✅ Current reference | One-time infra setup steps, still accurate if rebuilding infra |
| **SETUP_GUIDE.md** | ✅ Current reference | Third-party account setup (MSG91, Cloudinary, Google OAuth) |
| **MSG91_SUPPORT_ISSUE.md** | ✅ Historical record, resolved | OTP delivery bug, fixed 2026-07-13 — keep for reference, not actionable |
| **START_HERE.md** | ⚠️ Stale | Still says "Phase 1 — NOT STARTED" — the product has been live in production for weeks. Session-handoff ritual (git init, folder scaffold) is obsolete. |
| **BUILD_PLAN.md** | ⚠️ Stale | 14-week original build plan — project is well past Phase 3 in reality (payments, events, tickets, referrals all live) |
| **MARKETING_TASKS.md** | ⚠️ Stale | Last updated 2026-06-12, "Tamil Nadu next" — seeding has moved far past this (140 cities, South-India-wide scoping happened 2026-07-18) |
| **MARKETING_AGENT_SYSTEM.md** | ⚠️ Partially stale | Header still says "Status: PLANNED" — misleading. Most of the 8 described agents (`content_writer.py`, `seo_agent.py`, `reddit_agent.py`, `cro_agent.py`, `feedback_agent.py`, `growth_tracker.py`, `whatsapp_agent.py`, `city_launcher.py`) **do exist** as files in `agents/`. But it doesn't mention `meta_poster.py`, `ecosystem_poster.py`, or `blog_agent.py` at all, and its described cron schedules don't match the real `.github/workflows/*.yml` files. **Don't trust the schedule/status details — check `.github/workflows/` directly (§5).** |
| **AUTO_MARKETING_PLAN.md** | ⚠️ Stale | Describes Telegram/Twitter auto-posters as "to build" — never built. The Instagram/Facebook auto-poster it proposed (reposting YouTube Shorts) was built differently in practice as `meta_poster.py`/`ecosystem_poster.py` (original AI-generated images, not repurposed video). |
| **IQ_DOCUMENT.md** | ⚠️ Older snapshot | Dated 2026-06-19, pre-dates most of what's in ARCHITECTURE.md now. Useful as a plain-English narrative overview, not for specifics. |
| **PROJECT_IQ.md** | ⚠️ Older snapshot | Dated 2026-06-11, same caveat. |
| **FABLE_REVIEW_BRIEF.md** | 📌 Point-in-time snapshot | Written 2026-07-06/07 to hand to an external reviewer — frozen at that date, not meant to be kept current. |
| **MONETIZATION.md** | 🔶 Roadmap, partially live | Featured listings (§ "Already Built") are live; most of the rest is still "planned" — check ARCHITECTURE_INDEX.md's Feature Map for what's actually shipped (e.g. city banner ads and event ticketing are live now, not just planned, despite this doc). |

**Rule of thumb:** ARCHITECTURE.md / ARCHITECTURE_INDEX.md / CLAUDE.md are living docs kept in sync with the code (CLAUDE.md mandates this). Everything else in the table above is a point-in-time snapshot — verify against the code or ARCHITECTURE_INDEX.md before relying on it.

---

## 4. Marketing Agents (`agents/`)

Python scripts using the Anthropic API (`base_agent.py` is the shared runner) to generate and publish marketing content. Two generations exist side by side — not all agents in the original 8-agent plan are actually wired into a live schedule (check §5 for ground truth):

| File | What it does | Actually scheduled? |
|---|---|---|
| `meta_poster.py` | Generates + posts branded image/text posts to Facebook Page + Instagram (feed+story). Topics: app_feature, category_tip, safety_tip, city_spotlight, app_launch. **Fixed 2026-08-08**: was picking topics with plain `random.choice()` (no memory) and category_tip never specified which category, so it kept defaulting to the same "fake job posting" example — now uses round-robin-no-repeat rotation persisted to `agents/state/meta_poster_rotation.json`. | ✅ Yes — `social-poster.yml` |
| `ecosystem_poster.py` | Generates + posts the two-sided "Searching/Offering" ecosystem explainer poster | ✅ Yes — `social-poster.yml` (occasional, second daily slot) |
| `blog_agent.py` | Generates weekly evergreen SEO guide articles (city + category rotation via `agents/state/blog_rotation.json`, round-robin no-repeat — the pattern `meta_poster.py`'s fix now mirrors), commits to `frontend/src/content/blog/`, shares to Facebook | ✅ Yes — `blog-publisher.yml` |
| `city_launcher.py` | Seeds a new city with listings/businesses via the live backend API | Manual (`python agents/city_launcher.py --city ...`) |
| `content_writer.py`, `seo_agent.py`, `reddit_agent.py`, `cro_agent.py`, `feedback_agent.py`, `growth_tracker.py`, `whatsapp_agent.py` | Exist as files, described in `MARKETING_AGENT_SYSTEM.md` | ⚠️ Not found in any `.github/workflows/*.yml` — verify manually before assuming these run automatically |
| `social_publisher.py`, `share_blog_post.py` | Publishing helper utilities | Called by the above, not standalone scheduled jobs |
| `run_all.py`, `test_integration.py` | Batch runner / integration test | Manual |

`agents/context/product_context.md` — shared product facts (voice, all 12 categories, scope) read by the posting agents. `agents/instructions/*.md` — per-agent system prompt instructions.

---

## 5. What's Actually Scheduled (ground truth — verified 2026-08-08 via `gh workflow list` + reading each `.yml`)

| Workflow | Cron (UTC) | IST | What it does |
|---|---|---|---|
| `social-poster.yml` | `0 4 * * *`, `30 13 * * *` | 9:30am, 7pm daily | Runs `meta_poster.py` (mostly) or `ecosystem_poster.py`/text variant (2nd slot, randomized) |
| `blog-publisher.yml` | `0 3 * * 0` | 8:30am Sunday | Weekly evergreen blog article via `blog_agent.py` |
| `expiry-reminders.yml` | `30 3 * * *` | 9am daily | Sends real reminders to users with expiring listings |
| `interest-digest.yml` | `30 3 * * *`, `35 3 * * 1` | 9am daily / 9:05am Monday | Daily/weekly digest emails to users based on saved interests |
| `keepalive.yml` | `*/25 * * * *` | continuous | Pings backend to prevent Azure cold start |
| `backend-azure.yml` | push to master (`backend/**`) | — | Deploys backend to Azure App Service |
| `frontend-azure.yml` | push to master (`frontend/**`) + PR preview | — | Deploys frontend to Azure Static Web Apps |
| `test.yml` | push/PR to master/develop (`frontend/**`) | — | Runs Vitest |

All 5 cron-scheduled workflows were manually triggered and verified working 2026-08-08 (see §6).

---

## 6. Changelog (dated, most recent first — append here after notable sessions)

### 2026-08-11 — App-launch promo push + seed listings now exempt from expiry
- **Launch promotion**: `meta_poster.md`/`ecosystem_poster.md` still hard-forbade saying "download now" / Play Store claims (accurate before 08-11, false after) — corrected, and both now require the actual install URL as plain text in the caption (first live post said "Download on Google Play" with no link anywhere — nothing to tap on Facebook, nothing to copy on Instagram). Added a real Play Store presence to the website (footer badge site-wide, subtle homepage link). Fixed a second bug found the same day: the per-topic footer/CTA text in `render_post_image.js` was hardcoded identically across all 5 topics ("Free to post..."), so the app_launch image itself never mentioned downloading even though the headline said "app is live now" — now topic-aware (`TOPIC_THEMES[topic].footer`/`.cta`).
- **Seed listings never expire**: found that `Listing.expires_at` defaults to `created_at + 30 days` for every listing with zero exemption — `city_launcher.py`'s seeded listings were flipping to `status='expired'` via the daily cron exactly like real ones, quietly undoing a city's seeding a month later with no signal anywhere. Added `is_seed` (migration `a1c2d3e4f5a6`), admin-gated at creation (same "admins exempt" pattern as the per-city listing cap — a regular user's `is_seed: true` is silently forced to `false` server-side), and excluded `is_seed=True` from both of `cron.py`'s expiry queries. `city_launcher.py` now sends `is_seed: true` (it already authenticates as admin for every listing POST). Verified: full migration chain applies+downgrades cleanly against a scratch Postgres db, 3 new tests + full 167-test suite passing, and confirmed applied in production via the `backend-azure.yml` deploy log.
- **City seeding ground truth** (queried live, not the stale docs): 45 of 151 active cities have real listings (Hyderabad/Bengaluru/Chennai/Kochi/etc. well-seeded at 20-32 each; Vijayawada/Visakhapatnam/Guntur/Nellore/Tirupati lightly seeded at 10-17), 106 are still empty — mostly smaller AP/Karnataka/Kerala/TN/Telangana towns. `MARKETING_TASKS.md`'s seeding table (last updated 2026-06-12) is long stale — don't cite it.

### 2026-08-11 — Mobile app published to Google Play production
- Play Console flagged the closed-testing eligibility gate (12 testers, 14 days) as satisfied — but the AAB sitting in that closed test was `localsindia-v1.0.0-vc4-20260715.aab` (2026-07-15), which predated several real fixes landed since: Firebase/FCM push notifications actually delivering (`a6c484f`), Google Maps API key reaching the Android manifest (`1ed7bc4`), referral deep links (`ce2ee31`), location-assisted posting (`733cdcf`), splash screen fixes (`c335e06`, `c63e8e0`), mobile event creation (`a914209`).
- Cut a fresh EAS production build (`eas build --platform android --profile production`) from current `master` before submitting — versionCode 11 → 12, build id `b149241b-c6aa-4923-9d9c-7111ff72b9f9`, AAB includes all the above fixes. Production env vars (live Razorpay key, Maps key, Google Services JSON) were already correctly configured under the EAS `production` environment.
- Applied for Google Play production access (closed-test questionnaire) 2026-08-11 ~8:45 AM; granted same day. IARC content rating completed and live same day.
- Production release (submission #3) created with the fresh AAB, sent for review, and **published** 2026-08-11, ~9:21 AM — confirmed via Play Console Submission activity (status: Published) and the live Play Store listing responding. This is the app's first production release — previously internal/closed-testing only.
- **Known gap for next update**: countries/regions and store listing details were set during this flow but not independently re-verified against ARCHITECTURE.md/FABLE_REVIEW_BRIEF.md, which still describe the app as "not yet launched" — those docs need a pass to reflect that the app is now live.

### 2026-08-08 — Social post visual redesign: topic theming + 5 rotating styles
- The old `render_post_image.js` template was one flat dark card (navy bg, two blurry circles) reused for every post regardless of topic — founder flagged it as "too basic" / repetitive.
- Added topic-aware theming: each of the 5 topics gets its own icon, accent color, and eyebrow label.
- Added 5 independent layout styles — `glass` (frosted card over gradient), `bold` (oversized poster typography), `duotone` (diagonal color split), `quote` (light-background quote card), `spotlight` (solid billboard, headline in center-upper third) — rotated round-robin-no-repeat via `agents/state/meta_poster_rotation.json`, same pattern as the topic/category fix below, so style varies independently of topic.
- Design informed by web research on scroll-stopping content: 1.7s attention window, value-contrast (light/dark) matters more than hue, center-upper-third eye placement, quote-cards as a high-share pattern.
- Deliberately kept to CSS/SVG via the existing Playwright pipeline rather than per-post AI image generation (considered, but the connected image-gen account had 0.05 credits — plus per-post AI generation would add cost/latency/inconsistency to an unsupervised daily schedule anyway). Commit `e1a0d8f`.

### 2026-08-08 — Social Poster diagnosis, full scheduled-workflow health check, repeat-content fix
- **Bug found**: `social-poster.yml` had been failing 401 (Anthropic auth error) on every scheduled run since 2026-08-05 15:37 UTC. Root cause was a bad/expired `ANTHROPIC_API_KEY` GitHub secret (self-resolved by the time of manual retest — no key rotation was actually needed).
- **Health check**: manually triggered all 5 cron-scheduled workflows (`social-poster`, `blog-publisher`, `expiry-reminders`, `interest-digest`, `keepalive`) — all confirmed working. Real posts went out to Facebook/Instagram, a real blog article was published, real reminder/digest sends happened (user explicitly approved firing these off-schedule despite the near-term duplicate-send risk).
- **Repeat-content bug fixed**: `meta_poster.py`'s topic selection was `random.choice()` with zero memory, so `category_tip` (job-scam warning) kept recurring (4 of the last 5 image posts). Worse, `category_tip` never told the model which of the 12 real categories to write about, so it always defaulted to the same "fake job posting" example regardless of rotation. Fixed by adding round-robin-with-no-repeat rotation (mirroring the pattern `blog_agent.py` already used successfully) for both topic and, for `category_tip`, which category — persisted to `agents/state/meta_poster_rotation.json`, committed back by the workflow each run. Verified live: next run picked `app_feature` instead of repeating `category_tip`. Commit `390b41b`.
- **This file created** — see §3 for doc-trust findings from this pass (several root docs turned out stale on status/schedule details, corrected here).

