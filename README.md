# LocalsIndia

**localsindia.com** — a free local directory and classifieds site for South India. People find real local
businesses (clinics, restaurants, schools, shops, PGs, function halls …) by city, category and neighbourhood,
and post free listings that others contact directly on WhatsApp. Business owners can claim their listing for free.

| | |
|---|---|
| Website | https://www.localsindia.com |
| Backend API | https://localsindia-backend-in.azurewebsites.net (`/api/v1/...`) |
| Android app | React Native + Expo, on Google Play closed testing |
| Code | https://github.com/rajeshguntupalli59/localsindia (branch `master` = production) |

**Coverage (September 2026):** 150 cities in 6 states — Andhra Pradesh 36, Tamil Nadu 33, Karnataka 32,
Telangana 28, Kerala 20, Puducherry 1 · ~35,300 real businesses · 27,040 tagged with their neighbourhood ·
3,749 neighbourhood pages · 4,888 businesses with opening hours.

> New here? Read this file, then **PROJECT_MAP.md** (current status, open items, dated changelog).
> For "where is X in the code", use **ARCHITECTURE_INDEX.md**.

---

## 1. How it works — the big picture

```
  Visitors (phone / desktop)            Business owners               Admin (Raj)
          │                                   │                           │
          ▼                                   ▼                           ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │  WEBSITE — Next.js 14 (App Router), Azure Static Web Apps (hybrid SSR)     │
  │  Server-renders the SEO pages (city, category, area, business) so Google  │
  │  sees real content; interactive parts run in the browser.                 │
  └───────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTPS  /api/v1/...
  ┌───────────────────────────────▼───────────────────────────────────────────┐
  │  BACKEND — FastAPI (Python, async), Azure App Service (Central India)      │
  │  Auth (phone OTP / Google), listings, businesses, claims, search, admin.   │
  └──────┬──────────────┬──────────────┬──────────────┬───────────────┬───────┘
         ▼              ▼              ▼              ▼               ▼
    PostgreSQL     Cloudinary       MSG91          SendGrid       Google Gemini
    (all data;     (photos; claim   (SMS OTP)      (email)        (chat assistant)
    Alembic        documents are
    migrations)    kept private)

  GitHub Actions — deploys on push, plus the automation that runs on a schedule
  (social posts, blog, SEO text, reminders, digests) or by hand (data imports).
  Scripts live in agents/ (Python).
```

- **Content comes from two places.** Real businesses are imported from **OpenStreetMap** (open data, ODbL —
  every such page shows "© OpenStreetMap contributors"). Listings are posted by **real users** only.
  Nothing on the live site is invented: no AI-written listings, no placeholder businesses, no fake phones.
- **Businesses start unclaimed.** An owner claims one by SMS code sent to the business's own number, by
  uploading proof documents, or by emailing support. After a claim they can edit the page and add photos.
- **Growth** comes from Google (server-rendered SEO pages + sitemaps), Facebook/Instagram posts that link to
  real pages, a weekly blog, and manual owner outreach from the admin panel.

---

## 2. What each kind of user can do

**Visitors** (no sign-up needed to browse)
- Browse a city → categories → neighbourhoods → a business page (address, phone, hours with *Open now*,
  map, **Call / Directions / Share** buttons, reviews).
- Search listings and businesses; save listings; chat assistant.
- Sign in with a phone OTP (or Google) to post a free listing, review a business, save searches, get alerts.

**Business owners**
- **Claim** a listing (SMS code, documents + shop photo, or email). Then edit details, see analytics, and use
  the *"Get reviews from your customers"* card to WhatsApp their page to customers.

**Admin** (`/admin`, admin account only)
| Page | What it's for |
|---|---|
| `/admin/listings` | Approve / reject new listings (every listing starts *pending*) |
| `/admin/business-claims` | Review document claims (view the private documents, approve / reject with a reason) and approve email claims |
| `/admin/outreach` | **Owner outreach:** call or WhatsApp unclaimed businesses one at a time and log the outcome |
| `/admin/businesses`, `/admin/users`, `/admin/reports`, `/admin/buyer-requests` | Manage businesses, users, flagged listings and flagged buyer requests |
| `/admin/events`, `/admin/banners`, `/admin/announcements` | Events, city banners, announcements |
| `/admin/monitoring`, `/admin/activity`, `/admin/spending` | Health, marketing activity feed, AI/LLM + Azure spend |

---

## 3. Where everything is

```
localindia/
├── backend/                 FastAPI API
│   ├── app/main.py          app setup, CORS, registers every router
│   ├── app/routers/         one file per feature (endpoints)
│   ├── app/models/          SQLAlchemy tables
│   ├── app/schemas/         Pydantic request/response shapes
│   ├── app/services/        MSG91, Cloudinary, search, email, notifications, push
│   ├── app/core/            config (env vars), database, auth/JWT, rate limiter
│   ├── migrations/versions/ Alembic migrations (run automatically on deploy)
│   └── tests/               pytest (runs against a local PostgreSQL test DB)
├── frontend/                Next.js 14 website
│   ├── src/app/             pages (App Router) — see "Page map" below
│   ├── src/components/      UI components
│   ├── src/lib/             API client, types, helpers (covers, hours, SEO categories …)
│   ├── src/messages/        UI translations (en, hi, te, ta, kn, ml, …)
│   └── public/              static files, robots.txt, category cover photos
├── mobile/                  React Native + Expo Android app (src/screens, src/lib/api.ts)
├── agents/                  Python automation scripts (data imports, social, blog, SEO)
│   ├── data/city_regions.json   the 150 cities: map box, population, import order
│   ├── state/               progress/rotation files the workflows commit back
│   └── output/              logs (social posts, LLM usage) and previews
├── .github/workflows/       deploys + scheduled / manual automation
├── PROJECT_MAP.md           ← current status, open items, changelog (start here)
├── ARCHITECTURE_INDEX.md    ← "where is X" lookup (features → files → endpoints → tables)
└── ARCHITECTURE.md          full reference (tables, endpoints, pages, components)
```

### Page map (website)

| URL | What it shows |
|---|---|
| `/` | Home: search, choose a city |
| `/{city}` | City page: explore by category, popular areas, latest listings |
| `/{city}/{category}` | e.g. `/hyderabad/doctors` — real businesses + listings in that category, "by area" links |
| `/{city}/{category}/{area}` | e.g. `/hyderabad/doctors/madhapur` — **Doctors & Clinics in Madhapur, Hyderabad** |
| `/{city}/area/{area}` | e.g. `/hyderabad/area/madhapur` — every business in that neighbourhood |
| `/{city}/businesses` | Full business directory with category filter |
| `/{city}/businesses/{id}` | One business: details, hours, claim, reviews |
| `/{city}/classifieds/...`, `/listing/{id}` | Listings (post, view, edit) |
| `/{city}/events`, `/tickets/...` | Events and ticketing |
| `/search`, `/{city}/search` | Search (not indexed by Google on purpose) |
| `/blog/...` | City guides and directory articles |
| `/trust`, `/about`, `/privacy`, `/terms`, `/contact` | Info pages |
| `/sitemap.xml`, `/sitemap-areas.xml`, `/robots.txt` | For search engines |

The 13 SEO categories (URL segment → business category) are defined in `frontend/src/lib/seoCategories.ts`:
`tiffin, pg-roommate, jobs, vehicles, electronics, services, furniture, tutors, doctors, fashion,
event-venues, real-estate, shops`.

### Feature → code

| Feature | Backend | Frontend |
|---|---|---|
| Phone OTP / Google login | `routers/auth.py`, `services/msg91.py` | `app/auth/` |
| Listings (post → pending → approved) | `routers/listings.py`, `routers/admin.py` | `app/[city]/classifieds/`, `app/listing/` |
| Business directory | `routers/businesses.py` | `app/[city]/businesses/`, `components/business-list/` |
| Neighbourhood (area) pages | `routers/businesses.py` (`/businesses/localities`, `/locality-pages`) | `app/[city]/area/[area]/`, `app/[city]/[category]/[area]/`, `app/sitemap-areas.xml/` |
| Opening hours + *Open now* | `businesses.opening_hours` | `lib/openingHours.ts` |
| Claiming a business | `routers/business_claims.py` | `components/claim-business/`, `app/admin/business-claims/` |
| Owner outreach | `routers/business_outreach.py` | `app/admin/outreach/`, `lib/outreach.ts` |
| Data import endpoints (admin) | `routers/business_import.py` | — |
| Search | `routers/search.py`, `services/search_svc.py` | `app/search/`, `app/[city]/search/` |
| Photos | `routers/uploads.py`, `services/cloudinary_svc.py` | `lib/imageLoader.ts` (Cloudinary resizes every photo) |
| Cover photos for businesses without their own | — | `lib/categoryCover.ts`, `public/category-covers/` (labelled "Representative image") |
| Chat assistant | `routers/chat.py` (Gemini) | `components/chat-widget/` |
| Payments / featured / tickets | `routers/payments.py`, `routers/tickets.py` | promote & ticket pages |
| Notifications / push | `services/notification_svc.py`, `routers/notifications.py` | notification bell |
| Sitemaps | `/businesses/sitemap-entries`, `/businesses/locality-pages` | `app/sitemap.ts`, `app/sitemap-areas.xml/route.ts` |

---

## 4. Where the business data comes from (and how to refresh it)

All steps are GitHub workflows you run by hand (**Actions → workflow → Run workflow**). Each is safe to re-run.

1. **Cities** — `agents/prepare_city_regions.py` builds `agents/data/city_regions.json` (map box from
   Nominatim, cross-checked against Wikidata town coordinates; population; import order = main city of each
   state first, then smaller ones).
2. **Businesses** — workflow **OSM Business Import** (`agents/osm_business_import.py`). Pulls named shops,
   clinics, schools, restaurants … from OpenStreetMap for a city, maps each to *our* category, and filters out
   chains, generic names ("Bakery"), junk, duplicates and anything with neither phone nor address. After each
   city it re-homes businesses into the right city, removes ones that break the rules, and verifies the live
   pages. Progress: `agents/state/osm_import_state.json`.
   - Inputs: `city` or `count` (next N cities), `apply` (unticked = preview only), `fix_only`, `fix_done`,
     `backfill_hours` (copy OSM opening hours onto existing businesses; never overwrites).
3. **Neighbourhoods** — workflow **Assign Business Localities** (`agents/assign_localities.py`). Tags each
   business with its nearest OpenStreetMap suburb (or neighbourhood, in towns with few suburbs).
   **Re-run it after importing new businesses** so they appear on area pages.
4. **Owners** — claim their business; admin reviews in `/admin/business-claims`.

Imported businesses have `source='osm'` and a unique `source_ref` (e.g. `node/123456`), so re-imports never
duplicate or overwrite an owner's edits.

---

## 5. What runs automatically

| Workflow | When (IST) | What it does |
|---|---|---|
| **Social Poster** (`social-poster.yml`, `agents/meta_poster.py`, `ecosystem_poster.py`) | 9:30 am + 7 pm daily | Posts to the Facebook Page + Instagram. Every other post is an **area list** built from live counts (e.g. "57 Doctors, Clinics & Pharmacies in Malleswaram") linking to that page; the others rotate tips, city spotlights, seller calls. |
| **Blog Publisher** (`blog-publisher.yml`, `agents/blog_agent.py`) | Sunday 8:30 am | One article a week — alternates city guides and directory articles built from real businesses; auto-shared to Facebook |
| **SEO Agent** (`seo-agent.yml`, `agents/seo_agent.py`) | 11:30 am daily | Writes SEO text for cities with enough real content |
| **Expiry Reminders** | 9 am daily | Tells users their listing is about to expire |
| **Interest Digest** | 9 am daily / Monday | Email digests of new listings matching saved interests |
| **Keep Backend Alive** | every 25 min | Pings the API so it doesn't cold-start |
| **Deploy Backend / Frontend**, **Test** | on push to `master` | See section 7 |
| ~~City Seeder~~ | — | **Deleted 2026-09-25.** It posted AI-written listings with made-up phone numbers — never bring it back. |

Manual-only: **OSM Business Import**, **Assign Business Localities** (section 4).

---

## 6. Running it on your computer

Needs PostgreSQL 16 on `localhost:5432` (user/password `postgres`), Python 3.12+, Node 20.

```bash
# Backend  → http://localhost:8000   (API docs at /docs)
cd backend
pip install -r requirements.txt
alembic upgrade head                 # create / update the local database
uvicorn app.main:app --reload

# Frontend → http://localhost:3000
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Local-only tips: set `OTP_DEBUG=true` so login codes are shown instead of texted; leave `MSG91_*`,
`CLOUDINARY_*`, `SENDGRID_API_KEY` empty and those services run in mock mode. `FRONTEND_URL` must match the
frontend's address or the browser's requests are blocked (CORS).

**Tests — run before every push:**
```bash
cd backend  && python -m pytest tests/ -x -q        # needs database localindia_test
cd frontend && npm test && npm run build && npm run lint
```

---

## 7. Deploying

**Push to `master` = deploy to production.** GitHub Actions does the rest:

| You change | Workflow | Result |
|---|---|---|
| `backend/**` | Deploy Backend to Azure App Service | Builds, deploys, **runs Alembic migrations**, restarts (a few minutes; the new version can take a minute or two more to go live) |
| `frontend/**` | Deploy Frontend to Azure Static Web Apps + Test | Builds the site and publishes it |
| `agents/**`, docs | nothing deploys | Scripts are used the next time their workflow runs |

Data changes to production go through **Alembic data migrations** (they run on deploy) or the admin import
endpoints — not by editing the database by hand. Rows are soft-deleted (`deleted_at`), never hard-deleted.

---

## 8. Configuration (names only — values live in Azure / GitHub, never in the repo)

- **Backend** (Azure App Service → Configuration; see `backend/app/core/config.py`): `DATABASE_URL`,
  `SECRET_KEY`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_DLT_TEMPLATE_ID`, `RECAPTCHA_SECRET_KEY`,
  `GOOGLE_CLIENT_ID/SECRET`, `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`, `FRONTEND_URL`, `BACKEND_URL`,
  `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_KEY`, `RAZORPAY_KEY_ID/SECRET`,
  `SENDGRID_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `OTP_DEBUG` (false in production).
- **GitHub Actions secrets**: Azure deploy credentials, `NEXT_PUBLIC_*` build settings, `ANTHROPIC_API_KEY`,
  `LOCALINDIA_ADMIN_PASSWORD` (lets the data workflows call admin endpoints), `META_*` (Facebook/Instagram),
  `CLOUDINARY_*`, `CRON_SECRET`.
- **Feature switch**: `frontend/src/lib/features.ts` → `PAID_BADGES_ENABLED` (paid "Get Verified" offers;
  `false` for now — nothing is being sold).

More: `AZURE_DEPLOY.md` (infrastructure), `SETUP_GUIDE.md` (third-party accounts).

---

## 9. Operating it — day to day

| Task | How |
|---|---|
| **Approve new listings** | `/admin/listings` — every new listing waits here |
| **Review business claims** | `/admin/business-claims` — check the document name/address matches the business and the shop photo shows the signboard; call the contact number if unsure. Approve or reject with a reason (the claimant is notified). |
| **Email claims** | Owner emails proof to support@localsindia.com with the business ID → "Approve an email claim" box on the same page (needs the phone number they signed up with) |
| **Owner outreach** (~20 min/day) | `/admin/outreach` → pick a city → **To contact** → WhatsApp (pre-filled invite) or call → log the outcome. One message per business; if they say stop, mark *Not interested*. |
| **Add / refresh businesses** | Run **OSM Business Import**, then **Assign Business Localities** (section 4) |
| **Check Google** | Search Console → Performance (which pages get impressions) and Indexing → Pages. Sitemaps submitted: `sitemap.xml`, `sitemap-areas.xml`. |
| **See what was posted on social** | `agents/output/social_posts_log.jsonl` (committed after each run) |
| **Turn paid badges back on** | `PAID_BADGES_ENABLED = true` in `frontend/src/lib/features.ts`, push |

### Rules that must never be broken
- **Real only:** no AI-generated listings, no placeholder businesses, no fake phone numbers, no chains presented
  as local businesses, no pages or posts for cities we don't serve, no "best/top" rankings without real ratings.
- Photos not taken by the business are labelled **"Representative image"**.
- New listings always start as *pending*; 3 reports hide a listing; max 10 active listings per user per city.
- Phone numbers must match `+91[6-9]XXXXXXXXX`; OTPs are hashed, 3 attempts, 15-minute lockout.
- Soft-delete only; OpenStreetMap attribution on every imported business.
- Full list: `CLAUDE.md` (Hard Rules).

---

## 10. Other docs

| Doc | Use it for |
|---|---|
| **PROJECT_MAP.md** | Current status, open items, dated changelog, which docs are stale |
| **ARCHITECTURE_INDEX.md** | Fast lookup: feature → files → endpoints → tables |
| **ARCHITECTURE.md** | Full reference: every table, endpoint, page, component |
| **CLAUDE.md** | Build rules, commands, hard business rules |
| **TESTING.md** | Test setup |
| **AZURE_DEPLOY.md**, **SETUP_GUIDE.md** | Infrastructure and third-party account setup |
| **PRODUCT.md**, **UI_STACK.md** | Brand, design and UI stack decisions |

Older planning docs (START_HERE, BUILD_PLAN, MARKETING_*, AUTO_MARKETING_PLAN, IQ docs) are historical —
see the trust table in PROJECT_MAP.md §3 before relying on them.
