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
| `city_launcher.py` | Seeds a city with 20 listings + 10 businesses (`is_seed=true`, exempt from expiry). `--city NAME` for one city; `--auto N` finds the next N cities with zero active listings (live query, no state file) and seeds each. | ✅ Yes — `city-seeder.yml`, `--auto 10` (also `--city` manually) |
| `seo_agent.py` | Generates AI-varied SEO metadata (title/description/OG/keywords/JSON-LD) per city, writes to `frontend/src/content/seo/{slug}.json` — read live by `[city]/page.tsx` (`lib/seo.ts`), falls back to the plain template when absent. `--auto N` targets cities that already qualify for Google's index (`>= MIN_LISTINGS_FOR_INDEX`) without generated content yet, prioritized by listing count. **Fixed 2026-08-13**: was previously wired to write into gitignored `agents/output/` — completely disconnected from the live site, zero effect regardless of how often it ran. | ✅ Yes — `seo-agent.yml`, `--auto 10`, daily 11:30am IST |
| `content_writer.py`, `reddit_agent.py`, `cro_agent.py`, `feedback_agent.py`, `growth_tracker.py`, `whatsapp_agent.py` | Exist as files, described in `MARKETING_AGENT_SYSTEM.md` | ⚠️ Not found in any `.github/workflows/*.yml` — verify manually before assuming these run automatically |
| `social_publisher.py`, `share_blog_post.py` | Publishing helper utilities | Called by the above, not standalone scheduled jobs |
| `run_all.py`, `test_integration.py` | Batch runner / integration test | Manual |

`agents/context/product_context.md` — shared product facts (voice, all 12 categories, scope) read by the posting agents. `agents/instructions/*.md` — per-agent system prompt instructions.

### 4a. AI image/video pipeline (manual, not scheduled)

`agents/assets/ai_generated/` (raw) and `ai_generated_branded/` (logo + `localsindia.com` + "Download Free App" CTA composited top/bottom via ffmpeg) — 23 images as of 2026-08-14, generated via ComfyUI (Stable Diffusion 1.5) running on a **free Google Colab T4 GPU**, driven directly through ComfyUI's REST API from chat (not a script in this repo). 5 promo videos (ffmpeg: real Play Store screenshots + these AI images + Pixabay royalty-free music, crossfade transitions) were delivered to the founder but not committed (large binaries).

**Why this isn't scheduled**: Colab requires a manual browser session (~90min idle / ~12hr max timeout, new tunnel URL every session) — the GitHub Actions cron workflows can't reach it. Generating more images/videos is an on-request "hey Claude, generate N more" action, not automated.

**Publishing is manual, on-request only** — founder's explicit call each time ("whenever I think is ok I will ask you to publish"), not a standing schedule. `agents/meta_client.py` gained real video support 2026-08-14 (`upload_video_to_cloudinary`, `post_to_facebook_video`, `post_to_instagram_reel` — Reels need a status-poll loop before `media_publish` will succeed, unlike images) since it previously only handled photos. First real posts 2026-08-14: 1 video (FB + IG Reel) + 2 branded images (FB + IG feed) — see `agents/output/video_posts_log.jsonl` (gitignored, local record only).

**If you actually want AI-*generated* (motion, not slideshow) video**: needs ComfyUI's Wan2.2 14B image-to-video model downloaded onto the Colab instance first (~20-30GB, not downloaded as of 2026-08-14 — a cost/time tradeoff was flagged and the founder chose the ffmpeg-slideshow approach instead for speed/reliability on a free T4). The Z-Image-Turbo + Fun ControlNet Union models (~25.5GB) *are* downloaded and verified working, but that's for image **inpainting**, unrelated to video generation.

---

## 5. What's Actually Scheduled (ground truth — verified 2026-08-08 via `gh workflow list` + reading each `.yml`; `city-seeder.yml` added 2026-08-11)

| Workflow | Cron (UTC) | IST | What it does |
|---|---|---|---|
| `social-poster.yml` | `0 4 * * *`, `30 13 * * *` | 9:30am, 7pm daily | Runs `meta_poster.py` (mostly) or `ecosystem_poster.py`/text variant (2nd slot, randomized) |
| `city-seeder.yml` | `0 5 * * *` | 10:30am daily | Seeds the next 10 empty cities (`city_launcher.py --auto 10`). Live and verified 2026-08-11 — see §6 |
| `seo-agent.yml` | `0 6 * * *` | 11:30am daily | Generates SEO metadata for the next 10 indexable cities without it yet (`seo_agent.py --auto 10`). Live and verified 2026-08-13 — see §6 |
| `blog-publisher.yml` | `0 3 * * 0` | 8:30am Sunday | Weekly evergreen blog article via `blog_agent.py` |
| `expiry-reminders.yml` | `30 3 * * *` | 9am daily | Sends real reminders to users with expiring listings |
| `interest-digest.yml` | `30 3 * * *`, `35 3 * * 1` | 9am daily / 9:05am Monday | Daily/weekly digest emails to users based on saved interests |
| `keepalive.yml` | `*/25 * * * *` | continuous | Pings backend to prevent Azure cold start |
| `backend-azure.yml` | push to master (`backend/**`) | — | Deploys backend to Azure App Service |
| `frontend-azure.yml` | push to master (`frontend/**`) + PR preview | — | Deploys frontend to Azure Static Web Apps |
| `test.yml` | push/PR to master/develop (`frontend/**`) | — | Runs Vitest |

The original 5 cron-scheduled workflows were manually triggered and verified working 2026-08-08 (see §6). `city-seeder.yml` was added and verified live (real posting, not dry-run) 2026-08-11 — 16 cities seeded successfully that day across two manual batches.

---

## 6. Changelog (dated, most recent first — append here after notable sessions)

### 2026-08-14 — AI image/video content pipeline via ComfyUI on free Colab GPU, first real video publish
- Founder wanted to test whether their `github.com/rajeshguntupalli59/ComfyUI` fork could run on Google Colab's free tier for AI image generation, unrelated at first to LocalsIndia. Verified end-to-end: cloned the fork, downloaded SD1.5, launched with a `cloudflared` tunnel, generated a real image via direct REST API calls (`/prompt`, `/history`, `/view`) — bypassing the ComfyUI web UI's own client-side automation, which proved unreliable (Angular Material menus and the Monaco code editor didn't respond correctly to synthetic browser events). Also downloaded and verified Z-Image-Turbo + Fun ControlNet Union (~25.5GB) for image **inpainting** specifically — confirmed with a real masked edit (replaced a sun with a star in a test image, only the masked region changed).
- Pivoted to actual marketing use: generated 23 images across city spotlights, all major categories, safety/trust, referral, and community themes (`agents/assets/ai_generated/`), then built an ffmpeg overlay template stamping the LocalsIndia logo + `localsindia.com` + a "Download Free App" CTA onto every one (`ai_generated_branded/`) — founder's explicit ask was that every asset carry visible LocalsIndia branding, not just be a generic stock-style photo needing further work.
- Built 5 promo videos via ffmpeg (not ComfyUI — true AI video generation would need a ~20-30GB Wan2.2 model download, flagged as a cost/reliability tradeoff on free-tier Colab and the founder chose the faster slideshow approach): general promo, square/feed crop, a referral-program-specific cut (targets the "referral live but unpromoted" gap from 2026-08-11), a categories/community cut, and a version with the logo watermark persistent on every frame (not just intro/outro cards). Mixed in a Pixabay-licensed royalty-free track ("Upbeat Happy Corporate" by kornevmusic, free for commercial use).
- **`agents/meta_client.py` previously had zero video-posting capability** (only Facebook photo posts + Instagram feed/story images). Added `upload_video_to_cloudinary`, `post_to_facebook_video`, `post_to_instagram_reel` — Instagram Reels specifically need a status-poll loop (`FINISHED` check) before `media_publish` succeeds, unlike the synchronous image flow.
- **First real video post, ever**: published the main promo video to Facebook (post `1241827064722221`) and Instagram Reels (`17890955256602905`) — confirmed working end to end on the first real attempt. Later the same day, published 2 branded images (city market spotlight + happy customer) to both platforms at the founder's specific request.
- **This is a manual, on-request capability, not scheduled** — see §4a for why (Colab session lifecycle) and the founder's explicit preference for calling each publish rather than a standing rotation.

### 2026-08-13 — Wired seo_agent.py into the live site (was completely disconnected)
- Founder asked whether running `seo_agent.py` daily would help. Checked the code: it generated real SEO metadata via Claude but only ever wrote it to `agents/output/{city}/` — gitignored, nothing read it back into anything. The live city pages' metadata came entirely from `[city]/page.tsx`'s own hardcoded template (the one extended with regional keywords 2026-08-12). Running it daily as-built would have been pure API spend for zero live effect — said so plainly rather than just running it.
- Rewired end to end at the founder's request: `seo_agent.py` now writes to `frontend/src/content/seo/{slug}.json` (git-committed), read live by a new `frontend/src/lib/seo.ts` loader (mirrors the existing `blog.ts` pattern) inside `[city]/page.tsx`'s `generateMetadata()` and page body (adds a second JSON-LD block alongside the existing `ItemList` one). Added `--auto N`: targets cities that already qualify for Google's index (`>= MIN_LISTINGS_FOR_INDEX`, same threshold the page itself uses — no point generating for pages Google won't index) and don't have content yet, prioritized by listing count descending, no rotation-state file. Fixed a real pre-existing bug found in the process: `--state` used to default to "Andhra Pradesh" for every city regardless of which one; now pulled from the live API like `city_launcher.py` does.
- Found and fixed a second real bug while testing the first real generation (Hyderabad): the instructions file said "LocalIndia" (no *s*) throughout, so the generated title tag and JSON-LD would have shown the wrong brand name in actual Google search results. Fixed to "LocalsIndia," regenerated.
- New `seo-agent.yml`, daily 11:30am IST (after `city-seeder.yml`), `workflow_dispatch` with a configurable count.
- **Verified fully live**, not just build-clean: full production build passed, `--auto` candidate detection sanity-checked against the live API (79 real candidates, correctly sorted, correctly excluding cities with existing files), real end-to-end generation for Hyderabad committed and deployed, then confirmed via the actual production page (`localsindia.com/hyderabad`) — correct title, correct description, both JSON-LD blocks present.

### 2026-08-12 — Store-review prompt (mobile) + regional-SEO metadata + ecosystem_poster link fix
- **Store-review prompt built and verified on-device**: app had zero Play Store reviews since launch, no in-app prompt anywhere. Added `expo-store-review` + `maybePromptStoreReview()` (`mobile/src/lib/reviewPrompt.ts`), wired into the buyer's first WhatsApp-contact tap in `ListingDetailScreen.tsx` — a genuine happy-path moment, not launch/onboarding, per both platforms' guidelines. Fires the app's own request once per install (storage flag); the OS throttles the actual dialog beyond that. **Verified for real**: built a local dev-client (`expo run:android`, Android Studio's bundled JDK since none was on PATH) and installed to a Pixel_6 emulator, navigated the real app via `adb`/`uiautomator` (screenshot-pixel-guessing was unreliable — got exact button bounds via `uiautomator dump` instead), and confirmed via temporary debug logging that the full code path executes correctly: tap → gate check → `isAvailableAsync() -> true` → `requestReview()` called. The call itself fails with `ERR_R_MUNSUCCESSFUL_TASK` on the emulator — expected, documented Google Play Core behavior (needs a real Play Store account context, which emulators/sideloaded builds lack), not a bug. Debug logging removed before commit (`git diff` confirmed clean). **Not live yet** — needs a new EAS build + Play Store release, same as the original launch.
- **Regional-language SEO metadata** on city pages (`[city]/page.tsx`): title/description were English-only despite full Telugu/Tamil/Kannada/Malayalam translations existing. Discovered there's no locale-prefixed routing at all (no `middleware.ts`, no `/te/[city]` routes) — true hreflang multi-language SEO would be a real routing/architecture change, a separate decision. Shipped the safe scoped version instead: append each city's own already-translated, already-vetted app phrase (`messages/{lang}.json` `listing.post` key, reused verbatim — not a newly composed sentence, to avoid grammar risk in languages this codebase can't proofread) to title/description via `city.lang_default`. Noted in passing: `blog_agent.py` is still generating articles for cities outside the South-India-only scope (e.g. Ahmedabad, Gujarat) — separate issue, not fixed.
- **`ecosystem_poster.py` still wasn't including the Play Store link**, reported by the founder after the earlier meta_poster.py fix. Root cause: the instruction was phrased as optional/conditional ("it's fine to mention the app... if mentioned, include the link") — soft enough that the model mentioned "Google Play" without connecting it to the link requirement, confirmed in a real post 2026-08-12 14:37. Rewrote as unconditional: every caption ends with both `localsindia.com` and the full install URL, always, no judgment call left to the model. `meta_poster.py`'s equivalent rule was already phrased this way (bolded, unconditional) and had worked correctly — brought ecosystem_poster.md in line with it. Verified live: triggered a real post, full link present (my first grep check only caught the caption's first line and looked like a failure — the full logged caption had both URLs on their own lines after `\n\n`, worth remembering for next time).

### 2026-08-11 — Referral program promotion + ASO/accuracy fixes
- **Marketing channel audit**: full landscape check — 3 real automated channels (social posts, weekly blog, daily city seeding), 7 dormant agent scripts (`content_writer.py`, `seo_agent.py`, `reddit_agent.py`, `cro_agent.py`, `feedback_agent.py`, `growth_tracker.py`, `whatsapp_agent.py` — exist as files, wired into zero workflows), Telegram/Twitter auto-posters planned but never built, and an unverified external claim in `AUTO_MARKETING_PLAN.md` ("YouTube Shorts, 4/day, live via AI Content Studio on Railway" — outside this repo, not checked).
- **Referral program was live but unpromoted**: the actual reward (3 days free featured, both referrer and referred, on the referred user's first *approved* listing, capped at 20/account — see `routers/admin.py` `REFERRAL_REWARD_CAP`/`REFERRAL_FEATURED_DAYS`) was never stated anywhere on the web `/invite` page — framed as a vague "Founding Member Program" instead. Mobile's `InviteScreen.tsx` already communicated it correctly; rewrote web's hero/WhatsApp-message/stats to match. Added "referral" as a 6th topic to the social poster rotation (gift icon, own theme) so it gets promoted periodically instead of only living on one page nobody's pointed to yet.
- **Accuracy gaps found and fixed while in there**: both platforms' invite-share messages said "Works in Telugu, Hindi & more" — Hindi isn't served (South-India-only scope since 2026-07-18); now list the real 5 languages. Bigger version of the same problem on the **live Play Store listing**: "Live in 496+ cities across India" (actual: 150+, South India only) and "Available in 11 Indian languages" (technically true as translation files, but implies national coverage that doesn't exist — a Hindi/Marathi/Bengali speaker in Delhi/Mumbai/Kolkata would find zero cities). Corrected + ASO-improved full description (added city-name keywords, mentioned the referral program) drafted and handed to the founder to paste into Play Console (not git-managed).
- Verified: frontend lint + full `npm run build` clean before pushing the invite-page changes.
- Added `--auto N` mode to `city_launcher.py`: queries the live backend for cities with zero active listings (no rotation-state file — self-correcting, since a city just stops being "empty" once it has a listing, seeded or real), takes the next N in `(state, name)` order, seeds each the same way `--city` always has. New `city-seeder.yml`, daily `0 5 * * *` (10:30am IST), `workflow_dispatch` with a configurable count + dry-run toggle.
- Refactored the per-city POST/approve/save logic into a shared `seed_city()` used by both `--city` and `--auto`, rather than duplicating ~80 lines. While doing that, fixed a real pre-existing bug: `build_user_prompt(city, lang, lang)` was passing the language code where the state name belongs, so every generated prompt said e.g. "Adoni, te" instead of "Adoni, Andhra Pradesh." `--lang` is also no longer required — defaults to the city's own `lang_default` from the DB (`fetch_cities()` already returns it).
- Verified live end-to-end with `--auto 2 --dry-run` first (106 empty cities detected, matching the manual audit earlier the same day; correct next-two selection Adoni/Amalapuram; correct state name and language in the generated content).
- `LOCALINDIA_ADMIN_PASSWORD` GitHub secret (missing at first — flagged, added by the founder directly, not by me) is now set, unblocking real runs. Ran two real (non-dry-run) manual batches the same day: 2 cities to confirm posting actually works (Adoni, Amalapuram — confirmed live via the public API, `is_seed=true` on all 20/20 listings), then 14 more at the founder's request to accelerate day one (Amaravati, Bhimavaram, Chilakaluripet, Chittoor, Dharmavaram, Eluru, Gudivada, Guntakal, Hindupur, Kadapa, Kadiri, Machilipatnam, Madanapalle, Mangalagiri). All 16 cities: 20/20 listings + 10/10 businesses each, zero failures. Empty-city count: 106 → 90.
- Daily schedule (`0 5 * * *`, 10 cities/day) now runs unattended from here — no state file to babysit, it just picks the next 10 empty cities each morning. At 10/day, the remaining 90 clear in ~9 days.

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

