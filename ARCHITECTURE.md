# LocalIndia — Full Architecture Document

> **What this is**: India's hyperlocal community platform — think Indian JustDial + OLX + Facebook Marketplace, built for small cities. Users post classifieds (tiffin, PG, jobs), find local businesses, discover events — all in their own language, contacted via WhatsApp.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack at a Glance](#2-tech-stack-at-a-glance)
3. [How a Request Flows](#3-how-a-request-flows)
4. [Backend Architecture](#4-backend-architecture)
5. [Database — All 11 Tables Explained](#5-database--all-11-tables-explained)
6. [API Endpoints — Every Route](#6-api-endpoints--every-route)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Every Page Explained](#8-every-page-explained)
9. [Every Component Explained](#9-every-component-explained)
10. [Business Rules (Hard-Coded Laws)](#10-business-rules-hard-coded-laws)
11. [Security — How Auth Works](#11-security--how-auth-works)
12. [Payments — Razorpay Integration](#12-payments--razorpay-integration)
13. [Image Upload — Cloudinary](#13-image-upload--cloudinary)
14. [Search — PostgreSQL Full-Text](#14-search--postgresql-full-text)
15. [Internationalization — 11 Languages](#15-internationalization--11-languages)
16. [CI/CD — Azure Auto-Deploy](#16-cicd--azure-auto-deploy)
17. [Infrastructure Map](#17-infrastructure-map)
18. [What Each File Does — Quick Reference](#18-what-each-file-does--quick-reference)

---

## 1. System Overview

```
User's Phone (375px)
      |
Azure Static Web Apps  <--- Next.js 14 hybrid SSR (Azure-managed Node functions; city pages render on demand)
      | (API calls)
Azure App Service       <--- FastAPI Python server (11 routers, 60+ endpoints)
      | (SQL)
Azure PostgreSQL         <--- 11 tables, full-text search, soft-delete everywhere
      | (side effects)
Cloudinary              <--- listing photos (upload/delete)
MSG91                   <--- OTP SMS to Indian phones
Razorpay                <--- featured listing payments
Google OAuth            <--- social sign-in (web + mobile deep-link)
```

**One-line summary of each tier:**
- **Frontend**: Next.js hybrid SSR via Azure SWA's managed Node runtime — city/listing pages render on demand server-side, no pre-build explosion; works in 11 Indian languages
- **Backend**: FastAPI REST API with 13 routers — validates requests, enforces business rules, talks to DB; rate-limiting via slowapi
- **Database**: PostgreSQL — stores everything, full-text search built-in via tsvector; 12 tables
- **Infrastructure**: Azure — auto-deploys on every git push to master; `develop` branch gets a PR-preview staging environment; NOTE: `az webapp deploy` step times out after ~13 min consistently even when deploy succeeds — app starts correctly on its own restart

> **Architecture change (commit `3a60dd1`):** the frontend was migrated OFF `output: 'export'` static export and onto Azure SWA's hybrid SSR support. The old "5,638 pre-built pages" static-export model is gone — see §7 for what replaced it. This single fact invalidates anything written before this section that assumes pure static HTML.

---

## 2. Tech Stack at a Glance

| Layer | What | Why |
|-------|------|-----|
| Frontend framework | Next.js 14 (App Router) | SSG export = fast loads, Azure SWA compatible |
| UI components | shadcn/ui (Radix primitives) | Accessible, copy-owned (no breaking updates) |
| Animations | Framer Motion v11 | Smooth 60fps transitions on mobile |
| Icons | Lucide React | Lightweight, consistent |
| Fonts | Noto Sans family | Covers all 11 Indian scripts, zero FOUT |
| Styling | Tailwind CSS | Utility-first, mobile-first easy |
| i18n | next-intl | URL-based locale, JSON message files |
| API layer | Custom typed fetch (lib/api.ts) | Auto JWT refresh, typed params |
| Backend | FastAPI 0.115 + Python 3.12 | Async, fast, auto-generates OpenAPI docs |
| ORM | SQLAlchemy 2.0 async | Type-safe DB operations, async sessions |
| DB driver | asyncpg | Fastest PostgreSQL async driver for Python |
| Auth tokens | JWT (HS256) | Stateless, 15-min access + 30-day refresh |
| Password/OTP | bcrypt | Industry-standard hash, salt built-in |
| Migrations | Alembic | SQL schema versioning |
| Images | Cloudinary | Global CDN, auto-format/compress |
| SMS OTP | MSG91 | Indian telecom OTP gateway |
| Payments | Razorpay | India's dominant payment gateway |
| Hosting backend | Azure App Service | Always-on Python container |
| Hosting frontend | Azure Static Web Apps | Free tier, global CDN |
| Database | Azure PostgreSQL | Managed, auto-backup |
| CI/CD | GitHub Actions | Auto-deploy on push to master |

---

## 3. How a Request Flows

### Viewing a listing (e.g. `/hyderabad/classifieds/abc123`)

```
1. Browser hits Azure CDN
2. CDN serves pre-built HTML (no server involved -- it's static)
3. React hydrates -- ListingDetailClient.tsx mounts
4. useEffect fires -> api.listings.get('abc123')
5. fetch() -> GET https://api.localsindia.com/api/v1/listings/abc123
6. FastAPI router/listings.py validates listing exists + not deleted
7. SQLAlchemy loads listing + images from PostgreSQL
8. JSON response -> React renders photos, price, WhatsApp button
```

### Posting a listing

```
1. User fills 3-step form -> clicks Submit
2. api.listings.create(data, token) -> POST /api/v1/listings
3. FastAPI extracts Bearer token from Authorization header
4. core/deps.py -> decode JWT -> lookup user in DB
5. routers/listings.py:
   a. Validates phone regex (+91[6-9]XXXXXXXXXX)
   b. Checks user has < 10 active listings in this city (BL-02)
   c. Inserts listing with status='pending' (BL-11 -- never 'active' directly)
6. Listing enters admin moderation queue
7. Admin approves -> PATCH /admin/listings/{id}/approve -> status='active'
8. Now visible on city page
```

### OTP login flow

```
1. User types phone +91XXXXXXXXXX
2. POST /api/v1/auth/otp/send
   -> routers/auth.py checks: max 5 OTPs per phone per hour (BL-07)
   -> generates 6-digit OTP via security.generate_otp()
   -> bcrypt-hashes OTP -> saves to otp_requests table
   -> sends SMS via msg91.send_otp() (or logs to console in dev)
3. User types 6-digit OTP
4. POST /api/v1/auth/otp/verify
   -> finds latest un-verified otp_request for phone
   -> checks attempt count < 3 (BL-06)
   -> bcrypt.verify(submitted_otp, stored_hash)
   -> if first time -> creates user record
   -> returns {access_token, refresh_token, user, is_new_user}
5. Frontend stores tokens in localStorage
6. All subsequent API calls send: Authorization: Bearer <access_token>
```

---

## 4. Backend Architecture

### Directory: `backend/app/`

```
app/
+-- main.py               <- FastAPI app, routers mounted, CORS config
+-- core/
|   +-- config.py         <- All environment variables (Pydantic Settings)
|   +-- database.py       <- SQLAlchemy async engine + session factory
|   +-- security.py       <- JWT create/verify, bcrypt hash/verify, OTP generator
|   +-- deps.py           <- FastAPI dependency injection (get_current_user, get_current_admin)
+-- models/               <- SQLAlchemy ORM models (1 file per DB table)
+-- schemas/              <- Pydantic schemas (request validation + response shaping)
+-- routers/              <- API endpoint handlers (1 file per feature area)
+-- services/             <- Third-party integrations (MSG91, Cloudinary, Search)
```

### `main.py` — The Entry Point

FastAPI creates the app here. All 13 routers are registered under `/api/v1/`:

```python
app.include_router(auth_router,          prefix="/api/v1/auth")
app.include_router(cities_router,        prefix="/api/v1/cities")
app.include_router(categories_router,    prefix="/api/v1/categories")
app.include_router(listings_router,      prefix="/api/v1")
app.include_router(uploads_router,       prefix="/api/v1/upload")
app.include_router(search_router,        prefix="/api/v1/search")
app.include_router(admin_router,         prefix="/api/v1/admin")
app.include_router(events_router,        prefix="/api/v1")
app.include_router(businesses_router,    prefix="/api/v1")
app.include_router(payments_router,      prefix="/api/v1/payments")
app.include_router(users_router,         prefix="/api/v1/users")
app.include_router(chat_router,          prefix="/api/v1")
app.include_router(saved_searches_router,prefix="/api/v1")
```

Also has slowapi rate-limit exception handler (`_rate_limit_exceeded_handler`) and keepalive/debug endpoints at `/api/v1/health`.

CORS is configured to allow requests from `localsindia.com`, `www.localsindia.com`, and `localhost:3000`. This means only the frontend can call the backend (browser security).

Health check: `GET /api/v1/health` -> `{"status":"ok"}` -- used by Azure keep-alive pings.

### `core/config.py` — Environment Variables

All secrets and config loaded from environment variables (`.env` in dev, Azure App Service settings in prod):

| Variable | What it controls |
|----------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string (asyncpg format) |
| `SECRET_KEY` | Signs all JWT tokens -- rotate this in prod |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 15 minutes -- how long a login session lasts before auto-refresh |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 30 days -- how long until user must log in again |
| `MSG91_AUTH_KEY` | Indian OTP SMS gateway -- if missing, OTPs print to console (dev mock) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth app credentials |
| `CLOUDINARY_*` | Image CDN credentials -- if missing, images save to /tmp (dev mock) |
| `RAZORPAY_KEY_ID/SECRET` | Payment gateway -- Week 11-12 feature |
| `ADMIN_USERNAME/PASSWORD_HASH` | Admin panel login (bcrypt hash) |
| `OTP_DEBUG` | If `true`, OTP returned in API response (never enable in prod) |

### `core/database.py` — Database Connection

Creates one async SQLAlchemy engine connected to PostgreSQL. The `get_db()` function is a FastAPI dependency -- every route that needs DB access declares it:

```python
async def get_listings(db: AsyncSession = Depends(get_db)):
    # db is an open connection, auto-closed when request ends
```

SSL is extracted from the connection URL and passed as `connect_args` -- required for Azure PostgreSQL which enforces SSL.

### `core/security.py` — Auth Primitives

Six functions that handle all authentication cryptography:

| Function | What it does |
|----------|-------------|
| `hash_password(pwd)` | One-way bcrypt hash -- stores this, never plain text |
| `verify_password(plain, hashed)` | Checks if submitted password matches stored hash |
| `create_access_token(user_id)` | JWT with 15-min expiry, signed with SECRET_KEY |
| `create_refresh_token(user_id)` | JWT with 30-day expiry -- used to get new access tokens |
| `decode_token(token)` | Reads user_id from JWT -- returns None if expired/invalid |
| `generate_otp()` | Random 6-digit number (100000-999999) |

### `core/deps.py` — Request-Level Auth

Two FastAPI dependencies injected into protected routes:

- **`get_current_user()`**: Reads `Authorization: Bearer <token>` header -> decodes JWT -> loads user from DB -> raises 401 if invalid/not found/deleted
- **`get_current_admin()`**: Calls `get_current_user()` first, then checks `user.role == 'admin'` -> raises 403 if not admin

Example usage in a route:
```python
@router.post("/listings")
async def create_listing(
    data: ListingCreate,
    current_user: User = Depends(get_current_user),  # <- requires valid JWT
    db: AsyncSession = Depends(get_db)
):
```

---

## 5. Database — All 11 Tables Explained

### `users` — People who use the platform

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | Unique identifier |
| `phone` | String, unique | +91XXXXXXXXXX -- primary identifier for Indian users |
| `email` | String, unique | From Google OAuth |
| `name` | String | Display name shown on listings |
| `avatar_url` | String | Profile photo URL |
| `role` | Enum | `user` / `admin` / `business_owner` |
| `city_id` | FK->cities | User's home city |
| `lang_pref` | Enum | Preferred language (en/hi/te/ta/kn/mr/bn/gu/pa/ml/or) |
| `is_active` | Boolean | `false` = account suspended |
| `deleted_at` | DateTime | Soft-delete timestamp (PDPB compliance -- never hard-delete) |
| `referral_code` | String(12), unique, indexed | 8-char generated code (2026-07-18) — every user gets one, lazily backfilled for pre-feature accounts on their next `/auth/me` call |
| `referred_by_user_id` | FK->users, nullable, SET NULL on delete | Whoever's code this user signed up with, if any (2026-07-18) |
| `referral_rewards_count` | Integer, default 0 | Denormalized counter — how many referred signups have earned this user a reward, capped at 20 (2026-07-18) |

**Why soft-delete?** India's Personal Data Protection Bill requires audit trails. Hard-deleting users could violate compliance.

---

### `cities` — 496+ Indian cities

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | Unique ID |
| `name` | String | "Hyderabad", "Visakhapatnam" |
| `state` | String | "Telangana", "Andhra Pradesh" |
| `slug` | String, unique | URL-safe: "hyderabad", "visakhapatnam" |
| `lang_default` | Enum | Default language for this city (te for AP/Telangana, ta for TN, etc.) |
| `active` | Boolean | Hidden cities have `active=false` |

The slug becomes the URL: `/hyderabad/classifieds` -> city slug is "hyderabad".

---

### `categories` — Listing types

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `name` | String | "Tiffin Services", "PG / Roommate" |
| `slug` | String | "tiffin", "pg-roommate" |
| `icon` | String | Icon name for display |
| `parent_id` | FK->self | Sub-categories (e.g., Electronics -> Mobile Phones) |
| `sort_order` | Integer | Display order in UI |

---

### `listings` --- The core product

Every classified ad posted on the platform. This is the most important table.

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `user_id` | FK->users | Who posted it |
| `city_id` | FK->cities | Which city |
| `category_id` | FK->categories | What type of listing |
| `title` | String(150) | "1 BHK Flat for Rent - Madhapur" |
| `description` | Text | Full details |
| `price` | Numeric(12,2) | Rs. amount, nullable = "Price on request" |
| `area` | String | Neighbourhood within city |
| `contact_phone` | String | Seller's contact (validated +91 format) |
| `whatsapp_url` | String | `https://wa.me/91XXXXXXXXXX` |
| `website_url` | String | Seller's website |
| `social_url` | String | Facebook/Instagram |
| `status` | Enum | `pending` -> `active` -> `expired`/`fulfilled`/`rejected`/`flagged` |
| `is_featured` | Boolean | Paid promotion -- shows at top |
| `report_count` | Integer | Auto-increments on reports; at 3 -> auto-flagged (BL-04) |
| `expires_at` | DateTime | 30 days from posting; can be renewed |
| `wa_verified` | Boolean | WhatsApp button was clicked at least once |
| `view_count` | Integer | Incremented by POST /listings/{id}/view on every detail page open |
| `contact_click_count` | Integer | Incremented by POST /listings/{id}/wa-click on every WhatsApp tap |
| `last_renewed_at` | DateTime | Timestamp of last renewal; enforces 24h cooldown |
| `search_vector` | TSVECTOR | Auto-computed from title+description for full-text search |
| `latitude` | Numeric(9,6), nullable | Approximate seller device location at post time (2026-07-16, migration `f906010e814a`) — optional, only set if location permission granted; drives Haversine distance ordering |
| `longitude` | Numeric(9,6), nullable | Paired with `latitude` above |
| `deleted_at` | DateTime | Soft-delete |

*(Note: `featured_at`/`featured_until` columns exist in production per migration `c5d6e7f8a9b0` but are not yet reflected in this table listing — pre-existing doc gap, see ARCHITECTURE_INDEX.md's DB Table Index for the current full column list.)*

**Status lifecycle:**
```
(post) -> pending -> (admin approve) -> active -> (30 days pass) -> expired
                  -> (admin reject)  -> rejected
                  -> (3 reports)     -> flagged (hidden from public)
                  -> (owner marks)   -> fulfilled
```

---

### `listing_images` — Photos for listings

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `listing_id` | FK->listings | Which listing |
| `url` | Text | Cloudinary CDN URL |
| `cloudinary_id` | Text | Used to delete from Cloudinary |
| `display_order` | Integer | Order in carousel (0 = main photo) |

Max 5 images per listing (BL-08). Images are deleted from Cloudinary when listing is deleted.

---

### `listing_reviews` — User reviews on listings

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `listing_id` | FK->listings | Which listing |
| `user_id` | FK->users | Reviewer |
| `rating` | Integer | 1-5 stars |
| `body` | Text, nullable | Review text |

Constraint: One review per user per listing (unique on listing_id + user_id).

---

### `businesses` — Local business directory

Separate from classifieds -- these are permanent business profiles (think Yellow Pages).

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `city_id` | FK->cities | |
| `owner_id` | FK->users, nullable | Claimed by a registered user |
| `category_id` | FK->categories, nullable | Type of business |
| `name` | String(150) | "Sri Krishna Tiffin Center" |
| `description` | Text | About the business |
| `address` | Text | Street address |
| `phone` | String | Contact number |
| `whatsapp_url` | String | WhatsApp link |
| `website_url` | String | |
| `verified` | Boolean | Admin-verified legitimate business |
| `avg_rating` | Numeric(3,2) | Recalculated on each review |
| `review_count` | Integer | Total reviews count |

---

### `reviews` — Reviews on businesses

Same structure as listing_reviews but for businesses. One review per user per business (unique constraint).

After each review insert, the backend recalculates:
```python
business.avg_rating = sum(all ratings) / count
business.review_count = count
```

---

### `events` — Local events calendar

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `city_id` | FK->cities | |
| `user_id` | FK->users | Organizer |
| `title` | String(150) | "Kuchipudi Dance Show - Vijayawada" |
| `description` | Text | |
| `venue` | String(200) | Location |
| `event_date` | DateTime | When it happens |
| `is_free` | Boolean | Free = show "RSVP", Paid = show "Buy Tickets" |
| `ticket_url` | String, nullable | External ticket link |
| `status` | Enum | `pending` -> `active` -> `cancelled`/`completed` |

---

### `reports` — Spam/abuse reports

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `listing_id` | FK->listings | Which listing was reported |
| `user_id` | FK->users | Who reported |
| `reason` | Enum | `spam` / `inappropriate` / `duplicate` / `wrong_category` / `other` |
| `notes` | Text, nullable | Extra details |

One report per user per listing (unique constraint prevents vote-bombing). When `report_count` hits 3, listing is auto-hidden (BL-04).

---

### `otp_requests` — OTP lifecycle management

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `phone` | String(15) | +91XXXXXXXXXX |
| `otp_hash` | Text | bcrypt hash of 6-digit OTP (never stored plain) |
| `attempts` | Integer | How many verify attempts made |
| `verified` | Boolean | `true` once OTP used successfully |
| `expires_at` | DateTime | 10 minutes from creation |

**Rules enforced in auth router:**
- Max 5 OTP sends per phone per hour (prevents SMS abuse)
- Max 3 verify attempts per OTP (prevents brute-force)
- 15-minute lockout after 3 failures

---

### `saved_searches` — Search alert subscriptions

Added via Alembic migration `f6a7b8c9d0e1` (same migration as view_count columns).

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `user_id` | FK->users | Who saved the search |
| `city_slug` | String | Which city |
| `query` | String | The search term |
| `category_slug` | String, nullable | Optional category filter |
| `created_at` | DateTime | When alert was saved |

Frontend "🔔 Notify me" button on `/search` page is **pending** — backend endpoint lives but frontend button not yet built.

---

### `user_notifications` — In-app bell notifications

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `user_id` | FK->users | Recipient |
| `type` | String | e.g. `listing_approved`, `listing_expiring`, `listing_expired` |
| `title` / `body` | String / Text | Shown in the mobile `NotificationBell` sheet |
| `action_url` | String, nullable | Not currently navigated to on tap — stored for future use |
| `is_read` | Boolean | |
| `listing_id` | FK->listings, nullable | |

Created via the single `notify()` helper in `services/notification_svc.py` — every call site (admin approve, expiry cron) goes through it, and it also pushes to the user's devices (see `device_tokens` below).

---

### `device_tokens` — Push notification targets (added 2026-07-15)

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `user_id` | FK->users | Owner of this device |
| `token` | Text, unique | Raw Expo push token (`ExponentPushToken[...]`) |
| `created_at` | DateTime | |

**This table existed since 2026-06-11 but was never wired up** — its original schema stored only `token_hash` (a bcrypt hash), which can't actually be used to send a push (delivery requires the raw token; a one-way hash is only useful for equality checks, which nothing did either). Migration `7921c37a8128` renamed it to a plain `token` column. Registered via `POST /notifications/device-token` on login/app-open (`mobile/src/lib/pushNotifications.ts`), removed via `DELETE /notifications/device-token` on logout/account-delete. One row per token; re-registering the same token under a different account reassigns it (handles a device switching users).

**Android push Firebase/FCM V1 setup — DONE (2026-07-16).** Two separate pieces were needed, both now in place: (1) the Firebase Admin SDK service-account key, uploaded to Expo via the expo.dev dashboard (Project → Credentials → Android → Push Notifications FCM V1) — lets Expo's servers deliver to FCM; (2) `mobile/google-services.json` (gitignored, live API key) wired into `app.json` via `googleServicesFile` — lets the app itself initialize Firebase and generate a device token in the first place (missed in the original plan; discovered via a real device error, `Default FirebaseApp is not initialized`). Verified end-to-end with real test notifications delivered to a device's system tray via `curl` against Expo's push API + receipt check. **Requires a new EAS build to reach production** — the native config changed (Google Services Gradle plugin), so this can't ship via a JS/OTA update; the current Play Store Internal Testing build predates this fix entirely.

---

### `city_banners` — Admin-sold sponsor slots per city (added 2026-07-20)

| Column | Type | What it stores |
|--------|------|----------------|
| `id` | UUID | |
| `city_id` | FK->cities, CASCADE | Which city homepage shows this banner |
| `advertiser_name` | String(150) | Shown to admins only; not rendered on the public page |
| `image_url` | Text | Banner creative, hosted wherever the advertiser/admin uploaded it |
| `link_url` | Text | Where a tap/click sends the visitor |
| `start_date` / `end_date` | Date | Inclusive range the banner is shown; "newest wins" if ranges overlap |
| `created_at` | DateTime | |

See §12 "City Banner Ads" for why this is its own table rather than a `listings` row with `category='advertisement'` (the original Phase 3 plan-doc sketch).

---

## 6. API Endpoints — Every Route

### Auth: `/api/v1/auth`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/admin-login` | Admin login with username+password | No |
| POST | `/login` | Sign in by phone + password (replaced the old passwordless `/signin`, 2026-07-12 — that was a real security hole) | No |
| POST | `/otp/send` | Send OTP SMS to phone | No |
| POST | `/otp/verify` | Verify OTP -> returns a short-lived `setup_token`, not full tokens (2026-07-12). Accepts an optional `ref_code` (2026-07-18) — applied only for new signups; unknown, stale, or self-referred codes are silently ignored rather than erroring | No |
| POST | `/password/set` | Set password using a `setup_token` — same endpoint for signup password-creation and forgot-password reset | No |
| POST | `/refresh` | Get new access token using refresh token | No |
| DELETE | `/logout` | Client clears tokens (server stateless) | No |
| POST | `/dev-login` | Skip OTP (only when OTP_DEBUG=true) | No |
| GET | `/me` | Get current user profile — now includes `referral_code`, lazily generating and persisting one if the account predates this feature (2026-07-18) | Yes |
| PATCH | `/me` | Update name or language preference | Yes |
| DELETE | `/me` | Delete account — soft-deletes + anonymises the user (name/phone/email/password scrubbed) and cascades a soft-delete to all their listings (2026-07-14) | Yes |
| GET | `/google?mobile=1` | Redirect to Google OAuth consent; `mobile=1` requests a deep-link callback for the React Native app instead of a web redirect | No |
| GET | `/google/callback` | Exchange code -> tokens -> redirect frontend (`state=web`) or `localsindia://auth/callback` deep link (`state=mobile`) | No |

### Errors: `/api/v1/errors` (added 2026-07-14)

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/report` | Report a mobile/web app error — `{platform, message, stack?, context?, app_version?}`. Public (a crash can happen before login) but rate-limited 20/min per IP | No |

Also `GET /api/v1/admin/errors` (admin-only, see Admin section below) — lists recent errors grouped by message+platform+context with a count and last-seen timestamp, surfaced in `/admin/monitoring` as "Recent App Errors". Built because the mobile app previously had zero crash/error visibility (no Sentry/Firebase/analytics SDK of any kind).

### Cities: `/api/v1/cities`

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/` | All active cities (sorted by state then name) |
| GET | `/{slug}` | Single city by slug |
| GET | `/{slug}/banner` | Active sponsor banner for this city today, or `null` if none is scheduled (added 2026-07-20) |

### Categories: `/api/v1/categories`

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/` | All parent categories (sorted by sort_order) |

### Listings: `/api/v1`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| GET | `/cities/{slug}/listings` | Listings for a city (filter by category, status, page); optional `lat`/`lng` (2026-07-16) sorts by real Haversine distance, unlocated listings kept via `NULLS LAST` rather than dropped; `q` OR-matches per word (fixed 2026-07-16 — was AND-matching every word, so one filler word could zero out an otherwise-exact match) | No |
| POST | `/listings` | Create listing (status='pending') | Yes |
| GET | `/listings/mine` | My listings (all statuses) | Yes |
| GET | `/listings/{id}` | Single listing detail | No |
| PATCH | `/listings/{id}` | Update listing (owner only) | Yes |
| DELETE | `/listings/{id}` | Soft-delete listing (owner or admin) | Yes |
| POST | `/listings/{id}/report` | Report listing | Yes |
| POST | `/listings/{id}/renew` | Extend expiry 30 days (back to pending) | Yes |
| POST | `/listings/{id}/wa-click` | Track WhatsApp button click | No |
| GET | `/listings/{id}/reviews` | Get all reviews for listing | No |
| POST | `/listings/{id}/reviews` | Submit review | Yes |
| POST | `/listings/{id}/fulfill` | Mark listing as sold/done | Yes |

### Search: `/api/v1/search`

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/?q=...&city_slug=...&lat=...&lng=...` | Full-text search (OR-combined per-word `tsquery`, ranked by `ts_rank` — fixed 2026-07-16, was AND-matching every word) + ILIKE fallback. Optional `lat`/`lng` sorts by real Haversine distance; unlocated listings kept, never dropped. Returns paginated results. |

### Uploads: `/api/v1/upload`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/image/{listing_id}` | Upload photo -> Cloudinary -> save URL to DB | Yes |
| DELETE | `/image/{image_id}` | Delete photo from Cloudinary + DB | Yes |

### Businesses: `/api/v1`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| GET | `/businesses` | List businesses for city (filter by category, page) | No |
| POST | `/businesses` | Create business listing | Yes |
| GET | `/businesses/{id}` | Business detail + reviews | No |
| PATCH | `/businesses/{id}` | Update business (owner/admin) | Yes |
| DELETE | `/businesses/{id}` | Soft-delete business (admin or owner only) | Yes |
| POST | `/businesses/{id}/claim` | Claim ownership of unclaimed business | Yes |
| POST | `/businesses/{id}/reviews` | Add review (recalculates avg_rating) | Yes |

### Events: `/api/v1`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| GET | `/events` | List events for city (filter by category, date, page) | No |
| POST | `/events` | Create event (status='pending') | Yes |
| GET | `/events/{id}` | Event detail | No |
| PATCH | `/events/{id}` | Update event (owner/admin) | Yes |
| DELETE | `/events/{id}` | Soft-delete event (owner/admin) | Yes |

### Admin: `/api/v1/admin` (all require admin role)

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/listings/pending` | Moderation queue -- oldest first |
| GET | `/listings` | All listings with status filter |
| PATCH | `/listings/{id}/approve` | Approve -> status='active' |
| PATCH | `/listings/{id}/reject` | Reject -> status='rejected' |
| GET | `/events/pending` | Events moderation queue |
| GET | `/events` | All events with status filter |
| PATCH | `/events/{id}/approve` | Approve event |
| PATCH | `/events/{id}/reject` | Reject event |
| GET | `/users` | All users list |
| PATCH | `/users/{user_id}/role` | Set role to `admin` or `user` (cannot change own role) |
| POST | `/seed-placeholder-images` | Backfills a placeholder image onto every listing with zero photos; also fixes a previously-seeded "LocalIndia" → "LocalsIndia" text typo on old placeholders |
| GET | `/reports` | All abuse reports |
| GET | `/banners` | All city banners, newest first (added 2026-07-20) |
| POST | `/banners` | Create a banner: `{city_id, advertiser_name, image_url, link_url, start_date, end_date}` — 400 if `end_date < start_date` |
| DELETE | `/banners/{id}` | Remove a banner |

### Payments: `/api/v1/payments`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/featured/create-order` | Create Razorpay order (Rs.99/week or Rs.199/month) | Yes |
| POST | `/featured/verify` | Verify payment signature -> set is_featured=true, featured_until=now+plan_days. **Fixed 2026-07-15**: this used to overwrite the listing's own `expires_at` with the featured-plan duration instead of using a dedicated field — a real bug where promoting for a week could shrink an otherwise-longer listing lifetime. Now uses `featured_until`, decoupled from `expires_at`. | Yes |

Featured boosts expire via the daily `GET /api/v1/cron/expiry-reminders` job (same one that reminds about listing expiry and expires business badges) — it un-features any listing where `featured_until < now`. Before this fix (also 2026-07-15), nothing anywhere ever un-set `is_featured`, so paid featured boosts lasted forever regardless of the plan purchased.

**Listing expiry lifecycle, fixed 2026-07-15**: the same cron job now also drives the full `active` -> `expired` transition, which previously never happened anywhere in the codebase — `listings.status` stayed `'active'` forever past `expires_at`. This was a real, user-visible bug: the city browse endpoint (`GET /cities/{slug}/listings`) filters only on `status`, not `expires_at`, so an expired listing kept showing up in normal city/category browsing indefinitely (only the full-text search endpoint checked `expires_at` directly, which masked the gap there). It also meant the owner's "My Listings" screen kept showing a green "Active" badge on a listing buyers could otherwise no longer find via search.

The job now, in order: (1) for active listings expiring within `EXPIRY_WARN_DAYS` (3 days), sends an in-app notification (`listing_expiring`) to every owner unconditionally, and additionally emails them via `send_listing_expiry_email` only if `User.email` is set — previously this reminder was **email-only** and the query outright excluded owners without an email, which is most users, since signup is phone+OTP only and never collects one; (2) flips any listing where `expires_at <= now` to `status='expired'` and sends an in-app notification (`listing_expired`) to the owner — there was previously no signal at all once a listing actually expired.

Separately (not a cron change): "Mark as Sold" on `MyListingsScreen.tsx` is now category-aware — `pg-roommate`/`jobs` show "Filled", `services`/`tiffin`/`businesses`/`events` show "Closed", everything else keeps "Sold" — since a roommate or job listing was never literally "sold".

### Notifications: `/api/v1/notifications`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| GET | `` | List recent notifications for the current user | Yes |
| GET | `/unread-count` | Unread count for the bell badge | Yes |
| POST | `/read/{notification_id}` | Mark one as read | Yes |
| POST | `/read-all` | Mark all as read | Yes |
| POST | `/device-token` | Register/reassign an Expo push token to the current user. **Added 2026-07-15.** | Yes |
| DELETE | `/device-token?token=` | Remove a push token (called on logout/account-delete). **Added 2026-07-15.** | Yes |

### Users: `/api/v1/users`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| GET | `/users/{user_id}/public-profile` | Public seller profile: name, avatar_url, member_since, active_listings_count, listings (top 12, featured first, seed phones excluded) | No |

### Chat (AI Assistant): `/api/v1/chat`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/chat` | AI chatbot via **Gemini 2.0 Flash** (`google-genai` SDK). Body: `{message, city_slug?, history?}`. Returns `{reply, listings[]?}`. Rate-limited: 5/min + 20/hr per IP via slowapi. Needs `GOOGLE_AI_KEY` Azure env var. Anthropic permanently blocked from Azure East Asia (403 on all calls). | No |

### Saved Searches / Alerts: `/api/v1/saved-searches`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/saved-searches` | Save a search alert (`city_slug`, `query`, optional `category_slug`) | Yes |
| GET | `/saved-searches` | List current user's saved searches | Yes |

### Listing Engagement (added Alembic migration `f6a7b8c9d0e1`)

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/listings/{id}/view` | Increment `view_count` on listing (called on detail page mount) | No |
| PUT | `/listings/{id}/renew` | Extend expiry 30 days; enforces 24h cooldown via `last_renewed_at` | Yes |

### Listing Filter Params (added Phase 2 Part B)

`GET /cities/{slug}/listings` now accepts:

| Param | Type | Effect |
|-------|------|--------|
| `min_price` | int | Filter listings with price >= min_price |
| `max_price` | int | Filter listings with price <= max_price |
| `sort` | str | `newest` (default), `price_asc` (nulls last), `price_desc` (nulls first) |
| `verified_only` | bool | Only return wa_verified=true listings |
| `within` | str | `24h`, `7d`, or `30d` — filters by created_at cutoff |

---

## 7. Frontend Architecture

### How Hybrid SSR Works (replaced static export — commit `3a60dd1`)

The frontend used to be built with Next.js `output: 'export'` (pure static HTML, no server). That broke down at scale: pre-building 496 cities × 6 sub-pages produced a 200 MB / 11,355-file export that timed out Azure's CDN distribution step at exactly 306s on every deploy (see bug #16 in project memory). The fix was to drop `output: 'export'` entirely and let Azure Static Web Apps run Next.js in its supported **hybrid SSR mode**:

1. `next.config.mjs` no longer sets `output: 'export'` — it's a normal Next.js build (`images.unoptimized: true`, `cleanDistDir: true`, webpack cache disabled to avoid stale-chunk corruption)
2. `.github/workflows/frontend-azure.yml` deploys with `output_location: ''` — Azure SWA's build system (Oryx) detects the Next.js app and provisions its own managed Node.js Azure Functions runtime behind the scenes; you don't write or see this function app
3. `app/[city]/layout.tsx` has **no `generateStaticParams()`** — every city route renders server-side, on demand, the first time it's requested (this is what fixed the "all `/[city]/*` routes 500" bug — `generateStaticParams() { return [] }` always crashed the managed function)
4. `frontend/src/lib/static-params.ts` → `getAllCityParams()` now just returns `[]` with a comment confirming this: *"In SSR (hybrid) mode, city pages render on demand — no pre-building needed."*

**Why this still feels fast:** city/listing pages are real server renders (not a client-only fetch-after-mount trick) — the HTML that comes back already has the shell; data-heavy bits still hydrate client-side via `useEffect` + `lib/api.ts` calls for content that depends on auth state or changes per-request.

**Remaining client-only routes** (`error.tsx`, `/category/[slug]`, `/post`) are thin redirect/error shells — see §8.

### Directory Structure

```
frontend/src/
+-- app/                   <- Next.js App Router pages
|   +-- layout.tsx         <- Root layout (fonts, providers, toaster)
|   +-- page.tsx           <- Homepage (/)
|   +-- [city]/            <- Dynamic city routes (/hyderabad/...)
|   +-- auth/              <- Login, OAuth callback
|   +-- profile/           <- User profile, listings management
|   +-- admin/             <- Admin panel
|   +-- privacy/           <- Privacy policy
|   +-- terms/             <- Terms of service
|   +-- offline/           <- PWA offline fallback
|   +-- invite/            <- Invite friends page
+-- components/            <- Reusable UI components
+-- context/               <- Global state (PrefsContext)
+-- i18n/                  <- i18n config (request.ts)
+-- lib/                   <- API client, types, utils
+-- messages/              <- Translation files (11 languages)
```

### `lib/api.ts` — The API Client

Every backend call goes through this file. It's a typed wrapper around `fetch()`:

```typescript
// Example: calling the search endpoint
const results = await api.search.query({
  q: 'tiffin',
  city_slug: 'hyderabad',
  page: 1
});
// Returns: { items: Listing[], total: number, page: number, page_size: number }
```

**Auto-refresh logic:** If an API call returns 401 (token expired), the client automatically:
1. Calls POST /api/v1/auth/refresh with the stored refresh token
2. Saves the new access token to localStorage
3. Retries the original request once

If refresh also fails (refresh token expired), it clears localStorage and redirects to login.

### `context/PrefsContext.tsx` — Global State

Stored in localStorage, available everywhere via React context:

| State | What it stores | Persists? |
|-------|---------------|-----------|
| `citySlug` | Current city ("hyderabad") | Yes |
| `cityName` | Current city display name | Yes |
| `cities` | All cities list (cached) | No |
| `language` | User's UI language ("te") | Yes |
| `user` | Logged-in user object | Yes |
| `tokens` | JWT access + refresh tokens | Yes |

---

## 8. Every Page Explained

### `/` — Homepage

**File:** `app/page.tsx`

The entry point. Shows:
- Hero section: search bar + city selector + geolocation button
- "Pick your city" if no city set; redirects to city page if city already chosen
- 8 category cards with icon + listing counts
- "Fresh listings" from popular cities
- Trust section: 4 value props (instant posting, WhatsApp native, regional language, multilingual)
- Stats: 1.2L+ listings, 496+ cities, 3.8L+ users

---

### `/[city]` — City Home

**File:** `app/[city]/page.tsx`

The main discovery page for a specific city. Shows:
- Featured listings (is_featured=true, shown at top with amber badge)
- Latest listings grouped by category
- Category chip filter at top
- Pre-built at build time for all 496 cities (SSG)

---

### `/[city]/layout.tsx` — City Shell

**File:** `app/[city]/layout.tsx`

Wraps all city pages. Provides:
- Sticky header with site logo, city name chip, language switcher, sign in button
- Bottom navigation (mobile only)
- City context loaded here (city data fetched from API)

---

### `/[city]/classifieds/[id]` — Listing Detail

**Files:** `app/[city]/classifieds/[id]/page.tsx` + `ListingDetailClient.tsx`

Shows one listing in full detail:
- **Interactive image carousel** (`activeImg` state, commit `574bb4f`): main image controlled by `activeImg`; `ChevronLeft`/`ChevronRight` arrow buttons on image (disabled/hidden at first/last); white dot indicators at bottom of image for direct navigation; thumbnail strip below main image — clicking a thumbnail updates `activeImg` and shows active border (`border-orange-400 ring-1 ring-orange-300`); inactive thumbnails at 60% opacity. Global `/listing/[id]/ListingDetailClient.tsx` has the same implementation.
- Title, price, category, time posted, area/location
- Full description (expandable "Show more")
- Seller card (name, member since)
- WhatsApp button (full-width, fixed at bottom on mobile) -> opens `wa.me/91XXXXXXXXXX`
- Report button, Save (bookmark) button
- Reviews section with star ratings

`page.tsx` is a thin Server Component wrapper (pattern kept from the static-export era; still useful for clean code-splitting under SSR).
`ListingDetailClient.tsx` is the actual component with all state and API calls. On mount: calls `POST /listings/{id}/view` to increment view_count.

---

### `/[city]/classifieds/post` — Post a Listing

**File:** `app/[city]/classifieds/post/page.tsx`

3-step wizard:
1. **Details**: title, category selection (grid of cards), description, price (optional), area
2. **Photos**: drag-drop zone, thumbnail preview, reorder, max 5 photos
3. **Contact**: phone (prefilled if logged in), WhatsApp toggle, city confirmation

On submit: POSTs to `/api/v1/listings` -> shows "Your listing is under review" success screen.
Data saved across steps in component state (no loss on Back navigation).

---

### `/profile/listings/{id}/edit` — Edit Listing

**Files:** `app/profile/listings/[id]/edit/page.tsx` + `EditListingClient.tsx` (web); `mobile/src/screens/EditListingScreen.tsx` (mobile)

Same fields as Post, pre-filled with existing data. Only listing owner can access.
Sends PATCH to `/api/v1/listings/{id}`.
**Photos** (added 2026-07-13 — was missing on both web and mobile until caught in live emulator testing): existing photos shown in a grid with per-photo remove; add button uploads a new photo. Both actions call `POST/DELETE /api/v1/upload/image/...` immediately (not deferred to Save), since this is an already-live listing rather than a draft. Max 5 photos total, same limit as Post.

---

### `/[city]/classifieds/[id]/promote` — Feature a Listing (Paid)

**Files:** `app/[city]/classifieds/[id]/promote/page.tsx` + `PromoteClient.tsx`

Owner only. Shows:
- Rs.99/week or Rs.199/month pricing cards
- Razorpay checkout button
- On payment success: listing gets `is_featured=true`, appears at top of city grid with amber "Featured" badge

---

### `/[city]/search` — Search Results

**File:** `app/[city]/search/page.tsx`

URL format: `/hyderabad/search?q=tiffin&category=services`

- Search bar (pre-filled from URL)
- Filter panel (category, price range min/max, posted date: today/week/month)
- Results grid using ListingCard
- Empty state: "No results for 'tiffin' in Hyderabad" + suggested actions
- Loading: 8 skeleton cards while API responds

Wrapped in Suspense because it uses `useSearchParams()` (a Next.js requirement regardless of rendering mode).

Filter bar is always visible (no toggle) — sort (newest/price asc/price desc), min/max price, posted-within (24h/7d/30d), verified-only checkbox. Category tabs use `role="tab"` + `aria-selected` and resolve the URL slug → category UUID after categories load so the active tab highlights instantly.

---

### `/[city]/[category]` — Category Browse

**File:** `app/[city]/[category]/page.tsx`

Lists all active listings in a specific category for the city.
URL: `/hyderabad/jobs`, `/vijayawada/tiffin`

---

### `/[city]/businesses` — Business Directory

**File:** `app/[city]/businesses/page.tsx`

Yellow Pages style:
- Category icon grid at top (filter by type)
- Business cards: name, avg_rating (stars), WhatsApp button
- Verified badge (blue checkmark) on claimed + verified businesses

---

### `/[city]/businesses/[id]` — Business Profile

**Files:** `app/[city]/businesses/[id]/page.tsx` + `BusinessDetailClient.tsx`

- Business details: name, address, phone, website, WhatsApp
- Star rating display (average + total count)
- Review list (sorted newest first)
- "Write a Review" form (requires login, 1 per user)
- "Claim this business" button (if no owner set)

---

### `/[city]/businesses/add` — Add Business

**File:** `app/[city]/businesses/add/page.tsx`

Form to add a new business listing: name, category, description, address, phone, WhatsApp.

---

### `/[city]/events` — Events Calendar

**File:** `app/[city]/events/page.tsx`

- Calendar-style month header
- Event cards sorted by event_date ascending (upcoming first)
- Filter chips: cultural / sports / religious / music / food
- Free badge (green) / Paid badge (amber) on each card

---

### `/[city]/events/post` — Post Event

**File:** `app/[city]/events/post/page.tsx`

Form: title, description, venue, date+time picker, free/paid toggle, ticket URL.

---

### `/auth/login` — Login Page

**File:** `app/auth/login/page.tsx`

Two modes (tabs):
- **Sign In**: Enter phone -> direct login (backend checks phone exists)
- **Sign Up**: Enter phone -> OTP sent -> enter OTP -> enter name

Google OAuth button (if `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`).

Wrapped in Suspense because it reads URL params (`?mode=signup`).

---

### `/auth/callback` — OAuth Return

**File:** `app/auth/callback/page.tsx`

After Google OAuth, Google redirects here with `?token=...&refresh=...&name=...`
Reads tokens from URL params -> saves to localStorage -> redirects to homepage.
Shows spinner while processing.

---

### `/profile` — User Profile

**File:** `app/profile/page.tsx`

User settings:
- Change display name
- Set preferred language
- Change home city
- Delete account (2026-07-14) — double `confirm()` then `DELETE /api/v1/auth/me`

---

### `/account-deletion` — Delete Your Account (public, no login required)

**File:** `app/account-deletion/page.tsx`

Added 2026-07-14 to satisfy Google Play's requirement that apps with accounts provide a public, always-reachable way to request deletion — even for someone who's uninstalled the app or can't sign in. Two paths:
- Self-serve: Profile → Delete account (web and mobile), takes effect immediately
- Email fallback: `support@localsindia.com` with the registered phone number, processed within 7 days

Explains exactly what's deleted (name/phone/email/password, all listings hidden) vs. what's retained (an anonymised fraud-prevention record with no identifying info). Linked from the site footer and from `/privacy` §6.

---

### `/profile/listings` — My Listings

**File:** `app/profile/listings/page.tsx`

Shows all user's listings (all statuses: pending, active, expired, etc.):
- Active: Edit, Mark as Sold (Fulfill), Promote
- Expired: Renew (extends 30 days)
- Pending: Waiting for admin approval

---

### `/admin/listings` — Admin Listing Moderation

**File:** `app/admin/listings/page.tsx`

Data table with pending listings queue:
- Title, city, user, category, posted time
- "Approve" button (green) -> active
- "Reject" button (red) -> shows reason modal -> rejected

---

### `/admin/events` — Admin Event Moderation

Same pattern as admin/listings but for events.

---

### `/admin/users` — User Management

**File:** `app/admin/users/page.tsx`

User list: phone, name, role, is_active. Role management (promote to admin/business_owner).

---

### `/admin/reports` — Abuse Reports

**File:** `app/admin/reports/page.tsx`

Lists flagged listings with report reasons. Admin can then reject the listing.

---

### `/privacy`, `/terms` — Legal Pages

Static content pages. Pre-built HTML.

---

### `/offline` — PWA Offline Fallback

**File:** `app/offline/page.tsx`

Shown when user is offline and service worker can't serve cached content.

---

### `/invite` — Invite Friends

**File:** `app/invite/page.tsx`

Rebuilt 2026-07-18 as the real referral share page. Fetches the logged-in user's `referral_code` via `GET /auth/me` and builds a real link (`https://www.localsindia.com/{city}?ref={code}`). Guests without a token see a login-gate card instead of the share section. When someone signs up through the link and their first listing gets admin-approved, both the referrer's and referee's most-recent active listing get Featured for free for 3 days — see `routers/admin.py`'s `approve_listing` in §6.

---

### `/seller/[id]` — Public Seller Profile

**File:** `app/seller/[id]/page.tsx`

Shows a seller's public profile. Accessible by clicking the "Listed by" link on any listing detail page.

- Avatar: orange gradient with initials (falls back from avatar_url)
- Member since date
- Active listings count badge
- Grid of up to 12 active listings using `ListingCard`
- Skeleton loading + error state
- Calls `GET /api/v1/users/{id}/public-profile`

---

### `/saved` — Saved Listings

**File:** `app/saved/page.tsx`

Displays listings the user has bookmarked locally. No backend — purely localStorage.

- Uses `useSaved()` hook
- Empty state with CTA to browse
- Same `ListingCard` grid as other pages
- Data persists across browser sessions (localStorage key: `localsindia_saved`)

---

### `/listing/[id]` — Global (city-agnostic) Listing Detail

**Files:** `app/listing/[id]/page.tsx` + `ListingDetailClient.tsx`

A second listing-detail route that doesn't require a city in the URL — used by deep links (mobile app, shares, QR codes) where the city isn't known up front. Renders the same listing UI as `/[city]/classifieds/[id]` (gallery, price, WhatsApp CTA, reviews, category emoji fallback) but fetches purely by listing ID.

---

### `/category/[slug]` — Global Category Redirect

**File:** `app/category/[slug]/page.tsx`

Client-only redirect shell: reads `li_city` from localStorage (falls back to `hyderabad`) and immediately `router.replace()`s to `/{city}/search?category={slug}`. Exists so old/external links to `/category/jobs` style URLs land somewhere useful instead of a 404. Shows a spinner during the redirect.

---

### `/post` — Global Post Redirect

**File:** `app/post/page.tsx`

Same pattern as `/category/[slug]`: reads `li_city` from localStorage and redirects to `/{city}/classifieds/post`, or to `/?openPost=1` if no city is set yet. Gives the marketing/social copy a single stable "post a listing" URL that doesn't need to know the city.

---

### Global Error Boundary

**File:** `app/error.tsx`

Next.js root error boundary (not a route, fires on any uncaught render error). Special-cased for `ChunkLoadError` / "Loading chunk" / "Cannot find module" — these mean a stale browser tab is referencing JS chunk hashes from a previous deploy, so it force-reloads the page instead of showing a dead error screen. Other errors show a friendly "Something went wrong" message with a "Try again" button that calls Next's `reset()`.

---

## 9. Every Component Explained

### `ListingCard` — The Core Display Unit

**File:** `components/listing-card/ListingCard.tsx`

Used everywhere listings appear (city home, search, category browse, profile).

- Image: 4:3 aspect ratio, next/image, blur placeholder while loading
- Price badge: top-right corner, "Price on request" if null
- Category chip: bottom-left on image, semi-transparent dark
- Category emoji fallback: shown when no photo (tiffin🍱, PG🏠, jobs💼, vehicles🚗, etc.)
- Heart bookmark button: absolute top-right on image, filled red when saved via `useSaved()`
- Hover animation: `scale(1.02)` via Framer Motion `whileHover`
- WhatsApp button: full-width green at card bottom
- Time ago: "2 hours ago", not raw dates
- Status badge: amber "Featured" or gray strikethrough "Sold"

### `ListingCardSkeleton`

**File:** `components/listing-card/ListingCardSkeleton.tsx`

Exact same dimensions as ListingCard but Tailwind `animate-pulse` gray blocks. Shows while API is loading. Prevents layout shift.

### `SiteHeader`

**File:** `components/site-header/SiteHeader.tsx`

Sticky top navbar:
- Left: Site logo
- Center: City name chip (opens CityPickerModal on click)
- Right: Language selector, Sign In button, "Post Free" CTA button

### `SiteFooter`

**File:** `components/site-footer/SiteFooter.tsx`

Bottom footer with links (privacy, terms, about) and social links.

### `SiteLogo`

**File:** `components/site-logo/SiteLogo.tsx`

Responsive logo. Props: `variant` (light/dark), `size` (sm/md/lg), `tagline` (bool).

### `CityPickerModal`

**File:** `components/city-picker/CityPickerModal.tsx`

Full-screen overlay:
- Search input: filters cities in real-time
- Grouped by state (AP/Telangana first)
- Recent cities: last 3 visited (from localStorage)
- Geolocation button: requests browser location, finds nearest city

### `LanguageSelector` / `LanguageSwitcher`

**Files:** `components/language-selector/`, `components/language-switcher/`

Dropdown showing all 11 languages in their own script:
English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati, Punjabi, Malayalam, Odia

Saves preference to localStorage + updates next-intl locale.

### `WhatsAppButton`

**File:** `components/whatsapp-button/WhatsAppButton.tsx`

- Background: `#25D366` (WhatsApp green)
- Opens `wa.me/91XXXXXXXXXX` in new tab
- Variants: `full` (full-width on listing detail) or `compact` (card bottom)
- Pulse animation on listing detail page (draws attention)
- Tracks click via `api.listings.waClick()` (fire-and-forget analytics)

### `BottomNav`

**File:** `components/bottom-nav/BottomNav.tsx`

Mobile-only (hidden on tablet+). Fixed at bottom, z-50.

5 tabs:
1. Home (house icon)
2. Search (magnifier icon)
3. Post (plus in orange circle -- slightly raised)
4. My Listings (clipboard icon)
5. Profile (person icon)

Active tab: saffron orange. Inactive: gray.

### `EmptyState`

**File:** `components/empty-state/EmptyState.tsx`

Used on any page with no results. Props:
- `icon`: Lucide icon component
- `title`: "No listings yet"
- `description`: "Be the first to post in your city!"
- `action?`: `{label: "Post Free", href: "/post"}` -- optional CTA button

Never shows a blank white screen.

### `AdBanner`

**File:** `components/ad-banner/AdBanner.tsx`

Google AdSense slot in the city page footer. Phase 3 monetization feature. Not to be confused with `CityBanner` below — that's a directly-sold, admin-managed local sponsor slot, this is third-party programmatic ad inventory.

### `CityBanner` (added 2026-07-20)

**File:** `components/city-banner/CityBanner.tsx`

Fetches `GET /cities/{slug}/banner` on mount and renders nothing if the response is `null` — no skeleton, no placeholder, so an unsold city shows no gap. Rendered at the top of `[city]/CityHomeClient.tsx`, directly below the hero. Banners themselves are created and removed from `/admin/banners`, not by advertisers self-serving.

### `FreshListingsSection`

**File:** `components/fresh-listings/FreshListingsSection.tsx`

Carousel of latest listings on the homepage. Auto-scrolls. Fetches real listings from the API for the visitor's city (`li_city` localStorage, falls back to `hyderabad` for first-time visitors) — no longer static mock cards. Card click navigates to `/{city}/search?category={slug}` so results stay city-scoped.

### `useSaved` — Bookmark Hook

**File:** `hooks/useSaved.ts`

localStorage-based bookmark system. No backend required.

- `toggle(listing)` — adds or removes a listing from saved list
- `isSaved(id)` — returns boolean for heart button fill state
- `saved` — full array of saved `Listing` objects for `/saved` page
- Storage key: `localsindia_saved` (JSON array of full Listing objects)
- Initializes from localStorage on mount; writes back on every toggle

### `ServiceWorker`

**File:** `components/pwa/ServiceWorker.tsx`

Registers the PWA service worker (`public/sw.js`). Enables:
- Offline access to cached pages
- "Add to home screen" on Android Chrome
- Background sync (future)

### `ReferralCapture`

**File:** `components/referral-capture/ReferralCapture.tsx`

New 2026-07-18. Invisible client component mounted in root `layout.tsx` alongside `OnboardingGate`/`ContextualPrompt`. Reads `?ref=` off `window.location.search` on mount and persists it to `localStorage['li_ref_code']`, so it survives from whatever page a shared link lands on through to the signup form later — the login page's OTP-verify handler reads it back out and sends it as `ref_code`.

---

## 10. Business Rules (Hard-Coded Laws)

These rules are enforced in the backend code -- the frontend cannot bypass them.

| Rule | Where | What happens |
|------|-------|-------------|
| **BL-02**: Max 10 active listings per user per city | `routers/listings.py` | 400 error: "You have reached the maximum active listings limit" |
| **BL-04**: 3 reports -> listing hidden | `routers/listings.py` | `status='flagged'`, removed from public browse |
| **BL-06**: 3 OTP attempts max | `routers/auth.py` | 400 error: "Too many attempts. Request a new OTP." |
| **BL-07**: Max 5 OTPs per phone per hour | `routers/auth.py` | 429 error: "Too many OTP requests. Try again in an hour." |
| **BL-08**: Images: JPEG/PNG/WebP, <5MB, max 5 per listing | `routers/uploads.py` | 400 error per violation |
| **BL-11**: New listing always `status='pending'` | `routers/listings.py` | Cannot post active listings directly |
| **PDPB**: Soft-delete only | All models | `deleted_at` timestamp set, record kept in DB |
| Phone format | `routers/auth.py` | Regex `+91[6-9]XXXXXXXXXX` -- must be valid Indian mobile |
| WhatsApp URL | Pydantic validators | Must be `https://wa.me/91XXXXXXXXXX` |

---

## 11. Security — How Auth Works

### JWT Tokens

Two tokens issued on login:

| Token | Expiry | Use |
|-------|--------|-----|
| Access token | 15 minutes | Sent in `Authorization: Bearer` header on every API call |
| Refresh token | 30 days | Used once to get a new access token when it expires |

Structure of JWT payload:
```json
{
  "sub": "user-uuid-here",
  "type": "access",
  "exp": 1234567890
}
```

The `sub` (subject) = user UUID. Backend decodes this, looks up the user in DB.

### Why 15 minutes?

Short expiry limits damage if a token is stolen. The refresh flow automatically gets a new access token without the user noticing.

### OTP Security

OTP is never stored in plain text:
```python
otp_plain = "482917"
otp_hash = bcrypt.hash(otp_plain)   # stored in DB
# Later:
bcrypt.verify("482917", otp_hash)   # true
bcrypt.verify("000000", otp_hash)   # false
```

Even if DB is breached, attackers can't get real OTPs from the hash.

### SQL Injection Prevention

Search uses PostgreSQL `plainto_tsquery` with parameterized queries:
```python
# SAFE -- never string-format user input into SQL
query = text("WHERE search_vector @@ plainto_tsquery('simple', :q)")
db.execute(query, {"q": user_input})
```

### CORS

Backend only accepts requests from:
- `https://localsindia.com`
- `https://www.localsindia.com`
- `http://localhost:3000` (dev)
- `http://localhost:8081`, `http://localhost:19006` (Expo web dev server)

Browser blocks any other origin from calling the API.

### Google Sign-In — Mobile Deep Link (added — commit `f8327b3`; UI removed from mobile in a later, undated pass — see note below)

**Status as of 2026-07-18: this flow has no UI entry point on either platform, but the backend routes are intentionally kept, not deleted.** `mobile/src/screens/LoginScreen.tsx` no longer has any Google references at all (confirmed via grep — a prior session already stripped it down to phone-only login; this doc had gone stale and still described the mobile flow as live until this pass). Web's "Continue with Google" button is now hidden too (2026-07-18) via the pre-existing `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` feature flag (GitHub Actions secret flipped `true` → `false`, no code changed) — Raj's call, prompted by wanting to move fully to phone+password/OTP. The backend `GET /auth/google` / `GET /auth/google/callback` routes are deliberately left in place rather than removed: at least one real production user signed up Google-only (no phone number on file, confirmed via the callback code — Google signup only ever sets `email`), so they have no forgot-password fallback if Google access were fully severed. Raj's chosen plan is to email that user directly rather than migrate them programmatically; keeping the route alive (even though unlinked from any UI) preserves a path back if needed, and costs nothing to leave dormant.

The mechanics below describe how the flow worked when it had a mobile UI trigger — kept for reference in case it's ever re-enabled:

The mobile app can't receive a normal HTTP redirect after OAuth, so it uses Expo's `WebBrowser` + a custom URL scheme:

```
1. Mobile app opens GET /api/v1/auth/google?mobile=1 in an in-app browser (expo-web-browser)
2. Backend sets state=mobile, redirects to Google consent screen as usual
3. User approves -> Google redirects to GET /api/v1/auth/google/callback?code=...&state=mobile
4. Backend exchanges code for tokens, upserts user, then redirects to:
     localsindia://auth/callback?token=...&refresh=...&name=...
5. expo-web-browser detects the custom scheme, closes the in-app browser,
   hands the URL back to LoginScreen.tsx, which parses the tokens and stores them
```
On error (`state=mobile` + Google denies): redirects to `localsindia://auth/callback?error=google_denied` instead of the web's `/auth/login?error=google_denied`.

---

## 12. Payments — Razorpay Integration

### How Featured Listings Work

1. Owner clicks "Promote" on their listing
2. Frontend calls `POST /api/v1/payments/featured/create-order`
   - Backend creates a Razorpay order (Rs.99 or Rs.199)
   - Returns: `{order_id, amount, currency, key_id}`
3. Frontend opens Razorpay checkout modal (loads Razorpay JS)
4. User pays via UPI/card/netbanking
5. Razorpay calls back with `{payment_id, order_id, signature}`
6. Frontend calls `POST /api/v1/payments/featured/verify`
   - Backend verifies HMAC signature: `HMAC_SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)`
   - If valid: sets `listing.is_featured = true`, extends `expires_at`
7. Listing now appears at top of city grid with amber "Featured" badge

### Pricing

| Plan | Amount | Duration |
|------|--------|----------|
| Week | Rs. 99 | 7 days featured |
| Month | Rs. 199 | 30 days featured |

### Business Analytics Dashboard (added 2026-07-18)

First piece of Phase 3 monetization built after Featured Listings — chosen first specifically because it's pure reporting with no new Razorpay payment code, unlike the still-unbuilt ad banners and event ticketing pieces of the same plan.

- `POST /api/v1/businesses/{id}/view` and `POST /api/v1/businesses/{id}/wa-click` — fire-and-forget, same pattern as the existing `listings.py` view/wa-click endpoints, but log a row to a new `analytics_events` table (`business_id`, `event_type`, `created_at`) instead of incrementing a denormalized counter. A log was needed here (not just a counter) because the dashboard shows a day-by-day trend, not just a lifetime total.
- `GET /api/v1/analytics/business/{id}` — owner-or-admin only (403 otherwise). Aggregates the last 30 days: total views, total WhatsApp clicks, plus a per-day breakdown for the trend chart. Review count and average rating come straight off the `businesses` row, not the event log.
- `/[city]/businesses/[id]/dashboard` — 4 stat cards (Views, WhatsApp Taps, Reviews, Avg Rating) and a plain CSS bar chart for the daily trend. Deliberately no new charting library (`recharts`) added for one simple chart, in keeping with this app's existing preference against heavy dependencies.
- Reached via a "View Analytics" link on the business detail page, shown whenever the business has an owner on record (same gating convention the existing "Get Verified" CTA already uses on that page — the backend is the actual authorization boundary, not this link's visibility).

### Event Ticketing — Web + Mobile (added 2026-07-18)

Second piece of Phase 3 monetization. Two real gaps surfaced during this build, both fixed as part of it: the web events list linked to `/events/{id}` for every free event, but that route had never been built (404 before today); and Events as a feature — browse, detail, anything — didn't exist on mobile at all.

- **Data model**: `events.ticket_price` (nullable) is new. An event now sells tickets one of two mutually-exclusive ways: `ticket_price` set → in-app purchase (this feature); `ticket_url` set instead → the pre-existing external-link behavior, unchanged. A new `tickets` table holds one row per *paid* ticket (`event_id`, `user_id`, `amount`, `razorpay_order_id`, `razorpay_payment_id`, a unique `qr_token`, `used_at`) — created only after Razorpay signature verification succeeds, same as Featured Listings never writes anything until `/verify`.
- **Purchase flow**: `POST /api/v1/tickets/create-order` → `POST /api/v1/tickets/verify` (HMAC-checked exactly like `payments.py`'s `verify_featured_payment`). Web opens the standard Razorpay Checkout JS; mobile reuses the same `WebView` + injected-HTML-with-`postMessage` bridge pattern already established by `PromoteScreen.tsx` and `BusinessDetailScreen.tsx` — no new payment mechanism invented.
- **QR codes are generated server-side**, not client-side: `GET /api/v1/tickets/{id}` returns `qr_image`, a base64 PNG built with Python's `qrcode` library. This was a deliberate call — a client-side JS QR-render library works fine in a browser (canvas is built in), but React Native has no canvas, so rendering a QR client-side there means either `react-native-svg` or a canvas polyfill, both of which are native modules requiring a fresh native build. Since a native rebuild is *already* pending (referrals, push notifications), adding a second dependency that forces another one wasn't worth it for a feature RN's stock `<Image>` component can already display for free once the backend hands back a data URI. Web was actually built the same way at first (client-side `qrcode` npm package) and then switched to consume the server's `qr_image` too, once it existed — one QR implementation, not two.
- **Check-in is asymmetric by design**: web admin scanning uses the browser's native `BarcodeDetector` API (Chrome/Edge; no new npm dependency) with a manual-entry fallback for unsupported browsers. Mobile has **no camera scanning at all** — `expo-camera` isn't installed, and adding it would force yet another native rebuild before the pending one has even shipped. Mobile check-in is manual token entry only (`AdminScanTicketsScreen.tsx`). `POST /api/v1/admin/tickets/scan` is idempotent-safe: a re-scanned `qr_token` returns 409 with the original `used_at` timestamp rather than allowing re-entry.
- **Mobile Events, built from scratch**: `EventsScreen.tsx` (browse), `EventDetailScreen.tsx`, `TicketScreen.tsx`, `MyTicketsScreen.tsx`. Reached via a new "Events" promo banner on `HomeScreen.tsx`, deliberately mirroring how the Business Directory got its own promo banner in the 2026-07-17 pass rather than repurposing the existing "Events" category tile (which still points at generic classifieds search, unchanged).
- **Mobile event creation** (added later the same day, after initially being scoped out): rather than a second parallel screen, extends the existing `PostScreen.tsx` 3-step wizard exactly the way Businesses did — picking "Events" as the category swaps the Price/Area card for Venue + Date&Time + Free/Paid Admission fields, hides the Photos step (Events has no photo storage, same gap Businesses has), and branches `submit()` to `eventsApi.create()`. Unlike Businesses (live immediately), a newly-created event goes into the same `status='pending'` moderation queue as listings, so it lands on the generic "submitted, under review" success screen rather than navigating straight to the event's own detail page. Needed one new native dependency, `@react-native-community/datetimepicker` (v9.1.0) — a deliberate exception to the "avoid native deps that force a rebuild" reasoning used for QR/camera earlier in this same feature: a native rebuild is *already* unavoidable this cycle for several other reasons, so adding one more standard, well-maintained module to it costs nothing extra, unlike adding the first thing that would force a rebuild that otherwise wouldn't be needed yet.

### City Banner Ads (added 2026-07-20)

Third and last piece of the original Phase 3 monetization plan (Rs.999–2,999/mo per city slot, admin-assigned and manually invoiced — not a self-serve Razorpay flow, same as originally scoped).

- **Data model**: new `city_banners` table (`city_id`, `advertiser_name`, `image_url`, `link_url`, `start_date`, `end_date`). Deliberately **not** modeled as `listings` with `category='advertisement'`, which was the original plan-doc sketch — a banner has no price, WhatsApp contact, photo gallery, or moderation-queue lifecycle the way a real classified does, so folding it into `listings` would have added a non-classified row type that search, the moderation queue, and reporting would all need to know to exclude. A dedicated four-column table with two admin endpoints was less code overall, not more.
- **Public read**: `GET /api/v1/cities/{slug}/banner` returns the newest banner (by `created_at`) whose `start_date`/`end_date` range covers today, or `null`. "Newest wins" means an admin can simply add a new banner to switch sponsors without deleting the old one first.
- **Admin control**: `GET/POST /api/v1/admin/banners`, `DELETE /api/v1/admin/banners/{id}` — plain CRUD, no approval workflow (an admin is the one creating it). `/admin/banners` in the dashboard: a form (city picker, advertiser name, image URL, link URL, start/end date) plus a list showing Active/Scheduled/Expired computed client-side from today's date vs. the row's range.
- **Rendering**: `components/city-banner/CityBanner.tsx` fetches the active banner for the current city on mount and renders nothing at all if there isn't one — no placeholder, no layout-shifting skeleton, since an unsold slot should look like it was never there. Wired into `[city]/CityHomeClient.tsx` directly below the hero section, at the top of the page content.
- **Distinct from `AdBanner.tsx`** (see §9) — that component is Google AdSense, third-party programmatic ad inventory shown in the city page footer, already live. This is a directly-sold, admin-controlled local sponsor slot at the top of the page. The two coexist; neither replaces the other.

---

## 13. Image Upload — Cloudinary

### Upload Flow

```
User selects photo
  |
POST /api/v1/upload/image/{listing_id} (multipart/form-data)
  |
routers/uploads.py validates:
  - File type: JPEG, PNG, or WebP only
  - File size: < 5MB
  - Listing exists + user owns it
  - Listing has < 5 images already
  |
services/cloudinary_svc.upload_image(bytes, filename)
  -> Cloudinary API -> stores on global CDN
  -> Returns: {url: "https://res.cloudinary.com/...", cloudinary_id: "localindia/..."}
  |
DB: INSERT INTO listing_images (listing_id, url, cloudinary_id, display_order)
  |
Returns: {id, url, cloudinary_id}
```

### Mock Mode

If `CLOUDINARY_API_KEY` is not set (local dev):
- Image saved to `/tmp/` on server
- No Cloudinary account needed for development

---

## 14. Search — PostgreSQL Full-Text

### How It Works

PostgreSQL has a built-in search engine using `tsvector`. When a listing is saved:

```sql
-- This computed column is auto-maintained by PostgreSQL
search_vector = to_tsvector('simple', title || ' ' || description)
```

This converts words to normalized tokens (handles plurals, suffixes, etc.).

When user searches for "tiffin":
```sql
SELECT *, ts_rank(search_vector, plainto_tsquery('simple', 'tiffin')) AS rank
FROM listings
WHERE city_id = :city_id
  AND status = 'active'
  AND deleted_at IS NULL
  AND (
    search_vector @@ plainto_tsquery('simple', 'tiffin')
    OR title ILIKE '%tiffin%'
  )
ORDER BY
  is_featured DESC,   -- featured listings always first
  rank DESC,          -- most relevant next
  created_at DESC     -- newest for ties
LIMIT 12 OFFSET 0
```

### Why `plainto_tsquery`?

It's safe: any user input is treated as plain text. No special characters can break the query.

---

## 15. Internationalization — 11 Languages

### How Pages Load in Different Languages

1. User opens app, PrefsContext reads `language` from localStorage (default: city's `lang_default`)
2. `next-intl` loads the messages JSON for that language
3. Components use `t('listing.whatsapp')` which returns "Chat on WhatsApp" (en) or the Telugu equivalent
4. Noto Sans font loaded for that script (Devanagari for Hindi, Telugu script for Telugu, etc.)

### Languages Supported

| Code | Language | States |
|------|----------|--------|
| en | English | Default / fallback |
| hi | Hindi | UP, Bihar, MP, Rajasthan, Uttarakhand |
| te | Telugu | Andhra Pradesh, Telangana |
| ta | Tamil | Tamil Nadu |
| kn | Kannada | Karnataka |
| mr | Marathi | Maharashtra |
| bn | Bengali | West Bengal |
| gu | Gujarati | Gujarat |
| pa | Punjabi | Punjab |
| ml | Malayalam | Kerala |
| or | Odia | Odisha |

### Language Detection in Static Export

Since there's no server (static export), locale preference is stored in localStorage and applied client-side. `src/i18n/request.ts` defaults to 'en' during the build phase (no cookies/headers available at build time).

### Fonts

4 font families loaded via `next/font/google` (self-hosted -- no FOUT):
- `Plus Jakarta Sans` -- Latin display font (headings, UI)
- `Noto Sans` -- Latin body text
- `Noto Sans Devanagari` -- Hindi, Marathi
- `Noto Sans Telugu` -- Telugu

---

## 16. CI/CD — Azure Auto-Deploy

### What Triggers a Deploy

Every `git push` to `master` triggers GitHub Actions automatically.

### Backend Deploy (`.github/workflows/backend-azure.yml`)

```
Push to master (backend/** changes)
  |
GitHub Actions runner (ubuntu-latest)
  |
1. Checkout code
2. Set up Python 3.12
3. pip install -r requirements.txt
4. Create ZIP archive (exclude __pycache__, .env, tests)
5. az login (service principal from AZURE_CREDENTIALS secret)
6. az webapp deploy -> pushes ZIP to Azure App Service
```

### Frontend Deploy (`.github/workflows/frontend-azure.yml`)

```
Push to master (frontend/** changes)
  |
GitHub Actions runner
  |
Azure/static-web-apps-deploy@v1 action:
  1. npm run build  ->  Next.js static export -> out/ directory
  2. Upload out/ to Azure Static Web Apps CDN
  3. Azure propagates to global CDN edge nodes
```

Deploy completes in ~5 minutes. Zero-downtime (CDN swap).

### Staging — PR Preview Environments (added — commits `f1893a1`, `a6514f4`)

`frontend-azure.yml` now also runs on pull requests targeting `master`:
- `pull_request` opened/synchronize/reopened (not yet merged) → Azure SWA builds a **temporary staging environment** for that PR and posts the preview URL as a PR comment. Hits the same production backend, so you can test real flows before merging.
- `pull_request` closed (merged or abandoned) → `close-staging` job tears the preview environment down automatically.

All day-to-day work happens on `develop`; opening a `develop` → `master` PR is how you get a throwaway test URL before going live (matches the workflow already documented in project memory's branch strategy).

### Keep-Alive (`.github/workflows/keepalive.yml`)

Azure App Service on Free/Basic tier spins down after 20 minutes of inactivity. The keepalive workflow pings `GET /api/v1/health` every 15 minutes to prevent cold starts.

---

## 17. Infrastructure Map

```
GitHub Repository (master branch)
  |
  +-- push --> GitHub Actions CI/CD
                    |                    |
                    v                    v
         Azure App Service      Azure Static Web Apps
         (FastAPI Python 3.12)  (Next.js 14 hybrid SSR,
         Port 8000               Azure-managed Node runtime)
              |                       |
              | API calls (HTTPS)     |
              +<----------------------+
              |
              v
         Azure PostgreSQL
         (11 tables, SSL required)

Side services (called from backend):
  MSG91       -> OTP SMS
  Cloudinary  -> Image CDN
  Razorpay    -> Payments
  Google      -> OAuth
```

### Domain Routing

- `localsindia.com` -> Azure Static Web Apps (frontend)
- `api.localsindia.com` -> Azure App Service (backend)
- `staticwebapp.config.json` is now minimal: declares `platform.apiRuntime: node:18` (so Azure provisions the hybrid SSR runtime), allows anonymous on `/api/*`, sets security headers. The old `navigationFallback`/SPA-fallback rules from the static-export era were removed — routing is handled by Next.js itself now, not by SWA config.

---

## 18. What Each File Does — Quick Reference

### Backend

| File | What it does |
|------|-------------|
| `app/main.py` | FastAPI app, mounts 11 routers, CORS, health endpoint |
| `core/config.py` | Reads all env vars (DATABASE_URL, SECRET_KEY, etc.) |
| `core/database.py` | Creates async PostgreSQL connection pool |
| `core/security.py` | bcrypt hash/verify, JWT create/decode, OTP generator |
| `core/deps.py` | `get_current_user()` and `get_current_admin()` dependencies |
| `models/user.py` | `users` table -- people who use the platform |
| `models/city.py` | `cities` table -- 496 Indian cities |
| `models/category.py` | `categories` table -- listing types (tiffin, jobs, etc.) |
| `models/listing.py` | `listings` table -- classified ads (the core product) |
| `models/listing_image.py` | `listing_images` table -- photos for listings |
| `models/listing_review.py` | `listing_reviews` table -- user ratings on listings |
| `models/business.py` | `businesses` table -- business directory (Yellow Pages) |
| `models/review.py` | `reviews` table -- user ratings on businesses |
| `models/event.py` | `events` table -- local events calendar |
| `models/report.py` | `reports` table -- abuse/spam reports |
| `models/otp_request.py` | `otp_requests` table -- OTP lifecycle (hash, attempts, expiry) |
| `routers/auth.py` | Login, signup, OTP, Google OAuth, token refresh |
| `routers/cities.py` | List cities, get city by slug |
| `routers/categories.py` | List all categories |
| `routers/listings.py` | Full listing CRUD, report, renew, fulfill, reviews |
| `routers/uploads.py` | Image upload/delete via Cloudinary |
| `routers/search.py` | Full-text search with PostgreSQL tsvector |
| `routers/businesses.py` | Business directory CRUD, claim, reviews |
| `routers/events.py` | Events calendar CRUD |
| `routers/admin.py` | Admin moderation: approve/reject listings+events, user management |
| `routers/payments.py` | Razorpay featured listing payments |
| `routers/users.py` | Public seller profiles (name, avatar, member_since, listings) |
| `services/msg91.py` | Send OTP via MSG91 SMS gateway (mock in dev) |
| `services/cloudinary_svc.py` | Upload/delete images on Cloudinary CDN |
| `services/search_svc.py` | PostgreSQL full-text search query builder |
| `scripts/seed_cities.py` | Inserts 140 cities with state/language defaults |
| `scripts/seed_categories.py` | Inserts listing categories |
| `scripts/seed_cities_full.py` | Extended 700+ city list (Phase 2) |

### Frontend

| File | What it renders |
|------|----------------|
| `app/layout.tsx` | Root HTML shell -- fonts, global providers, toast notifications |
| `app/page.tsx` | Homepage: city selector, categories, fresh listings |
| `app/[city]/layout.tsx` | City shell: sticky header, bottom nav |
| `app/[city]/page.tsx` | City home: featured + latest listings by category |
| `app/[city]/[category]/page.tsx` | Category listings browse |
| `app/[city]/classifieds/[id]/page.tsx` | Listing detail (Server Component wrapper) |
| `app/[city]/classifieds/[id]/ListingDetailClient.tsx` | Listing detail -- actual UI with state |
| `app/[city]/classifieds/[id]/promote/page.tsx` | Featured listing payment (wrapper) |
| `app/[city]/classifieds/[id]/promote/PromoteClient.tsx` | Razorpay checkout UI |
| `app/[city]/classifieds/post/page.tsx` | Post new listing (3-step wizard) |
| `app/[city]/search/page.tsx` | Search results with filters |
| `app/[city]/businesses/page.tsx` | Business directory |
| `app/[city]/businesses/[id]/page.tsx` | Business profile (wrapper) |
| `app/[city]/businesses/[id]/BusinessDetailClient.tsx` | Business detail UI with state |
| `app/[city]/businesses/add/page.tsx` | Add business form |
| `app/[city]/events/page.tsx` | Events calendar |
| `app/[city]/events/post/page.tsx` | Post event form |
| `app/[city]/launch/page.tsx` | City launch celebration |
| `app/auth/login/page.tsx` | Phone OTP + Google OAuth login |
| `app/auth/callback/page.tsx` | Google OAuth redirect handler |
| `app/profile/page.tsx` | User settings (name, language, city) |
| `app/profile/listings/page.tsx` | My listings management |
| `app/profile/listings/[id]/page.tsx` | Listing stub (static export segment coverage) |
| `app/profile/listings/[id]/edit/page.tsx` | Edit listing (wrapper) |
| `app/profile/listings/[id]/edit/EditListingClient.tsx` | Edit form UI with state, incl. photo add/remove (2026-07-13) |
| `app/admin/login/page.tsx` | Admin login |
| `app/admin/layout.tsx` | Admin sidebar navigation |
| `app/admin/listings/page.tsx` | Listing moderation queue |
| `app/admin/events/page.tsx` | Event moderation queue |
| `app/admin/users/page.tsx` | User management |
| `app/admin/reports/page.tsx` | Abuse reports |
| `app/privacy/page.tsx` | Privacy policy |
| `app/terms/page.tsx` | Terms of service |
| `app/offline/page.tsx` | PWA offline fallback |
| `app/invite/page.tsx` | Invite friends |
| `app/seller/[id]/page.tsx` | Public seller profile — avatar, member since, listings grid |
| `app/saved/page.tsx` | Saved/bookmarked listings (localStorage, no backend) |
| `app/listing/[id]/page.tsx` + `ListingDetailClient.tsx` | Global city-agnostic listing detail (deep links, mobile, shares) |
| `app/category/[slug]/page.tsx` | Client redirect: `/category/{slug}` → `/{city}/search?category={slug}` |
| `app/post/page.tsx` | Client redirect: `/post` → `/{city}/classifieds/post` |
| `app/error.tsx` | Global error boundary — auto-reloads on ChunkLoadError, else friendly "Try again" screen |
| `hooks/useSaved.ts` | localStorage bookmark hook (toggle, isSaved, saved list) |
| `components/listing-card/ListingCard.tsx` | Listing display card (photo, price, WhatsApp button) |
| `components/listing-card/ListingCardSkeleton.tsx` | Loading placeholder (same size as ListingCard) |
| `components/site-header/SiteHeader.tsx` | Top navigation bar |
| `components/site-footer/SiteFooter.tsx` | Bottom footer |
| `components/site-logo/SiteLogo.tsx` | Logo (light/dark variants) |
| `components/city-picker/CityPickerModal.tsx` | City selection modal with search |
| `components/language-selector/LanguageSelector.tsx` | 11-language dropdown |
| `components/language-switcher/LanguageSwitcher.tsx` | Language toggle |
| `components/whatsapp-button/WhatsAppButton.tsx` | Green WhatsApp CTA button |
| `components/whatsapp-badge/WhatsAppBadge.tsx` | WhatsApp indicator badge |
| `components/bottom-nav/BottomNav.tsx` | Mobile bottom navigation (5 tabs) |
| `components/empty-state/EmptyState.tsx` | "No results" friendly state |
| `components/ad-banner/AdBanner.tsx` | City page ad banner slot (Phase 3) |
| `components/fresh-listings/FreshListingsSection.tsx` | Homepage latest listings carousel |
| `components/pwa/ServiceWorker.tsx` | PWA service worker registration |
| `context/PrefsContext.tsx` | Global state: city, language, user, tokens (localStorage-backed) |
| `lib/api.ts` | Typed API client -- every backend call defined here |
| `lib/types.ts` | TypeScript interfaces for all data models |
| `lib/utils.ts` | Utilities: cn(), formatPrice(), timeAgo() |
| `lib/prefs.ts` | localStorage preference helpers |
| `lib/razorpay.ts` | Razorpay checkout helper |
| `i18n/request.ts` | next-intl locale resolution (defaults to 'en' in static export) |
| `messages/en.json` | English translations |
| `messages/hi.json` | Hindi translations |
| `messages/te.json` | Telugu translations |
| `messages/*.json` | + 8 more languages (ta, kn, mr, bn, gu, pa, ml, or) |
| `next.config.mjs` | Hybrid SSR config (no `output: 'export'`), image domains, webpack cache disabled |
| `tailwind.config.ts` | Tailwind CSS theme |
| `app/globals.css` | CSS variables (brand colors), Tailwind base styles |

### Infrastructure

| File | What it does |
|------|-------------|
| `.github/workflows/backend-azure.yml` | Auto-deploy backend to Azure on push |
| `.github/workflows/frontend-azure.yml` | Auto-deploy frontend to Azure on push |
| `.github/workflows/keepalive.yml` | Ping API every 15 min to prevent cold starts |
| `staticwebapp.config.json` | Minimal SWA config: `apiRuntime: node:18` (hybrid SSR), security headers, anonymous `/api/*` |
| `backend/Dockerfile` | Python 3.12 container for backend |
| `backend/requirements.txt` | All Python dependencies pinned to exact versions |
| `backend/migrations/` | Alembic database schema versions (run: alembic upgrade head) |
| `backend/scripts/seed_cities.py` | Populate cities table (run once after first deploy) |
| `backend/scripts/seed_categories.py` | Populate categories table (run once) |

### Mobile App (React Native)

| File | What it does |
|------|-------------|
| `mobile/App.tsx` | Navigation root: bottom tabs (Home/Search/Post/Saved/Profile) + stack navigator (now includes `Invite`). Wrapped in `SafeAreaProvider`; tab bar height/padding driven by `useSafeAreaInsets().bottom` so it clears the Android gesture-nav pill / iOS home indicator instead of sitting under it. (2026-07-18) A new `expo-linking` effect captures `?ref=` from both cold-start (`getInitialURL`) and warm (`addEventListener('url')`) deep links into `storage.setReferralRefCode` |
| `mobile/src/lib/api.ts` | FastAPI-adapted axios layer; JWT auto-refresh; field names match backend (`contact_phone`, `access_token`) |
| `mobile/src/lib/storage.ts` | expo-secure-store wrapper for tokens + user; `clear()` for logout |
| `mobile/src/hooks/useSaved.ts` | AsyncStorage bookmark hook (same API as web `useSaved`) |
| `mobile/src/components/ListingCard.tsx` | RN listing card with gradient emoji placeholder, price, WA button |
| `mobile/src/screens/HomeScreen.tsx` | Dark hero with real `logo-mark-transparent.png` brand mark next to the headline, city switcher, trending chips, category grid (2×4, emoji `fontSize: 34` for legibility), fresh listings |
| `mobile/src/screens/SearchScreen.tsx` | Debounced search, category tabs (horizontal `FlatList`; `contentContainerStyle={{alignItems:'center'}}` + fixed `height:44` + `flexGrow:0` — without this the pills stretch to fill the list's full height, a classic horizontal-FlatList `alignItems:'stretch'` cross-axis gotcha), city chip, FlatList with results; "Near Me" toggle (2026-07-16) sends device `lat`/`lng` for real distance sorting |
| `mobile/src/screens/ListingDetailScreen.tsx` | Photo gallery + thumbnail strip, sticky WA button, seller → SellerProfile |
| `mobile/src/screens/SellerProfileScreen.tsx` | Seller avatar/initials, member since, listing count, listings list |
| `mobile/src/screens/LoginScreen.tsx` | OTP flow: phone → code → tokens stored in SecureStore; debug OTP shown; real logo image above the wordmark text. Signup path only (2026-07-18) reads any captured referral code out of storage and sends it as `ref_code` on `verifyOtp` — the separate forgot-password OTP flow is untouched |
| `mobile/src/screens/PostScreen.tsx` | 3-step wizard: details + category grid → photos (expo-image-picker) → contact; "Include my location" toggle (2026-07-16) auto-fills Area if empty + auto-picks City by exact name match against the seeded list (never forces an unmatched city), both always manually editable; (2026-07-17) picking "Businesses" as the category branches submit() to create a real Business Directory entry (`businessesApi.create`) instead of a classified — same wizard, Price hidden, Area relabels to Address, Photos step shows a note instead of the upload zone |
| `mobile/src/screens/BusinessesScreen.tsx` | (new, 2026-07-17) Business Directory browse list for the user's city; "Add Your Business" opens Post Listing with category pre-selected via route params rather than a separate screen |
| `mobile/src/screens/SplashScreen.tsx` | Animated launch screen (2026-07-16, new) — logo spring-in, wordmark fade-in, "Buy · Sell · Connect" tagline pops word-by-word; shown in `App.tsx` in place of the old blank placeholder View during `checkAuth()` |
| `mobile/src/screens/SavedScreen.tsx` | AsyncStorage bookmarks with empty state CTA |
| `mobile/src/screens/ProfileScreen.tsx` | User info + menu (My Listings, Saved, Invite Friends (2026-07-18), City, Edit) + logout with confirmation |
| `mobile/src/screens/InviteScreen.tsx` | (new, 2026-07-18) Fetches own `referral_code` via `getMe()`, builds `https://www.localsindia.com/{citySlug}?ref={code}`, shares it via the native `Share.share()` API (same pattern as `ListingDetailScreen.tsx`'s share button) |
| `mobile/src/screens/CityPickerScreen.tsx` | Searchable modal; pulls from `/api/v1/cities`; callback pattern for city selection |
| `mobile/src/screens/AdminScreen.tsx` | Admin panel ported to mobile: listing moderation queue, approve/reject, role management |
| `mobile/src/screens/LoginScreen.tsx` (Google) | Also handles Google Sign-In via `expo-web-browser` deep-link flow — see §11 |
| `mobile/eas.json` | EAS Build profiles: `development` (debug APK), `preview` (internal APK), `production` (AAB for Play Store, autoIncrement) |
| `mobile/app.json` | Expo config; `extra.eas.projectId` links to EAS project `@rajeshguntupalli59/localsindia`; splash image + image-picker permission text configured for store builds; `googleServicesFile` (2026-07-16) → `mobile/google-services.json` (gitignored) — required client-side for push notifications to generate a device token |
| `mobile/assets/icon.png`, `android-icon-foreground.png`, `favicon.png` | Real LocalsIndia logo — mark-only crop (turtle+pin symbol, no wordmark text since it'd be illegible at icon sizes) |
| `mobile/assets/splash-icon.png` | Real logo — full mark + "LocalsIndia" wordmark + tagline, shown on the orange splash background |
| `mobile/assets/logo-mark-transparent.png` | Logo mark with white chroma-keyed to transparent — used inside app UI (HomeScreen hero, LoginScreen) so it sits cleanly on colored/dark backgrounds |

**EAS Build (Play Store pipeline, added 2026-06-16):** `eas build --platform android --profile preview|production` from `mobile/`. Build dashboard: `https://expo.dev/accounts/rajeshguntupalli59/projects/localsindia/builds/`. **Update 2026-07-15:** already submitted and live on the Play Store Internal Testing track (versionCode 4, commit `a34006e`). **That build is now stale** — it predates the proximity search/location posting, search fix, splash screen, and the push notification client fix (all `2026-07-16`). A new build is the next step before promoting past Internal Testing. **Update 2026-07-18:** the gap has grown — the last actual *production-profile* build (versionCode 6, commit `1014006`) also predates the referral system (App Links capture + InviteScreen, commit `ce2ee31`), the Business Directory mobile screens, and the category-icon/member-since fixes. The next build needs to bundle all of it, not just the referral feature. `assetlinks.json`'s SHA-256 is already fixed (commit `3015c0a`) and live on the web, but Android verifies App Links at install time — so it only takes effect once a new build actually ships.

---

*Updated: 2026-07-18 | Scoped to South India only (migration `a3b4c5d6e7f8`, §5 cities table) — reversible `cities.active` data change, no code touched, both web and mobile automatically reflect it via the shared `/api/v1/cities` endpoints. Google Auth removed from web login via its pre-existing feature flag (§11 updated — corrected a stale claim that mobile still had a working Google deep-link; it had already been silently removed from `LoginScreen.tsx` in an earlier, undated pass). Backend `/auth/google*` routes deliberately kept, not deleted, for one real Google-only user with no phone fallback. Also today: Mobile event creation (§12) — added to `PostScreen.tsx` right after the ticketing feature shipped, once Raj asked specifically whether mobile event creation could be added too; extends the wizard exactly like Businesses did, one new native dependency accepted (`@react-native-community/datetimepicker`) since a rebuild is already pending regardless. Also today: Event ticketing, web + mobile (§12) — second piece of Phase 3 monetization; new `tickets` table, `routers/tickets.py`, the first-ever web `/events/[id]` page, and mobile Events built from scratch (browse/detail/buy/my-tickets); QR generated server-side so mobile needed zero new native dependencies, deliberately avoiding a second pending native rebuild — see §12 for the full reasoning. 129/129 backend tests, frontend + mobile verification all clean. Also today: Business Analytics Dashboard (§12) — first piece of Phase 3 monetization, commit `63155f0`; verified live in production (migration ran clean via CI, new route confirmed present + auth-gated on the deployed backend). Also today: two-sided referral system (§5 users table, §6 Auth endpoints, §8 /invite page, §9 ReferralCapture component, §18 mobile App.tsx/LoginScreen/ProfileScreen/InviteScreen) — commits `1f7243c` (backend+web) and `ce2ee31` (mobile); real Play Console App Signing SHA-256 added to assetlinks.json, commit `3015c0a`. ⚠️ This pass only closes the referral-system gap specifically — several earlier feature passes (2026-07-12 through 2026-07-17: password auth rework, buyer requests, proximity search, business directory mobile parity, push notifications, error tracking) are still only reflected in `ARCHITECTURE_INDEX.md`, not fully backfilled into this file's narrative sections yet. Previous update: 2026-06-16 | LocalIndia v3 -- hybrid SSR migration, admin role management, business soft-delete, mobile Google Sign-In + admin panel + EAS Play Store pipeline + real logo assets + safe-area bottom nav fix*
