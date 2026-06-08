# LocalIndia â€” Full Architecture Document
> India's hyperlocal community platform â€” city-wise, multilingual, WhatsApp-native

**[Chain: BA â†’ DB Architect â†’ Senior Engineer â†’ DevOps â†’ QA â†’ Docs Writer]**

**Assumptions:** All Indian cities, Google OAuth + phone OTP (MSG91), WhatsApp wa.me links (Phase 1), monetization post-traction, all major Indian languages (Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati, Punjabi, Malayalam, Odia + English), Next.js 14 + FastAPI + PostgreSQL, Railway deployment.

---

## 1. EXECUTIVE SUMMARY

**What:** LocalIndia is a city-wise Indian community discovery platform where residents discover local events, post classifieds, find services (tiffin, tutors, carpool, cricket clubs), list PGs/roommates, and connect with local businesses â€” all in their regional language.

**Who:** Indian urban and semi-urban residents in 700+ cities. Primary demographics: students, young professionals, homemakers, local business owners, event organizers.

**Why it matters:** OLX/Quikr are transactional buy-sell platforms with no community soul. Sulekha is services-only. No platform exists that replicates the "discover your city" experience with regional language support, WhatsApp-native contact, and local culture categories (temple events, Sankranti melas, carpool groups, tiffin services). This is the gap.

**Business model:** Free listings at launch â†’ featured listing fees â†’ local business ads â†’ event ticketing commission (Phase 3).

---

## 2. FUNCTIONAL REQUIREMENTS

### AUTH
```
FR-01: The user can sign in via Google OAuth (Gmail)
FR-02: The user can sign in via Indian mobile OTP (MSG91)
FR-03: The system shall create a user profile on first login
FR-04: When a user logs in for the first time, the system shall prompt city + language selection
FR-05: The user can update their city, language preference, and profile at any time
```

### CITY & LANGUAGE
```
FR-06: The system shall display a city selector on first visit (searchable, 700+ cities)
FR-07: The system shall remember the user's selected city via localStorage + account
FR-08: The user can switch city at any time from the header
FR-09: The system shall serve UI labels in: English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati, Punjabi, Malayalam, Odia
FR-10: The user can switch display language from any page
FR-11: When a city is selected, the system shall show only that city's listings
```

### LISTINGS / CLASSIFIEDS
```
FR-12: The user can post a listing in categories: Classifieds, Services, PG/Roommate, Jobs, Vehicles, Electronics, Events, Businesses
FR-13: The system shall require: title, category, city, contact phone for every listing
FR-14: The user can upload up to 5 images per listing (max 5MB each)
FR-15: When a listing is submitted, the system shall set status = 'pending' and notify admin
FR-16: The user can add a WhatsApp contact link (wa.me/91XXXXXXXXXX) to their listing
FR-17: Listings shall auto-expire after 30 days (configurable per category)
FR-18: The user can renew, edit, or delete their own listings
FR-19: The user can mark a listing as sold/fulfilled
```

### EVENTS
```
FR-20: The user can post a local event with: title, description, venue, date/time, free/paid flag, ticket URL (optional)
FR-21: The system shall display events sorted by date ascending
FR-22: The user can browse events by city and category (cultural, sports, religious, music, food)
```

### BUSINESS DIRECTORY
```
FR-23: The user can browse local businesses by city + category (Yellow Pages style)
FR-24: A business owner can claim and manage their business profile
FR-25: The user can leave a star rating + review on a business
FR-26: If a business has WhatsApp, the system shall show a "Chat on WhatsApp" button
```

### SEARCH
```
FR-27: The user can search listings by keyword across the selected city
FR-28: The system shall support full-text search in English and transliterated regional language terms
FR-29: The user can filter search results by category, price range, and date posted
```

### ADMIN
```
FR-30: Admin can approve or reject pending listings with a reason
FR-31: Admin can view all listings, users, reports in a dashboard
FR-32: Admin can mark a listing as featured (Phase 3: paid)
FR-33: The user can report a listing as spam/inappropriate
FR-34: When a listing receives 3+ reports, the system shall auto-flag for admin review
```

---

## 3. NON-FUNCTIONAL REQUIREMENTS

```
NFR-01: PERFORMANCE  â€” Page load < 2.5s on 4G mobile (Core Web Vitals: LCP < 2.5s, CLS < 0.1)
NFR-02: MOBILE       â€” Mobile-first responsive design; 80%+ Indian internet traffic is mobile
NFR-03: LANGUAGE     â€” Full Unicode support for all 11 languages; RTL not required (all are LTR)
NFR-04: UPTIME       â€” 99.5% availability SLA
NFR-05: SECURITY     â€” All passwords bcrypt-hashed; JWT tokens; HTTPS only; input sanitization
NFR-06: COMPLIANCE   â€” India PDPB 2023 compliant: user consent on signup, right to delete account + data
NFR-07: IMAGES       â€” CDN-served via Cloudinary; max 5MB upload; auto-compressed to WebP
NFR-08: SEO          â€” City + category pages must be server-side rendered for Google indexing
NFR-09: SCALE        â€” Handle 10,000 concurrent users at launch; horizontal scaling via Railway
NFR-10: SEARCH       â€” Full-text search response < 500ms for queries on 1M+ listings
NFR-11: RATE LIMITING â€” Max 10 listings/day per free user; 5 OTP requests/hour per phone
NFR-12: ACCESSIBILITY â€” WCAG 2.1 AA minimum on all core flows
```

---

## 4. ACCEPTANCE CRITERIA (Key FRs)

```
FR-02 â€” Phone OTP Login:
  Given: User enters valid Indian mobile number (+91XXXXXXXXXX)
  When:  They tap "Send OTP"
  Then:  OTP delivered via MSG91 within 30 seconds
  And:   OTP is valid for 10 minutes, single use only
  And:   After 3 failed attempts, account locked for 15 minutes

FR-12 â€” Post a Listing:
  Given: Authenticated user on /[city]/post
  When:  They submit a listing with title, category, city, phone
  Then:  Listing created with status = 'pending'
  And:   User sees "Your listing is under review" confirmation
  And:   Admin notified via dashboard alert

FR-27 â€” Search:
  Given: User is on /hyderabad with search term "tiffin"
  When:  They submit the search
  Then:  Results appear in < 500ms
  And:   Only listings from Hyderabad are shown
  And:   Results ranked by relevance then recency

FR-09 â€” Language Switch:
  Given: User selects "à°¤à±†à°²à±à°—à±" from language switcher
  When:  Page reloads
  Then:  All UI labels render in Telugu
  And:   Preference saved to localStorage and user account
  And:   User-generated listing content is NOT auto-translated (shown as-is)

FR-34 â€” Auto-flag Reported Listing:
  Given: A listing has received 3 unique user reports
  When:  The 3rd report is submitted
  Then:  Listing status changes to 'flagged'
  And:   Listing hidden from public view
  And:   Admin dashboard shows alert with report reasons
```

---

## 5. ENHANCEMENT OPPORTUNITIES

```
[Recommended]  PWA with offline support â€” India has patchy connectivity, especially Tier 2/3 cities
[Recommended]  WhatsApp Business API for listing confirmations + renewal reminders (Phase 2)
[Recommended]  AI-powered listing category auto-suggestion (Claude API)
[Recommended]  SEO: auto-generate city landing pages with static content (festival guides, local tips)
[Nice to Have] "Post via WhatsApp" â€” user sends listing details to a WhatsApp bot number
[Nice to Have] Multilingual listing search â€” search "à°Ÿà°¿à°«à°¿à°¨à±" and find "tiffin" listings too
[Nice to Have] Map view for listings (Leaflet.js + OpenStreetMap â€” free)
[Future Phase] Paid featured listings with Razorpay integration
[Future Phase] Event ticketing with QR code entry (Razorpay payment)
[Future Phase] LocalIndia mobile app (Flutter)
[Future Phase] Business analytics dashboard for claimed businesses
[Future Phase] Community forums per city (threaded discussion)
```

---

## 6. DATABASE SCHEMA (PostgreSQL)

### ERD (Mermaid)

```mermaid
erDiagram
    CITIES ||--o{ USERS : "home city"
    CITIES ||--o{ LISTINGS : "belongs to"
    CITIES ||--o{ EVENTS : "belongs to"
    CITIES ||--o{ BUSINESSES : "belongs to"
    USERS ||--o{ LISTINGS : "posts"
    USERS ||--o{ EVENTS : "posts"
    USERS ||--o{ BUSINESSES : "owns"
    USERS ||--o{ REVIEWS : "writes"
    USERS ||--o{ REPORTS : "files"
    LISTINGS ||--o{ LISTING_IMAGES : "has"
    LISTINGS ||--o{ REPORTS : "reported in"
    BUSINESSES ||--o{ REVIEWS : "receives"
    CATEGORIES ||--o{ LISTINGS : "classifies"
    CATEGORIES ||--o{ CATEGORIES : "parent-child"

    CITIES { uuid id PK; string name; string state; string slug UK; string lang_default }
    USERS { uuid id PK; string phone UK; string email UK; string name; string role; uuid city_id FK; string lang_pref }
    CATEGORIES { uuid id PK; string name; string slug UK; string icon; uuid parent_id FK }
    LISTINGS { uuid id PK; uuid user_id FK; uuid city_id FK; uuid category_id FK; string title; text description; decimal price; string contact_phone; string whatsapp_url; string status; boolean is_featured; timestamp expires_at }
    LISTING_IMAGES { uuid id PK; uuid listing_id FK; string url; int display_order }
    EVENTS { uuid id PK; uuid city_id FK; uuid user_id FK; string title; text description; string venue; timestamp event_date; boolean is_free; string ticket_url; string status }
    BUSINESSES { uuid id PK; uuid city_id FK; uuid owner_id FK; uuid category_id FK; string name; string address; string phone; string whatsapp_url; boolean verified }
    REVIEWS { uuid id PK; uuid business_id FK; uuid user_id FK; int rating; text body }
    REPORTS { uuid id PK; uuid listing_id FK; uuid user_id FK; string reason }
```

### Full DDL

```sql
-- EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- SHARED TRIGGER: auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Table: cities
CREATE TABLE cities (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    state         VARCHAR(100) NOT NULL,
    slug          VARCHAR(120) NOT NULL UNIQUE,
    lang_default  VARCHAR(10)  NOT NULL DEFAULT 'en'
                  CHECK (lang_default IN ('en','hi','te','ta','kn','mr','bn','gu','pa','ml','or')),
    active        BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_cities_slug   ON cities(slug);
CREATE INDEX idx_cities_state  ON cities(state);
CREATE INDEX idx_cities_active ON cities(id) WHERE active = true;

-- Table: categories
CREATE TABLE categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(80) NOT NULL,
    slug        VARCHAR(90) NOT NULL UNIQUE,
    icon        VARCHAR(50),
    parent_id   UUID        REFERENCES categories(id) ON DELETE SET NULL,
    sort_order  INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug   ON categories(slug);

-- Table: users
CREATE TABLE users (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone        VARCHAR(15) UNIQUE,
    email        VARCHAR(254) UNIQUE,
    name         VARCHAR(100) NOT NULL,
    avatar_url   TEXT,
    role         VARCHAR(20) NOT NULL DEFAULT 'user'
                 CHECK (role IN ('user', 'admin', 'business_owner')),
    city_id      UUID        REFERENCES cities(id) ON DELETE SET NULL,
    lang_pref    VARCHAR(10) NOT NULL DEFAULT 'en'
                 CHECK (lang_pref IN ('en','hi','te','ta','kn','mr','bn','gu','pa','ml','or')),
    is_active    BOOLEAN     NOT NULL DEFAULT true,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_phone      ON users(phone)    WHERE phone IS NOT NULL;
CREATE INDEX idx_users_email      ON users(email)    WHERE email IS NOT NULL;
CREATE INDEX idx_users_city       ON users(city_id);
CREATE INDEX idx_users_active     ON users(id)       WHERE deleted_at IS NULL;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: listings
CREATE TABLE listings (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city_id         UUID         NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    category_id     UUID         NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title           VARCHAR(150) NOT NULL,
    description     TEXT         NOT NULL,
    price           NUMERIC(12,2),
    contact_phone   VARCHAR(15)  NOT NULL,
    whatsapp_url    TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','expired','rejected','flagged','fulfilled')),
    is_featured     BOOLEAN      NOT NULL DEFAULT false,
    report_count    INT          NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ  NOT NULL DEFAULT now() + INTERVAL '30 days',
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    search_vector   TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
    ) STORED
);
CREATE INDEX idx_listings_city        ON listings(city_id, status, created_at DESC);
CREATE INDEX idx_listings_category    ON listings(category_id);
CREATE INDEX idx_listings_user        ON listings(user_id);
CREATE INDEX idx_listings_status      ON listings(status);
CREATE INDEX idx_listings_featured    ON listings(city_id, is_featured) WHERE is_featured = true AND status = 'active';
CREATE INDEX idx_listings_expires     ON listings(expires_at) WHERE status = 'active';
CREATE INDEX idx_listings_active      ON listings(id) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_listings_search      ON listings USING GIN(search_vector);
CREATE INDEX idx_listings_trgm_title  ON listings USING GIN(title gin_trgm_ops);
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: listing_images
CREATE TABLE listing_images (
    id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id     UUID  NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url            TEXT  NOT NULL,
    cloudinary_id  TEXT  NOT NULL,
    display_order  INT   NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_images_listing ON listing_images(listing_id, display_order);

-- Table: events
CREATE TABLE events (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id      UUID         NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  UUID         REFERENCES categories(id) ON DELETE SET NULL,
    title        VARCHAR(150) NOT NULL,
    description  TEXT         NOT NULL,
    venue        VARCHAR(200) NOT NULL,
    event_date   TIMESTAMPTZ  NOT NULL,
    is_free      BOOLEAN      NOT NULL DEFAULT true,
    ticket_url   TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','active','cancelled','completed')),
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_city_date  ON events(city_id, event_date ASC) WHERE status = 'active';
CREATE INDEX idx_events_user       ON events(user_id);
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: businesses
CREATE TABLE businesses (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id       UUID         NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    owner_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
    category_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,
    name          VARCHAR(150) NOT NULL,
    description   TEXT,
    address       TEXT,
    phone         VARCHAR(15),
    whatsapp_url  TEXT,
    website_url   TEXT,
    verified      BOOLEAN      NOT NULL DEFAULT false,
    avg_rating    NUMERIC(3,2) DEFAULT 0,
    review_count  INT          NOT NULL DEFAULT 0,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_businesses_city      ON businesses(city_id, category_id);
CREATE INDEX idx_businesses_owner     ON businesses(owner_id);
CREATE INDEX idx_businesses_verified  ON businesses(city_id) WHERE verified = true;
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: reviews
CREATE TABLE reviews (
    id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  UUID  NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id      UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating       INT   NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (business_id, user_id)
);
CREATE INDEX idx_reviews_business ON reviews(business_id, created_at DESC);
CREATE INDEX idx_reviews_user     ON reviews(user_id);

-- Table: reports
CREATE TABLE reports (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      VARCHAR(50) NOT NULL
                CHECK (reason IN ('spam','inappropriate','duplicate','wrong_category','other')),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, user_id)
);
CREATE INDEX idx_reports_listing ON reports(listing_id);

-- Table: otp_requests
CREATE TABLE otp_requests (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(15) NOT NULL,
    otp_hash    TEXT        NOT NULL,
    attempts    INT         NOT NULL DEFAULT 0,
    verified    BOOLEAN     NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '10 minutes',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_phone   ON otp_requests(phone, created_at DESC);
CREATE INDEX idx_otp_expires ON otp_requests(expires_at) WHERE verified = false;
```

---

## 7. ENGINEERING HANDOFF SPEC

### Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSG city pages = SEO; consistent with React ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Mobile-fast, consistent, copy-owned components |
| Animation | Framer Motion + Magic UI | City selector transitions, micro-interactions |
| Icons | Lucide React | Referenced in category icons throughout |
| Fonts | next/font + Noto Sans family | 11 language scripts, zero FOUT |
| i18n | next-intl | SSR-compatible, App Router support |
| Backend | FastAPI (Python 3.12) | Consistent with Satvik & KrishiTrack |
| ORM | SQLAlchemy 2.0 + Alembic | Type-safe, migration support |
| Validation | Pydantic v2 | Built into FastAPI |
| Auth | JWT (access 15min + refresh 7d) | Stateless, scalable |
| Google OAuth | authlib | Standard OAuth2 flow |
| Phone OTP | MSG91 REST API | India-native, Rs.0.18/SMS |
| Images | Cloudinary | Free tier 25GB, CDN, WebP transform |
| Search | PostgreSQL pg_trgm + tsvector | No extra infra cost |
| Database | PostgreSQL 16 | Full-text, UUID, JSONB, partitioning |
| Deployment | Railway | Consistent with other apps |
| CI/CD | GitHub Actions | Free for public repos |

### Project Folder Structure

```
localindia/
â”œâ”€â”€ frontend/                        # Next.js 14
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ layout.tsx               # Root layout with language provider
â”‚   â”‚   â”œâ”€â”€ page.tsx                 # Landing / city selector
â”‚   â”‚   â”œâ”€â”€ [city]/
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx             # City home (SSG)
â”‚   â”‚   â”‚   â”œâ”€â”€ classifieds/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx         # Listings grid
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ [id]/page.tsx    # Listing detail
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ post/page.tsx    # Post listing form
â”‚   â”‚   â”‚   â”œâ”€â”€ events/page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ businesses/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ [id]/page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ search/page.tsx
â”‚   â”‚   â”œâ”€â”€ admin/
â”‚   â”‚   â”‚   â”œâ”€â”€ listings/page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ reports/page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ users/page.tsx
â”‚   â”‚   â””â”€â”€ auth/
â”‚   â”‚       â”œâ”€â”€ login/page.tsx
â”‚   â”‚       â””â”€â”€ callback/page.tsx
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ ui/                      # shadcn/ui components
â”‚   â”‚   â”œâ”€â”€ city-selector/
â”‚   â”‚   â”œâ”€â”€ listing-card/
â”‚   â”‚   â”œâ”€â”€ language-switcher/
â”‚   â”‚   â”œâ”€â”€ whatsapp-button/
â”‚   â”‚   â””â”€â”€ image-upload/
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ api.ts
â”‚   â”‚   â””â”€â”€ utils.ts
â”‚   â”œâ”€â”€ messages/                    # next-intl translation files
â”‚   â”‚   â”œâ”€â”€ en.json  hi.json  te.json  ta.json  kn.json  mr.json
â”‚   â”‚   â””â”€â”€ bn.json  gu.json  pa.json  ml.json  or.json
â”‚   â””â”€â”€ next.config.ts
â”‚
â”œâ”€â”€ backend/                         # FastAPI
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ main.py
â”‚   â”‚   â”œâ”€â”€ core/
â”‚   â”‚   â”‚   â”œâ”€â”€ config.py
â”‚   â”‚   â”‚   â”œâ”€â”€ security.py
â”‚   â”‚   â”‚   â””â”€â”€ database.py
â”‚   â”‚   â”œâ”€â”€ routers/
â”‚   â”‚   â”‚   â”œâ”€â”€ auth.py  cities.py  listings.py  events.py
â”‚   â”‚   â”‚   â”œâ”€â”€ businesses.py  search.py  uploads.py  admin.py
â”‚   â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â”œâ”€â”€ schemas/
â”‚   â”‚   â””â”€â”€ services/
â”‚   â”‚       â”œâ”€â”€ msg91.py  cloudinary_svc.py  search_svc.py
â”‚   â”œâ”€â”€ migrations/versions/
â”‚   â”œâ”€â”€ tests/
â”‚   â”‚   â”œâ”€â”€ test_auth.py  test_listings.py  test_search.py  conftest.py
â”‚   â”œâ”€â”€ Dockerfile
â”‚   â””â”€â”€ requirements.txt
â”‚
â”œâ”€â”€ CLAUDE.md
â”œâ”€â”€ BUILD_PLAN.md
â”œâ”€â”€ UI_STACK.md
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ .claudeignore
â”œâ”€â”€ .claude/
â”‚   â”œâ”€â”€ settings.json
â”‚   â””â”€â”€ skills/
â”‚       â”œâ”€â”€ phase1-mvp/SKILL.md
â”‚       â”œâ”€â”€ phase2-community/SKILL.md
â”‚       â””â”€â”€ phase3-monetize/SKILL.md
â””â”€â”€ .github/workflows/ci.yml
```

### API Endpoints

```
AUTH
POST   /api/v1/auth/otp/send           {phone} â†’ {message, expires_in}
POST   /api/v1/auth/otp/verify         {phone, otp} â†’ {access_token, refresh_token, user}
GET    /api/v1/auth/google             Redirect to Google OAuth
GET    /api/v1/auth/google/callback    {code} â†’ {access_token, refresh_token, user}
POST   /api/v1/auth/refresh            {refresh_token} â†’ {access_token}
DELETE /api/v1/auth/logout             Auth: Bearer â†’ 204

CITIES
GET /api/v1/cities                     {state?, active?} â†’ [{id, name, state, slug}]
GET /api/v1/cities/{slug}              â†’ {city}

LISTINGS
GET    /api/v1/listings                {city_slug, category?, page, limit} â†’ {items[], total, page}
POST   /api/v1/listings                Auth; ListingCreate â†’ {listing}
GET    /api/v1/listings/{id}           â†’ {listing + images}
PATCH  /api/v1/listings/{id}           Auth (owner only) â†’ {listing}
DELETE /api/v1/listings/{id}           Auth (owner or admin) â†’ 204
POST   /api/v1/listings/{id}/report    Auth; {reason, notes} â†’ 201
POST   /api/v1/listings/{id}/renew     Auth (owner only) â†’ {listing}
POST   /api/v1/listings/{id}/fulfill   Auth (owner only) â†’ {listing}

EVENTS
GET    /api/v1/events                  {city_slug, category?, from_date?, page} â†’ {items[], total}
POST   /api/v1/events                  Auth; EventCreate â†’ {event}
GET    /api/v1/events/{id}             â†’ {event}
PATCH  /api/v1/events/{id}             Auth (owner only) â†’ {event}
DELETE /api/v1/events/{id}             Auth (owner or admin) â†’ 204

BUSINESSES
GET  /api/v1/businesses                {city_slug, category?, page} â†’ {items[], total}
POST /api/v1/businesses                Auth; BusinessCreate â†’ {business}
GET  /api/v1/businesses/{id}           â†’ {business + reviews}
POST /api/v1/businesses/{id}/claim     Auth â†’ {business}
POST /api/v1/businesses/{id}/reviews   Auth; {rating, body} â†’ {review}

SEARCH
GET /api/v1/search                     {q, city_slug, category?, min_price?, max_price?, sort?} â†’ {items[], total}

UPLOADS
POST   /api/v1/upload/image            Auth; Form {file} â†’ {url, cloudinary_id}
DELETE /api/v1/upload/image/{cid}      Auth â†’ 204

ADMIN (role=admin required)
GET   /api/v1/admin/listings/pending   {page} â†’ {items[], total}
PATCH /api/v1/admin/listings/{id}/approve â†’ {listing}
PATCH /api/v1/admin/listings/{id}/reject  {reason} â†’ {listing}
GET   /api/v1/admin/reports            {page} â†’ {items[], total}
```

### Business Logic Rules

```
BL-01: Phone must be Indian format â€” /^\+91[6-9]\d{9}$/ server-side
BL-02: Max 10 active listings per user per city (free tier)
BL-03: Listings auto-expire after 30 days; expired hidden from public, visible in dashboard
BL-04: 3+ reports â†’ status='flagged', hidden from public
BL-05: Only listing owner or admin can edit/delete
BL-06: OTP valid 10 minutes, max 3 attempts, 15-min phone lockout after failures
BL-07: Max 5 OTP requests per phone per hour
BL-08: Images JPEG/PNG/WebP only, max 5MB, Cloudinary auto-converts to WebP
BL-09: One review per user per business (UNIQUE constraint)
BL-10: Business avg_rating updated by application after each review
BL-11: Admin approval required before listing goes active
BL-12: WhatsApp URL must match /^https:\/\/wa\.me\/91\d{10}$/
BL-13: Google OAuth email must be Gmail (configurable)
BL-14: Soft-delete only â€” no hard deletes (PDPB compliance)
BL-15: City slug must match /^[a-z0-9-]+$/
```

### i18n Architecture

```
Strategy:  next-intl with App Router
Routing:   /[city]?lang=te  (query param â€” avoids breaking city SSG)
Keys:      messages/{lang}.json
Content:   User-generated content NOT auto-translated â€” shown as-is
Fonts:     Noto Sans family loaded via next/font (zero FOUT)

Languages + Font:
  en â†’ Noto Sans
  hi â†’ Noto Sans Devanagari
  te â†’ Noto Sans Telugu
  ta â†’ Noto Sans Tamil
  kn â†’ Noto Sans Kannada
  mr â†’ Noto Sans Devanagari
  bn â†’ Noto Sans Bengali
  gu â†’ Noto Sans Gujarati
  pa â†’ Noto Sans Gurmukhi
  ml â†’ Noto Sans Malayalam
  or â†’ Noto Sans Oriya
```

---

## 8. DEVOPS & DEPLOYMENT

### Environments
```
local      â†’ docker-compose (Postgres + FastAPI + Next.js)
staging    â†’ Railway (auto-deploy on PR merge to develop)
production â†’ Railway (auto-deploy on merge to main, manual gate)
```

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/localindia
SECRET_KEY=<256-bit random>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
MSG91_AUTH_KEY=<msg91 key>
MSG91_TEMPLATE_ID=<otp template>
GOOGLE_CLIENT_ID=<google oauth>
GOOGLE_CLIENT_SECRET=<google oauth>
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
FRONTEND_URL=https://localsindia.com  # CONFIRMED domain

# Frontend
NEXT_PUBLIC_API_URL=https://api.localsindia.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<name>
NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=https://localsindia.com
```

### GitHub Actions CI
```yaml
name: CI/CD
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: localindia_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ --cov=backend/app --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/localindia_test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run lint && npm run build

  deploy-railway:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: npx @railway/cli up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Docker Compose (Local Dev)
```yaml
version: '3.9'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: localindia
      POSTGRES_USER: localindia
      POSTGRES_PASSWORD: localindia
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://localindia:localindia@db:5432/localindia
    depends_on: [db]
    volumes: [./backend:/app]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    volumes: [./frontend:/app]
    command: npm run dev

volumes:
  pgdata:
```

---

## 9. QA PLAN

### Test Matrix
| Layer | Tool | Coverage |
|---|---|---|
| Unit â€” Backend | pytest | 80% |
| API Integration | pytest + httpx | All endpoints |
| Frontend | Jest + RTL | Core UI |
| E2E | Playwright | 5 critical flows |
| DB | pgTAP | Constraints + indexes |
| Performance | k6 | 10k concurrent users |
| Security | OWASP ZAP | Auth, injection, rate limits |

### Critical Test Cases
```
TC-001: Phone OTP â€” valid Indian number receives OTP within 30s          [P1]
TC-002: Phone OTP â€” non-Indian number rejected with 400                  [P1]
TC-003: Phone OTP â€” 3 failed attempts locks account 15 minutes           [P1]
TC-004: Google OAuth â€” valid Gmail creates user + returns JWT             [P1]
TC-005: Post listing â€” all required fields â†’ status=pending              [P1]
TC-006: Post listing â€” missing title returns 422 with field error         [P1]
TC-007: Post listing â€” unauthenticated user returns 401                   [P1]
TC-008: Search â€” "tiffin" in Hyderabad returns only Hyderabad results    [P1]
TC-009: Search â€” SQL injection in query param does not execute            [P1 Security]
TC-010: Image upload â€” 6MB file rejected with 413                         [P2]
TC-011: Image upload â€” non-image file (PDF) rejected with 400             [P2]
TC-012: Report listing â€” 3rd report triggers status=flagged + hidden      [P1]
TC-013: Language switch â€” UI renders in Telugu script correctly            [P2]
TC-014: City selector â€” selecting Vijayawada shows only Vijayawada data  [P1]
TC-015: Listing auto-expire â€” expired not returned in GET /listings       [P2]
TC-016: Admin approve â€” listing moves to active and appears publicly      [P1]
TC-017: Rate limit â€” 6th OTP request in 1 hour returns 429               [P1 Security]
TC-018: WhatsApp URL â€” invalid format rejected server-side with 422       [P2]
TC-019: Review â€” user cannot submit 2 reviews for same business           [P2]
TC-020: Soft delete â€” deleted listing not returned but exists in DB       [P2]
```

---

## 10. BUILD PHASES

### Phase 1 â€” MVP (Weeks 1-6)
- [ ] DB schema + migrations
- [ ] FastAPI: auth, cities, listings CRUD, image upload, search
- [ ] Next.js: city selector, listings grid + detail, post form
- [ ] Admin: approve/reject listings
- [ ] i18n: English + Hindi + Telugu
- [ ] Deploy to Railway
- [ ] 50 cities seeded

### Phase 2 â€” Community (Weeks 7-10)
- [ ] Events module (post + browse)
- [ ] Business directory + reviews
- [ ] Remaining 8 languages
- [ ] WhatsApp Business API notifications
- [ ] PWA manifest + service worker
- [ ] Full 700+ cities seeded

### Phase 3 â€” Monetization (Weeks 11-14)
- [ ] Razorpay integration
- [ ] Featured listings (paid boost)
- [ ] Business ad banners (city pages)
- [ ] Analytics dashboard (business owners)
- [ ] Event ticketing with QR codes

---

## 11. OPEN QUESTIONS

```
Q1: Domain â€” localsindia.com CONFIRMED
Q2: Seed cities â€” 140 South India-focused cities (see BUILD_PLAN.md)
Q3: Admin team size at launch?
Q4: MSG91 account ready or need setup guide?
Q5: Cloudinary free tier (25GB) sufficient for Phase 1?
```

