---
name: phase2-community
description: LocalIndia Phase 2 — Events module, Business directory + reviews, remaining 8 languages, PWA, 700+ cities. Weeks 7-10. Load after Phase 1 is deployed.
---

# Phase 2 — Community Build Guide

## Prerequisites
- Phase 1 deployed and live on Railway
- All Phase 1 tests passing
- 50 cities seeded in production

## Week 7-8: Events Module

### Backend
1. `backend/app/routers/events.py` — full CRUD
   - GET /events?city_slug=&category=&from_date=&page=
   - POST /events (Auth required, status='pending')
   - GET /events/{id}
   - PATCH /events/{id} (owner only)
   - DELETE /events/{id} (owner or admin, soft-delete)
2. `backend/app/schemas/event.py` — EventCreate, EventUpdate, EventResponse
3. `backend/tests/test_events.py` — CRUD + auth + city isolation tests
4. Add events to admin panel: GET /admin/events/pending, PATCH approve/reject

### Frontend
1. `frontend/app/[city]/events/page.tsx`
   - Calendar-style header showing current month
   - Cards sorted by event_date ASC
   - Filter: cultural / sports / religious / music / food chips
   - Free badge (green) / Paid badge (amber) on each card
2. `frontend/app/[city]/events/[id]/page.tsx`
   - Event details: venue, date/time, description
   - Free: "RSVP" button (external link or WhatsApp)
   - Paid: "Get Tickets" button → ticket_url
3. `frontend/app/[city]/events/post/page.tsx`
   - Form: title, description, venue, date+time picker, free/paid toggle, ticket URL

Verification: `pytest tests/test_events.py -x -q` + `npm run build`

## Week 8-9: Business Directory

### Backend
1. `backend/app/routers/businesses.py`
   - GET /businesses?city_slug=&category=&page=
   - POST /businesses (Auth, creates unverified)
   - GET /businesses/{id} (includes reviews)
   - POST /businesses/{id}/claim (Auth, sets owner_id)
   - POST /businesses/{id}/reviews (Auth, rating + body)
   - avg_rating update: recalculate after each review INSERT
2. `backend/app/schemas/business.py` — BusinessCreate, BusinessResponse, ReviewCreate
3. `backend/tests/test_businesses.py` — CRUD + review uniqueness (TC-019 equivalent) + avg_rating

### Frontend
1. `frontend/app/[city]/businesses/page.tsx`
   - Yellow Pages style: category icons grid at top
   - Below: business cards with rating, category, WhatsApp button
   - Verified badge (blue checkmark) on claimed + verified businesses
2. `frontend/app/[city]/businesses/[id]/page.tsx`
   - Business profile: name, address, phone, website, WhatsApp button
   - Star rating display (avg + count)
   - Review list (sorted by created_at DESC)
   - "Write a Review" form (Auth required, 1 per user)
   - "Claim this business" button (if unclaimed)

Verification: `pytest tests/test_businesses.py -x -q` + `npm run build`

## Week 9-10: Language Expansion + PWA

### Remaining 8 Languages
Create translation files with all keys from en.json:
- `frontend/messages/ta.json` — Tamil
- `frontend/messages/kn.json` — Kannada
- `frontend/messages/mr.json` — Marathi (same font as Hindi)
- `frontend/messages/bn.json` — Bengali
- `frontend/messages/gu.json` — Gujarati
- `frontend/messages/pa.json` — Punjabi
- `frontend/messages/ml.json` — Malayalam
- `frontend/messages/or.json` — Odia

Update language switcher to show all 11 options.
Test each font renders correctly: verify Noto Sans loaded for each script.

### PWA
1. `frontend/public/manifest.json`
   ```json
   {
     "name": "LocalIndia",
     "short_name": "LocalIndia",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#FAFAFA",
     "theme_color": "#FF6B35",
     "icons": [...]
   }
   ```
2. `frontend/public/sw.js` — service worker
   - Cache: city home pages, listing images (Cloudinary URLs)
   - Strategy: stale-while-revalidate for city pages
   - Offline fallback: cached listing cards with "No internet" banner
3. Register service worker in `frontend/app/layout.tsx`

### 700+ Cities Seed
1. `backend/scripts/seed_cities_full.py`
   - Source: Wikipedia list of Indian cities (CSV included in scripts/data/)
   - Assign lang_default based on state (te for AP/Telangana, ta for TN, etc.)
   - Generate slug: lowercase, hyphen-separated, unique
2. Run on Railway: `python scripts/seed_cities_full.py`

Verification: Language switcher shows all 11 languages, each renders correct script. PWA installs on Android Chrome.
