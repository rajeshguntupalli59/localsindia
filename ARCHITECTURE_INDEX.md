# LocalIndia — Architecture Index

> Fast lookup. Use this BEFORE reading ARCHITECTURE.md.
> Every feature addition MUST update this file AND ARCHITECTURE.md together.

---

## How to Use This Index

- **"Where is X implemented?"** → look up by Feature
- **"What does this file do?"** → look up by File
- **"Which endpoint does Y?"** → look up by Endpoint
- **"What columns are in table Z?"** → look up by Table
- **"Which component renders W?"** → look up by Component

---

## Feature Map
*One row per feature. Column headers: Feature | ARCH section | Backend files | Frontend files | DB tables | Key endpoints*

| Feature | ARCH.md § | Backend | Frontend | DB Tables | Endpoints |
|---------|-----------|---------|----------|-----------|-----------|
| OTP Login (phone) | §11, §6-Auth | `routers/auth.py`, `services/msg91.py`, `core/security.py` | `auth/login/page.tsx` | `otp_requests`, `users` | POST /auth/otp/send, POST /auth/otp/verify |
| Google OAuth | §11, §6-Auth | `routers/auth.py`, `core/config.py` | `auth/login/page.tsx`, `auth/callback/page.tsx` | `users` | GET /auth/google, GET /auth/google/callback |
| JWT token refresh | §11 | `routers/auth.py`, `core/security.py` | `lib/api.ts` (auto-refresh) | — | POST /auth/refresh |
| Admin login | §6-Auth | `routers/auth.py` | `admin/login/page.tsx` | `users` (role=admin) | POST /auth/admin-login |
| User profile | §8-Profile | `routers/auth.py` | `profile/page.tsx` | `users` | GET /auth/me, PATCH /auth/me |
| Post a listing | §8-PostListing, §10 | `routers/listings.py` | `[city]/classifieds/post/page.tsx` | `listings` | POST /listings |
| Browse listings | §8-CityHome | `routers/listings.py` | `[city]/page.tsx`, `[city]/[category]/page.tsx` | `listings`, `listing_images` | GET /cities/{slug}/listings |
| Listing detail | §8-ListingDetail | `routers/listings.py` | `[city]/classifieds/[id]/page.tsx`, `ListingDetailClient.tsx` | `listings`, `listing_images`, `listing_reviews` | GET /listings/{id} |
| Edit listing | §8-EditListing | `routers/listings.py` | `[city]/classifieds/[id]/edit/page.tsx`, `EditListingClient.tsx` | `listings` | PATCH /listings/{id} |
| Delete listing | §10 | `routers/listings.py` | `profile/listings/page.tsx` | `listings` (soft-delete) | DELETE /listings/{id} |
| Renew listing | §8-MyListings | `routers/listings.py` | `profile/listings/page.tsx` | `listings` | POST /listings/{id}/renew |
| Mark as sold | §8-MyListings | `routers/listings.py` | `profile/listings/page.tsx` | `listings` | POST /listings/{id}/fulfill |
| Report listing | §10-BL04 | `routers/listings.py` | `[city]/classifieds/[id]/ListingDetailClient.tsx` | `reports`, `listings` | POST /listings/{id}/report |
| Listing reviews | §5-listing_reviews | `routers/listings.py` | `ListingDetailClient.tsx` | `listing_reviews` | GET /listings/{id}/reviews, POST /listings/{id}/reviews |
| WhatsApp tracking | §9-WhatsAppButton | `routers/listings.py` | `WhatsAppButton.tsx` | `listings` (wa_verified) | POST /listings/{id}/wa-click |
| Photo upload | §13 | `routers/uploads.py`, `services/cloudinary_svc.py` | `[city]/classifieds/post/page.tsx` | `listing_images` | POST /upload/image/{listing_id} |
| Photo delete | §13 | `routers/uploads.py`, `services/cloudinary_svc.py` | `[city]/classifieds/[id]/edit/EditListingClient.tsx` | `listing_images` | DELETE /upload/image/{image_id} |
| Full-text search | §14 | `routers/search.py`, `services/search_svc.py` | `[city]/search/page.tsx` | `listings` (search_vector) | GET /search?q=&city_slug= |
| Featured listings (paid) | §12 | `routers/payments.py` | `[city]/classifieds/[id]/promote/page.tsx`, `PromoteClient.tsx`, `lib/razorpay.ts` | `listings` (is_featured) | POST /payments/featured/create-order, POST /payments/featured/verify |
| Business directory | §8-Businesses | `routers/businesses.py` | `[city]/businesses/page.tsx`, `BusinessDetailClient.tsx` | `businesses`, `reviews` | GET /businesses, POST /businesses |
| Business profile | §8-BusinessProfile | `routers/businesses.py` | `[city]/businesses/[id]/page.tsx`, `BusinessDetailClient.tsx` | `businesses`, `reviews` | GET /businesses/{id} |
| Claim business | §8-BusinessProfile | `routers/businesses.py` | `BusinessDetailClient.tsx` | `businesses` (owner_id) | POST /businesses/{id}/claim |
| Business reviews | §5-reviews | `routers/businesses.py` | `BusinessDetailClient.tsx` | `reviews` | POST /businesses/{id}/reviews |
| Events calendar | §8-Events | `routers/events.py` | `[city]/events/page.tsx` | `events` | GET /events?city_slug= |
| Post event | §8-PostEvent | `routers/events.py` | `[city]/events/post/page.tsx` | `events` | POST /events |
| Admin moderation (listings) | §8-AdminListings, §6-Admin | `routers/admin.py` | `admin/listings/page.tsx` | `listings` | GET /admin/listings/pending, PATCH /admin/listings/{id}/approve |
| Admin moderation (events) | §8-AdminEvents, §6-Admin | `routers/admin.py` | `admin/events/page.tsx` | `events` | GET /admin/events/pending, PATCH /admin/events/{id}/approve |
| Admin user management | §6-Admin | `routers/admin.py` | `admin/users/page.tsx` | `users` | GET /admin/users |
| Admin abuse reports | §6-Admin | `routers/admin.py` | `admin/reports/page.tsx` | `reports` | GET /admin/reports |
| City selection | §9-CityPicker | `routers/cities.py` | `components/city-picker/CityPickerModal.tsx` | `cities` | GET /cities, GET /cities/{slug} |
| Category browse | §5-categories | `routers/categories.py` | `[city]/[category]/page.tsx` | `categories` | GET /categories |
| 11-language i18n | §15 | `i18n/request.ts` | `messages/*.json`, `components/language-selector/` | — | — (client-side only) |
| PWA / offline | §9-ServiceWorker | — | `components/pwa/ServiceWorker.tsx`, `app/offline/page.tsx` | — | — |
| Static export (Azure SWA) | §7, §16 | — | `next.config.mjs`, `staticwebapp.config.json` | — | — |
| Auto-deploy CI/CD | §16 | `.github/workflows/backend-azure.yml` | `.github/workflows/frontend-azure.yml` | — | — |
| City seeding | §18-Scripts | `scripts/seed_cities.py`, `scripts/seed_categories.py` | — | `cities`, `categories` | — |

---

## File Index
*One line per file. Grouped by layer.*

### Backend — Core

| File | What it does |
|------|-------------|
| `backend/app/main.py` | FastAPI app entry point; mounts all 10 routers under /api/v1; CORS; /health endpoint |
| `backend/app/core/config.py` | All env vars (DATABASE_URL, SECRET_KEY, MSG91, Cloudinary, Razorpay, Google OAuth) |
| `backend/app/core/database.py` | Async PostgreSQL engine + `get_db()` session dependency |
| `backend/app/core/security.py` | bcrypt hash/verify, JWT create/decode, 6-digit OTP generator |
| `backend/app/core/deps.py` | `get_current_user()` and `get_current_admin()` FastAPI dependencies |

### Backend — Models (DB tables)

| File | Table | One-liner |
|------|-------|-----------|
| `models/user.py` | `users` | Registered users; phone/email/name/role/lang_pref/soft-delete |
| `models/city.py` | `cities` | 496+ Indian cities; slug drives all URLs |
| `models/category.py` | `categories` | Listing types (tiffin, jobs, PG); self-join for sub-categories |
| `models/listing.py` | `listings` | Core product — classified ads with status lifecycle + search_vector |
| `models/listing_image.py` | `listing_images` | Up to 5 Cloudinary photos per listing |
| `models/listing_review.py` | `listing_reviews` | 1–5 star reviews on listings (one per user) |
| `models/business.py` | `businesses` | Permanent business profiles; avg_rating auto-updated |
| `models/review.py` | `reviews` | 1–5 star reviews on businesses (one per user) |
| `models/event.py` | `events` | Local events; free/paid; status lifecycle |
| `models/report.py` | `reports` | Spam/abuse reports; 3 triggers auto-flag listing |
| `models/otp_request.py` | `otp_requests` | OTP lifecycle; bcrypt-hashed; 3-attempt lockout |

### Backend — Routers (API endpoints)

| File | Prefix | What it handles |
|------|--------|----------------|
| `routers/auth.py` | `/api/v1/auth` | OTP login, Google OAuth, JWT refresh, profile update |
| `routers/cities.py` | `/api/v1/cities` | List cities, get by slug |
| `routers/categories.py` | `/api/v1/categories` | List all categories |
| `routers/listings.py` | `/api/v1` | Full listing CRUD + report + renew + fulfill + reviews |
| `routers/uploads.py` | `/api/v1/upload` | Cloudinary image upload/delete |
| `routers/search.py` | `/api/v1/search` | PostgreSQL full-text search |
| `routers/businesses.py` | `/api/v1` | Business directory CRUD + claim + reviews |
| `routers/events.py` | `/api/v1` | Events calendar CRUD |
| `routers/admin.py` | `/api/v1/admin` | Moderation queues, approve/reject, user management |
| `routers/payments.py` | `/api/v1/payments` | Razorpay featured listing orders + verification |

### Backend — Services

| File | What it calls |
|------|--------------|
| `services/msg91.py` | MSG91 SMS API for OTP delivery (mocked if key missing) |
| `services/cloudinary_svc.py` | Cloudinary image upload/delete (mocked if key missing) |
| `services/search_svc.py` | Builds PostgreSQL tsvector + ILIKE search queries |

### Backend — Scripts

| File | When to run |
|------|-------------|
| `scripts/seed_cities.py` | Once after first deploy — inserts 140 cities with state + lang_default |
| `scripts/seed_categories.py` | Once after first deploy — inserts listing categories |
| `scripts/seed_cities_full.py` | Phase 2 — inserts 700+ cities |

### Frontend — Pages (routes)

| File | URL it serves | What it shows |
|------|--------------|--------------|
| `app/page.tsx` | `/` | Homepage: city selector, categories, fresh listings, trust badges |
| `app/layout.tsx` | (root) | Root HTML shell: fonts, NextIntlClientProvider, Toaster, ServiceWorker |
| `app/[city]/layout.tsx` | `/[city]/*` | Sticky header, bottom nav, city context |
| `app/[city]/page.tsx` | `/[city]` | City home: featured + latest listings by category |
| `app/[city]/[category]/page.tsx` | `/[city]/jobs` | All listings in a category for the city |
| `app/[city]/classifieds/[id]/page.tsx` | `/[city]/classifieds/[id]` | Listing detail (Server Component wrapper) |
| `app/[city]/classifieds/[id]/ListingDetailClient.tsx` | (client) | Listing detail UI: carousel, WhatsApp, reviews |
| `app/[city]/classifieds/[id]/edit/page.tsx` | `/[city]/classifieds/[id]/edit` | Edit listing form (owner only) |
| `app/[city]/classifieds/[id]/edit/EditListingClient.tsx` | (client) | Edit form state and API calls |
| `app/[city]/classifieds/[id]/promote/page.tsx` | `/[city]/classifieds/[id]/promote` | Featured listing payment (wrapper) |
| `app/[city]/classifieds/[id]/promote/PromoteClient.tsx` | (client) | Razorpay checkout UI |
| `app/[city]/classifieds/post/page.tsx` | `/[city]/classifieds/post` | 3-step post listing wizard |
| `app/[city]/search/page.tsx` | `/[city]/search?q=` | Search results + filter panel |
| `app/[city]/businesses/page.tsx` | `/[city]/businesses` | Business directory with category filter |
| `app/[city]/businesses/[id]/page.tsx` | `/[city]/businesses/[id]` | Business profile (Server Component wrapper) |
| `app/[city]/businesses/[id]/BusinessDetailClient.tsx` | (client) | Business detail: info, reviews, claim button |
| `app/[city]/businesses/add/page.tsx` | `/[city]/businesses/add` | Add new business form |
| `app/[city]/events/page.tsx` | `/[city]/events` | Events calendar with filters |
| `app/[city]/events/post/page.tsx` | `/[city]/events/post` | Post event form |
| `app/[city]/launch/page.tsx` | `/[city]/launch` | City launch celebration page |
| `app/auth/login/page.tsx` | `/auth/login` | Phone OTP + Google OAuth login (Suspense-wrapped) |
| `app/auth/callback/page.tsx` | `/auth/callback` | Google OAuth redirect handler (Suspense-wrapped) |
| `app/profile/page.tsx` | `/profile` | User settings: name, language, city |
| `app/profile/listings/page.tsx` | `/profile/listings` | My listings: manage, renew, fulfill, promote |
| `app/profile/listings/[id]/page.tsx` | `/profile/listings/[id]` | Static export segment stub |
| `app/profile/listings/[id]/edit/page.tsx` | `/profile/listings/[id]/edit` | Edit listing (owner view) |
| `app/admin/login/page.tsx` | `/admin/login` | Admin username+password login |
| `app/admin/layout.tsx` | `/admin/*` | Admin sidebar nav with badge counts |
| `app/admin/listings/page.tsx` | `/admin/listings` | Listing moderation queue: approve/reject |
| `app/admin/events/page.tsx` | `/admin/events` | Event moderation queue |
| `app/admin/users/page.tsx` | `/admin/users` | User list + role management |
| `app/admin/reports/page.tsx` | `/admin/reports` | Abuse reports for flagged listings |
| `app/privacy/page.tsx` | `/privacy` | Privacy policy (static) |
| `app/terms/page.tsx` | `/terms` | Terms of service (static) |
| `app/offline/page.tsx` | `/offline` | PWA offline fallback |
| `app/invite/page.tsx` | `/invite` | Invite friends page |

### Frontend — Components

| File | What it renders |
|------|----------------|
| `components/listing-card/ListingCard.tsx` | Listing card: photo, price badge, category chip, WhatsApp button, time ago |
| `components/listing-card/ListingCardSkeleton.tsx` | Animated placeholder — same size as ListingCard |
| `components/site-header/SiteHeader.tsx` | Sticky top nav: logo, city chip, language, sign in, post CTA |
| `components/site-footer/SiteFooter.tsx` | Footer: links, social icons |
| `components/site-logo/SiteLogo.tsx` | Brand logo (light/dark/size variants) |
| `components/city-picker/CityPickerModal.tsx` | City search modal with geolocation + recent cities |
| `components/language-selector/LanguageSelector.tsx` | 11-language dropdown |
| `components/language-switcher/LanguageSwitcher.tsx` | Language toggle button |
| `components/whatsapp-button/WhatsAppButton.tsx` | Green #25D366 button opening wa.me link |
| `components/whatsapp-badge/WhatsAppBadge.tsx` | Small WhatsApp indicator badge |
| `components/bottom-nav/BottomNav.tsx` | Mobile-only 5-tab bottom nav |
| `components/empty-state/EmptyState.tsx` | "No results" state: icon + title + description + optional CTA |
| `components/ad-banner/AdBanner.tsx` | City page ad banner slot (Phase 3 monetization) |
| `components/fresh-listings/FreshListingsSection.tsx` | Homepage latest listings carousel |
| `components/pwa/ServiceWorker.tsx` | Registers PWA service worker for offline support |

### Frontend — Library

| File | What it provides |
|------|-----------------|
| `lib/api.ts` | Typed fetch wrapper — every API call (50+) with auto JWT refresh |
| `lib/types.ts` | TypeScript interfaces: City, Listing, Business, Event, User, etc. |
| `lib/utils.ts` | `cn()`, `formatPrice()`, `timeAgo()` |
| `lib/prefs.ts` | localStorage helpers for city/language preferences |
| `lib/razorpay.ts` | Razorpay checkout open/close helper |
| `lib/translations.ts` | i18n key type definitions |
| `context/PrefsContext.tsx` | Global state: citySlug, language, user, tokens (localStorage-backed) |
| `i18n/request.ts` | next-intl locale resolver — defaults to 'en' in static export |
| `messages/en.json` | English translations |
| `messages/hi.json` | Hindi translations |
| `messages/te.json` | Telugu translations |
| `messages/ta.json` | Tamil translations |
| `messages/kn.json` | Kannada translations |
| `messages/mr.json` | Marathi translations |
| `messages/bn.json` | Bengali translations |
| `messages/gu.json` | Gujarati translations |
| `messages/pa.json` | Punjabi translations |
| `messages/ml.json` | Malayalam translations |
| `messages/or.json` | Odia translations |

### Infrastructure

| File | What it does |
|------|-------------|
| `.github/workflows/backend-azure.yml` | Auto-deploy backend to Azure App Service on master push |
| `.github/workflows/frontend-azure.yml` | Auto-deploy frontend to Azure Static Web Apps on master push |
| `.github/workflows/keepalive.yml` | Pings /api/v1/health every 15 min — prevents Azure cold start |
| `staticwebapp.config.json` | SPA fallback routing — unknown paths serve index.html |
| `next.config.mjs` | Static export, trailing slash, unoptimized images, webpack cache disabled |
| `tailwind.config.ts` | Tailwind theme extension |
| `app/globals.css` | CSS variables: --primary #FF6B35, --wa-green #25D366, --nav-bg #1A1A2E |
| `backend/Dockerfile` | Python 3.12-slim container; exposes port 8000 |
| `backend/requirements.txt` | All Python deps pinned (FastAPI, SQLAlchemy, asyncpg, bcrypt, etc.) |
| `backend/migrations/` | Alembic schema versions — run `alembic upgrade head` |

---

## Endpoint Index
*Quick lookup: what method + path does what.*

### Auth
```
POST   /api/v1/auth/otp/send              Send OTP SMS (rate-limited: 5/hr)
POST   /api/v1/auth/otp/verify            Verify OTP -> JWT tokens
POST   /api/v1/auth/signin                Sign in by phone (no OTP, existing users)
POST   /api/v1/auth/admin-login           Admin username+password login
POST   /api/v1/auth/refresh               Exchange refresh token for new access token
DELETE /api/v1/auth/logout                Client-side only (stateless)
GET    /api/v1/auth/me                    Get current user [AUTH]
PATCH  /api/v1/auth/me                    Update name/lang_pref [AUTH]
GET    /api/v1/auth/google                Redirect to Google OAuth
GET    /api/v1/auth/google/callback       Handle OAuth code -> JWT -> redirect frontend
POST   /api/v1/auth/dev-login             Skip OTP (OTP_DEBUG=true only)
```

### Cities & Categories
```
GET    /api/v1/cities                     All active cities
GET    /api/v1/cities/{slug}              Single city
GET    /api/v1/categories                 All parent categories
```

### Listings
```
GET    /api/v1/cities/{slug}/listings     City listings (filter: category, status, page)
POST   /api/v1/listings                   Create listing -> status='pending' [AUTH]
GET    /api/v1/listings/mine              My listings [AUTH]
GET    /api/v1/listings/{id}              Listing detail
PATCH  /api/v1/listings/{id}              Update listing [AUTH, owner]
DELETE /api/v1/listings/{id}              Soft-delete [AUTH, owner/admin]
POST   /api/v1/listings/{id}/report       Report listing [AUTH]
POST   /api/v1/listings/{id}/renew        Extend 30 days [AUTH, owner]
POST   /api/v1/listings/{id}/wa-click     Track WhatsApp click
GET    /api/v1/listings/{id}/reviews      Get reviews
POST   /api/v1/listings/{id}/reviews      Submit review [AUTH]
POST   /api/v1/listings/{id}/fulfill      Mark as sold [AUTH, owner]
```

### Search
```
GET    /api/v1/search?q=&city_slug=       Full-text search (tsvector + ILIKE fallback)
```

### Uploads
```
POST   /api/v1/upload/image/{listing_id}  Upload photo to Cloudinary [AUTH]
DELETE /api/v1/upload/image/{image_id}    Delete photo from Cloudinary [AUTH]
```

### Businesses
```
GET    /api/v1/businesses                 List businesses (filter: city_slug, category)
POST   /api/v1/businesses                 Create business [AUTH]
GET    /api/v1/businesses/{id}            Business detail + reviews
PATCH  /api/v1/businesses/{id}            Update [AUTH, owner/admin]
POST   /api/v1/businesses/{id}/claim      Claim ownership [AUTH]
POST   /api/v1/businesses/{id}/reviews    Add review (recalcs avg_rating) [AUTH]
```

### Events
```
GET    /api/v1/events                     List events (filter: city_slug, date, category)
POST   /api/v1/events                     Create event -> status='pending' [AUTH]
GET    /api/v1/events/{id}                Event detail
PATCH  /api/v1/events/{id}               Update [AUTH, owner/admin]
DELETE /api/v1/events/{id}               Soft-delete [AUTH, owner/admin]
```

### Admin (all require role=admin)
```
GET    /api/v1/admin/listings/pending     Moderation queue (oldest first)
GET    /api/v1/admin/listings             All listings (filter: status)
PATCH  /api/v1/admin/listings/{id}/approve  -> status='active'
PATCH  /api/v1/admin/listings/{id}/reject   -> status='rejected'
GET    /api/v1/admin/events/pending       Event moderation queue
GET    /api/v1/admin/events               All events
PATCH  /api/v1/admin/events/{id}/approve
PATCH  /api/v1/admin/events/{id}/reject
GET    /api/v1/admin/users               All users
GET    /api/v1/admin/reports             All abuse reports
```

### Payments
```
POST   /api/v1/payments/featured/create-order  Razorpay order (Rs.99 week / Rs.199 month) [AUTH]
POST   /api/v1/payments/featured/verify        Verify signature -> is_featured=true [AUTH]
```

### Health
```
GET    /api/v1/health                     {"status":"ok"} — keepalive probe
```

---

## DB Table Index
*Quick column lookup for each table.*

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, phone, email, name, role, city_id, lang_pref, is_active, deleted_at | Soft-delete; PDPB |
| `cities` | id, name, state, slug, lang_default, active | slug = URL segment |
| `categories` | id, name, slug, icon, parent_id, sort_order | Self-join for sub-cats |
| `listings` | id, user_id, city_id, category_id, title, description, price, contact_phone, whatsapp_url, status, is_featured, report_count, expires_at, search_vector, deleted_at | Core product; tsvector search |
| `listing_images` | id, listing_id, url, cloudinary_id, display_order | Max 5; Cloudinary CDN |
| `listing_reviews` | id, listing_id, user_id, rating, body | Unique(listing_id, user_id) |
| `businesses` | id, city_id, owner_id, name, address, phone, whatsapp_url, verified, avg_rating, review_count, deleted_at | avg_rating recalculated on review |
| `reviews` | id, business_id, user_id, rating, body | Unique(business_id, user_id) |
| `events` | id, city_id, user_id, title, venue, event_date, is_free, ticket_url, status, deleted_at | status: pending/active/cancelled/completed |
| `reports` | id, listing_id, user_id, reason, notes | Unique(listing_id, user_id); 3 = auto-flag |
| `otp_requests` | id, phone, otp_hash, attempts, verified, expires_at | bcrypt hash; 3-attempt max; 10-min expiry |

---

## Business Rules Quick Reference

| Rule ID | Rule | Enforced in | Trigger |
|---------|------|-------------|---------|
| BL-02 | Max 10 active listings per user per city | `routers/listings.py` | POST /listings |
| BL-04 | 3 reports -> auto-flag listing | `routers/listings.py` | POST /listings/{id}/report |
| BL-06 | OTP: max 3 verify attempts, 15-min lockout | `routers/auth.py` | POST /auth/otp/verify |
| BL-07 | Max 5 OTPs per phone per hour | `routers/auth.py` | POST /auth/otp/send |
| BL-08 | Images: JPEG/PNG/WebP only, <5MB, max 5 per listing | `routers/uploads.py` | POST /upload/image/{id} |
| BL-11 | New listing always status='pending' | `routers/listings.py` | POST /listings |
| PDPB | Soft-delete only — never hard-delete users/listings | All models | DELETE any resource |
| PHONE | +91[6-9]XXXXXXXXXX format | `routers/auth.py`, Pydantic | Any phone field |
| WA-URL | https://wa.me/91XXXXXXXXXX format | Pydantic validators | Any whatsapp_url field |

---

## i18n Key Index
*Translation key -> which component uses it*

| Key Namespace | Used in |
|---------------|---------|
| `nav.*` | `SiteHeader`, `BottomNav` |
| `city.*` | `CityPickerModal`, homepage |
| `listing.*` | `ListingCard`, `ListingDetailClient`, `profile/listings` |
| `search.*` | `[city]/search/page.tsx` |
| `post.*` | `[city]/classifieds/post/page.tsx` |
| `errors.*` | Form validation across all forms |
| `categories.*` | `[city]/page.tsx`, category chips |
| `hero.*` | `app/page.tsx` |
| `sort.*` | Listing grid sort dropdown |

---

## CSS Variables Quick Reference

| Variable | Value | Used for |
|----------|-------|----------|
| `--primary` / `--li-primary` | `#FF6B35` | Post CTA buttons, active states |
| `--wa-green` | `#25D366` | WhatsApp buttons (never change this) |
| `--featured` | `#F7B731` | Featured badge, promoted listings |
| `--nav-bg` / `--li-nav-bg` | `#1A1A2E` | Header, admin sidebar |
| `--card-bg` / `--li-card-bg` | `#FFFFFF` | Listing cards, modals |
| `--page-bg` / `--li-page-bg` | `#F5F5F5` | Page backgrounds |
| `--text-main` | `#1A1A2E` | Body text |
| `--text-muted` | `#6B7280` | Secondary text, timestamps |
| `--border` | `#E5E7EB` | Card borders, dividers |

---

## When Adding a New Feature — Checklist

Every new feature (page, endpoint, table, component) requires updates to both files:

### Update ARCHITECTURE.md
- [ ] Add a new `§` section (or extend existing one) explaining what the feature does
- [ ] Add the new DB table(s) to §5 with column descriptions
- [ ] Add the new endpoints to §6 with method, path, auth, description
- [ ] Add the new page(s) to §8 with URL + what it renders
- [ ] Add the new component(s) to §9 with purpose + props
- [ ] Add the new files to §18 quick reference

### Update ARCHITECTURE_INDEX.md (this file)
- [ ] Add a row to the **Feature Map** table
- [ ] Add new files to the **File Index** (backend or frontend section)
- [ ] Add new endpoints to the **Endpoint Index**
- [ ] Add new DB tables to the **DB Table Index**
- [ ] Add new business rules to the **Business Rules** table (if any)
- [ ] Add new i18n keys to **i18n Key Index** (if any)

### Code
- [ ] Backend: model → schema → router → service (in that order)
- [ ] Backend: `alembic revision --autogenerate -m "description"` for new tables
- [ ] Frontend: page → component → add to `lib/api.ts` → add types to `lib/types.ts`
- [ ] Tests: `pytest tests/test_<feature>.py -x -q` → exit 0
- [ ] Build: `npm run build && npm run lint` → exit 0

---

*Last updated: 2026-06-12 | Matches ARCHITECTURE.md written same date*
