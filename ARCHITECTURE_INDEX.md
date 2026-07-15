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
| OTP phone verification (signup + forgot-password) | §11, §6-Auth | `routers/auth.py`, `services/msg91.py`, `core/security.py` (setup_token, 10-min expiry) | `auth/login/page.tsx`, `mobile/src/screens/LoginScreen.tsx` | `otp_requests`, `users` | POST /auth/otp/send, POST /auth/otp/verify (returns `setup_token`, not full tokens) |
| Password auth (2026-07-12) | §11, §6-Auth | `routers/auth.py`, `models/user.py` (`password_hash`, migration `a7b8c9d0e1f2`) | `auth/login/page.tsx`, `mobile/src/screens/LoginScreen.tsx` | `users` | POST /auth/password/set (signup or reset — same endpoint), POST /auth/login (phone+password, replaces the old passwordless `/auth/signin`) |
| Biometric re-login (mobile only, pre-existing) | §11 | — | `mobile/src/hooks/useBiometric.ts`, `mobile/src/lib/storage.ts` (`biometric_enabled`), `App.tsx` (unlock on launch), `ProfileScreen.tsx` (toggle) | — (local SecureStore only) | — |
| Google OAuth | §11, §6-Auth | `routers/auth.py`, `core/config.py` | `auth/login/page.tsx`, `auth/callback/page.tsx` | `users` | GET /auth/google, GET /auth/google/callback — **kept intentionally** (existing Google-only users would be locked out otherwise); Raj to notify users before eventual removal |
| JWT token refresh | §11 | `routers/auth.py`, `core/security.py` | `lib/api.ts` (auto-refresh) | — | POST /auth/refresh |
| Admin login | §6-Auth | `routers/auth.py` | `admin/login/page.tsx` | `users` (role=admin) | POST /auth/admin-login |
| User profile | §8-Profile | `routers/auth.py` | `profile/page.tsx` | `users` | GET /auth/me, PATCH /auth/me |
| Account deletion (2026-07-14) | §8-Profile, §6-Auth | `routers/auth.py` (soft-deletes user + cascades to their listings) | `profile/page.tsx` (Delete account button), `account-deletion/page.tsx` (public, no-login-required page for Play Store data-deletion policy), `mobile/src/screens/ProfileScreen.tsx` (Delete account, double-confirm) | `users`, `listings` (both soft-deleted; user PII scrubbed: name/phone/email/password_hash/avatar_url set to null/placeholder) | DELETE /auth/me |
| Post a listing | §8-PostListing, §10 | `routers/listings.py` | `[city]/classifieds/post/page.tsx` | `listings` | POST /listings |
| Browse listings | §8-CityHome | `routers/listings.py` | `[city]/page.tsx`, `[city]/[category]/page.tsx` | `listings`, `listing_images` | GET /cities/{slug}/listings |
| Listing detail | §8-ListingDetail | `routers/listings.py` | `[city]/classifieds/[id]/page.tsx`, `ListingDetailClient.tsx` | `listings`, `listing_images`, `listing_reviews` | GET /listings/{id} |
| Edit listing | §8-EditListing | `routers/listings.py` | `profile/listings/[id]/edit/page.tsx`, `EditListingClient.tsx` (web); `mobile/src/screens/EditListingScreen.tsx` | `listings` | PATCH /listings/{id} |
| Delete listing | §10 | `routers/listings.py` | `profile/listings/page.tsx` | `listings` (soft-delete) | DELETE /listings/{id} |
| Renew listing | §8-MyListings | `routers/listings.py` | `profile/listings/page.tsx` | `listings` | POST /listings/{id}/renew |
| Mark as sold | §8-MyListings | `routers/listings.py` | `profile/listings/page.tsx` | `listings` | POST /listings/{id}/fulfill |
| Report listing | §10-BL04 | `routers/listings.py` | `[city]/classifieds/[id]/ListingDetailClient.tsx` | `reports`, `listings` | POST /listings/{id}/report |
| Listing reviews | §5-listing_reviews | `routers/listings.py` | `ListingDetailClient.tsx` | `listing_reviews` | GET /listings/{id}/reviews, POST /listings/{id}/reviews |
| WhatsApp tracking | §9-WhatsAppButton | `routers/listings.py` | `WhatsAppButton.tsx` | `listings` (wa_verified) | POST /listings/{id}/wa-click |
| Photo upload | §13 | `routers/uploads.py`, `services/cloudinary_svc.py` | `[city]/classifieds/post/page.tsx`, `profile/listings/[id]/edit/EditListingClient.tsx` (2026-07-13: add photos when editing, was post-only) | `listing_images` | POST /upload/image/{listing_id} |
| Photo delete | §13 | `routers/uploads.py`, `services/cloudinary_svc.py` | `profile/listings/[id]/edit/EditListingClient.tsx`; `mobile/src/screens/EditListingScreen.tsx` (2026-07-13, mobile previously had no photo management at all on edit) | `listing_images` | DELETE /upload/image/{image_id} |
| Full-text search | §14 | `routers/search.py`, `services/search_svc.py` | `[city]/search/page.tsx` | `listings` (search_vector) | GET /search?q=&city_slug= |
| App error tracking (2026-07-14) | §6-Auth (adjacent) | `routers/errors.py` (public report), `routers/admin.py` (admin list) | `admin/monitoring/page.tsx` ("Recent App Errors" panel); mobile `App.tsx` (`ErrorUtils.setGlobalHandler`), `src/components/ErrorBoundary.tsx`, `src/lib/errorReporting.ts`, `src/lib/api.ts` (reports 5xx/network failures) | `app_error_logs` | POST /errors/report (public, rate-limited 20/min/IP), GET /admin/errors (grouped by message) |
| Featured listings (paid) | §12 | `routers/payments.py`, `routers/cron.py` (daily auto-expiry) | `[city]/classifieds/[id]/promote/page.tsx`, `PromoteClient.tsx`, `lib/razorpay.ts` | `listings` (is_featured, featured_at, featured_until) | POST /payments/featured/create-order, POST /payments/featured/verify, GET /cron/expiry-reminders (un-features expired boosts) |
| Featured-boost expiry bug fix (2026-07-15) | §12 | `routers/payments.py`, `routers/cron.py`, migration `c5d6e7f8a9b0` | — | `listings.featured_until` (new) | Real production bug: `verify_featured_payment` overwrote the listing's general `expires_at` with the featured-plan duration, and nothing ever un-set `is_featured` — a "week" promotion stayed featured forever. Fixed with a dedicated `featured_until` column + daily cron cleanup (same pattern as business badge expiry). One live listing directly corrected in production. |
| Public seller profile | §8-SellerProfile, §6-Users | `routers/users.py` | `seller/[id]/page.tsx` | `users`, `listings` | GET /users/{user_id}/public-profile |
| Bookmarks (saved listings) | §9-useSaved | — | `hooks/useSaved.ts`, `saved/page.tsx`, `listing-card/ListingCard.tsx` | — (localStorage) | — |
| Listing search filters | §6-Listings | `routers/listings.py` | `search/page.tsx` | `listings` | GET /cities/{slug}/listings?min_price=&max_price=&sort=&verified_only=&within= |
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
| Hybrid SSR (Azure SWA) | §7, §16 | — | `next.config.mjs`, `staticwebapp.config.json`, `lib/static-params.ts` | — | — |
| Auto-deploy CI/CD + PR staging | §16 | `.github/workflows/backend-azure.yml` | `.github/workflows/frontend-azure.yml` | — | — |
| City seeding | §18-Scripts | `scripts/seed_cities.py`, `scripts/seed_categories.py` | — | `cities`, `categories` | — |
| Admin role management | §6-Admin | `routers/admin.py` | `admin/users/page.tsx`, mobile `AdminScreen.tsx` | `users` | PATCH /admin/users/{id}/role |
| Seed placeholder images | §6-Admin | `routers/admin.py` | `admin/listings/page.tsx` (button) | `listing_images` | POST /admin/seed-placeholder-images |
| Business soft-delete | §6-Businesses | `routers/businesses.py` | — | `businesses` | DELETE /businesses/{id} |
| Google Sign-In (mobile deep link) | §11 | `routers/auth.py` | `mobile/src/screens/LoginScreen.tsx` | `users` | GET /auth/google?mobile=1, GET /auth/google/callback |
| Global listing/category/post redirects | §8 | — | `app/listing/[id]/`, `app/category/[slug]/page.tsx`, `app/post/page.tsx` | — | — |
| Global error boundary | §8-ErrorBoundary | — | `app/error.tsx` | — | — |
| Mobile admin panel | §18-Mobile | `routers/admin.py` | `mobile/src/screens/AdminScreen.tsx` | `listings`, `users` | (same as web admin) |
| EAS Play Store build pipeline | §18-Mobile | — | `mobile/eas.json`, `mobile/app.json` | — | — |
| AI chatbot assistant | §6-Chat | `routers/chat.py`, `core/limiter.py` | `components/chat-widget/ChatWidget.tsx`, `mobile/src/screens/ChatScreen.tsx` | — | POST /chat |
| Listing view tracking | §6-Listings | `routers/listings.py` | `listing/[id]/ListingDetailClient.tsx` | `listings` (view_count) | POST /listings/{id}/view |
| Saved searches / alerts | §6-SavedSearches | `routers/saved_searches.py` | `/search` page (frontend button pending) | `saved_searches` | POST /api/v1/saved-searches, GET /api/v1/saved-searches |
| Buyer requests ("Wanted") | §5-buyer_requests (not yet in ARCHITECTURE.md) | `routers/buyer_requests.py`, `models/buyer_request.py`, `schemas/buyer_request.py` | `components/buyer-requests/BuyerRequestsSection.tsx` (rendered on `[city]/CityHomeClient.tsx`) | `buyer_requests` | GET /api/v1/buyer-requests/cities/{slug}, POST /api/v1/buyer-requests, PATCH /api/v1/buyer-requests/{id}/fulfill, DELETE /api/v1/buyer-requests/{id} |

---

## File Index
*One line per file. Grouped by layer.*

### Backend — Core

| File | What it does |
|------|-------------|
| `backend/app/main.py` | FastAPI app entry point; mounts 18 routers under /api/v1; CORS; /health endpoint; rate-limit exception handler |
| `backend/app/core/config.py` | All env vars (DATABASE_URL, SECRET_KEY, MSG91, Cloudinary, Razorpay, Google OAuth, ANTHROPIC_API_KEY) |
| `backend/app/core/database.py` | Async PostgreSQL engine + `get_db()` session dependency |
| `backend/app/core/security.py` | bcrypt hash/verify, JWT create/decode, 6-digit OTP generator |
| `backend/app/core/deps.py` | `get_current_user()` and `get_current_admin()` FastAPI dependencies |
| `backend/app/core/limiter.py` | slowapi rate limiter (key by IP); shared across routers; chat: 5/min + 20/hr |

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
| `models/buyer_request.py` | `buyer_requests` | "Wanted" posts — buyer looking for X; status open/fulfilled; soft-delete |

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
| `routers/users.py` | `/api/v1/users` | Public seller profiles (name, member since, active listings) |
| `routers/chat.py` | `/api/v1/chat` | AI chatbot (Gemini 2.0 Flash); rate-limited 5/min + 20/hr per IP; needs GOOGLE_AI_KEY |
| `routers/saved_searches.py` | `/api/v1/saved-searches` | Save/list search alerts for a user |
| `routers/buyer_requests.py` | `/api/v1/buyer-requests` | "Wanted" post CRUD — list by city, create, fulfill, soft-delete |

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
| `app/[city]/page.tsx` | `/[city]` | Server Component wrapper (2026-07-07): real SSR fetch of city/todayCount/trending/fresh, `generateMetadata` with per-city title + noindex if <3 real listings, JSON-LD. Renders `CityHomeClient.tsx` |
| `app/[city]/CityHomeClient.tsx` | (client) | City home UI: hero, trending/fresh listing rows, category browse — seeded with server-fetched `initialCity`/`initialFresh`/etc props so first paint has real content, not "Loading..." |
| `app/[city]/[category]/page.tsx` | `/[city]/jobs` | All listings in a category for the city |
| `app/[city]/classifieds/[id]/page.tsx` | `/[city]/classifieds/[id]` | Listing detail (Server Component wrapper) |
| `app/[city]/classifieds/[id]/ListingDetailClient.tsx` | (client) | Listing detail UI: interactive image carousel (activeImg state, prev/next arrows, dot indicators, clickable thumbnails with active orange border), WhatsApp, reviews |
| `app/profile/listings/[id]/edit/page.tsx` | `/profile/listings/{id}/edit` | Edit listing form (owner only) |
| `app/profile/listings/[id]/edit/EditListingClient.tsx` | (client) | Edit form state and API calls; includes photo add/remove (2026-07-13, uses `api.upload.image`/`api.upload.deleteImage`, same as post flow) |
| `app/[city]/classifieds/[id]/promote/page.tsx` | `/[city]/classifieds/[id]/promote` | Featured listing payment (wrapper) |
| `app/[city]/classifieds/[id]/promote/PromoteClient.tsx` | (client) | Razorpay checkout UI |
| `app/[city]/classifieds/post/page.tsx` | `/[city]/classifieds/post` | 3-step post listing wizard |
| `app/[city]/search/page.tsx` | `/[city]/search?q=` | Search results + filter panel |
| `app/[city]/not-found.tsx` | (city-segment 404 boundary) | Client Component (`useParams()` for city) — branded 404 with "Back to {City}", search link, popular category chips (2026-07-12) |
| `app/[city]/businesses/page.tsx` | `/[city]/businesses` | Business directory with category filter |
| `app/[city]/businesses/[id]/page.tsx` | `/[city]/businesses/[id]` | Business profile (Server Component wrapper) |
| `app/[city]/businesses/[id]/BusinessDetailClient.tsx` | (client) | Business detail: info, reviews, claim button |
| `app/[city]/businesses/add/page.tsx` | `/[city]/businesses/add` | Add new business form |
| `app/[city]/events/page.tsx` | `/[city]/events` | Events calendar with filters |
| `app/[city]/events/post/page.tsx` | `/[city]/events/post` | Post event form |
| `app/[city]/launch/page.tsx` | `/[city]/launch` | City launch celebration page |
| `app/auth/login/page.tsx` | `/auth/login` | Phone OTP + Google OAuth login (Suspense-wrapped) |
| `app/auth/callback/page.tsx` | `/auth/callback` | Google OAuth redirect handler (Suspense-wrapped) |
| `app/profile/page.tsx` | `/profile` | User settings: name, language, city; Delete account button (2026-07-14) |
| `app/account-deletion/page.tsx` | `/account-deletion` | Public page (no login required) explaining how to delete your account — in-app self-serve + email fallback for users without app access. Required by Google Play's account-deletion policy (2026-07-14) |
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
| `app/cities/page.tsx` | `/cities` | Server Component wrapper (2026-07-07): SSR fetch of full city list, renders `CitiesListClient.tsx` |
| `app/cities/CitiesListClient.tsx` | (client) | City directory search/filter UI, seeded with server-fetched `initialCities` |
| `app/seller/[id]/page.tsx` | `/seller/[id]` | Public seller profile: avatar, member since, active listings grid |
| `app/saved/page.tsx` | `/saved` | Saved/bookmarked listings from localStorage |
| `app/search/page.tsx` | `/search?q=&city=` | Server Component wrapper (2026-07-12): `generateMetadata` builds `"{q} in {City}"` title from searchParams, `robots: noindex` (query pages are near-infinite variations, not real SEO surface). Renders `SearchClient.tsx` |
| `app/search/SearchClient.tsx` | (client) | Global (no city pre-selected) search UI: city picker, filters, results grid — same component that used to be `page.tsx` directly |
| `app/listing/[id]/page.tsx` | `/listing/[id]` | Server Component wrapper (2026-07-12): SSR fetch of the listing, `generateMetadata` (per-listing title/description/OG image from first photo/Twitter card), Product/Offer JSON-LD. Renders `ListingDetailClient.tsx` |
| `app/listing/[id]/ListingDetailClient.tsx` | (client) | Global (city-agnostic) listing detail — interactive carousel, share button (Web Share API + clipboard fallback), report, similar-listings row (same city+category), seeded via `initialListing` prop |
| `app/category/[slug]/page.tsx` | `/category/[slug]` | Client redirect → `/{city}/search?category={slug}` |
| `app/post/page.tsx` | `/post` | Client redirect → `/{city}/classifieds/post` |
| `app/error.tsx` | (root error boundary) | Auto-reload on ChunkLoadError; friendly "Try again" otherwise |
| `app/not-found.tsx` | (root 404 boundary) | Server Component — generic branded 404, Home + Browse listings links (2026-07-12) |

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
| `components/buyer-requests/BuyerRequestsSection.tsx` | "Wanted" horizontal row on city home + post-request modal (category, description, budget) — WhatsApp-contact CTA per request |

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
| `hooks/useSaved.ts` | localStorage bookmark hook — toggle/isSaved/saved list; used in ListingCard + /saved page |
| `i18n/request.ts` | next-intl locale resolver — defaults to 'en' if no locale resolvable |
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
| `.github/workflows/test.yml` | Runs `cd frontend && npm test` (Vitest) on push/PR to master + develop (added 2026-07-07) |
| `frontend/vitest.config.ts` + `vitest.setup.ts` | Vitest config (jsdom env, `@` path alias) + jest-dom matchers setup |
| `staticwebapp.config.json` | Minimal hybrid-SSR config — `apiRuntime: node:18`, security headers, anonymous `/api/*` (no more SPA fallback rules) |
| `next.config.mjs` | Hybrid SSR (no `output: 'export'`), unoptimized images, webpack cache disabled |
| `tailwind.config.ts` | Tailwind theme extension |
| `app/globals.css` | CSS variables: --primary #FF6B35, --wa-green #25D366, --nav-bg #1A1A2E |
| `backend/Dockerfile` | Python 3.12-slim container; exposes port 8000 |
| `backend/requirements.txt` | All Python deps pinned (FastAPI, SQLAlchemy, asyncpg, bcrypt, etc.) |
| `backend/migrations/` | Alembic schema versions — run `alembic upgrade head` |

---

## Endpoint Index
*Quick lookup: what method + path does what.*

### Auth (reworked 2026-07-12 — phone+OTP+password, see migration `a7b8c9d0e1f2`)
```
POST   /api/v1/auth/otp/send              Send OTP SMS (rate-limited: 5/hr) — used for both signup and forgot-password
POST   /api/v1/auth/otp/verify            Verify OTP -> {setup_token, has_password, is_new_user}
                                          NOTE: no longer returns access/refresh tokens directly.
                                          setup_token is a 10-min JWT (type=otp_verified), only valid for /auth/password/set
POST   /api/v1/auth/password/set          {setup_token, password} -> AuthResponse (full tokens)
                                          Serves BOTH signup (create password) and forgot-password (reset) — same action
POST   /api/v1/auth/login                 {phone, password} -> AuthResponse. Replaces the old passwordless /auth/signin
                                          (which let anyone log in as any known phone number with zero verification)
                                          404 = no account, 409 = account has no password yet, 401 = wrong password
POST   /api/v1/auth/admin-login           Admin username+password login (unrelated to user password_hash)
POST   /api/v1/auth/refresh               Exchange refresh token for new access token
DELETE /api/v1/auth/logout                Client-side only (stateless)
GET    /api/v1/auth/me                    Get current user [AUTH]
PATCH  /api/v1/auth/me                    Update name/lang_pref [AUTH]
DELETE /api/v1/auth/me                    Delete account (2026-07-14) — soft-deletes + anonymises user,
                                          cascades soft-delete to all their listings [AUTH]
GET    /api/v1/auth/google?mobile=1        Redirect to Google OAuth (mobile=1 -> deep-link callback for RN app) — kept for existing Google-only users
GET    /api/v1/auth/google/callback       Handle OAuth code -> JWT -> redirect frontend or localsindia:// deep link
POST   /api/v1/auth/dev-login             Skip OTP (OTP_DEBUG=true only)
```

### App Error Tracking (2026-07-14)
```
POST   /api/v1/errors/report              Report an app error/crash (public, no auth, rate-limited 20/min/IP)
                                          {platform: 'mobile'|'web', message, stack?, context?, app_version?}
GET    /api/v1/admin/errors               List recent errors grouped by message+platform+context,
                                          with count + last_seen [ADMIN]
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
DELETE /api/v1/businesses/{id}            Soft-delete [AUTH, owner/admin]
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
PATCH  /api/v1/admin/users/{id}/role     Set role to admin|user (cannot change own role)
POST   /api/v1/admin/seed-placeholder-images  Backfill placeholder images on photo-less listings; fixes old typo'd placeholders
GET    /api/v1/admin/reports             All abuse reports
```

### Payments
```
POST   /api/v1/payments/featured/create-order  Razorpay order (Rs.99 week / Rs.199 month) [AUTH]
POST   /api/v1/payments/featured/verify        Verify signature -> is_featured=true [AUTH]
```

### Users
```
GET    /api/v1/users/{user_id}/public-profile  Public seller profile (name, avatar, member_since, listings[12])
```

### Listings (filter params added)
```
GET    /api/v1/cities/{slug}/listings?min_price=&max_price=&sort=price_asc|price_desc|newest&verified_only=true&within=24h|7d|30d
```

### Chat (AI Assistant)
```
POST   /api/v1/chat                       AI chatbot: natural language search + FAQ
                                          Model: Gemini 2.0 Flash (google-genai SDK)
                                          Rate limits: 5 req/min + 20 req/hr per IP  ← edit @limiter.limit in routers/chat.py
                                          Body: { message, city_slug?, history? }
                                          Returns: { reply, listings[]? }
                                          No auth required. Needs GOOGLE_AI_KEY Azure env var (NOT Anthropic).
                                          Note: Anthropic API blocked from Azure East Asia region (403 on all calls).
```

### Listings — Engagement Tracking
```
POST   /api/v1/listings/{id}/view         Increment view_count; no auth required
```

### Saved Searches / Alerts
```
POST   /api/v1/saved-searches             Save a search alert [AUTH]
GET    /api/v1/saved-searches             List user's saved searches [AUTH]
```

### Buyer Requests ("Wanted")
```
GET    /api/v1/buyer-requests/cities/{slug}    List open requests for a city (newest first, limit 20)
POST   /api/v1/buyer-requests                  Create request -> status='open' [AUTH]
PATCH  /api/v1/buyer-requests/{id}/fulfill     Mark fulfilled -> drops out of public feed [AUTH, owner/admin]
DELETE /api/v1/buyer-requests/{id}             Soft-delete [AUTH, owner/admin]
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
| `users` | id, phone, email, password_hash, name, role, city_id, lang_pref, is_active, deleted_at | Soft-delete; PDPB. `password_hash` nullable (migration `a7b8c9d0e1f2`, 2026-07-12) — null means the user has never set a password (pre-migration or Google-only account) |
| `cities` | id, name, state, slug, lang_default, active | slug = URL segment |
| `categories` | id, name, slug, icon, parent_id, sort_order | Self-join for sub-cats |
| `listings` | id, user_id, city_id, category_id, title, description, price, contact_phone, whatsapp_url, status, is_featured, featured_at, featured_until, report_count, expires_at, view_count, contact_click_count, last_renewed_at, search_vector, deleted_at | Core product; tsvector search; view/click counters added migration `f6a7b8c9d0e1`; `featured_until` added migration `c5d6e7f8a9b0` (2026-07-15) — dedicated featured-boost expiry, decoupled from the listing's own `expires_at` lifecycle field |
| `listing_images` | id, listing_id, url, cloudinary_id, display_order | Max 5; Cloudinary CDN |
| `listing_reviews` | id, listing_id, user_id, rating, body | Unique(listing_id, user_id) |
| `businesses` | id, city_id, owner_id, name, address, phone, whatsapp_url, verified, avg_rating, review_count, deleted_at | avg_rating recalculated on review |
| `reviews` | id, business_id, user_id, rating, body | Unique(business_id, user_id) |
| `events` | id, city_id, user_id, title, venue, event_date, is_free, ticket_url, status, deleted_at | status: pending/active/cancelled/completed |
| `reports` | id, listing_id, user_id, reason, notes | Unique(listing_id, user_id); 3 = auto-flag |
| `otp_requests` | id, phone, otp_hash, attempts, verified, expires_at | bcrypt hash; 3-attempt max; 10-min expiry |
| `saved_searches` | id, user_id, city_slug, query, category_slug, created_at | Search alerts; user notified when matching listings appear; migration `f6a7b8c9d0e1` |
| `buyer_requests` | id, city_id, user_id, category_id, description, budget, contact_phone, status, deleted_at, created_at | "Wanted" posts; status open/fulfilled; migration `f1a2b3c4d5e6` (2026-07-12) |
| `app_error_logs` | id, platform, message, stack, context, app_version, created_at | No user_id (reports must work pre-login/no-auth); platform in ('mobile','web'); migration `b3c4d5e6f7a8` (2026-07-14) |

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

---

## Mobile App — React Native (Expo 56)

**Directory:** `mobile/`

| File | What it does |
|------|-------------|
| `mobile/App.tsx` | Root: bottom tab navigator (Home/Search/Post/Saved/Profile) + stack (ListingDetail/SellerProfile/Login/CityPicker). Wrapped in `SafeAreaProvider`; tab bar height/padding derived from `useSafeAreaInsets().bottom` so it isn't covered by the Android gesture-nav bar or iOS home indicator. Also wrapped in `ErrorBoundary` + registers a global `ErrorUtils` handler for uncaught JS errors (2026-07-14 — previously zero crash visibility existed) |
| `mobile/src/components/ErrorBoundary.tsx` | Catches render-time errors app-wide, reports via `errorReporting.ts`, shows a "Try again" fallback instead of a blank/crashed screen (2026-07-14) |
| `mobile/src/lib/errorReporting.ts` | `reportError(error, context)` — fire-and-forget POST to `/api/v1/errors/report`, never throws (2026-07-14) |
| `mobile/src/lib/api.ts` | FastAPI-adapted axios layer — `/cities/{slug}/listings`, `contact_phone`, `access_token`/`refresh_token` |
| `mobile/src/lib/storage.ts` | expo-secure-store wrapper for JWT tokens + user object |
| `mobile/src/lib/format.ts` | `formatPrice()` — shared Indian-locale price formatter (exact under ₹10k, truncated k/L above, never rounds up); Vitest tests in `format.test.ts`. Run: `cd mobile && npm test` |
| `mobile/src/hooks/useSaved.ts` | AsyncStorage bookmark hook (same pattern as web, different storage layer) |
| `mobile/src/components/ListingCard.tsx` | React Native listing card: gradient image placeholder, price, WA button |
| `mobile/src/screens/HomeScreen.tsx` | Dark hero with real logo mark next to headline, city picker, trending chips, category grid (emoji `fontSize: 34`), fresh listings |
| `mobile/src/screens/SearchScreen.tsx` | Debounced search (350ms), category tabs (horizontal FlatList — `height:44`/`flexGrow:0`/centered `contentContainerStyle` to stop pills stretching to the list's full height), city chip, FlatList results |
| `mobile/src/screens/ListingDetailScreen.tsx` | Photo gallery, thumbnail strip, sticky WhatsApp button, seller → SellerProfile |
| `mobile/src/screens/SellerProfileScreen.tsx` | Avatar/initials, member since, active listings count, listings list |
| `mobile/src/screens/LoginScreen.tsx` | OTP phone → code flow; stores access_token/refresh_token in SecureStore; real logo image above the wordmark |
| `mobile/src/screens/PostScreen.tsx` | 3-step wizard: details → photos (expo-image-picker) → contact |
| `mobile/src/screens/SavedScreen.tsx` | AsyncStorage bookmark list with empty state |
| `mobile/src/screens/ProfileScreen.tsx` | User avatar, name, phone, menu (My Listings, Saved, Edit, City), logout, Delete account (double-confirm, 2026-07-14) |
| `mobile/src/screens/CityPickerScreen.tsx` | Searchable modal pulling cities from `/api/v1/cities` |
| `mobile/src/screens/AdminScreen.tsx` | Admin panel: listing moderation, approve/reject, role management |
| `mobile/src/screens/EditProfileScreen.tsx` | Edit display name (2026-07-13, was a "coming soon" placeholder) — phone shown read-only, calls `PATCH /auth/me` |
| `mobile/src/screens/EditListingScreen.tsx` | Edit a posted listing (2026-07-13, previously didn't exist on mobile at all) — title/description/price/area/WhatsApp/website/social, same fields as web's edit page, no featured-status restriction; photo add/remove added same day (was missing on initial build — uses `uploadsApi.image`/`uploadsApi.deleteImage`) |
| `mobile/eas.json` | EAS Build profiles: development (debug APK), preview (internal APK), production (AAB) |
| `mobile/app.json` | Expo config + EAS project link (`@rajeshguntupalli59/localsindia`) + splash/permission config for store builds |
| `mobile/assets/icon.png`, `android-icon-foreground.png`, `favicon.png`, `splash-icon.png` | Real LocalsIndia logo (mark-only for icon sizes, full mark+wordmark for splash) |
| `mobile/assets/logo-mark-transparent.png` | Logo mark, white chroma-keyed transparent, for in-app use on colored/dark backgrounds |

**To run:** `cd mobile && npm install && npx expo start`
**To build for Play Store:** `cd mobile && eas build --platform android --profile preview|production`

---

*Last updated: 2026-07-13 (mobile Promote button on listing detail was missing entirely — added; Edit Profile "coming soon" placeholder replaced with a real screen; Edit Listing added to mobile — previously didn't exist at all, web-only feature until now; MSG91 OTP delivery fixed — see [[msg91-otp-fix]] memory + `MSG91_SUPPORT_ISSUE.md`; CI test workflow fixed, had been silently failing since 2026-07-07) | Previous pass 2026-07-12: password-based auth (phone+OTP+password login/signup, forgot-password reset, biometric re-login on mobile confirmed pre-existing/unchanged, Google OAuth intentionally kept), buyer-requests backend feature, `/[city]` hydration fix, `/listing/[id]` + `/search` SEO metadata, root + city-level branded 404 pages, mobile price-formatter fix + Vitest setup | ⚠️ ARCHITECTURE.md §5-9, §11, §18 not yet updated to match — index is current, full doc is stale for all of the above*
