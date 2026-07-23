# LocalIndia — Project Intelligence Document
**Last updated:** 2026-06-11 | **Last commit:** 0e5f83a

---

## 1. WHAT IS THIS PROJECT

**localsindia.com** — India's hyperlocal community classifieds platform.
Users pick their city, browse listings in their language, post for free, and contact sellers via WhatsApp.
Covers classifieds, events, businesses, PG/roommate across 249+ Indian cities in 11 languages.

**Owner:** Venkata Rajesh Guntupalli (Raj) — queryoptimizer78@gmail.com

---

## 2. LIVE URLS

| Surface | URL | Status |
|---|---|---|
| Website | https://www.localsindia.com | ✅ LIVE |
| Backend API | https://localsindia-backend-in.azurewebsites.net | ✅ LIVE |
| Health check | https://localsindia-backend-in.azurewebsites.net/api/v1/health | ✅ `{"status":"ok"}` |
| Admin panel | https://www.localsindia.com/admin/login | ✅ LIVE (no public link) |
| API docs | https://localsindia-backend-in.azurewebsites.net/docs | ✅ FastAPI Swagger |

---

## 3. INFRASTRUCTURE

| Layer | Service | Tier | Cost |
|---|---|---|---|
| Frontend | Azure Static Web Apps | FREE | $0/mo |
| Backend | Azure App Service F1 | FREE | $0/mo |
| Database | Azure PostgreSQL Flexible Server B1ms | Paid | ~$15/mo |
| Images | Cloudinary | FREE tier | $0/mo |
| Auth (Google) | Google OAuth | FREE | $0/mo |
| CI/CD | GitHub Actions | FREE | $0/mo |
| Keep-alive | GitHub Actions cron (every 5 min) | FREE | $0/mo |
| Domain | GoDaddy | Paid | ~$10/yr |

**Resource group:** `localsindia-rg`
**App Service name:** `localsindia-backend`

---

## 4. CODE REPOSITORY

**GitHub:** https://github.com/rajeshguntupalli59/localsindia.git
**Branch:** `master` (NOT main — workflows trigger on master)
**Local path:** `C:\Users\rajes\localindia\`

**Key docs in repo:**
- `CLAUDE.md` — build spec, hard rules, UI quality bar
- `ARCHITECTURE.md` — full DB schema, API spec
- `BUILD_PLAN.md` — 14-week plan, 140 seed cities
- `AZURE_DEPLOY.md` — 10-step Azure checklist (DONE)

---

## 5. TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS |
| UI components | shadcn/ui (New York style, Slate base) |
| Animations | Framer Motion v11 |
| i18n | next-intl + custom `usePrefs()` hook |
| Backend | FastAPI Python 3.12 |
| ORM | SQLAlchemy 2.0 async + Alembic migrations |
| DB driver | asyncpg |
| Database | PostgreSQL 16 |
| Auth | JWT (access 15 min / refresh 30 days) + bcrypt |
| OAuth | Google OAuth 2.0 |
| OTP | MSG91 (currently in debug/mock mode) |
| Images | Cloudinary (upload + CDN) |
| Testing (BE) | pytest + pytest-asyncio |
| Testing (FE) | Playwright E2E |

**Critical notes:**
- SSL: `connect_args={"ssl": True}` NOT `?ssl=true` (asyncpg requires this)
- Route order: static FastAPI routes MUST be before dynamic `/{id}` routes
- `NEXT_PUBLIC_*` vars must be in `.github/workflows/frontend-azure.yml` env section

---

## 6. ENVIRONMENT VARIABLES

### Backend (Azure App Service → Configuration)

| Variable | Value | Status |
|---|---|---|
| DATABASE_URL | postgresql+asyncpg://localsindia_admin:...@localsindia-db.../localsindia?ssl=true | ✅ SET |
| SECRET_KEY | (JWT signing key) | ✅ SET |
| FRONTEND_URL | https://www.localsindia.com | ✅ SET |
| ENVIRONMENT | production | ✅ SET |
| OTP_DEBUG | true | ⚠️ CHANGE TO false when MSG91 live |
| MSG91_AUTH_KEY | NOT SET | 🔴 Blocked on DLT registration |
| MSG91_TEMPLATE_ID | NOT SET | 🔴 Blocked on DLT registration |
| CLOUDINARY_CLOUD_NAME | dbgoijryf | ✅ LIVE |
| CLOUDINARY_API_KEY | 436189718573935 | ✅ LIVE |
| CLOUDINARY_API_SECRET | (set) | ✅ LIVE |
| GOOGLE_CLIENT_ID | 919627354106-a74cb4li3cn3g4odl8tiqu63beeo45kc.apps.googleusercontent.com | ✅ LIVE |
| GOOGLE_CLIENT_SECRET | (set) | ✅ LIVE |
| GOOGLE_REDIRECT_URI | https://localsindia-backend-in.azurewebsites.net/api/v1/auth/google/callback | ✅ SET |
| ADMIN_USERNAME | localsindia_admin | ✅ SET |
| ADMIN_PASSWORD_HASH | (bcrypt hash of Rajesh@4356) | ✅ SET |

### Frontend (GitHub Actions secrets)

| Secret | Value |
|---|---|
| AZURE_CLIENT_ID | (set) |
| AZURE_CLIENT_SECRET | (set) |
| AZURE_TENANT_ID | (set) |
| AZURE_SUBSCRIPTION_ID | (set) |
| AZURE_STATIC_WEB_APPS_API_TOKEN | (set) |
| NEXT_PUBLIC_API_URL | https://localsindia-backend-in.azurewebsites.net |
| NEXT_PUBLIC_GOOGLE_AUTH_ENABLED | true |
| NEXT_PUBLIC_OTP_DEBUG | true |

---

## 7. ADMIN ACCESS

**URL:** `https://www.localsindia.com/admin/login` (no public link)
**Username:** `localsindia_admin`
**Password:** stored as env var — bcrypt hashed

**Admin capabilities:**
- Approve / Reject pending listings (with reason modal)
- View listings by status: Pending / Active / Flagged / Rejected
- Approve / Reject pending events
- View and manage reported listings
- View user list

**How it works internally:**
- `POST /api/v1/auth/admin-login` validates username + bcrypt hash
- Creates synthetic DB user with phone `+910000000001` (impossible for real Indian mobiles)
- Returns UUID-based JWT — works with the same `get_current_user` dep as regular users
- Admin layout: `if (pathname === '/admin/login') return <>{children}</>` bypasses auth guard on login page itself

---

## 8. WHAT'S BUILT — FULL FEATURE LIST

### Backend API routes

**Auth:**
- `POST /auth/admin-login` — username+password admin login
- `POST /auth/signin` — existing users sign in directly (no OTP)
- `POST /auth/otp/send` — send OTP (mock mode: returns OTP in response)
- `POST /auth/otp/verify` — verify OTP, create/return user
- `GET /auth/google` + `GET /auth/google/callback` — Google OAuth
- `POST /auth/refresh` — refresh JWT
- `DELETE /auth/logout`
- `GET/PATCH /auth/me`

**Cities:**
- `GET /cities` — all 249+ cities
- `GET /cities/{slug}` — single city
- `GET /cities/{slug}/listings` — listings for city

**Categories:** `GET /categories`

**Listings:**
- Full CRUD: `POST`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`
- `GET /listings/mine` — logged-in user's listings
- `POST /listings/{id}/report` — flag a listing
- `POST /listings/{id}/renew` — extend expiry
- `POST /listings/{id}/fulfill` — mark as sold
- `GET /listings/{id}/reviews` + `POST /listings/{id}/reviews`

**Upload:** `POST /upload/image`, `DELETE /upload/image`

**Search:** `GET /search?q=&city_id=&category=&limit=&offset=` (tsvector + pg_trgm)

**Events:** `GET/POST /events`, `GET/PATCH/DELETE /events/{id}`

**Businesses:** `GET/POST /businesses`, `GET/PATCH /businesses/{id}`, `POST /businesses/{id}/claim`, `POST /businesses/{id}/reviews`

**Admin:**
- `GET /admin/listings/pending` — pending queue
- `GET /admin/listings?status=` — listings by status
- `PATCH /admin/listings/{id}/approve`
- `PATCH /admin/listings/{id}/reject`
- `DELETE /admin/listings/{id}`
- `GET /admin/events/pending`, `GET /admin/events?status=`
- `PATCH /admin/events/{id}/approve`, `PATCH /admin/events/{id}/reject`
- `GET /admin/reports`
- `GET /admin/users`

### Frontend pages

| Route | Description |
|---|---|
| `/` | Homepage — hero search, category grid, fresh listings, trust badges |
| `/auth/login` | Phone OTP (3 steps: phone→OTP→name for new) + Google OAuth |
| `/auth/callback` | Google OAuth token exchange + redirect |
| `/[city]` | City home — featured + latest listings, category pills, sort |
| `/[city]/search` | Search results + sidebar filters (desktop) + mobile filter accordion |
| `/[city]/classifieds/[id]` | Listing detail — gallery, WhatsApp fixed CTA, seller reviews |
| `/[city]/classifieds/post` | 3-step post wizard (Details → Photos → Contact) |
| `/[city]/classifieds/[id]/edit` | Edit listing |
| `/[city]/events` | Events list |
| `/[city]/events/post` | Post event form |
| `/[city]/businesses` | Yellow Pages style — star ratings, WA button |
| `/[city]/businesses/[id]` | Business profile + write review + claim |
| `/[city]/businesses/add` | Add business form |
| `/[city]/[category]` | SEO landing pages (8 categories × 249+ cities = 1,992 pages) |
| `/profile` | User profile |
| `/profile/listings` | My listings — edit, mark sold, renew, delete |
| `/profile/listings/[id]/edit` | Edit listing |
| `/admin/login` | Admin console — dark navy, username/password |
| `/admin/listings` | Listings moderation (Pending/Active/Flagged/Rejected tabs) |
| `/admin/events` | Events moderation |
| `/admin/reports` | Flagged listings |
| `/admin/users` | User list |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Service |

### Special features

**i18n:** 11 languages — English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati, Punjabi, Malayalam, Odia
- All UI chrome translates (nav, buttons, categories, sort, badges)
- User-generated content stays in seller's language (same as JustDial/OLX)

**PWA:** manifest.json, service worker (stale-while-revalidate), offline page, install prompt

**SEO:** robots.txt, dynamic sitemap.ts (static + all city URLs), Google Search Console verified, JSON-LD ItemList schema on category pages

**Google OAuth:** live + "Continue with Google" button, auto-switches to signup for new emails

**Keep-alive:** GitHub Actions cron every 5 min — prevents Azure F1 cold start

**Geolocation:** "Use Current Location" in hero + city picker — Nominatim reverse geocoding + fuzzy city match

---

## 9. DATABASE SCHEMA (key tables)

```
users          id(UUID), phone, email, name, role(user/admin), lang_pref, avatar_url, is_active, deleted_at
cities         id(UUID), name, slug, state, lang_default, listing_count
categories     id(UUID), name, slug, icon_emoji, sort_order
listings       id(UUID), title, description, price, city_id, category_id, user_id, status(pending/active/flagged/rejected/fulfilled/expired), images(JSONB), contact_phone, whatsapp_url, area, website_url, social_url, search_vector(tsvector), expires_at, created_at
listing_images id(UUID), listing_id, url, public_id, sort_order
listing_reviews id(UUID), listing_id, user_id, rating(1-5), body, created_at (UNIQUE per user per listing)
otp_requests   id(UUID), phone, otp_hash, attempts, verified, expires_at, created_at
events         id(UUID), title, city_id, user_id, status, venue, from_date, to_date, is_free, ticket_url
businesses     id(UUID), name, city_id, category_id, user_id, phone, description, verified, claimed_by
reviews        id(UUID), business_id, user_id, rating(1-5), body
```

**Migrations applied on Azure:**
- Initial schema
- Google OAuth fields (email, avatar_url)
- social_url + website_url on listings
- area column on listings (`c3d4e5f6a7b8`)
- listing_reviews table (`d4e5f6a7b8c9`)

---

## 10. TEST COVERAGE

| Suite | Result |
|---|---|
| `pytest backend/tests/` | ✅ 54/54 PASS |
| `npm run build` | ✅ Compiled, 178 static pages |
| `npm run lint` | ✅ 0 ESLint warnings/errors |
| `npx tsc --noEmit` | ✅ 0 TypeScript errors |
| Playwright E2E (local) | ✅ 87/87 PASS |

---

## 11. PENDING WORK

### Raj's Tasks (blocked on external registrations)

| Task | Why needed | How to unblock |
|---|---|---|
| **MSG91 DLT registration** | Real OTP SMS (currently mock — OTP appears on screen) | 1. Get Udyam cert (udyamregistration.gov.in) → 2. Register on vilpower.in → 3. Get PE ID + Header `LINDIA` + Template ID → 4. Set `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID` on Azure → 5. Set `OTP_DEBUG=false` |
| **Razorpay registration** | Phase 3 featured listing payments (Rs.99/week) | Register as Indian business owner at razorpay.com |
| **Facebook Page** | Social auto-posting agent | Create Facebook Page for LocalsIndia |
| **Instagram Business account** | Social auto-posting agent | Create Instagram Business account |
| **Meta Developer App** | API access for auto-posting | Create app at developers.facebook.com → share App ID |
| **Google OAuth branding** | Remove "unverified app" warning on Google login | UNDER REVIEW since 2026-06-09 — just wait |

### Claude builds (unblocked)

| Task | Notes |
|---|---|
| **Phase 3** | Featured listings + Razorpay checkout + business ads + event ticketing — starts after Razorpay |
| **Social auto-posting agent** | 9am IST daily post to Facebook + Instagram — starts after Meta Dev App |
| **Remember Device** | 30-day device trust, OTP only on first login per device — spec saved in `localindia_device_trust.md` |

---

## 12. REVENUE MODEL (Phase 3)

| Product | Price | Target |
|---|---|---|
| Featured listings | Rs.99/week or Rs.199/month | All cities |
| Verified business badge | Rs.499–999/month | Businesses |
| City banner ads | Rs.999–2,999/month | Per city |
| Job posts | Rs.299–999/30 days | Jobs category |
| Event ticketing | 2–3% of ticket sales | Events |
| **Target per active city** | **Rs.40,000/month** | |
| **Target at scale (100 cities)** | **Rs.2.5 Cr/month** | 3-year horizon |

---

## 13. BUILD PHASES

| Phase | Weeks | Status |
|---|---|---|
| Phase 1 — MVP (auth, listings, search, admin, deploy) | 1–6 | ✅ COMPLETE + LIVE |
| Phase 2 — Community (events, businesses, reviews, PWA, 11 languages, SEO) | 7–10 | ✅ COMPLETE |
| Phase 3 — Monetisation (Razorpay, featured listings, ads, ticketing) | 11–14 | 🔴 Blocked on Razorpay |

---

## 14. COMPETITIVE POSITION

| Competitor | Problem | Our advantage |
|---|---|---|
| JustDial | 1.4/5 Trustpilot, spam calls, Rs.5k/yr paywall | FREE to post, no spam |
| OLX | Dead in India (Quikr merged, barely maintained) | Active + modern |
| WhatsApp groups | Unstructured, hard to search | Searchable, categorised |

**Moat:** 249-city seed data + 11 languages + WhatsApp-first (zero middlemen) + free posting

---

## 15. COMMIT HISTORY (key milestones)

| Commit | Description |
|---|---|
| cfeaa0a | PrefsContext + CityPickerModal wired into page.tsx |
| 02ff862 | LocalsIndia logo across all surfaces |
| 6577b32 | Premium header redesign |
| 788f5de | Premium listing cards + FreshListingsSection |
| e1c6548 | Hero capsule + category grid redesign |
| 11ac6e1 | CityPickerModal + PrefsContext + 11-lang translations |
| 4807684 | Final E2E fixes — all 87/87 pass |
| a34df53 | Auth redesign (signin no-OTP) + mobile UX fixes |
| 9689e69 | Full-site i18n expansion (10 translation groups) |
| 9addf97 | Tagline update → "India's Hyperlocal Community Platform" |
| e09b4cc | robots.txt + sitemap.ts |
| 33d1044 | GSC meta tag verification |
| aa45a5f | GSC HTML verification file |
| (admin) | Admin username/password login (replaced OTP) |
| 0e5f83a | GitHub Actions keepalive cron (every 5 min) |

---

## 16. DNS

| Record | Type | Value |
|---|---|---|
| www | CNAME | Azure SWA endpoint |
| @ (apex) | Forwarded | → www.localsindia.com |
| Google GSC TXT | TXT | google-site-verification=... |

Google Search Console: VERIFIED ✅
Sitemap submitted: https://www.localsindia.com/sitemap.xml
