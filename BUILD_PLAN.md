# LocalIndia â€” 14-Week Build Plan

## Pre-Build Setup (Day 1 â€” ~2 hours)

```
1. git init localindia
2. Create full folder structure (see ARCHITECTURE.md Section 7)
3. docker-compose.yml â†’ Postgres 16 local
4. backend/ â†’ FastAPI scaffold + requirements.txt + alembic init
5. frontend/ â†’ npx create-next-app@14 --typescript --tailwind --app
6. shadcn/ui init â†’ npx shadcn@latest init
7. CLAUDE.md + .claudeignore + .claude/settings.json done (already created)
8. GitHub repo + Actions skeleton
9. alembic upgrade head â†’ all 10 tables + indexes created
10. Verify: docker-compose up â†’ Postgres healthy, FastAPI /docs loads
```

---

## Phase 1 â€” MVP (Weeks 1-6)

### Week 1-2: Backend Foundation
**Files to create:**
- `backend/app/core/config.py` â€” pydantic-settings, all env vars
- `backend/app/core/database.py` â€” SQLAlchemy async engine + session
- `backend/app/core/security.py` â€” JWT create/verify, bcrypt hash
- `backend/app/models/` â€” all 10 ORM models (cities, users, categories, listings, listing_images, events, businesses, reviews, reports, otp_requests)
- `backend/app/schemas/` â€” Pydantic request/response schemas for each model
- `backend/app/routers/auth.py` â€” OTP send/verify + Google OAuth (authlib)
- `backend/app/services/msg91.py` â€” SMS wrapper (mock mode if no key)
- `backend/tests/test_auth.py` â€” TC-001 through TC-004, TC-017

**Gate:** `pytest tests/test_auth.py -x -q` â€” all green

### Week 2-3: Listings Backend
**Files to create:**
- `backend/app/routers/cities.py` â€” GET /cities, GET /cities/{slug}
- `backend/app/routers/listings.py` â€” full CRUD + report + renew + fulfill
- `backend/app/routers/uploads.py` â€” Cloudinary upload/delete
- `backend/app/routers/search.py` â€” pg_trgm + tsvector query
- `backend/app/services/cloudinary_svc.py` â€” upload, delete, WebP transform
- `backend/app/services/search_svc.py` â€” search logic, relevance ranking
- `backend/app/routers/admin.py` â€” approve/reject, pending list, reports
- `backend/tests/test_listings.py` â€” TC-005 through TC-012, TC-018-020
- `backend/tests/test_search.py` â€” TC-008, TC-009 (SQL injection), TC-014

**Gate:** `pytest tests/ -x -q` â€” all green

### Week 3-4: Frontend Shell
**Components to build:**
- shadcn/ui install: Button, Card, Badge, Sheet, Dialog, Input, Select, Skeleton, Tabs, Avatar, DropdownMenu
- `frontend/app/layout.tsx` â€” NextIntlProvider + Noto font loader (11 fonts)
- `frontend/app/page.tsx` â€” City selector landing (animated card grid, searchable)
- `frontend/components/city-selector/` â€” search input + 700 cities list + Framer Motion transitions
- `frontend/components/language-switcher/` â€” query param locale, flag icons
- `frontend/components/whatsapp-button/` â€” green CTA button, wa.me link
- `frontend/messages/en.json` â€” all UI label keys
- `frontend/messages/hi.json` â€” Hindi translations
- `frontend/messages/te.json` â€” Telugu translations

**UX Patterns:**
- City selector: full-screen modal on mobile, popover on desktop
- Language switcher: top-right chip showing current language
- WhatsApp button: always green (#25D366), WhatsApp icon, prominent placement

**Gate:** `npm run build && npm run lint` â€” no errors

### Week 4-5: Core Listing Flow
**Pages to build:**
- `frontend/app/[city]/page.tsx` â€” City home: search bar + category chips + featured listings
- `frontend/app/[city]/classifieds/page.tsx` â€” 2-col mobile / 4-col desktop card grid with skeleton
- `frontend/app/[city]/classifieds/[id]/page.tsx` â€” Detail: images carousel + WhatsApp CTA (above fold on mobile)
- `frontend/app/[city]/classifieds/post/page.tsx` â€” Multi-step form (3 steps: details â†’ images â†’ contact)
- `frontend/app/[city]/search/page.tsx` â€” Search results with category/price/date filters
- `frontend/components/listing-card/` â€” Image-first card, price badge, category chip, WhatsApp button
- `frontend/components/image-upload/` â€” Drag-drop + preview, 5-image max, Cloudinary direct upload
- `frontend/app/auth/login/page.tsx` â€” Google + Phone OTP tabs

**Mobile UX Rules:**
- Bottom navigation bar: Home / Post / Search / Profile (Sheet on mobile)
- Sticky city name in header with switch icon
- WhatsApp CTA button: full-width on mobile, fixed at bottom of listing detail
- Image carousel: swipeable on mobile (Framer Motion drag)

**Playwright E2E (write these):**
- Post listing â†’ appears as pending in admin â†’ admin approves â†’ visible in grid
- Search "tiffin" on /hyderabad â†’ only hyderabad results shown
- Report listing 3x â†’ status=flagged â†’ hidden from grid

**Gate:** E2E passes + `npm run build` clean

### Week 5-6: Admin + Deploy
**Files:**
- `frontend/app/admin/listings/page.tsx` â€” pending queue with approve/reject buttons
- `frontend/app/admin/reports/page.tsx` â€” flagged listings with report reasons
- `frontend/app/admin/users/page.tsx` â€” user list, soft-delete, role change
- `backend/scripts/seed_cities.py` â€” seed 50 cities (10 metro + 40 AP/Telangana)

**Deploy:**
- `railway.toml` â€” Railway project config for backend + frontend
- Set all env vars in Railway dashboard
- GitHub Actions CI: verify both test jobs green on main branch
- Seed 50 cities on Railway Postgres

**Gate:** Live Railway URL loads, post listing flow works end-to-end

---

## Phase 2 â€” Community (Weeks 7-10)

### Week 7-8: Events Module
- `backend/app/routers/events.py` â€” full CRUD
- `backend/tests/test_events.py`
- `frontend/app/[city]/events/page.tsx` â€” date-sorted calendar view
- `frontend/app/[city]/events/[id]/page.tsx` â€” event detail + ticket URL button

### Week 8-9: Business Directory
- `backend/app/routers/businesses.py` â€” CRUD + claim + reviews
- `frontend/app/[city]/businesses/page.tsx` â€” category grid (Yellow Pages style)
- `frontend/app/[city]/businesses/[id]/page.tsx` â€” profile + star rating + WhatsApp
- Business avg_rating update logic after each review POST

### Week 9-10: Language Expansion + PWA
- Create remaining 8 translation files: ta, kn, mr, bn, gu, pa, ml, or
- `frontend/public/manifest.json` â€” PWA manifest
- `frontend/public/sw.js` â€” service worker (cache city pages + listing images)
- `backend/scripts/seed_cities_full.py` â€” seed all 700+ cities from CSV

---

## Phase 3 â€” Monetization (Weeks 11-14)

### Week 11-12: Razorpay Featured Listings
- Razorpay SDK integration (backend + frontend)
- `backend/app/routers/payments.py` â€” create order, verify webhook
- Featured listing boost: `is_featured=true`, appears at top of city grid
- Admin can manually feature (free) or user pays to feature

### Week 12-13: Business Ads + Analytics
- City page header ad banner slots (business owners)
- `frontend/app/[city]/businesses/dashboard/page.tsx` â€” views, clicks, WhatsApp taps
- Basic analytics tracking (server-side, no 3rd party)

### Week 13-14: Event Ticketing
- Razorpay payment for paid events
- QR code generation on payment (`qrcode` npm package)
- `frontend/app/[city]/events/[id]/ticket/page.tsx` â€” ticket + QR display

---

## Verification Gates Summary

| After | Run | Must Pass |
|---|---|---|
| Each backend router | `pytest tests/ -x -q` | All tests green |
| Each frontend page | `npm run build && npm run lint` | Exit 0 |
| Phase 1 complete | Playwright E2E (3 flows) | All pass |
| Phase 2 complete | Full test suite + Playwright | All pass |
| Each deploy | Railway health check | /api/v1/health returns 200 |

---

## Seed Cities â€” Phase 1 (130 South India-focused cities)

Strategy: Full South India coverage from Day 1 (AP + Telangana + TN + Karnataka + Kerala + Goa + Puducherry) + 10 national metro cities.

### 10 National Metro (all India)
| City | State | Slug |
|---|---|---|
| Hyderabad | Telangana | hyderabad |
| Bengaluru | Karnataka | bengaluru |
| Chennai | Tamil Nadu | chennai |
| Mumbai | Maharashtra | mumbai |
| Delhi | Delhi | delhi |
| Pune | Maharashtra | pune |
| Kolkata | West Bengal | kolkata |
| Ahmedabad | Gujarat | ahmedabad |
| Jaipur | Rajasthan | jaipur |
| Lucknow | Uttar Pradesh | lucknow |

### 32 Andhra Pradesh
| City | Slug |
|---|---|
| Visakhapatnam | visakhapatnam |
| Vijayawada | vijayawada |
| Guntur | guntur |
| Nellore | nellore |
| Kurnool | kurnool |
| Kakinada | kakinada |
| Rajamahendravaram | rajamahendravaram |
| Kadapa | kadapa |
| Tirupati | tirupati |
| Anantapuram | anantapuram |
| Ongole | ongole |
| Vizianagaram | vizianagaram |
| Eluru | eluru |
| Proddatur | proddatur |
| Nandyal | nandyal |
| Adoni | adoni |
| Machilipatnam | machilipatnam |
| Tenali | tenali |
| Chittoor | chittoor |
| Hindupur | hindupur |
| Srikakulam | srikakulam |
| Bhimavaram | bhimavaram |
| Tadepalligudem | tadepalligudem |
| Guntakal | guntakal |
| Dharmavaram | dharmavaram |
| Gudivada | gudivada |
| Narasaraopet | narasaraopet |
| Madanapalle | madanapalle |
| Kadiri | kadiri |
| Tadipatri | tadipatri |
| Chilakaluripet | chilakaluripet |
| Mangalagiri | mangalagiri |

### 25 Telangana
| City | Slug |
|---|---|
| Warangal | warangal |
| Nizamabad | nizamabad |
| Karimnagar | karimnagar |
| Khammam | khammam |
| Ramagundam | ramagundam |
| Mahbubnagar | mahbubnagar |
| Nalgonda | nalgonda |
| Adilabad | adilabad |
| Suryapet | suryapet |
| Miryalaguda | miryalaguda |
| Siddipet | siddipet |
| Jagtial | jagtial |
| Mancherial | mancherial |
| Nirmal | nirmal |
| Sangareddy | sangareddy |
| Bhongir | bhongir |
| Kamareddy | kamareddy |
| Wanaparthy | wanaparthy |
| Nagarkurnool | nagarkurnool |
| Medak | medak |
| Vikarabad | vikarabad |
| Zahirabad | zahirabad |
| Shadnagar | shadnagar |
| Bodhan | bodhan |
| Tandur | tandur |

### 27 Karnataka
| City | Slug |
|---|---|
| Mysuru | mysuru |
| Hubballi | hubballi |
| Mangaluru | mangaluru |
| Belagavi | belagavi |
| Kalaburagi | kalaburagi |
| Davanagere | davanagere |
| Ballari | ballari |
| Vijayapura | vijayapura |
| Shivamogga | shivamogga |
| Tumakuru | tumakuru |
| Raichur | raichur |
| Bidar | bidar |
| Udupi | udupi |
| Hospet | hospet |
| Gadag | gadag |
| Hassan | hassan |
| Bhadravati | bhadravati |
| Chitradurga | chitradurga |
| Kolar | kolar |
| Mandya | mandya |
| Chikkamagaluru | chikkamagaluru |
| Gangavati | gangavati |
| Bagalkot | bagalkot |
| Ranebennuru | ranebennuru |
| Arsikere | arsikere |
| Robertsonpet | robertsonpet |
| Dharwad | dharwad |

### 25 Tamil Nadu
| City | Slug |
|---|---|
| Coimbatore | coimbatore |
| Madurai | madurai |
| Tiruchirappalli | tiruchirappalli |
| Salem | salem |
| Tirunelveli | tirunelveli |
| Tiruppur | tiruppur |
| Erode | erode |
| Vellore | vellore |
| Thoothukudi | thoothukudi |
| Thanjavur | thanjavur |
| Nagercoil | nagercoil |
| Dindigul | dindigul |
| Kanchipuram | kanchipuram |
| Kumbakonam | kumbakonam |
| Hosur | hosur |
| Cuddalore | cuddalore |
| Tiruvannamalai | tiruvannamalai |
| Rajapalayam | rajapalayam |
| Pudukkottai | pudukkottai |
| Nagapattinam | nagapattinam |
| Neyveli | neyveli |
| Karaikkudi | karaikkudi |
| Ambur | ambur |
| Krishnagiri | krishnagiri |
| Sivakasi | sivakasi |

### 15 Kerala
| City | Slug |
|---|---|
| Thiruvananthapuram | thiruvananthapuram |
| Kochi | kochi |
| Kozhikode | kozhikode |
| Thrissur | thrissur |
| Kollam | kollam |
| Palakkad | palakkad |
| Alappuzha | alappuzha |
| Malappuram | malappuram |
| Kannur | kannur |
| Kasaragod | kasaragod |
| Kottayam | kottayam |
| Thrippunithura | thrippunithura |
| Manjeri | manjeri |
| Thalassery | thalassery |
| Guruvayur | guruvayur |

### 5 Goa + 1 Puducherry
| City | State | Slug |
|---|---|---|
| Panaji | Goa | panaji |
| Margao | Goa | margao |
| Vasco da Gama | Goa | vasco-da-gama |
| Mapusa | Goa | mapusa |
| Ponda | Goa | ponda |
| Puducherry | Puducherry | puducherry |

**Total: 140 cities** â€” full South India from Day 1.

---

## lang_default mapping for seed script

```python
STATE_LANG = {
    "Andhra Pradesh": "te",
    "Telangana":      "te",
    "Tamil Nadu":     "ta",
    "Karnataka":      "kn",
    "Kerala":         "ml",
    "Goa":            "en",
    "Puducherry":     "ta",
    "Maharashtra":    "mr",
    "Gujarat":        "gu",
    "West Bengal":    "bn",
    "Rajasthan":      "hi",
    "Uttar Pradesh":  "hi",
    "Delhi":          "hi",
}
```

---

## Pre-Build Checklist

- [x] Q1: Domain â€” **localsindia.com** confirmed
- [x] Q2: Seed cities â€” 140 South India-focused cities (see above)
- [ ] Q3: MSG91 account â€” see SETUP_GUIDE.md (mock mode works for Day 1)
- [ ] Q4: Cloudinary account â€” see SETUP_GUIDE.md (5 min setup, free tier)
- [ ] Q5: Google OAuth â€” see SETUP_GUIDE.md (10 min setup)
- [ ] Q6: Railway account + project â€” see SETUP_GUIDE.md
- [ ] Q7: GitHub repo created

