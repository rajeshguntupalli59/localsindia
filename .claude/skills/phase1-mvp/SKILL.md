---
name: phase1-mvp
description: LocalIndia Phase 1 MVP — scaffold + backend auth/listings/search + beautiful Next.js frontend + admin + Azure deploy. Weeks 1-6. Load this skill at the start of every Phase 1 session.
---

# Phase 1 â€” MVP Build Guide

## Goal
A live, beautiful, fast website on Azure where an Indian user can:
1. Pick their city
2. Browse classifieds in their language
3. Post a listing with photos
4. Contact sellers via WhatsApp
...all on a slow 4G phone in under 3 seconds per page.

---

## Week 1-2: Backend Foundation

### Files to create (in order)
```
backend/
  requirements.txt
  Dockerfile
  .env.example
  app/
    __init__.py
    main.py
    core/
      __init__.py
      config.py       â† pydantic-settings, all env vars
      database.py     â† SQLAlchemy 2.0 async engine + get_db dep
      security.py     â† JWT create/verify, bcrypt hash/verify
    models/
      __init__.py
      city.py  user.py  category.py  listing.py  listing_image.py
      event.py  business.py  review.py  report.py  otp_request.py
    schemas/
      __init__.py
      city.py  user.py  listing.py  event.py  business.py
      auth.py  upload.py  search.py  admin.py
    routers/
      __init__.py
      auth.py         â† /auth/otp/send, /auth/otp/verify, /auth/google, /auth/google/callback
    services/
      __init__.py
      msg91.py        â† MOCK if MSG91_AUTH_KEY not set (print OTP to console)
  migrations/
    env.py
    versions/         â† alembic generates these
  tests/
    __init__.py
    conftest.py       â† test DB, test client, user fixture, city fixture
    test_auth.py      â† TC-001 through TC-004, TC-017
  scripts/
    seed_cities.py    â† seed 140 cities from BUILD_PLAN.md
```

### Mock mode pattern (use for MSG91 + Cloudinary)
```python
# services/msg91.py
import os, logging
logger = logging.getLogger(__name__)

async def send_otp(phone: str, otp: str) -> bool:
    if not os.getenv("MSG91_AUTH_KEY"):
        logger.warning(f"[MOCK] OTP for {phone}: {otp}")  # visible in console
        return True
    # real MSG91 call here
```

### Alembic migration
Run `alembic revision --autogenerate -m "initial schema"` after all models defined.
Run `alembic upgrade head` to apply.
Invoke db-reviewer agent to check migration vs ARCHITECTURE.md DDL.

**Gate:** `pytest tests/test_auth.py -x -q` â€” all green before Week 2-3

---

## Week 2-3: Listings + Search Backend

### Additional files
```
app/routers/
  cities.py     â† GET /cities, GET /cities/{slug}
  listings.py   â† full CRUD + /report + /renew + /fulfill
  uploads.py    â† POST/DELETE /upload/image
  search.py     â† GET /search (pg_trgm + tsvector)
  admin.py      â† pending queue, approve, reject, reports
app/services/
  cloudinary_svc.py   â† upload_image (mock: save to /tmp), delete_image
  search_svc.py       â† build_search_query with relevance ranking
tests/
  test_listings.py
  test_search.py      â† TC-009 SQL injection MUST be tested explicitly
```

### Search query pattern
```python
# services/search_svc.py â€” use parameterized, NEVER string format
from sqlalchemy import text
query = text("""
    SELECT *, ts_rank(search_vector, plainto_tsquery('simple', :q)) AS rank
    FROM listings
    WHERE city_id = :city_id
      AND status = 'active'
      AND deleted_at IS NULL
      AND (search_vector @@ plainto_tsquery('simple', :q)
           OR title ILIKE :q_like)
    ORDER BY rank DESC, created_at DESC
    LIMIT :limit OFFSET :offset
""")
```

Invoke security-reviewer agent after `auth.py` and `search.py` complete.

**Gate:** `pytest tests/ -x -q` â€” all green before Week 3-4

---

## Week 3-4: Frontend Shell

### Setup commands
```bash
cd C:\Users\rajes\localindia
npx create-next-app@14 frontend --typescript --tailwind --app --src-dir
cd frontend
npx shadcn@latest init
# Choose: New York style, Slate base, CSS variables YES
npx shadcn@latest add button card badge sheet dialog input select skeleton tabs avatar dropdown-menu toast form label separator scroll-area command popover
npm install framer-motion next-intl lucide-react @cloudinary/next
```

### Files to create
```
frontend/
  next.config.ts         â† next-intl plugin, image domains: res.cloudinary.com
  middleware.ts          â† next-intl locale detection
  app/
    layout.tsx           â† root layout: NextIntlClientProvider + fonts + Toaster
    page.tsx             â† city selector landing
    globals.css          â† Tailwind base + CSS custom properties
    [city]/
      layout.tsx         â† sticky header with city chip + language switcher
      page.tsx           â† city home (SSG)
    auth/
      login/page.tsx
      callback/page.tsx
  components/
    ui/                  â† shadcn components (auto-generated)
    city-selector/
      CitySelector.tsx
      CitySearch.tsx
    listing-card/
      ListingCard.tsx
      ListingCardSkeleton.tsx
    language-switcher/
      LanguageSwitcher.tsx
    whatsapp-button/
      WhatsAppButton.tsx
    bottom-nav/
      BottomNav.tsx
    empty-state/
      EmptyState.tsx
  lib/
    api.ts               â† typed fetch wrapper with JWT refresh
    utils.ts             â† cn(), formatPrice(), timeAgo()
  messages/
    en.json  hi.json  te.json
```

### Noto Sans font setup (copy exactly)
```typescript
// app/layout.tsx
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Telugu } from 'next/font/google'

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto', weight: ['400','600','700'] })
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-devanagari', weight: ['400','600','700'] })
const notoTelugu = Noto_Sans_Telugu({ subsets: ['telugu'], variable: '--font-telugu', weight: ['400','600','700'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoDevanagari.variable} ${notoTelugu.variable}`}>
```

### CSS variables (globals.css)
```css
:root {
  --primary:    #FF6B35;   /* saffron orange â€” post CTA */
  --wa-green:   #25D366;   /* WhatsApp green */
  --featured:   #F7B731;   /* amber â€” featured badge */
  --nav-bg:     #1A1A2E;   /* deep navy â€” header */
  --card-bg:    #FFFFFF;
  --page-bg:    #F5F5F5;
  --text-main:  #1A1A2E;
  --text-muted: #6B7280;
  --border:     #E5E7EB;
}
```

**Gate:** `npm run build && npm run lint` â€” zero errors before Week 4-5

---

## Week 4-5: Core Listing Flow

### Beautiful UI patterns â€” implement ALL of these

#### City Selector (app/page.tsx)
```typescript
// Full-screen on mobile, centered modal on desktop
// Framer Motion: staggered city card entrance
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
}
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}
// Group cities by state (AP/Telangana first), show state headers
// Search: filter as user types, highlight matching text
// Recent cities: store last 3 in localStorage, show at top
```

#### Listing Card (components/listing-card/ListingCard.tsx)
```typescript
// Image: aspect-ratio 4:3, object-cover, next/image with blur placeholder
// Price: top-right badge on image, bold, primary color if set, "Price on request" if null
// Category chip: bottom-left on image, semi-transparent dark
// Hover: subtle shadow + scale(1.02) via Framer Motion whileHover
// WhatsApp button: full-width green button at card bottom
// Time ago: "2 hours ago", "3 days ago" â€” not date strings
// Status badge: only show if 'featured' (amber) or 'fulfilled' (gray strikethrough)

// ListingCardSkeleton: exact same dimensions, Tailwind animate-pulse
```

#### City Home Page (app/[city]/page.tsx)
```typescript
// Hero: search bar full-width, placeholder: "Search tiffin, PG, tutor..."
// Below search: horizontal scroll category chips with emoji icons
//   ðŸ± Tiffin  ðŸ  PG/Roommate  ðŸ’¼ Jobs  ðŸš— Vehicles  ðŸ“± Electronics  ðŸŽ‰ Events  ðŸª Businesses
// Below categories: "Featured" section (if any), then "Latest" grid
// City name in hero: "Discover [City]" with state in smaller text
// SSG with ISR: revalidate every 3600 seconds
```

#### Listing Detail (app/[city]/classifieds/[id]/page.tsx)
```
MOBILE LAYOUT (375px):
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â† Back   [Report]  â”‚  â† sticky header
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Image carousel     â”‚  â† swipeable, Framer Motion drag
â”‚  (tap to fullscreen)â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Category â€¢ Time    â”‚
â”‚  Title (2xl bold)   â”‚
â”‚  â‚¹ Price (primary)  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Description        â”‚
â”‚  (Show more...)     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  ðŸ“ Location        â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  â”€â”€ Seller Info â”€â”€  â”‚
â”‚  [Avatar] Name      â”‚
â”‚  Member since...    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  [WhatsApp seller]  â”‚  â† FULL WIDTH, fixed at bottom of screen
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Post Listing Form (app/[city]/classifieds/post/page.tsx)
```
3-step wizard with progress bar:
Step 1 â€” Details:   title, category (grid of category cards), description, price (optional)
Step 2 â€” Photos:    drag-drop zone "Add up to 5 photos", thumbnail preview, reorder
Step 3 â€” Contact:   phone (prefill if logged in), WhatsApp toggle + URL, city confirm

Submit â†’ success screen: "Your listing is under review" + "View my listings" button
Each step validates inline before allowing Next
Back button saves entered data (don't wipe on back navigation)
```

#### Search Page (app/[city]/search/page.tsx)
```
URL: /hyderabad/search?q=tiffin&category=services
Filters sheet (bottom sheet on mobile, sidebar on desktop):
  Category dropdown, Price range (min/max), Posted (today/week/month)
Results: same ListingCard grid
Empty state: "No results for 'tiffin' in Hyderabad" + suggested searches
Loading: skeleton grid (8 cards)
```

#### Empty State Component (components/empty-state/EmptyState.tsx)
```typescript
// Props: icon (lucide), title, description, action? {label, href}
// Used on: listings grid, search results, my listings, admin queues
// Design: centered, icon 48px muted color, friendly message
// Example: <EmptyState icon={SearchX} title="No listings yet" description="Be the first to post in your city!" action={{label: "Post Free", href: "/post"}} />
```

#### WhatsApp Button (components/whatsapp-button/WhatsAppButton.tsx)
```typescript
// Always: bg #25D366, white text, WhatsApp icon (lucide MessageCircle or custom SVG)
// Variants: 'full' (full-width), 'compact' (card bottom)
// Opens: wa.me link in new tab
// Tracks: click event for analytics (Phase 3)
// Pulse animation on listing detail (draws attention)
```

#### Bottom Navigation (components/bottom-nav/BottomNav.tsx)
```
Mobile only (hidden md:hidden):
[ðŸ  Home] [ðŸ” Search] [âž• Post] [ðŸ“‹ My Listings] [ðŸ‘¤ Profile]
Post button: bg-primary (saffron), rounded-full, slightly raised (+2px)
Active tab: primary color icon + label
Inactive: muted gray
Fixed at bottom, z-50, white bg with top border
```

### Additional pages
```
app/[city]/classifieds/page.tsx  â€” listing grid + category filter + sort
app/[city]/classifieds/[id]/edit/page.tsx â€” edit form (owner only, pre-filled)
app/auth/login/page.tsx â€” Google button + Phone OTP tabs
app/auth/callback/page.tsx â€” Google OAuth callback
app/profile/page.tsx â€” my listings, edit profile, city/language settings
```

### i18n key structure (messages/en.json)
```json
{
  "nav": { "home": "Home", "search": "Search", "post": "Post Free", "myListings": "My Listings", "profile": "Profile" },
  "city": { "selectCity": "Select your city", "searchPlaceholder": "Search city...", "recentCities": "Recent" },
  "listing": { "post": "Post Free Listing", "whatsapp": "Chat on WhatsApp", "priceOnRequest": "Price on request", "pending": "Under Review", "active": "Active", "featured": "Featured", "fulfilled": "Sold", "expired": "Expired", "timeAgo": "{time} ago" },
  "search": { "placeholder": "Search tiffin, PG, tutor...", "noResults": "No results for \"{q}\"", "filters": "Filters" },
  "post": { "title": "What are you selling?", "step1": "Details", "step2": "Photos", "step3": "Contact", "success": "Your listing is under review" },
  "errors": { "phoneInvalid": "Enter a valid Indian mobile number", "required": "This field is required", "imageTooLarge": "Image must be under 5MB" },
  "categories": { "classifieds": "Classifieds", "services": "Services", "pgRoommate": "PG / Roommate", "jobs": "Jobs", "vehicles": "Vehicles", "electronics": "Electronics", "events": "Events", "businesses": "Businesses" }
}
```

**Gate:** Playwright E2E â€” post listing â†’ admin approve â†’ visible in grid. Run `npm run build` clean.

---

## Week 5-6: Admin + Deploy

### Admin panel
```
app/admin/
  layout.tsx        â† sidebar nav (Pending badge count, Flagged, Reports, Users)
  listings/page.tsx â† data table: title, city, user, status, approve/reject actions
  reports/page.tsx  â† flagged listings with report reasons listed
  users/page.tsx    â† user list with role management

Admin sidebar design:
  Dark bg (#1A1A2E), white text
  Badge counts on Pending + Flagged (red if >0)
  Approve button: green, Reject button: red with reason modal
```

### Seed script
```python
# scripts/seed_cities.py â€” reads city list from BUILD_PLAN.md
# Creates all 140 cities with correct lang_default per state
# Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
```

### Deploy checklist
```
1. Push to master → GitHub Actions deploys backend to Azure App Service + frontend to Azure SWA automatically
2. All env vars set in Azure App Service → Configuration → Application settings
3. Run DB migration: az webapp ssh -n localsindia-backend -g localsindia-rg → alembic upgrade head
4. Seed cities: same SSH session → python scripts/seed_cities.py
5. /api/v1/health returns 200 at https://localsindia-backend.azurewebsites.net/api/v1/health
6. localsindia.com DNS (GoDaddy) CNAME www → Azure SWA
```

**Gate:** Live URL loads, post + approve + WhatsApp flow works end-to-end.

---

## Design QA Checklist (before marking any page complete)
- [ ] Loads in < 2.5s on simulated 4G (Lighthouse)
- [ ] No layout shift on image load (CLS = 0)
- [ ] Skeleton shows before any API data
- [ ] Works at 375px width without horizontal scroll
- [ ] WhatsApp button visible without scrolling on listing detail
- [ ] Empty state shows on zero results (not blank screen)
- [ ] Error toast shows on API failure
- [ ] Language switcher changes UI labels (not listing content)
- [ ] Category icons display correctly
- [ ] Framer Motion transitions run at 60fps (no janky animations)

