---
name: phase3-monetize
description: LocalIndia Phase 3 — Razorpay featured listings, business ads, analytics, event ticketing with QR. Weeks 11-14. Load after Phase 2 is live.
---

# Phase 3 — Monetization Build Guide

## Prerequisites
- Phase 2 live, all community features working
- Razorpay account created (razorpay.com)
- Test API keys in hand

## Week 11-12: Razorpay Featured Listings

### Backend
1. `pip install razorpay`
2. `backend/app/routers/payments.py`
   - POST /payments/featured/create-order
     - Creates Razorpay order for featured listing (amount: Rs.99 or Rs.199)
     - Returns {order_id, amount, currency, key_id}
   - POST /payments/featured/verify
     - Verifies razorpay_payment_id + razorpay_signature HMAC
     - On success: sets listing.is_featured=true
3. Add RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET to env vars
4. `backend/tests/test_payments.py` — mock Razorpay, test verification logic

### Frontend
1. `frontend/app/[city]/classifieds/[id]/promote/page.tsx`
   - "Promote this listing" option visible to listing owner
   - Price display: Rs.99/week or Rs.199/month
   - Razorpay checkout button (load Razorpay script, open checkout modal)
   - On success: show "Your listing is now featured!" confirmation
2. Featured listings appear at top of city grid with "Featured" amber badge
3. `frontend/lib/razorpay.ts` — typed Razorpay checkout helper

Verification: Test payment flow with Razorpay test keys → listing gets is_featured=true

## Week 12-13: Business Ad Banners + Analytics

### Ad Banners
1. City page header: one banner slot above the category chips
   - Banner stored as listing with category='advertisement' + is_featured=true
   - Admin assigns banners to cities in admin panel
2. `frontend/components/city-banner/` — responsive banner component (no layout shift)
3. Admin UI: assign banner to city, set start/end dates

### Business Analytics Dashboard
1. `backend/app/routers/analytics.py`
   - GET /analytics/business/{id} (owner only)
   - Returns: views (last 30 days), WhatsApp clicks, review count, rating trend
   - Track events: listing_view, whatsapp_click stored in simple analytics table
2. `backend/app/models/analytics.py` — AnalyticsEvent model (lightweight)
3. `frontend/app/[city]/businesses/dashboard/page.tsx`
   - Simple stats cards: Views / WhatsApp Taps / Reviews / Avg Rating
   - Last 30 days trend (simple line using recharts — lightweight)
   - No heavy charting libraries

Verification: Business owner can see their stats dashboard

## Week 13-14: Event Ticketing with QR

### Backend
1. `backend/app/routers/tickets.py`
   - POST /tickets/create-order — Razorpay order for paid event ticket
   - POST /tickets/verify — verify payment, create ticket record
   - GET /tickets/{id} — get ticket + QR data (owner only)
2. `backend/app/models/ticket.py` — Ticket model (event_id, user_id, amount, qr_code, used)
3. `pip install qrcode[pil]`
4. QR code contains: ticket UUID + event ID + user ID (signed with SECRET_KEY)

### Frontend
1. `frontend/app/[city]/events/[id]/page.tsx` — add "Buy Tickets" Razorpay button for paid events
2. `frontend/app/tickets/[id]/page.tsx`
   - Ticket display: event name, date, venue, seat (if any)
   - QR code rendered as image (base64 from backend)
   - "Add to Wallet" (future)
3. Admin: `frontend/app/admin/events/scan/page.tsx`
   - QR scanner (browser camera via jsQR npm)
   - Scans QR → verifies ticket → marks as used → shows green/red

Verification: Buy ticket flow → QR generated → admin scan marks as used

## Pricing Summary

```
Featured Listing:   Rs.99/week or Rs.199/month
Event Ticket:       Set by event organizer (Razorpay charges 2% + GST)
Business Ads:       Rs.999/month per city slot (manual invoicing Phase 3)
```

## Environment Variables to Add
```bash
RAZORPAY_KEY_ID=<from razorpay dashboard>
RAZORPAY_KEY_SECRET=<from razorpay dashboard>
NEXT_PUBLIC_RAZORPAY_KEY_ID=<same key id, safe for frontend>
```
