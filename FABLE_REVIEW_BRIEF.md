# LocalIndia (LocalsIndia) — Full Project Brief for Review

> Give this whole file to Fable and ask it to review the website + mobile app for bugs,
> security issues, UX problems, performance issues, and missing edge cases.
> This file intentionally excludes real API keys/secrets — see "Credentials" note at the bottom.

---

## 1. What This Is

LocalIndia is a hyperlocal Indian community platform — classifieds, events, business directory,
PG/roommate listings — for 496+ Indian cities in 11 languages. Think "JustDial + OLX" but
mobile-first, WhatsApp-native, and free to post.

- **Web:** https://www.localsindia.com (Next.js, live on Azure Static Web Apps)
- **Backend API:** https://localsindia-backend.azurewebsites.net (FastAPI, Azure App Service)
- **Health check:** https://localsindia-backend.azurewebsites.net/api/v1/health → `{"status":"ok"}`
- **Mobile:** React Native + Expo 56, not yet published to Play Store (still on EAS preview builds)
- **GitHub:** https://github.com/rajeshguntupalli59/localsindia

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), shadcn/ui, Tailwind, Framer Motion v11, next-intl (11 languages) |
| Backend | FastAPI (Python 3.12), SQLAlchemy 2.0 async, Alembic migrations |
| Database | PostgreSQL 16 (Azure Flexible Server B1ms), asyncpg driver |
| Hosting | Azure Static Web Apps (hybrid SSR) + Azure App Service B1 |
| Images | Cloudinary |
| SMS/OTP | MSG91 (DLT-registered, India) |
| Payments | Razorpay (currently on **live** keys as of 2026-07-06) |
| AI Chatbot | Google Gemini 2.0 Flash via `google-genai` SDK (Anthropic API is blocked from this Azure region) |
| Mobile | React Native + Expo SDK 56, EAS Build |
| CI/CD | GitHub Actions → auto-deploy on push to `master` |

## 3. How It Makes Money

- Featured listings: ₹99/week or ₹199/month (Razorpay)
- Verified business badges: ₹499–999/month (Razorpay)
- City banner ads: ₹999–2,999/month (planned, not automated yet)
- Job posts: ₹299–999/30 days (planned)
- Event ticketing: 2–3% fee (planned)

## 4. Feature Map (what exists, where)

| Feature | Backend | Frontend | DB Tables | Key Endpoints |
|---|---|---|---|---|
| OTP Login (phone) | `routers/auth.py`, `services/msg91.py` | `auth/login/page.tsx` | `otp_requests`, `users` | POST /auth/otp/send, /auth/otp/verify |
| Google OAuth | `routers/auth.py` | `auth/login`, `auth/callback` | `users` | GET /auth/google, /auth/google/callback |
| JWT refresh | `routers/auth.py` | `lib/api.ts` (auto-refresh) | — | POST /auth/refresh |
| Admin login | `routers/auth.py` | `admin/login/page.tsx` | `users` (role=admin) | POST /auth/admin-login |
| Post a listing | `routers/listings.py` | `[city]/classifieds/post` | `listings` | POST /listings |
| Browse listings | `routers/listings.py` | `[city]/page.tsx`, `[city]/[category]` | `listings`, `listing_images` | GET /cities/{slug}/listings |
| Listing detail | `routers/listings.py` | `ListingDetailClient.tsx` | `listings`, `listing_images`, `listing_reviews` | GET /listings/{id} |
| Edit / Delete / Renew / Fulfill listing | `routers/listings.py` | `profile/listings/*` | `listings` | PATCH, DELETE, POST /renew, /fulfill |
| Report listing (3 reports → auto-flag) | `routers/listings.py` | `ListingDetailClient.tsx` | `reports`, `listings` | POST /listings/{id}/report |
| Listing reviews | `routers/listings.py` | `ListingDetailClient.tsx` | `listing_reviews` | GET/POST /listings/{id}/reviews |
| WhatsApp click tracking | `routers/listings.py` | `WhatsAppButton.tsx` | `listings` | POST /listings/{id}/wa-click |
| Photo upload/delete (Cloudinary, max 5, 5MB) | `routers/uploads.py` | post/edit forms | `listing_images` | POST/DELETE /upload/image |
| Full-text search (tsvector + ILIKE) | `routers/search.py` | `[city]/search` | `listings` | GET /search |
| Featured listings (paid) | `routers/payments.py` | `PromoteClient.tsx` | `listings.is_featured` | POST /payments/featured/create-order, /verify |
| Public seller profile | `routers/users.py` | `seller/[id]` | `users`, `listings` | GET /users/{id}/public-profile |
| Bookmarks (saved) | — (client only) | `hooks/useSaved.ts`, `/saved` | localStorage only | — |
| Business directory + claim + reviews | `routers/businesses.py` | `[city]/businesses/*` | `businesses`, `reviews` | full CRUD + /claim, /reviews |
| Events calendar | `routers/events.py` | `[city]/events/*` | `events` | full CRUD |
| Admin moderation (listings/events/users/reports) | `routers/admin.py` | `admin/*` | — | approve/reject/role endpoints |
| City selection (496+ cities) | `routers/cities.py` | `CityPickerModal.tsx` | `cities` | GET /cities |
| 11-language i18n | — | `messages/*.json` | — | client-side, `?lang=` |
| PWA / offline | — | `ServiceWorker.tsx`, `/offline` | — | — |
| AI chatbot (Gemini) | `routers/chat.py`, `core/limiter.py` | `ChatWidget.tsx` (web), `ChatScreen.tsx` (mobile) | — | POST /chat, rate-limited 5/min + 20/hr per IP |
| Listing view tracking | `routers/listings.py` | — | `listings.view_count` | POST /listings/{id}/view |
| Saved searches / alerts | `routers/saved_searches.py` | `/search` (partial) | `saved_searches` | POST/GET /saved-searches |

## 5. Full Endpoint List

```
AUTH
POST   /api/v1/auth/otp/send              rate-limited 5/hr
POST   /api/v1/auth/otp/verify            -> JWT tokens; 3-attempt lockout
POST   /api/v1/auth/signin                phone sign-in, no OTP (existing users)
POST   /api/v1/auth/admin-login
POST   /api/v1/auth/refresh
DELETE /api/v1/auth/logout                client-side only
GET    /api/v1/auth/me / PATCH /api/v1/auth/me
GET    /api/v1/auth/google[?mobile=1] / /auth/google/callback
POST   /api/v1/auth/dev-login             OTP_DEBUG=true only — CHECK this is false in prod

CITIES & CATEGORIES
GET /api/v1/cities, /api/v1/cities/{slug}, /api/v1/categories

LISTINGS
GET    /api/v1/cities/{slug}/listings     filters: category, status, page, min_price, max_price,
                                           sort, verified_only, within
POST   /api/v1/listings                   -> status='pending' always
GET    /api/v1/listings/mine
GET    /api/v1/listings/{id}
PATCH/DELETE /api/v1/listings/{id}        owner only; soft-delete
POST   /api/v1/listings/{id}/report | /renew | /wa-click | /fulfill | /view
GET/POST /api/v1/listings/{id}/reviews

SEARCH
GET /api/v1/search?q=&city_slug=

UPLOADS
POST/DELETE /api/v1/upload/image/{id}     JPEG/PNG/WebP only, <5MB, max 5/listing

BUSINESSES
GET/POST /api/v1/businesses, GET/PATCH/DELETE /api/v1/businesses/{id}
POST /api/v1/businesses/{id}/claim, /reviews

EVENTS
GET/POST /api/v1/events, GET/PATCH/DELETE /api/v1/events/{id}

ADMIN (role=admin required)
GET /api/v1/admin/listings[/pending], PATCH .../approve, .../reject
GET /api/v1/admin/events[/pending], PATCH .../approve, .../reject
GET /api/v1/admin/users, PATCH .../role
GET /api/v1/admin/reports
POST /api/v1/admin/seed-placeholder-images

PAYMENTS (Razorpay — LIVE keys as of 2026-07-06)
POST /api/v1/payments/featured/create-order   ₹99/week or ₹199/month
POST /api/v1/payments/featured/verify         HMAC signature verification -> is_featured=true

USERS
GET /api/v1/users/{id}/public-profile

CHAT (AI)
POST /api/v1/chat    Gemini 2.0 Flash, 5/min + 20/hr rate limit, no auth required

SAVED SEARCHES
POST/GET /api/v1/saved-searches

HEALTH
GET /api/v1/health
```

## 6. Database Tables

| Table | Key Columns | Notes |
|---|---|---|
| `users` | id, phone, email, name, role, city_id, lang_pref, is_active, deleted_at | soft-delete only |
| `cities` | id, name, state, slug, lang_default, active | |
| `categories` | id, name, slug, icon, parent_id, sort_order | self-referencing |
| `listings` | id, user_id, city_id, category_id, title, description, price, contact_phone, whatsapp_url, status, is_featured, report_count, expires_at, view_count, contact_click_count, last_renewed_at, search_vector, deleted_at | core product |
| `listing_images` | id, listing_id, url, cloudinary_id, display_order | max 5 |
| `listing_reviews` | id, listing_id, user_id, rating, body | unique(listing_id, user_id) |
| `businesses` | id, city_id, owner_id, name, address, phone, whatsapp_url, verified, avg_rating, review_count, deleted_at | |
| `reviews` | id, business_id, user_id, rating, body | unique(business_id, user_id) |
| `events` | id, city_id, user_id, title, venue, event_date, is_free, ticket_url, status, deleted_at | |
| `reports` | id, listing_id, user_id, reason, notes | 3 reports/listing -> auto-flag |
| `otp_requests` | id, phone, otp_hash, attempts, verified, expires_at | bcrypt hash, 10-min expiry |
| `saved_searches` | id, user_id, city_slug, query, category_slug, created_at | |

## 7. Business Rules (never violate)

| Rule | Enforced in |
|---|---|
| Soft-delete only — never hard-delete users/listings/events/businesses (PDPB) | all models |
| New listing always `status='pending'`, never `'active'` | POST /listings |
| Phone format `+91[6-9]\d{9}` | Pydantic validators |
| WhatsApp URL `https://wa.me/91\d{10}` | Pydantic validators |
| 3 reports → auto-flag, hide from public | POST /listings/{id}/report |
| Max 10 active listings per user per city | POST /listings |
| OTP: bcrypt-hashed, 3 attempts max, 15-min lockout | auth.py |
| Max 5 OTP sends per phone per hour | auth.py |
| Images: JPEG/PNG/WebP only, 5MB max, Cloudinary mandatory | uploads.py |
| Anonymous browsing is intentional — do NOT add a login gate for browsing, only for posting/contacting | frontend routing |

## 8. Mobile App (React Native + Expo 56)

Directory: `mobile/`. Not yet submitted to Play Store — currently on EAS preview builds only.

**Screens:** Home, Search, ListingDetail, SellerProfile, Login (OTP + hidden 5-tap admin login),
Post (3-step wizard), Saved, Profile, CityPicker, Admin, Promote (Razorpay via WebView checkout —
NOT native SDK, because `react-native-razorpay` doesn't work in Expo Go), AlertsPrefs, Chat.

**Key notes:**
- API base hardcoded to the Azure backend in `mobile/src/lib/api.ts`
- JWT stored in `expo-secure-store`
- Payments use `react-native-webview` + inline Razorpay checkout.js HTML (not the native Razorpay SDK)
- `EXPO_PUBLIC_RAZORPAY_KEY_ID` set in `mobile/.env` (local) and as an EAS environment variable
  for the `production` build profile — **`preview` profile currently has no override**, so preview
  APK builds will also use the live Razorpay key via `.env` inheritance
- Google Sign-In on mobile uses a deep-link callback (`localsindia://`) via `/auth/google?mobile=1`

## 9. Known Issues / Things To Check Specifically

- **Mobile app not launched yet** — still building toward Play Store submission (production AAB not built)
- **EAS `preview` build profile has no Razorpay key override** — will use the same live key as production; confirm this is intentional before generating a new preview APK for testers
- **Naked domain bug**: `localsindia.com` (without `www`) returns HTTP 422 — GoDaddy apex DNS needs an ALIAS/ANAME record or forward to `www.localsindia.com`
- **AI chatbot** uses Gemini 2.0 Flash; if `GOOGLE_AI_KEY` free-tier quota is exhausted, it shows a graceful fallback message rather than erroring — verify this fails gracefully, not with a raw 500
- **City coverage**: 86 of 496+ target cities seeded so far — check that ungeeded cities don't produce broken empty states in the UI
- **Debug endpoints**: confirm no `/dev-login` or debug endpoints are reachable in production unless `OTP_DEBUG=true` is explicitly and intentionally set
- **Trademark**: "LocalsIndia" not yet registered — not a code issue, just a business note

## 10. What To Ask Fable To Check

Please review this project (website + backend + mobile app) for:

1. **Security** — auth flows (OTP, JWT, Google OAuth, admin login), rate limiting, injection risks in
   search/filters, IDOR risks on listing/business ownership checks, payment signature verification,
   whether soft-delete is actually enforced everywhere it should be
2. **Correctness / edge cases** — pagination, empty states (zero listings in a city), expired listings,
   race conditions on renew/fulfill/report counters, review uniqueness constraints
3. **Payment flow correctness** — since Razorpay is now on LIVE keys, double-check the order-creation
   → checkout → signature-verification → `is_featured` update chain has no way to mark a listing
   featured without a verified payment
4. **Performance** — N+1 queries, missing indexes, unbounded result sets, image optimization
5. **UX / mobile-first quality** — 375px layout, skeleton loading, WhatsApp button always visible,
   i18n completeness across all 11 languages
6. **Mobile app readiness for Play Store** — anything blocking submission beyond the production AAB build

---

## Credentials Note (IMPORTANT — do not ask Fable to fetch these)

Real secrets (MSG91 keys, Razorpay live keys, Cloudinary keys, JWT secret, Google OAuth secret,
database URL) are intentionally **excluded** from this brief. They live in:
- Azure App Service → Configuration → Application settings (backend)
- `mobile/.env` (Razorpay publishable key only — safe to expose client-side)
- GitHub Actions repo secrets

Do not paste actual key values into any external review tool. If Fable needs to know whether a
specific env var is *set* (not its value), that's a yes/no check you can do yourself via:
```
az webapp config appsettings list --name localsindia-backend --resource-group localsindia-rg
```
