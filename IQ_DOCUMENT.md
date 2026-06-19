# LocalIndia — Full IQ Document
> Everything about this app: what it does, what each file does, how to manage it, and where it's going.
> **Start here if you're new to this project or returning after a long break.**
> Last updated: 2026-06-12

---

## Table of Contents

1. [What LocalIndia Is](#1-what-localindia-is)
2. [How It Makes Money](#2-how-it-makes-money)
3. [Live Deployment Status](#3-live-deployment-status)
4. [Tech Stack — What We Built With and Why](#4-tech-stack)
5. [How the App is Structured (Big Picture)](#5-how-the-app-is-structured)
6. [The Database — Every Table Explained](#6-the-database)
7. [The Backend API — Every Endpoint Explained](#7-the-backend-api)
8. [The Frontend — Every Page Explained](#8-the-frontend-pages)
9. [The Frontend — Every Component Explained](#9-the-frontend-components)
10. [Authentication — How Users Log In](#10-authentication)
11. [Search — How It Works](#11-search)
12. [Image Upload — How Photos Work](#12-image-upload)
13. [Payments — How Featured Listings Work](#13-payments)
14. [The Admin Panel — How to Moderate Content](#14-the-admin-panel)
15. [Infrastructure — Azure, GitHub Actions, CI/CD](#15-infrastructure)
16. [The AI Marketing System — 8 Agents](#16-the-ai-marketing-system)
17. [City Seeding — How to Add a New City](#17-city-seeding)
18. [How to Manage Day-to-Day](#18-how-to-manage-day-to-day)
19. [Business Rules — Never Break These](#19-business-rules)
20. [What's Built vs What's Coming](#20-whats-built-vs-whats-coming)
21. [Key Numbers](#21-key-numbers)
22. [Secrets and Credentials](#22-secrets-and-credentials)
23. [Pending Registrations (Raj's Tasks)](#23-pending-registrations)

---

## 1. What LocalIndia Is

LocalIndia (at **localsindia.com**) is India's hyperlocal community platform. Think of it as a free, modern version of JustDial or OLX that is:

- **Free to post** — unlike JustDial which charges Rs.5,000/year
- **WhatsApp-first** — buyers contact sellers directly on WhatsApp, no middlemen
- **Language-first** — works in 11 Indian languages (Telugu, Hindi, Tamil, Kannada, Marathi, Bengali, Gujarati, Punjabi, Malayalam, Odia, English)
- **Mobile-first** — designed for slow 4G phones at 375px screen width

**What a user can do:**
1. Pick their city (496+ cities covered, 18 cities seeded with content)
2. Browse classified listings (tiffin, PG/rooms, jobs, vehicles, electronics, education, services)
3. Find local businesses (Yellow Pages-style with star ratings)
4. Find local events (free and paid)
5. Post their own listing with up to 5 photos — free
6. Contact sellers directly on WhatsApp — no registration required to browse
7. Search anything using full-text search
8. Read and write reviews on listings and businesses

**What Raj manages:**
- Approving new listings (they all start in a "pending" state — admin must approve)
- Removing spam/abuse reports
- Seeding new cities using the AI agent
- Monitoring growth via the growth tracker agent

---

## 2. How It Makes Money

**Currently live (Phase 2 complete):**
- Nothing yet — all features are free. Building user base first.

**Phase 3 (needs Razorpay registration — pending):**
- Featured listings: **Rs.99/week or Rs.199/month** — appears at top of city grid with amber badge
- Business ad banners: **Rs.999–2,999/month** per city slot
- Verified business badges: **Rs.499–999/month**
- Job posts: **Rs.299–999 per 30 days**
- Event ticketing: **2–3% fee** on paid event tickets

**Target:** Rs.40,000/month revenue per active city once 50+ cities are live and active.

**Scaling math:** 500 cities × Rs.40k/month = Rs.2 crore/month at full scale.

---

## 3. Live Deployment Status

| Service | URL | Platform | Cost |
|---------|-----|----------|------|
| Frontend | https://www.localsindia.com | Azure Static Web Apps (Free) | Rs.0 |
| Backend API | https://localsindia-backend.azurewebsites.net | Azure App Service F1 (Free) | Rs.0 |
| Database | localsindia-db.postgres.database.azure.com | Azure PostgreSQL Flexible Server B1ms | ~Rs.1,600/month |
| Images | res.cloudinary.com | Cloudinary (Free tier) | Rs.0 |
| DNS | localsindia.com | GoDaddy | Rs.800/year |

**Health check:** GET https://localsindia-backend.azurewebsites.net/api/v1/health → `{"status":"ok"}`

**CI/CD:** Every `git push` to `master` branch triggers:
- GitHub Action → builds frontend → deploys to Azure SWA
- GitHub Action → builds Docker container → deploys backend to Azure App Service
- GitHub Action (keepalive) → pings health endpoint every 15 minutes to prevent cold start

**Last deployed commit:** `13251e5`
**GitHub repo:** https://github.com/rajeshguntupalli59/localsindia.git (branch: `master`)

---

## 4. Tech Stack

### Why each technology was chosen

| Layer | Technology | What it does | Why chosen |
|-------|-----------|-------------|-----------|
| Backend language | **Python 3.12** | Powers the API server | Fast to write, excellent async support, PostgreSQL libraries |
| API framework | **FastAPI** | Handles HTTP requests | Auto-generates API docs, async-native, Pydantic validation |
| ORM | **SQLAlchemy 2.0 async** | Talks to database | Industry standard, async support, clean migrations |
| Migrations | **Alembic** | Tracks DB schema changes | Works with SQLAlchemy, auto-detects changes |
| Database | **PostgreSQL 16** | Stores all data | Full-text search (tsvector), JSONB, ACID, Azure managed |
| Auth | **JWT + bcrypt** | User sessions and OTP | Stateless (scales), secure, no external dependencies |
| Frontend | **Next.js 14 App Router** | Web pages | SSG for speed, React for interactivity, Azure SWA compatible |
| UI components | **shadcn/ui** | Pre-built components | Copy-owned (not a dependency), Tailwind-based |
| Animation | **Framer Motion v11** | Smooth transitions | Best React animation library |
| Icons | **Lucide React** | UI icons | Consistent, lightweight |
| Fonts | **Noto Sans (Google Fonts)** | Text rendering in all scripts | Only font family with all 11 Indian scripts |
| i18n | **next-intl** | Language switching | Works with Next.js App Router |
| Images | **Cloudinary** | Photo hosting + CDN | Auto-resize, WebP conversion, global CDN |
| Payments | **Razorpay** | Featured listing payments | India-focused, UPI support, easy to integrate |
| SMS (OTP) | **MSG91** | Sends OTP SMS | India-specific, DLT compliant, reliable |
| Infrastructure | **Azure** | Hosting | Free tiers available, globally available |
| AI agents | **Claude Haiku (Anthropic)** | Marketing content generation | Fast, cheap, good at Indian context |

### How the frontend actually runs (updated 2026-06-16 — was static export, now hybrid SSR)
We tried pure static export first (`output: 'export'`), but pre-building all 496+ cities × sub-pages produced a 200 MB / 11,355-file export that timed out Azure's CDN distribution step every single deploy. We migrated off it (commit `3a60dd1`) onto Azure Static Web Apps' **hybrid SSR mode** instead:
- `next.config.mjs` no longer sets `output: 'export'` — it's a normal Next.js build
- Azure SWA's build system detects the Next.js app and runs it on a managed Node.js runtime behind the scenes (you never see or write this server)
- City and listing pages render **server-side on demand**, the first time anyone requests them — not pre-built at deploy time
- Pages with dynamic/auth-dependent data still fetch from the backend API client-side after the initial render
- `staticwebapp.config.json` is now minimal (just security headers + `apiRuntime: node:18`) — the old SPA-fallback routing rules are gone because Next.js handles routing itself now

---

## 5. How the App is Structured

```
localsindia/
├── backend/                 ← Python FastAPI server
│   ├── app/
│   │   ├── main.py          ← Entry point; wires all routers together
│   │   ├── core/            ← Config, database connection, security, dependencies
│   │   ├── models/          ← Database table definitions (SQLAlchemy)
│   │   ├── schemas/         ← Request/response shapes (Pydantic)
│   │   ├── routers/         ← API endpoint handlers (10 router files)
│   │   └── services/        ← External service integrations (MSG91, Cloudinary, search)
│   ├── migrations/          ← Alembic migration files (DB schema history)
│   ├── scripts/             ← One-time admin scripts (seed cities, categories)
│   └── tests/               ← Pytest test suite (54 tests, all passing)
│
├── frontend/                ← Next.js 14 frontend (hybrid SSR on Azure SWA)
│   └── src/
│       ├── app/             ← Pages (file = URL route)
│       ├── components/      ← Reusable UI pieces
│       ├── lib/             ← Utilities, API client, types
│       ├── context/         ← Global state (user, city, language)
│       ├── i18n/            ← Language resolution
│       └── messages/        ← Translation strings (11 JSON files)
│
├── agents/                  ← 8 AI marketing agents
│   ├── instructions/        ← Editable behavior files per agent
│   ├── output/              ← Generated content per city
│   ├── city_launcher.py     ← Seeds listings + businesses via API
│   ├── run_all.py           ← Runs all agents for a city
│   └── ...
│
├── .claude/                 ← Claude Code configuration
│   ├── agents/              ← Claude sub-agent definitions (security-reviewer, db-reviewer)
│   ├── skills/              ← Phase build guides (phase1-mvp, phase2-community, phase3-monetize)
│   └── settings.json        ← PostToolUse hook (reminds to update arch docs)
│
├── .github/workflows/       ← GitHub Actions CI/CD
│   ├── backend-azure.yml    ← Deploy backend on master push
│   ├── frontend-azure.yml   ← Build + deploy frontend on master push
│   └── keepalive.yml        ← Ping health endpoint every 15 min
│
├── ARCHITECTURE.md          ← Full 18-section architecture document
├── ARCHITECTURE_INDEX.md    ← Fast lookup index (read this first)
├── IQ_DOCUMENT.md           ← This file
├── CLAUDE.md                ← Rules for Claude Code
├── BUILD_PLAN.md            ← 14-week build roadmap
└── MARKETING_TASKS.md       ← 29 ordered marketing tasks
```

### How a user request flows through the system

**Example: User opens localsindia.com/hyderabad**
1. Browser fetches `/hyderabad/index.html` from Azure SWA CDN (instant — static file)
2. Next.js hydrates — React takes over in the browser
3. Page loads `PrefsContext` from localStorage (remembers user's city + language)
4. Page calls `GET https://localsindia-backend.azurewebsites.net/api/v1/cities/hyderabad/listings` from browser
5. Backend: FastAPI receives request → `get_db()` opens PostgreSQL session → `listings.py` queries DB → returns JSON
6. Frontend renders the listings using the ListingCard component
7. User clicks WhatsApp button → `wa.me/91XXXXXXXXXX` opens WhatsApp (no backend call needed)

**Example: User posts a listing**
1. User navigates to `/hyderabad/classifieds/post`
2. Page checks `PrefsContext` — if not logged in, redirects to `/auth/login`
3. User fills 3-step form wizard (details → photos → contact)
4. Step 2 uploads photos: `POST /api/v1/upload/image/{listing_id}` → Cloudinary → returns URL
5. Step 3 submits: `POST /api/v1/listings` — backend validates, creates with `status='pending'`
6. Admin gets a badge count update on the admin panel
7. Raj approves → `PATCH /api/v1/admin/listings/{id}/approve` → `status='active'`
8. Listing appears on city page

---

## 6. The Database

**All tables explained in plain English:**

### `users`
Stores every registered user. Key fields:
- `phone` — +91 format, this is the primary login identifier
- `email` — from Google OAuth (optional)
- `name` — display name (collected on first login)
- `role` — either `'user'` (default) or `'admin'` (Raj)
- `lang_pref` — which language they prefer (stored as 2-char code: 'te', 'hi', etc.)
- `city_id` — their home city (optional)
- `deleted_at` — if set, user is soft-deleted (never actually removed from DB — Indian law requires this)
- `is_active` — false = blocked from logging in

### `cities`
List of all Indian cities. Key fields:
- `slug` — URL-safe name used in all URLs (e.g., 'hyderabad', 'vijayawada') — this is the identifier used everywhere
- `state` — which state it's in
- `lang_default` — which language to use by default for this city (e.g., Hyderabad → 'te', Chennai → 'ta')
- `active` — whether to show this city in the city picker

Currently: 496 cities in the database. 18 cities seeded with content.

### `categories`
Types of listings (tiffin, PG/roommate, jobs, vehicles, electronics, events, businesses, services, education).
- `slug` — URL-safe identifier used in category filter URLs
- `parent_id` — for sub-categories (e.g., "Vehicles" > "Two-wheelers")
- `icon` — emoji displayed on the category chip
- `sort_order` — display order on the page

### `listings`
The core table — every classified ad ever posted.
- `user_id` — who posted it
- `city_id` — which city it belongs to
- `category_id` — which category
- `title` — listing headline
- `description` — full details
- `price` — optional (null = "Price on request")
- `contact_phone` — seller's phone (required)
- `whatsapp_url` — `https://wa.me/91XXXXXXXXXX` format (required)
- `area` — neighborhood within city (e.g., "Banjara Hills")
- `status` — lifecycle: `pending` → `active` → `expired`/`fulfilled`/`flagged`/`rejected`
- `is_featured` — paid promotion (amber badge, appears first)
- `report_count` — how many people reported this listing (3 = auto-flagged)
- `expires_at` — listings auto-expire after 30 days (can be renewed)
- `search_vector` — PostgreSQL tsvector column for full-text search (auto-updated by trigger)
- `deleted_at` — soft-delete (never actually deleted — PDPB compliance)

### `listing_images`
Photos attached to a listing. Up to 5 per listing.
- `url` — Cloudinary CDN URL
- `cloudinary_id` — used to delete the image when listing is deleted
- `display_order` — order they appear in the photo gallery

### `listing_reviews`
Star ratings on listings (1-5 stars). One review per user per listing.
- Reviews appear below the listing detail
- After 5 seconds of a WhatsApp click, a prompt asks the user to leave a review

### `businesses`
Permanent business profiles (unlike listings which expire).
- `owner_id` — who claimed this business (initially null = unclaimed)
- `verified` — admin has verified this is a real business
- `avg_rating` — automatically recalculated every time a review is added
- `review_count` — used to show "4.2 ★ (47 reviews)"

### `reviews`
Star ratings on businesses. One review per user per business.

### `events`
Local events (concerts, festivals, workshops, etc.).
- `event_date` — when it happens
- `is_free` — if false, a ticket URL is shown
- `ticket_url` — where to buy tickets (external link)
- `status` — `pending` → `active` → `cancelled`/`completed`

### `reports`
When a user clicks "Report this listing" — stored here.
- 3 reports on the same listing → `report_count` reaches 3 → listing auto-flagged and hidden from public
- Unique constraint: one report per user per listing (prevents spam-reporting)

### `otp_requests`
Stores OTP verification attempts.
- `otp_hash` — the 6-digit OTP is bcrypt-hashed before storage (never stored in plain text)
- `attempts` — how many wrong guesses (max 3 before lockout)
- `expires_at` — OTPs expire after 10 minutes
- `verified` — set to true when user enters correct OTP

---

## 7. The Backend API

**Base URL:** `https://localsindia-backend.azurewebsites.net/api/v1`
**Local dev URL:** `http://localhost:8000/api/v1`

**How routers work:** `main.py` imports all 10 router files and mounts them. Each router file handles one feature area.

### Router: `auth.py` — `/api/v1/auth/*`
Everything about user identity.

| Endpoint | What it does |
|----------|-------------|
| `POST /auth/otp/send` | User enters phone number → generates 6-digit OTP → bcrypt-hashes it → calls MSG91 API (or logs to console in mock mode) → saves to `otp_requests` table. Rate limited: max 5 OTPs per phone per hour. |
| `POST /auth/otp/verify` | User enters the OTP → looks up `otp_requests` → bcrypt-compares → if match: creates user if new + returns JWT tokens. Max 3 wrong attempts → locked out 15 min. |
| `POST /auth/signin` | Existing users sign in with just their phone (no OTP) — for returning users who are already known. Returns JWT tokens. |
| `POST /auth/admin-login` | Admin username + password login. Password checked against bcrypt hash stored in env var. Returns JWT with `role=admin`. |
| `POST /auth/refresh` | When access token expires (after 15 min), frontend sends refresh token here → gets new access token. Refresh token lives 30 days. |
| `GET /auth/google` | Redirects browser to Google OAuth consent screen |
| `GET /auth/google/callback` | Google sends user back here with an auth code → exchange code for Google profile → create/find user → redirect to frontend with JWT tokens |
| `GET /auth/me` | Returns current user's profile (requires valid JWT) |
| `PATCH /auth/me` | Update name or language preference |
| `POST /auth/dev-login` | Skip OTP entirely (only works when `OTP_DEBUG=true` in env) — used during development and testing |

### Router: `cities.py` — `/api/v1/cities/*`
| Endpoint | What it does |
|----------|-------------|
| `GET /cities` | Returns all active cities. Frontend city picker uses this. |
| `GET /cities/{slug}` | Returns one city by slug (e.g., `/cities/hyderabad`) |
| `GET /cities/{slug}/listings` | Returns paginated listings for that city. Supports `?category=`, `?status=`, `?page=`, `?sort=`. |

### Router: `listings.py` — `/api/v1/listings/*`
| Endpoint | What it does |
|----------|-------------|
| `POST /listings` | Create a new listing. Always sets `status='pending'`. Enforces BL-02 (max 10 active per user per city). |
| `GET /listings/mine` | Returns all listings belonging to the current user (for "My Listings" page) |
| `GET /listings/{id}` | Returns one listing with all its photos |
| `PATCH /listings/{id}` | Update a listing (owner only). Can't change city or category. |
| `DELETE /listings/{id}` | Soft-delete a listing (sets `deleted_at = now()`) — owner or admin |
| `POST /listings/{id}/report` | Report a listing as spam/fake. 3 unique reporters → auto-flags listing. |
| `POST /listings/{id}/renew` | Extend a listing's `expires_at` by 30 days (owner only) |
| `POST /listings/{id}/wa-click` | Records that someone clicked the WhatsApp button on this listing (for analytics) |
| `GET /listings/{id}/reviews` | Returns all reviews on a listing |
| `POST /listings/{id}/reviews` | Submit a star rating + text on a listing (one per user) |
| `POST /listings/{id}/fulfill` | Mark listing as sold/fulfilled (owner only — changes status to 'fulfilled') |

### Router: `search.py` — `/api/v1/search`
| Endpoint | What it does |
|----------|-------------|
| `GET /search?q=tiffin&city_slug=hyderabad` | Full-text search using PostgreSQL tsvector. Also falls back to ILIKE for partial matches. Returns ranked results. Parameterized queries — SQL injection impossible. |

### Router: `uploads.py` — `/api/v1/upload/*`
| Endpoint | What it does |
|----------|-------------|
| `POST /upload/image/{listing_id}` | Accepts a photo file → validates JPEG/PNG/WebP, max 5MB → uploads to Cloudinary → saves URL to `listing_images` → returns image URL. Max 5 photos per listing. |
| `DELETE /upload/image/{image_id}` | Deletes photo from both Cloudinary and the database (owner only) |

### Router: `businesses.py` — `/api/v1/businesses/*`
| Endpoint | What it does |
|----------|-------------|
| `GET /businesses?city_slug=hyderabad` | Returns business profiles for that city |
| `POST /businesses` | Create a new business profile (unverified by default) |
| `GET /businesses/{id}` | Business detail with all reviews |
| `PATCH /businesses/{id}` | Update business info (owner or admin) |
| `POST /businesses/{id}/claim` | Claim this business as yours (sets `owner_id` to current user) |
| `POST /businesses/{id}/reviews` | Add a star rating + text review (one per user — 409 on duplicate) |

### Router: `events.py` — `/api/v1/events/*`
| Endpoint | What it does |
|----------|-------------|
| `GET /events?city_slug=hyderabad` | List events for city. Supports `?category=`, `?from_date=`. |
| `POST /events` | Create event → `status='pending'`, needs admin approval |
| `GET /events/{id}` | Event detail |
| `PATCH /events/{id}` | Update event (owner or admin) |
| `DELETE /events/{id}` | Soft-delete (owner or admin) |

### Router: `admin.py` — `/api/v1/admin/*`
All endpoints require JWT with `role=admin`. Raj's management interface.

| Endpoint | What it does |
|----------|-------------|
| `GET /admin/listings/pending` | Returns all listings awaiting approval (oldest first). This is the moderation queue Raj reviews. |
| `GET /admin/listings?status=active` | All listings filterable by status |
| `PATCH /admin/listings/{id}/approve` | Approves a listing → `status='active'` → appears on site |
| `PATCH /admin/listings/{id}/reject` | Rejects a listing → `status='rejected'` → notified to user |
| `GET /admin/events/pending` | Event moderation queue |
| `PATCH /admin/events/{id}/approve` | Approve event |
| `PATCH /admin/events/{id}/reject` | Reject event |
| `GET /admin/users` | All registered users |
| `GET /admin/reports` | All abuse reports on flagged listings |

### Router: `payments.py` — `/api/v1/payments/*`
| Endpoint | What it does |
|----------|-------------|
| `POST /payments/featured/create-order` | Creates a Razorpay payment order for featuring a listing. Returns order_id, amount (Rs.99 or Rs.199), currency. |
| `POST /payments/featured/verify` | After user pays, Razorpay sends back a signature. This endpoint verifies the HMAC signature → if valid, sets `listing.is_featured = true`. |

---

## 8. The Frontend Pages

**How pages work:** Every file in `frontend/src/app/` is a URL route. The folder structure = the URL.

### Homepage — `app/page.tsx` → URL: `/`
**What it shows:** City selector + category grid + fresh listings preview + trust badges
**What it does:**
- Opens city picker modal (CityPickerModal component) when user clicks their city
- Shows 8 category cards (Tiffin, PG, Jobs, etc.) with real listing counts
- Shows "Fresh Listings Near You" — a horizontal scrollable carousel of sample listings
- Geolocation button detects user's city via browser GPS → Nominatim reverse geocoding
- Language selector (globe icon) in top-right lets users switch between 11 languages
- City and language preference saved to localStorage via PrefsContext

### City Home — `app/[city]/page.tsx` → URL: `/hyderabad`
**What it shows:** Featured listings + latest listings for that city
**What it does:**
- Fetches listings from `GET /api/v1/cities/hyderabad/listings`
- Shows 8 category chips — clicking opens that category's listings
- Featured listings (paid) appear at the top with amber badge
- Sort by: newest, price low-high, price high-low

### Category Page — `app/[city]/[category]/page.tsx` → URL: `/hyderabad/jobs`
**What it shows:** All listings in one category for this city
**What it does:**
- Fetches listings filtered by category
- Has JSON-LD structured data (helps Google index these pages as rich results)
- Cross-city links at bottom ("Browse Jobs in Vijayawada")
- SEO-optimized title/description for long-tail search ("jobs in Hyderabad classifieds")

### Search Page — `app/[city]/search/page.tsx` → URL: `/hyderabad/search?q=tiffin`
**What it shows:** Search results + filters
**What it does:**
- Calls `GET /api/v1/search?q=tiffin&city_slug=hyderabad`
- Desktop: sidebar with category + price range + date filters
- Mobile: horizontal category chip row + "More filters" accordion (collapsible)
- Shows skeleton grid while loading (8 placeholder cards)
- Empty state if no results with suggested searches

### Listing Detail — `app/[city]/classifieds/[id]/page.tsx` → URL: `/hyderabad/classifieds/{uuid}`
**What it shows:** Full listing detail — photos, description, seller info, WhatsApp button
**What it does:**
- Server Component wrapper (kept from the static-export era; still a clean split under hybrid SSR) that renders `ListingDetailClient.tsx`
- Photo carousel: swipeable on mobile, click to fullscreen
- WhatsApp button: fixed at the bottom of mobile screen — ALWAYS visible
- Share button: uses `navigator.share()` (mobile native share sheet) with clipboard fallback
- Reviews section: star rating average + all reviews + "Write a Review" form
- 5 seconds after WhatsApp click → animated prompt to leave a review
- Report button in header → `POST /listings/{id}/report`
- If owner: shows Edit button

### Post Listing — `app/[city]/classifieds/post/page.tsx` → URL: `/hyderabad/classifieds/post`
**What it shows:** 3-step wizard to post a new listing
**Step 1 — Details:** Title, category (grid of category cards), description, price (optional), area/neighborhood
**Step 2 — Photos:** Drag-drop zone, up to 5 photos, thumbnail preview with reorder
**Step 3 — Contact:** Phone (prefilled if logged in), WhatsApp toggle, city confirmation
**What it does:**
- Each step validates before allowing "Next"
- Going back does NOT wipe entered data
- On submit: `POST /api/v1/listings` → success screen "Your listing is under review"
- Requires login — redirects to `/auth/login` if not authenticated

### Edit Listing — `app/[city]/classifieds/[id]/edit/page.tsx`
**What it shows:** Same form as post listing but pre-filled with existing data
**What it does:**
- Only accessible by listing owner (checked client-side + enforced by backend)
- Can add/remove photos
- Calls `PATCH /api/v1/listings/{id}` on save

### Promote Listing — `app/[city]/classifieds/[id]/promote/page.tsx`
**What it shows:** Payment screen for featuring a listing
**What it does:**
- Shows Rs.99/week or Rs.199/month options
- Opens Razorpay checkout when user selects a plan
- On payment success: listing gets `is_featured=true`

### Businesses — `app/[city]/businesses/page.tsx` → URL: `/hyderabad/businesses`
**What it shows:** Yellow Pages directory for local businesses
**What it does:** Category filter at top, business cards with star ratings and WhatsApp button

### Business Detail — `app/[city]/businesses/[id]/page.tsx`
**What it shows:** Full business profile + reviews
**What it does:** Star rating, review list, "Write a Review" form, "Claim this business" button (if unclaimed)

### Events — `app/[city]/events/page.tsx` → URL: `/hyderabad/events`
**What it shows:** Upcoming events calendar
**What it does:** Sorted by date, Free/Paid badge, venue and time shown

### City Launch Page — `app/[city]/launch/page.tsx` → URL: `/hyderabad/launch`
**What it shows:** Special landing page when a city goes live
**What it does:**
- Dark navy hero with live listing count from API
- "Why LocalsIndia beats JustDial & OLX" comparison
- "Founding Member" share card with pre-filled WhatsApp message
- Used for PR — link shared when launching a new city

### Invite Page — `app/invite/page.tsx` → URL: `/invite`
**What it shows:** Page to invite businesses and friends
**What it does:** City picker, pre-filled WhatsApp invite message, "Send on WhatsApp" + "Copy link" buttons

### Auth — Login — `app/auth/login/page.tsx` → URL: `/auth/login`
**What it shows:** Login screen with two modes: phone OTP and Google OAuth
**What it does:**
- Existing users: enter phone → direct signin (no OTP needed)
- New users: enter phone → OTP sent via MSG91 → enter OTP → enter name → account created
- Google button: redirect to Google OAuth → comes back as logged in
- Wrapped in React Suspense (Next.js requires this for `useSearchParams` regardless of rendering mode)

### Admin Login — `app/admin/login/page.tsx` → URL: `/admin/login`
**What it shows:** Dark navy login screen for Raj
**What it does:** Username + password form → `POST /api/v1/auth/admin-login` → JWT with admin role

### Admin Panel — `app/admin/listings/page.tsx` → URL: `/admin/listings`
**What it shows:** Moderation queue of pending listings
**What it does:** Approve/reject buttons, 4 status tabs (Pending, Active, Rejected, Flagged)

### Profile — `app/profile/page.tsx` → URL: `/profile`
**What it shows:** User profile settings
**What it does:** Edit name, change language preference, change home city

### My Listings — `app/profile/listings/page.tsx` → URL: `/profile/listings`
**What it shows:** All the user's own listings
**What it does:** Per listing: Edit, Mark as Sold, Renew (extend 30 days), Delete, Promote

---

## 9. The Frontend Components

Components are reusable UI pieces used across multiple pages.

### `ListingCard.tsx`
**What it renders:** A single listing as a card
- Photo (4:3 aspect ratio, blurred placeholder while loading)
- Price badge (top-right corner of photo)
- Category chip (bottom-left of photo)
- Title, area/location, time posted
- Green WhatsApp button at card bottom
- Featured badge (amber) if `is_featured=true`

### `ListingCardSkeleton.tsx`
**What it renders:** Animated gray placeholder — exact same dimensions as ListingCard
Shows while API data is loading. Prevents layout shift.

### `SiteHeader.tsx`
**What it renders:** Sticky top navigation bar
- Logo (left)
- "Browse Cities" (with map pin icon)
- Language selector trigger (2-char ISO code — EN, TE, HI, etc.)
- Sign in link
- "Post Free" CTA button (saffron orange, rounded-2xl)

### `BottomNav.tsx`
**What it renders:** Mobile-only bottom tab bar (hidden on screens ≥768px)
5 tabs: Home, Search, Post (raised saffron button), My Listings, Profile

### `CityPickerModal.tsx`
**What it renders:** Full-screen modal for selecting a city
- Search input filters cities in real time
- "Use Current Location" button with geolocation + reverse geocoding
- Cities grouped by state (South India first)
- Last 3 visited cities shown at top ("Recent")

### `LanguageSelector.tsx`
**What it renders:** Language switching UI
- Desktop: absolute dropdown (3-column grid of 11 language cards)
- Mobile: fixed bottom sheet with drag handle
- Selected language shown as orange dot badge on trigger

### `WhatsAppButton.tsx`
**What it renders:** Green (#25D366) WhatsApp button
- Full-width on listing detail
- Compact at bottom of listing cards
- Opens `wa.me/91XXXXXXXXXX` link in new tab
- Official WhatsApp SVG logo (not Lucide icon)

### `WhatsAppBadge.tsx`
**What it renders:** Small WhatsApp indicator
- 3 variants: `overlay` (floating on listing photo), `pill` (footer CTA), `inline` (list row)
- Uses exact brand green #25D366

### `EmptyState.tsx`
**What it renders:** Friendly "nothing here" state
- Used everywhere a list could be empty (search, my listings, admin queues)
- Props: icon, title, description, optional CTA button

### `FreshListingsSection.tsx`
**What it renders:** Homepage horizontal carousel of sample listings
- 6 cards: Tiffin, PG, iPhone, Activa, Tutor, 2BHK
- Horizontal snap scroll, arrow buttons on desktop
- Framer Motion stagger animation on scroll into view

### `AdBanner.tsx`
**What it renders:** City page banner slot (Phase 3 monetization — Rs.999-2,999/month)

### `ServiceWorker.tsx`
**What it does:** Registers the PWA service worker for offline support
Not visible — pure functionality

---

## 10. Authentication

### How OTP login works (new user flow)
1. User enters phone number (format: 10-digit starting with 6-9)
2. Backend validates format, generates 6-digit OTP, bcrypt-hashes it, saves to `otp_requests`
3. MSG91 API called to send SMS (in mock mode: OTP logged to server console)
4. User enters OTP in 10 minutes window, max 3 attempts
5. Backend bcrypt-compares → if match: checks if user exists
   - Existing user: update last login → return JWT tokens
   - New user: show name input → create user record → return JWT tokens
6. Frontend saves tokens to localStorage via `PrefsContext`

### How JWT auth works
- **Access token:** Lives 15 minutes. Sent as `Authorization: Bearer {token}` header with every API call.
- **Refresh token:** Lives 30 days. When access token expires, `lib/api.ts` automatically calls `POST /auth/refresh` and retries the original request.
- Tokens are stateless — backend doesn't store them, just verifies the signature using `SECRET_KEY`.

### How Google OAuth works
1. User clicks "Continue with Google" → backend redirects to Google consent screen
2. Google sends user back to `/api/v1/auth/google/callback` with an auth code
3. Backend exchanges code for Google profile (email, name, photo)
4. Creates/finds user by email → generates JWT → redirects to frontend with tokens in URL params
5. Frontend (`/auth/callback`) extracts tokens from URL → saves to localStorage

### How admin login works
- Username + password stored as Azure env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`)
- `ADMIN_PASSWORD_HASH` is a bcrypt hash of Raj's password (generated once, never stored plain)
- Returns a JWT with `role=admin` — all admin endpoints check this role

---

## 11. Search

**What it does:** Full-text search across listing titles, descriptions, and categories.

**How it works technically:**
- PostgreSQL has a `search_vector` column on the `listings` table (type: `tsvector`)
- A database trigger automatically updates this column whenever a listing is created or updated
- The vector contains weighted words: title words get higher weight than description words
- Query: `plainto_tsquery('simple', :q)` — converts the search term to a search query
- Ranking: `ts_rank(search_vector, query)` — more matches in title = higher rank
- Fallback: if tsvector finds nothing, falls back to `ILIKE '%tiffin%'` fuzzy match
- **SQL injection is impossible** — uses parameterized queries (`:q` placeholder), never string formatting

**Example:**
- User searches "tiffin near me" in Hyderabad
- `GET /search?q=tiffin+near+me&city_slug=hyderabad`
- Backend: `plainto_tsquery('simple', 'tiffin near me')` → PostgreSQL searches all Hyderabad listings
- Returns listings ranked by relevance (title matches beat description matches)

---

## 12. Image Upload

**Flow:** User selects photo → frontend sends to backend → backend sends to Cloudinary → returns CDN URL

**Constraints enforced by backend:**
- File types: JPEG, PNG, WebP only (rejects GIF, SVG, etc.)
- Max size: 5MB per photo
- Max count: 5 photos per listing

**Cloudinary:** Automatically generates:
- Multiple sizes (thumbnail, medium, full)
- WebP format (smaller files)
- Global CDN (fast anywhere in India)
- URLs stored in `listing_images.url`

**Mock mode:** If `CLOUDINARY_CLOUD_NAME` env var not set → saves to `/tmp/` locally (for development)

---

## 13. Payments

**Currently live but needs Razorpay KYC registration before going live for users.**

**Flow for featuring a listing:**
1. Listing owner clicks "Promote this listing" on their listing
2. Selects Rs.99/week or Rs.199/month
3. Frontend calls `POST /payments/featured/create-order` → backend creates Razorpay order → returns `order_id`
4. Frontend loads Razorpay checkout SDK → opens payment modal (UPI, card, net banking)
5. User pays → Razorpay calls webhook + frontend receives `payment_id` and `signature`
6. Frontend calls `POST /payments/featured/verify` with the signature
7. Backend verifies HMAC signature (prevents fake payment confirmations)
8. If valid: sets `listing.is_featured = true` → listing moves to top of city grid with amber badge

---

## 14. The Admin Panel

**URL:** localsindia.com/admin/login (not linked publicly)
**Credentials:** Username = `localsindia_admin`, Password = set in Azure env var

### What the admin panel shows

**Listings tab** — The main moderation queue:
- All new listings start here in "Pending" tab
- Raj reviews: approve (makes it live) or reject (with optional reason)
- Flagged listings (3+ reports) — review and either remove or clear the flag
- Can filter by: Pending / Active / Rejected / Flagged

**Events tab** — Same as listings but for events

**Users tab** — All registered users
- Can see when they joined, phone/email, how many listings
- Can disable accounts (sets `is_active=false`)

**Reports tab** — All abuse reports
- Shows the listing + who reported it + reason
- Raj decides whether to remove the listing

### How to moderate efficiently
1. Check Pending tab daily — approve genuine listings, reject spam
2. Check Reports tab weekly — review flagged content
3. Listings auto-expire after 30 days — users can renew from "My Listings"

---

## 15. Infrastructure

### Azure Resources (all in resource group `localsindia-rg`)

**Azure Static Web Apps (SWA) Free:**
- Hosts the Next.js frontend in **hybrid SSR mode** (no more pure static export — migrated off it because pre-building all cities timed out the CDN distribution step on every deploy)
- Auto-deploys from GitHub Actions on master push; `develop` → `master` PRs also get a temporary staging preview environment (auto-created on PR open, auto-torn-down on merge/close)
- Global CDN at the edge + on-demand server rendering for city/listing pages
- `staticwebapp.config.json` — now minimal: `apiRuntime: node:18` (tells Azure to provision the managed SSR runtime) + security headers
- `next.config.mjs` — no `output: 'export'`; normal Next.js build, image optimization disabled, webpack cache disabled

**Azure App Service F1 (Free):**
- Hosts the Python FastAPI backend
- Runs as a Docker container (see `backend/Dockerfile`)
- F1 tier sleeps after 20 min inactivity — GitHub Actions keepalive cron pings every 15 min to prevent cold starts
- All env vars stored in Azure Portal → App Service → Configuration

**Azure PostgreSQL Flexible Server B1ms:**
- The database
- Only backend can connect (private endpoint)
- Connection string uses `ssl=true` — required for Azure
- Run `alembic upgrade head` via SSH or Azure CLI when new migrations are needed

### GitHub Actions Workflows

**`frontend-azure.yml`** — triggers on push to `master`, and on PRs into `master`:
1. Checks out code
2. `azure/static-web-apps-deploy` action builds the Next.js app and deploys it to Azure SWA's managed hybrid SSR runtime (no manual `out/` folder step — Azure's Oryx build system handles the Next.js-specific build)
3. On `push`/`workflow_dispatch`: deploys straight to production
4. On `pull_request` opened/updated: deploys to a temporary staging environment, posts the preview URL as a PR comment
5. On `pull_request` closed: tears the staging environment down (`close-staging` job)

**`backend-azure.yml`** — triggers on push to `master`:
1. Checks out code
2. Logs into Azure
3. Deploys backend to Azure App Service (builds Docker image)

**`keepalive.yml`** — triggers every 15 minutes (cron):
1. Sends `GET` request to `/api/v1/health`
2. Azure keeps the backend warm (prevents 20-second cold start for first user)

### Why hybrid SSR instead of static export?
We started on static export because Azure SWA Free tier doesn't run a custom Next.js server. But static export meant pre-building every city page at deploy time — at 496+ cities that ballooned to a 200 MB / 11,355-file export that timed out Azure's CDN distribution step on every single deploy. Azure SWA's hybrid SSR support (a managed Node.js runtime it provisions automatically) solved this: city/listing pages now render on demand, server-side, the first time anyone visits them — no pre-build explosion, same free tier.

---

## 16. The AI Marketing System

Located in: `C:\Users\rajes\localindia\agents\`

**Purpose:** When a new city is launched, these agents automate the content creation work that would otherwise take hours per city.

### How it works

Each agent:
1. Reads its instruction file from `agents/instructions/{agent_name}.md` (editable without code changes)
2. Reads a shared product context (what LocalIndia is, what's built)
3. Calls Claude Haiku API with a city-specific prompt
4. Saves output to `agents/output/{city_slug}/{content_type}.json`

### The 8 Agents

| Agent | File | What it creates |
|-------|------|----------------|
| **CityLauncher** | `city_launcher.py` | Seeds 20 classified listings + 10 business profiles in a city via the live API. This is the most important agent — it makes a new city look active. Run this first for every new city. |
| **SEOAgent** | `seo_agent.py` | Generates optimized title, meta description, JSON-LD structured data, and keyword list for each city's page |
| **ContentWriter** | `content_writer.py` | Writes a blog introduction, SEO guide, and FAQ for the city |
| **WhatsAppAgent** | `whatsapp_agent.py` | Creates 5 WhatsApp forward messages in English + regional language Unicode script — designed to spread naturally in Indian group chats |
| **RedditAgent** | `reddit_agent.py` | Writes two Reddit post drafts — one for r/india, one for the city-specific subreddit — in founder voice |
| **CROAgent** | `cro_agent.py` | Analyzes key pages and suggests conversion rate optimization improvements |
| **FeedbackAgent** | `feedback_agent.py` | Creates 8 community response templates for common support situations (listing not showing, spam reports, etc.) |
| **GrowthTracker** | `growth_tracker.py` | Fetches live data from the API → generates a weekly report showing which cities have content, which need seeding, and what to do next |

### How to run agents

**Seed a new city (most common):**
```bash
cd C:\Users\rajes\localindia
python agents/city_launcher.py --city "Chennai" --lang "ta" --state "Tamil Nadu"
```

**Run all agents for a city:**
```bash
python agents/run_all.py --city "Chennai" --lang "ta" --state "Tamil Nadu"
```

**Get a growth report:**
```bash
python agents/growth_tracker.py
```

**Required:** `agents/.env.agents` file with:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
LOCALINDIA_ADMIN_PASSWORD=...
LOCALINDIA_API_URL=https://localsindia-backend.azurewebsites.net
```
**NEVER commit this file to git.** It's gitignored.

### AI Auto-Video Marketing
LocalIndia is also connected to the AI Content Studio (`C:\Users\rajes\ai-content-platform\`):
- 4 marketing videos per day (Telugu, Hindi, Tamil, English)
- Topics pulled from live LocalIndia API (real listing counts)
- Videos auto-publish to YouTube Shorts
- 1,460 marketing videos/year — zero manual work

---

## 17. City Seeding

### State-by-state seeding order (planned)
1. ✅ Andhra Pradesh (10 cities seeded)
2. ✅ Telangana (8 cities seeded)
3. 🔜 Tamil Nadu — say "start seeding" to begin (next)
4. Karnataka
5. Kerala
6. Maharashtra (Mumbai, Pune)
7. Delhi / NCR
8. Gujarat
9. West Bengal (Kolkata)
10. Rest of India

### Tamil Nadu cities (next batch)
Cities: Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Tirunelveli, Vellore, Erode, Thoothukudi, Dindigul
Language: `ta` (Tamil)

Command for each city:
```bash
python agents/city_launcher.py --city "Chennai" --lang "ta" --state "Tamil Nadu"
```

### Seeding produces:
- 20 classified listings (tiffin, PG, tutors, vehicles, electronics, jobs, services)
- 10 business profiles (restaurants, coaching centers, repair shops)
- All with realistic Telugu/Tamil/Kannada content and proper WhatsApp links

---

## 18. How to Manage Day-to-Day

### Daily (5 minutes)
1. Check admin panel at localsindia.com/admin/login
2. Approve any new listings in the Pending tab
3. If more than 5 reports on any listing — review and decide

### Weekly (30 minutes)
1. Run growth tracker: `python agents/growth_tracker.py`
2. Look at which cities have < 5 listings — seed them
3. Check Reports tab — review flagged content

### When launching a new city
1. Run city_launcher: `python agents/city_launcher.py --city "Chennai" --lang "ta" --state "Tamil Nadu"`
2. Run social publisher: `python agents/social_publisher.py --city "Chennai" --lang "ta" --state "Tamil Nadu"`
3. Share the launch page URL: `localsindia.com/chennai/launch`
4. Manually approve the seeded listings (they'll be in pending queue)

### When a bug is found
1. Fix in code
2. Run tests: `cd backend && pytest tests/ -x -q`
3. Run build: `cd frontend && npm run build && npm run lint`
4. If both pass: `git add` specific files → `git commit` → `git push origin master`
5. GitHub Actions auto-deploys (takes ~3 minutes)

### When adding a new feature
**MANDATORY:** Update both `ARCHITECTURE_INDEX.md` AND `ARCHITECTURE.md` before finishing.
- `ARCHITECTURE_INDEX.md` — add row to Feature Map, add file to File Index, add endpoints to Endpoint Index
- `ARCHITECTURE.md` — add the full section for the new feature

---

## 19. Business Rules — Never Break These

These are enforced in code. Do not remove them.

| Rule | What it says | Why |
|------|-------------|-----|
| **BL-02** | Max 10 active listings per user per city | Prevents spam flooding. Exception: admin users are exempt. |
| **BL-04** | 3 unique reports → listing auto-flagged | Community self-moderation. Reduces Raj's moderation load. |
| **BL-06** | OTP: max 3 wrong attempts → 15-min lockout | Prevents brute-force OTP guessing |
| **BL-07** | Max 5 OTPs per phone per hour | Prevents SMS bombing abuse |
| **BL-08** | Photos: JPEG/PNG/WebP only, max 5MB, max 5 per listing | Prevents server overload and format abuse |
| **BL-11** | New listing always `status='pending'` | Every listing must be reviewed before going live |
| **PDPB** | Soft-delete only — never hard-delete users or listings | Indian Personal Data Protection Bill compliance |
| **PHONE** | +91[6-9]XXXXXXXXXX format | Rejects invalid/foreign phone numbers |
| **WA-URL** | https://wa.me/91XXXXXXXXXX format | Ensures WhatsApp links are valid |

---

## 20. What's Built vs What's Coming

### Phase 1 — MVP (COMPLETE ✅)
- User registration (OTP + Google OAuth)
- Post, browse, search, edit, delete listings
- Photo upload (Cloudinary)
- Admin moderation panel
- 11-language support
- PWA (offline support)
- Deployed live on Azure

### Phase 2 — Community (COMPLETE ✅)
- Events calendar (post, browse, admin approve)
- Business directory with star ratings
- Seller reviews on listings
- WhatsApp Verified Badge
- 496 cities in DB, 18 cities seeded
- 8 AI marketing agents
- AI auto-video (4 videos/day on YouTube)
- SEO: sitemap, robots.txt, structured data, Google Search Console verified
- City launch pages + Invite page
- 87/87 E2E tests passing
- 54/54 backend pytest passing

### Phase 3 — Monetization (WAITING on Razorpay)
**Backend already built for this (routers/payments.py exists).**
Waiting for: Raj to complete Razorpay merchant registration (requires Indian business documents).

Will enable:
- Featured listings (Rs.99/week, Rs.199/month)
- Business ad banners (Rs.999-2,999/month)
- Event ticketing with QR codes
- Verified business badge (paid)

### Phase 4 — Planned (future)
- Remember Device (30-day trust) — full spec ready in `localindia_device_trust.md` memory file
- Reddit auto-poster (waiting for Reddit API credentials)
- Analytics dashboard for business owners
- Listing content translation (currently deferred — only translate when users demand it)
- 700+ cities (seed_cities_full.py already written)

---

## 21. Key Numbers

| Metric | Value |
|--------|-------|
| Rendering mode | Hybrid SSR (Azure SWA managed runtime) — not pre-built static pages |
| Cities in database | 496+ |
| Cities seeded with content | 51 (AP: 10, Telangana: 8, Tamil Nadu: 10, Karnataka: 9, Kerala: 8, Maharashtra: 6) |
| Languages supported | 11 |
| Backend tests | 54 passing |
| E2E Playwright tests | 87 passing |
| API endpoints | 50+ |
| DB tables | 11 |
| Frontend pages | 29+ |
| Frontend components | 15+ |
| AI marketing agents | 8 |
| Videos auto-generated/year | 1,460 |
| Monthly infra cost | ~Rs.1,600 (DB only — everything else free) |

---

## 22. Secrets and Credentials

**NEVER store these in git. All are in Azure env vars or local .env files.**

### Azure App Service env vars (backend)
| Variable | What it is | Status |
|----------|-----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Live |
| `SECRET_KEY` | JWT signing key | ✅ Live |
| `FRONTEND_URL` | https://www.localsindia.com | ✅ Live |
| `ENVIRONMENT` | production | ✅ Live |
| `OTP_DEBUG` | true = OTP shown on screen (disable when MSG91 ready) | Set to true |
| `MSG91_AUTH_KEY` | SMS sending key | ❌ Not set (mock mode) |
| `MSG91_TEMPLATE_ID` | SMS template ID | ❌ Not set |
| `CLOUDINARY_CLOUD_NAME` | dbgoijryf | ✅ Live |
| `CLOUDINARY_API_KEY` | 436189718573935 | ✅ Live |
| `CLOUDINARY_API_SECRET` | (set) | ✅ Live |
| `GOOGLE_CLIENT_ID` | 919627354106-... | ✅ Live |
| `GOOGLE_CLIENT_SECRET` | (set) | ✅ Live |
| `GOOGLE_REDIRECT_URI` | .../auth/google/callback | ✅ Live |
| `ADMIN_USERNAME` | localsindia_admin | ✅ Live |
| `ADMIN_PASSWORD_HASH` | bcrypt hash | ✅ Live |

### GitHub Actions secrets
| Secret | What it is |
|--------|-----------|
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | Azure service principal for deployment |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend build |

### Local agent secrets — `agents/.env.agents` (NEVER commit)
| Variable | What it is |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Claude API key for AI agents |
| `LOCALINDIA_ADMIN_PASSWORD` | Admin password for city seeder |
| `LOCALINDIA_API_URL` | Backend URL for agents |

---

## 23. Pending Registrations

These are external registrations that Raj needs to complete. Claude cannot do them — they require Indian documents.

### 1. MSG91 DLT Registration (enables real OTP SMS)
**Current state:** Mock mode — OTP is shown on screen (`OTP_DEBUG=true`). Real users can still log in because dev-login works, but real SMS not sent.

**Steps:**
1. Get Udyam certificate at udyamregistration.gov.in (MSME registration, free)
2. Go to vilpower.in (DLT portal for telecom)
3. Register and get a Principal Entity (PE) ID
4. Register Header: `LINDIA`
5. Register Template (the OTP SMS text)
6. Set in Azure: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`
7. Set `OTP_DEBUG=false`

### 2. Razorpay Registration (enables Phase 3 payments)
**Current state:** Razorpay code built and ready. Just needs live API keys.

**Steps:**
1. Register at razorpay.com as Indian business owner
2. Complete KYC (PAN card, bank account)
3. Get test keys first, then live keys
4. Set in Azure: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
5. Set in GitHub Actions: `NEXT_PUBLIC_RAZORPAY_KEY_ID`

### 3. Google OAuth Branding Verification
**Current state:** Under review (submitted 2026-06-09). No action needed — wait.

### 4. Social Media Accounts (enables auto-posting agents)
- Facebook Page for LocalsIndia
- Instagram Business account
- WhatsApp Channel for LocalsIndia
- Meta Developer App (App ID needed to build auto-post agents)

### 5. Google AdSense (future passive revenue)
- Apply at adsense.google.com once site has 3+ months of traffic

---

## Quick Reference — Most Common Commands

```bash
# === LOCAL DEVELOPMENT ===
cd C:\Users\rajes\localindia
docker-compose up -d                              # Start local PostgreSQL
cd backend && uvicorn app.main:app --reload       # Backend on :8000
cd frontend && npm run dev                        # Frontend on :3000

# === TESTING ===
cd backend && pytest tests/ -x -q                 # All backend tests
cd frontend && npm run build && npm run lint       # Frontend build check
node frontend/localsindia_test.js                 # 87-check E2E audit

# === DATABASE ===
cd backend && alembic upgrade head                # Apply new migrations
cd backend && python scripts/seed_cities_full.py  # Seed all 496+ cities

# === AI AGENTS ===
python agents/city_launcher.py --city "Chennai" --lang "ta" --state "Tamil Nadu"
python agents/run_all.py --city "Chennai" --lang "ta" --state "Tamil Nadu"
python agents/growth_tracker.py
python agents/social_publisher.py --city "Chennai" --lang "ta" --state "Tamil Nadu"

# === DEPLOY ===
git add <specific files>
git commit -m "description"
git push origin master                            # Triggers Azure auto-deploy

# === ARCHITECTURE DOCS (always update after adding features) ===
# Read ARCHITECTURE_INDEX.md to find anything
# Update ARCHITECTURE_INDEX.md + ARCHITECTURE.md after every new feature
```

---

*Read `ARCHITECTURE_INDEX.md` for fast file/endpoint/table lookups.*
*Read `ARCHITECTURE.md` for deep detail on any specific section.*
*Read `MARKETING_TASKS.md` for 29 ordered marketing actions.*
*Read `BUILD_PLAN.md` for the original 14-week phase roadmap.*
