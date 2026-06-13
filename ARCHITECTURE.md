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
Azure Static Web Apps  <--- Next.js static HTML/JS (5,638 pre-built pages)
      | (API calls)
Azure App Service       <--- FastAPI Python server (10 routers, 50+ endpoints)
      | (SQL)
Azure PostgreSQL         <--- 11 tables, full-text search, soft-delete everywhere
      | (side effects)
Cloudinary              <--- listing photos (upload/delete)
MSG91                   <--- OTP SMS to Indian phones
Razorpay                <--- featured listing payments
Google OAuth            <--- social sign-in
```

**One-line summary of each tier:**
- **Frontend**: Pre-built static HTML + React client — loads fast on 4G, works in 11 Indian languages
- **Backend**: FastAPI REST API — validates requests, enforces business rules, talks to DB
- **Database**: PostgreSQL — stores everything, full-text search built-in via tsvector
- **Infrastructure**: Azure — auto-deploys on every git push to master

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

FastAPI creates the app here. All 10 routers are registered under `/api/v1/`:

```python
app.include_router(auth_router,       prefix="/api/v1/auth")
app.include_router(cities_router,     prefix="/api/v1/cities")
app.include_router(categories_router, prefix="/api/v1/categories")
app.include_router(listings_router,   prefix="/api/v1")
app.include_router(uploads_router,    prefix="/api/v1/upload")
app.include_router(search_router,     prefix="/api/v1/search")
app.include_router(businesses_router, prefix="/api/v1")
app.include_router(events_router,     prefix="/api/v1")
app.include_router(admin_router,      prefix="/api/v1/admin")
app.include_router(payments_router,   prefix="/api/v1/payments")
```

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
| `search_vector` | TSVECTOR | Auto-computed from title+description for full-text search |
| `deleted_at` | DateTime | Soft-delete |

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

## 6. API Endpoints — Every Route

### Auth: `/api/v1/auth`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/admin-login` | Admin login with username+password | No |
| POST | `/signin` | Sign in existing user by phone (no OTP) | No |
| POST | `/otp/send` | Send OTP SMS to phone | No |
| POST | `/otp/verify` | Verify OTP -> get tokens | No |
| POST | `/refresh` | Get new access token using refresh token | No |
| DELETE | `/logout` | Client clears tokens (server stateless) | No |
| POST | `/dev-login` | Skip OTP (only when OTP_DEBUG=true) | No |
| GET | `/me` | Get current user profile | Yes |
| PATCH | `/me` | Update name or language preference | Yes |
| GET | `/google` | Redirect to Google OAuth consent | No |
| GET | `/google/callback` | Exchange code -> tokens -> redirect frontend | No |

### Cities: `/api/v1/cities`

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/` | All active cities (sorted by state then name) |
| GET | `/{slug}` | Single city by slug |

### Categories: `/api/v1/categories`

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/` | All parent categories (sorted by sort_order) |

### Listings: `/api/v1`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| GET | `/cities/{slug}/listings` | Listings for a city (filter by category, status, page) | No |
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
| GET | `/?q=...&city_slug=...` | Full-text search + ILIKE fallback. Returns paginated results. |

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
| GET | `/reports` | All abuse reports |

### Payments: `/api/v1/payments`

| Method | Path | What it does | Auth? |
|--------|------|-------------|-------|
| POST | `/featured/create-order` | Create Razorpay order (Rs.99/week or Rs.199/month) | Yes |
| POST | `/featured/verify` | Verify payment signature -> set is_featured=true | Yes |

---

## 7. Frontend Architecture

### How Static Export Works

The frontend is built with Next.js `output: 'export'` -- this means at build time, all pages are converted to static HTML files. There is no server. Azure Static Web Apps just serves these HTML files from a CDN.

**Why this matters:** Pages that need real-time data (listing detail, search) use a trick:
1. The HTML shell is pre-built and served instantly
2. React mounts (hydrates) in the browser
3. `useEffect` fires an API call to fetch real data
4. React re-renders with the real data

This gives you fast first paint (static HTML) + dynamic content (API fetch).

**The `generateStaticParams` pattern:** For routes like `/[city]/classifieds/[id]`, we can't pre-build every possible listing ID. So we pre-build one placeholder (`/hyderabad/classifieds/placeholder`) and use `navigationFallback` in `staticwebapp.config.json` to serve the same HTML for any real listing URL.

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
- Image carousel (swipeable on mobile, tap to fullscreen)
- Title, price, category, time posted, area/location
- Full description (expandable "Show more")
- Seller card (name, member since)
- WhatsApp button (full-width, fixed at bottom) -> opens `wa.me/91XXXXXXXXXX`
- Report button
- Reviews section

`page.tsx` is a thin Server Component wrapper (for static export compatibility).
`ListingDetailClient.tsx` is the actual component with all state and API calls.

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

### `/[city]/classifieds/[id]/edit` — Edit Listing

**Files:** `app/[city]/classifieds/[id]/edit/page.tsx` + `EditListingClient.tsx`

Same form as Post but pre-filled with existing data. Only listing owner can access.
Sends PATCH to `/api/v1/listings/{id}`.

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

Wrapped in Suspense because it uses `useSearchParams()` (required for static export).

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

Share the platform with friends via WhatsApp/SMS.

---

## 9. Every Component Explained

### `ListingCard` — The Core Display Unit

**File:** `components/listing-card/ListingCard.tsx`

Used everywhere listings appear (city home, search, category browse, profile).

- Image: 4:3 aspect ratio, next/image, blur placeholder while loading
- Price badge: top-right corner, "Price on request" if null
- Category chip: bottom-left on image, semi-transparent dark
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

Responsive banner slot above category chips on city page. Phase 3 monetization feature.

### `FreshListingsSection`

**File:** `components/fresh-listings/FreshListingsSection.tsx`

Carousel of latest listings on the homepage. Auto-scrolls. Shows listings from popular cities.

### `ServiceWorker`

**File:** `components/pwa/ServiceWorker.tsx`

Registers the PWA service worker (`public/sw.js`). Enables:
- Offline access to cached pages
- "Add to home screen" on Android Chrome
- Background sync (future)

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

Browser blocks any other origin from calling the API.

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
         (FastAPI Python 3.12)  (Next.js static HTML/JS)
         Port 8000               5,638 pre-built pages
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
- `staticwebapp.config.json` handles SPA routing: any unknown path -> serves `index.html` (client-side router takes over)

---

## 18. What Each File Does — Quick Reference

### Backend

| File | What it does |
|------|-------------|
| `app/main.py` | FastAPI app, mounts 10 routers, CORS, health endpoint |
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
| `app/[city]/classifieds/[id]/edit/page.tsx` | Edit listing (wrapper) |
| `app/[city]/classifieds/[id]/edit/EditListingClient.tsx` | Edit form UI with state |
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
| `app/profile/listings/[id]/edit/page.tsx` | Edit listing |
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
| `next.config.mjs` | Static export config, image domains, webpack settings |
| `tailwind.config.ts` | Tailwind CSS theme |
| `app/globals.css` | CSS variables (brand colors), Tailwind base styles |

### Infrastructure

| File | What it does |
|------|-------------|
| `.github/workflows/backend-azure.yml` | Auto-deploy backend to Azure on push |
| `.github/workflows/frontend-azure.yml` | Auto-deploy frontend to Azure on push |
| `.github/workflows/keepalive.yml` | Ping API every 15 min to prevent cold starts |
| `staticwebapp.config.json` | Azure SWA routing rules (SPA fallback -> index.html) |
| `backend/Dockerfile` | Python 3.12 container for backend |
| `backend/requirements.txt` | All Python dependencies pinned to exact versions |
| `backend/migrations/` | Alembic database schema versions (run: alembic upgrade head) |
| `backend/scripts/seed_cities.py` | Populate cities table (run once after first deploy) |
| `backend/scripts/seed_categories.py` | Populate categories table (run once) |

---

*Generated: 2026-06-12 | LocalIndia v1 -- Azure Static Web Apps + Azure App Service*
