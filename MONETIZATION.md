# LocalsIndia — Monetization Roadmap

All revenue options ranked by effort and value. Activate when user base is ready.

---

## ✅ Already Built

| Feature | Price | Status |
|---|---|---|
| Featured listing | Rs.99/wk · Rs.199/mo | LIVE (Razorpay test keys) |

---

## Quick Wins — 1–2 Days Each

### 1. Urgent Tag
- **What:** Rs.49 one-time badge on a listing ("URGENT" red label)
- **Why:** Impulse buy, zero friction, seller already has a listing
- **How:** Add `is_urgent` boolean to listings + Razorpay one-time payment; badge shows on ListingCard

### 2. Listing Renewal
- **What:** Rs.29–49 to renew an expiring listing (listings expire in 30 days)
- **Why:** Seller already invested effort in the original post — renewal is obvious
- **How:** Show "Renew" button when `expires_at` < 7 days away; extend `expires_at` by 30 days on payment

### 3. Job Postings (Paid)
- **What:** Rs.299–499 to post a job listing (employers pay, not job seekers)
- **Why:** High intent; businesses budget for hiring; repeat customers
- **How:** New category `jobs` with `is_paid_post` flag; free browse, paid to post

### 4. City Banner Ad Slot
- **What:** Rs.999–2,999/mo — one banner slot at the top of each city homepage
- **Why:** AdBanner component already built; just needs admin assignment UI
- **How:** Admin panel: assign a listing (category=advertisement) to a city with start/end dates

---

## Medium Effort — 3–5 Days Each

### 5. Verified Business Badge
- **What:** Rs.499–999/mo — blue checkmark + priority placement in business directory
- **Why:** Businesses pay recurring; highest revenue per transaction; builds trust for buyers
- **How:** `is_verified` flag on businesses; admin approves after manual KYC; badge on BusinessCard
- **Target:** Local shops, restaurants, service providers
- **Priority: HIGH** — best path to predictable monthly recurring revenue

### 6. PG / Roommate Featured
- **What:** Rs.299/mo — PG listing appears at top of PG category in that city
- **Why:** PG owners have continuous vacancies; they pay every month automatically
- **How:** Category-specific featured logic in search; separate plan for `pg-roommate` category

### 7. WhatsApp City Broadcast
- **What:** Rs.199 one-time — new listing gets pushed to all users who saved that city/category
- **Why:** Notification infrastructure already built; high perceived value for sellers
- **How:** On payment, trigger `notification_svc.py` to create notifications for all users with matching preferences

---

## Later (Phase 4+)

### 8. Event Ticketing
- **What:** 2–3% fee on paid event tickets
- **Why:** Zero upfront cost to event organizer; scales with event size
- **How:** Razorpay + QR code ticket generation (spec already in phase3-monetize skill)

### 9. Business Analytics Dashboard
- **What:** Rs.299/mo — views, WhatsApp clicks, rating trends for business owners
- **Why:** Businesses that see ROI keep paying
- **How:** `analytics_event` table + dashboard page (spec in phase3-monetize skill)

### 10. Subscription Listings Pack
- **What:** Rs.499/mo — post unlimited listings (removes 10-listing cap per city)
- **Why:** Power sellers (dealers, brokers) need volume
- **How:** `subscription` table; bypass BL-02 cap for subscribed users

---

## Revenue Targets

| Phase | Features Active | Target per City/Month |
|---|---|---|
| Now | Featured listing | Rs.5,000 |
| Phase 3 | + Verified badge + Urgent + Renewal | Rs.15,000 |
| Phase 4 | + Job posts + PG featured + Banner | Rs.40,000 |
| Scale | All features + subscriptions | Rs.1,00,000+ |

---

## Implementation Notes
- All payments go through Razorpay (switch to live keys before launching any paid feature)
- Switch test → live keys: `az webapp config appsettings set --name localsindia-backend --resource-group localsindia-rg --settings "RAZORPAY_KEY_ID=rzp_live_XXX" "RAZORPAY_KEY_SECRET=XXX"`
- Verified Business Badge needs manual admin review step — build admin UI for this
- Never introduce a paid wall on browsing — anonymous browsing stays free always
