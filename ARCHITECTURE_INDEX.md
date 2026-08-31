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
| OTP phone verification (signup + forgot-password) | §11, §6-Auth | `routers/auth.py`, `services/msg91.py`, `services/recaptcha.py` (Google siteverify), `core/security.py` (setup_token, 10-min expiry) | `auth/login/page.tsx` + `lib/recaptcha.ts` (reCAPTCHA v3 widget), `mobile/src/screens/LoginScreen.tsx` + `mobile/src/lib/recaptcha.tsx` (same widget, run inside an invisible WebView) | `otp_requests`, `users` | POST /auth/otp/send (per-IP rate limited 3/min+6/hour, reCAPTCHA-gated — see 2026-08-25/31 PROJECT_MAP.md entries), POST /auth/otp/verify (returns `setup_token`, not full tokens), POST /auth/phone/check (15/min per IP) — **mobile reCAPTCHA needs a new EAS build + Play Store release to reach real devices; the currently-live build predates it** |
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
| Listing expiry lifecycle fix (2026-07-15) | §6-Listings, §12 | `routers/cron.py`, `services/notification_svc.py` | `MyListingsScreen.tsx` (category-aware "Sold"/"Filled"/"Closed" label), `NotificationBell.tsx` (icon map) | `listings.status`, `user_notifications` | GET /cron/expiry-reminders (extended) — Same class of bug as the featured-boost fix above: nothing ever flipped `listings.status` to `'expired'` once `expires_at` passed. The city browse endpoint (`GET /cities/{slug}/listings`) filters only on `status`, not `expires_at`, so expired listings stayed fully visible there indefinitely (only full-text search checked `expires_at` directly, masking the gap). Also, the pre-expiry reminder was email-only and required `User.email`, which phone+OTP signup never collects, so most owners never got any warning. Fixed: the daily cron now (1) flips past-due active listings to `status='expired'`, (2) sends an in-app notification (`listing_expired`) when it does, (3) sends the pre-expiry-soon in-app notification (`listing_expiring`) to every owner regardless of email, emailing additionally only if one is on file. Separately, "Mark as Sold" is now category-aware ("Filled" for pg-roommate/jobs, "Closed" for services/tiffin/businesses/events) since a roommate listing was never literally "sold". |
| Push notifications (2026-07-15, FCM wired up 2026-07-16) | §5 (`user_notifications`, `device_tokens`), §6-Notifications | `routers/notifications.py` (device-token endpoints), `services/push_svc.py` (Expo push send), `services/notification_svc.py` (`notify()` now pushes too) | `mobile/src/lib/pushNotifications.ts`, wired into `App.tsx` (on app-open if logged in), `LoginScreen.tsx` (`finish()` + name-step, both places tokens are set), `ProfileScreen.tsx` (unregister on logout + delete-account) | `device_tokens` (repurposed from a 2026-06-11 stub — see §5) | POST/DELETE /notifications/device-token — in-app bell notifications only surface when the app is open; this adds an actual OS push. **DONE 2026-07-16**: Firebase/FCM V1 fully wired — Admin SDK service-account key uploaded to Expo (expo.dev dashboard), plus `mobile/google-services.json` (gitignored) + `"googleServicesFile"` in `app.json` (the client-side piece the original plan missed — the app needs this to even generate a device token, separate from the server-side Expo→FCM delivery key). Verified end-to-end with real test notifications delivered to a device. **Needs a new EAS build to reach the Play Store build** — the currently-live Internal Testing build predates this fix. |
| Real proximity search + location-assisted posting (2026-07-16, commit `3e3aeed`; unified into one location flow 2026-07-26, commit `2bb1fd7`) | §6-Listings, §14 | `routers/listings.py` (`list_city_listings` — Haversine `distance_km` order, OR-matched multi-word search), `routers/search.py`, `services/search_svc.py` (same OR-match + distance fixes), `models/listing.py` (`latitude`/`longitude`, migration `f906010e814a`) | **Mobile location system, current shape (2026-07-26):** one screen (`MapPinPickerScreen.tsx`, "Confirm your location") is now the single entry point everywhere a lat/lng is needed — reached from `PostScreen.tsx`'s one location row and, separately, `CityAutoDetectPrompt.tsx` on first Home launch. It fetches GPS itself (`location.ts`'s `getApproxLocation()`) whenever it's opened without an already-known coordinate (`initialRegion` param), animates the map to the fix once resolved, and falls back to a static India-wide view (no crash, no hang) if GPS never resolves — e.g. no permission, or an emulator/device with no location provider. A draggable pin + tap-anywhere-on-map both call `handlePinMoved()`, which re-runs `Location.reverseGeocodeAsync()` on every move to live-refresh an editable "village/town/area" `TextInput` (never overwritten once the user types their own correction — tracked via `areaEditedRef`) and a `cityGuessRef` (used only for auto-picking the posting city on an exact name match, same non-forcing rule as before). Confirming returns `{latitude, longitude, areaGuess, cityGuess}` to the caller via the existing `onConfirm` nav-param callback pattern. `PostScreen.tsx` previously had a separate "Include my location" GPS-fetch toggle plus this map link as two different affordances; collapsed into one row ("Add your exact location" → "Location added — buyers nearby can find this ✕") since confirming the pin now covers both the auto and manual cases. **No separate one-time permission ask was added anywhere** — `navigation.replace('Main')` after signup already lands on `HomeScreen` (first tab, no `initialRouteName` override), which already mounts `CityAutoDetectPrompt` and fires it once (no saved city yet for a fresh signup); `Location.requestForegroundPermissionsAsync()` is OS-idempotent, so whatever the user answered there is silently reused by every later `getApproxLocation()` call — this is what makes the location system feel like "asked once, works everywhere" without any new permission-caching code. Design driven by Raj asking directly how Swiggy/OLX/Uber handle this: GPS only ever decides where the pin starts, never gates whether the user can proceed. | `listings.latitude`, `listings.longitude` (new, nullable) | GET /cities/{slug}/listings?lat=&lng=, GET /search?lat=&lng= — Haversine computed in plain SQL (no PostGIS/earthdistance extension available on Azure Postgres Flexible Server); unlocated listings always still appear (`ORDER BY distance ASC NULLS LAST`), never dropped. Also fixed a real search bug here: `plainto_tsquery` AND-matched every word, so one extra word (e.g. "dental service **near me**") could zero out an otherwise-exact match — switched to OR-combined per-word tsqueries ranked by `ts_rank`. Play Store Data Safety + `/privacy` both updated same-day for the new location collection. |
| Splash screen (2026-07-16, commit `fb804dd`; overhauled 2026-07-28) | §9 | — | Native OS splash (`app.config.js`'s `expo-splash-screen` plugin) was showing `splash-icon.png` — a 1024×1024 asset with a white card baked in — on an orange field, rendering as a stray floating white box; swapped to `assets/icon.png` (tightly-cropped logo, no card) on a white `backgroundColor`. `mobile/src/screens/SplashScreen.tsx` (shown during `checkAuth()`, wired into `App.tsx`) was originally an animated logo→letters→tagline sequence but that raced `checkAuth()` — a local-storage-only read that resolves in milliseconds for a logged-out user — so `App.tsx` swapped the splash out before the animation ever got a frame to render; simplified to a static logo+name+tagline render, no animation, no timing coordination needed. Also fixed: `LoginScreen.tsx`'s decorative `glowTR` background blob was sized/positioned to overlap the hero logo, reading as a dull shadow — shrunk and repositioned into the corner. Native splash portion needs a new EAS build to reach the Play Store; JS portions are live immediately | — | — |
| Home category grid + icon fixes (2026-07-17, commit `794434e`) | §9 | — | `mobile/src/screens/HomeScreen.tsx` — was hardcoded to `categories.slice(0, 8)` (only showed 8 of 14 categories); now shows all, each with a distinct icon/color (6 were missing and fell back to a generic price-tag icon on both Home and `PostScreen.tsx`'s category picker). Also fixed a `flexGrow` bug where an incomplete last grid row stretched to fill the width | — | — |
| Member-since profile stat (2026-07-17, commit `794434e` + fix in `001a55c`) | §6-Auth | `schemas/auth.py` (`UserOut.created_at` added) | `mobile/src/screens/ProfileScreen.tsx` — the "Member" stat was purely decorative (no data). First attempt (`794434e`) still didn't work live because the fresh `/auth/me` response was only used to update the listing count, never merged into the displayed `user` object (which came from a stale local cache); fixed (`001a55c`) by merging the response into state + persisting it back to storage, careful not to overwrite `avatar_url` (which `UserOut` doesn't include at all) | `users.created_at` (pre-existing column, just never exposed via the API) | GET /auth/me (now includes `created_at`) |
| Two-sided referral system (2026-07-18, commits `1f7243c` backend+web, `ce2ee31` mobile) | §6-Auth, §6-Admin, §8-Profile | `routers/auth.py` (`_generate_referral_code` — 8-char hex, retried on collision; `ref_code` captured on signup in `verify_otp`; lazily backfilled for pre-feature users in `get_me`), `routers/admin.py` (`approve_listing` — on the referee's FIRST admin-approved listing, marks both the new listing and the referrer's most-recent active listing `is_featured` for `REFERRAL_FEATURED_DAYS=3`, capped at `REFERRAL_REWARD_CAP=20` per referrer via a denormalized `referral_rewards_count`; wrapped in try/except so a reward failure never blocks the core approval), `models/user.py` (`referral_code`, `referred_by_user_id`, `referral_rewards_count`, migration `d3e4f5a6b7c8`) | Web: `components/referral-capture/ReferralCapture.tsx` (captures `?ref=` from any page into localStorage), `auth/login/page.tsx` (sends `ref_code` on signup only, not forgot-password), `invite/page.tsx` (fetches own code, builds share link, login-gated for guests). Mobile: `App.tsx` (`expo-linking` `getInitialURL`/`addEventListener('url')` captures `?ref=` cold+warm → `storage.setReferralRefCode`), `LoginScreen.tsx` (signup path only), `screens/InviteScreen.tsx` (new — own link + native `Share.share()`, reached via `ProfileScreen.tsx` → "Invite Friends"), `app.json` (Android `intentFilters`, `autoVerify: true`, for `https://[www.]localsindia.com`) | `users.referral_code`, `users.referred_by_user_id`, `users.referral_rewards_count` (all new) | POST /auth/otp/verify (now accepts optional `ref_code`, silently ignored if unknown/stale/self-sent), GET /auth/me (now returns `referral_code`) — Reward gated on a real admin-approved listing, not bare signup, so it resists fake-account farming. `assetlinks.json` now has the real Play Console App Signing SHA-256 (commit `3015c0a`, 2026-07-18) — Android App Links can verify once this deploys. **2026-07-28**: Play Console flagged one host failing verification — root-caused to the apex `localsindia.com` (no www) 301-redirecting `/.well-known/assetlinks.json` to `www.localsindia.com` instead of serving it directly; Android's verifier does not follow redirects for that file. Every real link the app generates already uses `www.localsindia.com` only, so the apex host in `intentFilters` was dead weight — removed it (commit `9dba00f`). **Remaining gap**: a new production/EAS build is still needed for both the original `intentFilters` addition and this fix to reach real users; the currently-live Play Store build predates both. |
| Public seller profile | §8-SellerProfile, §6-Users | `routers/users.py` | `seller/[id]/page.tsx` | `users`, `listings` | GET /users/{user_id}/public-profile |
| Bookmarks (saved listings) | §9-useSaved | — | `hooks/useSaved.ts`, `saved/page.tsx`, `listing-card/ListingCard.tsx` | — (localStorage) | — |
| Listing search filters | §6-Listings | `routers/listings.py` | `search/page.tsx` | `listings` | GET /cities/{slug}/listings?min_price=&max_price=&sort=&verified_only=&within= |
| Business directory (mobile parity added 2026-07-17) | §8-Businesses | `routers/businesses.py` | Web: `[city]/businesses/page.tsx`, `BusinessDetailClient.tsx`. Mobile (new): `mobile/src/screens/BusinessesScreen.tsx` (directory browse for the user's city), reached via a dedicated "Own a Business?" promo banner on `HomeScreen.tsx` (separate from the category grid — the existing "Businesses" category tile still goes to normal classifieds search, unchanged) | `businesses`, `reviews` | GET /businesses, POST /businesses |
| Business profile | §8-BusinessProfile | `routers/businesses.py` | `[city]/businesses/[id]/page.tsx`, `BusinessDetailClient.tsx` (web); `mobile/src/screens/BusinessDetailScreen.tsx` (mobile — existed since Phase 2 but was completely unreachable until the 2026-07-17 fix above; zero code anywhere linked to it) | `businesses`, `reviews` | GET /businesses/{id} |
| Claim business | §8-BusinessProfile | `routers/businesses.py` | `BusinessDetailClient.tsx` | `businesses` (owner_id) | POST /businesses/{id}/claim |
| Business reviews | §5-reviews | `routers/businesses.py` | `BusinessDetailClient.tsx` | `reviews` | POST /businesses/{id}/reviews |
| Business analytics dashboard (Phase 3, 2026-07-18; mobile parity 2026-07-28) | §6-Businesses, §12 | `routers/analytics.py` (owner/admin-only, aggregates 30-day totals + a daily views/whatsapp-click trend from `analytics_events`; no change for mobile parity — same endpoint, real 403 for non-owners), `routers/businesses.py` (`/view`, `/wa-click`), `models/analytics_event.py` (table, migration `e1a2b3c4d5f6`) | Web: `BusinessDetailClient.tsx` ("View Analytics" link, shown whenever `business.owner_id` is set — not strictly gated to the *current* user, relies on the backend 403 to actually enforce ownership), `[city]/businesses/[id]/dashboard/BusinessDashboardClient.tsx` (4 stat cards + plain CSS bar chart). Mobile (new): `mobile/src/screens/BusinessDashboardScreen.tsx` (same stat cards/bar chart/banner-ad promo, RN `View`-based bars instead of divs), entry point is an owner-only "View Analytics" button on `BusinessDetailScreen.tsx` gated on the screen's own real `isOwner` check (current user id === business.owner_id), stricter than web's owner_id-only check | `analytics_events` (business_id, event_type, created_at) | GET /analytics/business/{id} [AUTH, owner or admin only], POST /businesses/{id}/view, POST /businesses/{id}/wa-click |
| City banner ads (Phase 3, 2026-07-20) | §5-city_banners, §6-Cities, §12 | `models/city_banner.py` (new — `city_id`, `advertiser_name`, `image_url`, `link_url`, `start_date`, `end_date`), migration `b4c5d6e7f8a9`, `routers/cities.py` (`GET /cities/{slug}/banner` — public, returns the newest banner whose date range covers today, or `null`), `routers/admin.py` (`GET/POST /admin/banners`, `DELETE /admin/banners/{id}`) | `admin/banners/page.tsx` (new — city picker + advertiser/image/link fields + start/end date, list with Active/Scheduled/Expired status pill), `components/city-banner/CityBanner.tsx` (new — fetches the active banner for the current city, renders nothing if none; wired into `[city]/CityHomeClient.tsx` right below the hero) | `city_banners` (new) | GET /cities/{slug}/banner (public), GET/POST /admin/banners, DELETE /admin/banners/{id} [ADMIN] — last remaining piece of the original Phase 3 monetization plan (Rs.999–2,999/mo per city slot, admin-assigned/manually-invoiced, not self-serve Razorpay). Built as its own small table rather than "a listing with category=advertisement" (the original plan-doc sketch) — a banner has no price/WhatsApp/photos/moderation-queue semantics a classifieds listing carries, so overloading `listings` would have polluted search/reporting with non-classified rows for no benefit. Distinct from the pre-existing `AdBanner.tsx` (Google AdSense, `[city]/CityHomeClient.tsx` footer) — that's third-party programmatic ad inventory; this is a directly-sold, admin-controlled local sponsor slot. |
| Event ticketing (Phase 3, 2026-07-18) — web + mobile | §6-Events, §12 | `routers/tickets.py` (new — `/create-order`, `/verify` (HMAC, mirrors `payments.py`), `/my`, `/{id}`), `routers/admin.py` (`POST /admin/tickets/scan` — checks in a ticket by `qr_token`, 409 if already used, 404 if unknown), `models/ticket.py` (new table), `models/event.py` (`ticket_price`, nullable — an event can EITHER sell in-app tickets via `ticket_price` OR link externally via the pre-existing `ticket_url`), migration `f2b3c4d5e6a7` | Web (new): `events/[id]/EventDetailClient.tsx` (first-ever web event detail page — didn't exist before today), `tickets/[id]/TicketClient.tsx` + `tickets/page.tsx` (My Tickets list), `admin/events/scan/page.tsx` (camera QR scan via the browser's native `BarcodeDetector` API, manual-entry fallback — no new npm dependency). Mobile (new — Events didn't exist on mobile at all before today): `EventsScreen.tsx`, `EventDetailScreen.tsx`, `TicketScreen.tsx`, `MyTicketsScreen.tsx`, `AdminScanTicketsScreen.tsx` (manual token entry, not camera — see note below), `HomeScreen.tsx` (new "Events" promo banner, same pattern as the Business Directory promo) | `tickets` (new — event_id, user_id, amount, razorpay_order_id, razorpay_payment_id, qr_token unique, used_at, created_at), `events.ticket_price` (new, nullable) | POST /tickets/create-order, POST /tickets/verify, GET /tickets/my, GET /tickets/{id} [AUTH], POST /admin/tickets/scan [ADMIN] — QR image generated server-side (`qrcode[pil]`, base64 PNG in `TicketOut.qr_image`) specifically so mobile could display it via React Native's built-in `Image` component with **zero new native dependencies** — avoided `react-native-svg`/`expo-camera` deliberately since either would force a second native rebuild on top of the one already pending for referrals/push notifications; mobile ticket check-in is therefore manual-token-entry rather than camera-based, camera scanning is web-only for now. Mobile event **creation** (added later same day, `PostScreen.tsx`) extends the existing Post Listing wizard exactly like Businesses did — picking "Events" as the category shows Venue/Date-Time/Admission fields instead of Price, branches `submit()` to `eventsApi.create()`, and (unlike Businesses, which is live immediately) lands on the generic "submitted, under review" success screen since events go through the same moderation queue as listings. Needed a new native dependency, `@react-native-community/datetimepicker` — added anyway despite the "avoid forcing a new native rebuild" rule used elsewhere in this feature, since a rebuild was *already* unavoidable this cycle (referrals/push/ticketing all need one), so this one rides along at no extra cost. |
| Post a business (mobile, 2026-07-17) | §8-Businesses | `routers/businesses.py` (no backend change — already fully supported) | `mobile/src/screens/PostScreen.tsx` — picking "Businesses" as the category in the *same* Post Listing wizard branches `submit()` to `businessesApi.create()` instead of a classified; Price field hidden, "Area/Locality" relabels to "Address", Photos step shows an explanatory note (Business has no photo storage yet), lands on the new business's own detail page (no approval queue, live immediately) | `businesses` | POST /businesses — deliberately NOT a separate screen; an earlier attempt built one (`PostBusinessScreen`) and was reverted per explicit feedback not to add a new path when the existing wizard could be extended instead |
| Post an event (mobile, 2026-07-18) | §6-Events, §8-Events | `routers/events.py` (no backend change — already fully supported) | `mobile/src/screens/PostScreen.tsx` — same wizard-extension pattern as Businesses: picking "Events" swaps Price/Area for Venue + Date&Time (native picker) + Free/Paid Admission (+ in-app ticket price or external URL if paid); Photos step shows a note (Events has no photo storage); lands on the generic "under review" success screen, not the event's own page, since events are moderated like listings (unlike Businesses); `EventsScreen.tsx` gained a "Post an Event" button reaching it via `presetCategory` | `events` | POST /events — new native dependency `@react-native-community/datetimepicker` added (a deliberate exception since a native rebuild is already unavoidable this cycle for other reasons) |
| Events calendar | §8-Events | `routers/events.py` | `[city]/events/page.tsx` | `events` | GET /events?city_slug= |
| Post event | §8-PostEvent | `routers/events.py` | `[city]/events/post/page.tsx` | `events` | POST /events |
| Admin moderation (listings) | §8-AdminListings, §6-Admin | `routers/admin.py` | `admin/listings/page.tsx` | `listings` | GET /admin/listings/pending, PATCH /admin/listings/{id}/approve |
| Admin moderation (events) | §8-AdminEvents, §6-Admin | `routers/admin.py` | `admin/events/page.tsx` | `events` | GET /admin/events/pending, PATCH /admin/events/{id}/approve |
| Admin user management | §6-Admin | `routers/admin.py` | `admin/users/page.tsx` | `users` | GET /admin/users |
| Admin abuse reports | §6-Admin | `routers/admin.py` | `admin/reports/page.tsx` | `reports` | GET /admin/reports |
| City selection | §9-CityPicker | `routers/cities.py` | `components/city-picker/CityPickerModal.tsx` | `cities` | GET /cities, GET /cities/{slug} |
| **Scoped to South India only (2026-07-18, migration `a3b4c5d6e7f8`)** — Raj's business decision, reversible data-only change | n/a — no code change | n/a | n/a | `cities.active` — 151 cities across Telangana/Andhra Pradesh/Karnataka/Tamil Nadu/Kerala/Puducherry stay `active=true`; the other ~345 across 28 states/UTs flipped to `active=false` | Every city-touching endpoint already gated on `City.active` (listings, search, businesses, events, buyer-requests, chat, city picker, sitemap) — confirmed by grep before running, not assumed. Both web and mobile automatically reflect this since both consume the same `/api/v1/cities`-family endpoints; zero frontend/mobile code changes needed. Fully reversible via the migration's `downgrade()`. |
| Category browse | §5-categories | `routers/categories.py` | `[city]/[category]/page.tsx` | `categories` | GET /categories |
| 11-language i18n | §15 | `i18n/request.ts` | `messages/*.json`, `components/language-selector/` | — | — (client-side only) |
| PWA / offline | §9-ServiceWorker | — | `components/pwa/ServiceWorker.tsx`, `app/offline/page.tsx` | — | — |
| Hybrid SSR (Azure SWA) | §7, §16 | — | `next.config.mjs`, `staticwebapp.config.json`, `lib/static-params.ts` | — | — |
| Auto-deploy CI/CD + PR staging | §16 | `.github/workflows/backend-azure.yml` | `.github/workflows/frontend-azure.yml` | — | — |
| City seeding | §18-Scripts | `scripts/seed_cities.py`, `scripts/seed_categories.py` | — | `cities`, `categories` | — |
| Admin role management | §6-Admin | `routers/admin.py` | `admin/users/page.tsx`, mobile `AdminScreen.tsx` | `users` | PATCH /admin/users/{id}/role |
| Seed placeholder images | §6-Admin | `routers/admin.py` | `admin/listings/page.tsx` (button) | `listing_images` | POST /admin/seed-placeholder-images |
| Business soft-delete | §6-Businesses | `routers/businesses.py` | — | `businesses` | DELETE /businesses/{id} |
| Google Sign-In (backend route, currently unreachable from either app's UI) | §11 | `routers/auth.py` | none currently — `mobile/src/screens/LoginScreen.tsx` had Google removed in an earlier pass (pre-2026-07-18, confirmed via grep: zero Google references anywhere in `mobile/src/`), and web's button is now flag-gated off (2026-07-18, `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` secret flipped to `false` — a real user still has a Google-only account with no phone on file, so the backend route is deliberately kept, not deleted, in case it needs to be flipped back on) | `users` | GET /auth/google?mobile=1, GET /auth/google/callback — both routes still live server-side, reachable only by direct URL, not linked from either app's current UI |
| Global listing/category/post redirects | §8 | — | `app/listing/[id]/`, `app/category/[slug]/page.tsx`, `app/post/page.tsx` | — | — |
| Global error boundary | §8-ErrorBoundary | — | `app/error.tsx` | — | — |
| Mobile admin panel | §18-Mobile | `routers/admin.py` | `mobile/src/screens/AdminScreen.tsx` | `listings`, `users` | (same as web admin) |
| EAS Play Store build pipeline | §18-Mobile | — | `mobile/eas.json`, `mobile/app.json` | — | — |
| AI chatbot assistant | §6-Chat | `routers/chat.py`, `core/limiter.py` | `components/chat-widget/ChatWidget.tsx`, `mobile/src/screens/ChatScreen.tsx` | — | POST /chat |
| Listing view tracking | §6-Listings | `routers/listings.py` | `listing/[id]/ListingDetailClient.tsx` | `listings` (view_count) | POST /listings/{id}/view |
| Saved searches / alerts (mobile parity + save-trigger added 2026-07-28) | §6-SavedSearches | `routers/saved_searches.py` (no backend change — create/list/delete already existed) | Web: `[city]/search/page.tsx` ("Save search" button, new — the backend + the `/profile/saved-searches` list/run/delete page already existed but nothing on either platform could actually create one, so the whole feature was inert until today), `profile/page.tsx` (menu entry, pre-existing), `profile/saved-searches/page.tsx` (list/run/delete, pre-existing). Mobile (new): `mobile/src/screens/SearchScreen.tsx` ("Save search" chip, same trigger condition as web — query or category set), `mobile/src/screens/SavedSearchesScreen.tsx` (new — list/run/delete, mirrors the web page), `ProfileScreen.tsx` (menu entry) | `saved_searches` | POST /api/v1/saved-searches, GET /api/v1/saved-searches, DELETE /api/v1/saved-searches/{id} |
| Alerts & Preferences (web parity added 2026-07-28) | §6-Preferences (not yet in ARCHITECTURE.md) | `routers/preferences.py` (no backend change — GET/POST already existed, previously only ever called once by the onboarding quiz gate) | Web (new): `profile/alerts/page.tsx` — persistent settings page (interest chips + daily/weekly/never alert frequency), reached via `profile/page.tsx` menu entry; previously web could only set interests once via `OnboardingQuiz.tsx`'s one-time gate, with no way to revisit them or ever set `alert_frequency` at all (always defaulted to `'never'`). Mobile: `mobile/src/screens/AlertsPrefsScreen.tsx` (pre-existing, unchanged — reference implementation this page mirrors) | `user_preferences` | GET /api/v1/preferences, POST /api/v1/preferences |
| Buyer requests ("Wanted") — mobile parity + moderation + contact field (2026-07-27) | §5-buyer_requests (not yet in ARCHITECTURE.md) | `routers/buyer_requests.py` (`POST /{id}/report` — 3 reports auto-flags, mirrors the listing-report pattern BL-04), `routers/admin.py` (`GET /admin/buyer-requests`, `PATCH /admin/buyer-requests/{id}/restore`), `models/buyer_request_report.py` (new), `buyer_requests.report_count` + `'flagged'` status (new) | Web: `components/buyer-requests/BuyerRequestsSection.tsx` (rendered on `[city]/CityHomeClient.tsx`; gained an explicit editable "Contact number" field on the post form — was previously silently pulled from the account phone and never shown), `admin/buyer-requests/page.tsx` (new — review queue, mirrors `admin/reports/page.tsx`). Mobile (new — feature didn't exist on mobile at all before this): `mobile/src/components/BuyerRequestsSection.tsx` (Home card, placed after the category grid; fulfill/delete for the poster's own requests — these backend endpoints existed but neither platform's UI ever called them until now), same explicit "Contact number" field on the post form | `buyer_requests` (`report_count`, `'flagged'` status added), `buyer_request_reports` (new) | GET /api/v1/buyer-requests/cities/{slug}, POST /api/v1/buyer-requests, POST /api/v1/buyer-requests/{id}/report, PATCH /api/v1/buyer-requests/{id}/fulfill, DELETE /api/v1/buyer-requests/{id}, GET/PATCH /api/v1/admin/buyer-requests[/{id}/restore] [ADMIN] |
| Category-specific structured listing fields (2026-07-21) | §5-listing_details (not yet in ARCHITECTURE.md), §6-Listings, §8-PostListing | `models/listing_details.py` (11 new 1:1 detail tables, `DETAILS_BY_CATEGORY_SLUG` lookup), migration `d3c3f83522ec`, `schemas/listing.py` (11 `*DetailsIn` schemas + `DETAILS_SCHEMA_BY_CATEGORY_SLUG`, `category_details` field on `ListingCreate`/`ListingOut`), `routers/listings.py` (`_save_category_details()`/`_load_category_details()`, wired into create/get/mine — deliberately NOT wired into the bulk city-listing/trending endpoints, to avoid N+1 queries on hot grid views) | Post wizard restructured on both platforms: category picker is now its own first step, followed by a dedicated category-specific-questions step (skipped automatically for Classifieds/Businesses/Events, which have none), then the generic Title/Description step — `mobile/src/screens/PostScreen.tsx` (`CATEGORY_DETAIL_FIELDS`, dynamic `STEPS`/step-index constants based on whether the picked category has fields), `frontend/src/app/[city]/classifieds/post/page.tsx` (same field-set and step split; replaced the old `CATEGORY_CHIPS`/`attributes` system, which the backend silently dropped — `ListingCreate` never declared an `attributes` field) | `vehicle_details`, `job_details`, `pg_roommate_details`, `real_estate_details`, `electronics_details`, `furniture_details`, `fashion_details`, `education_details`, `doctor_details`, `service_details`, `tiffin_details` (all new) | POST /listings (now accepts `category_details`), GET /listings/{id} (now returns it), GET /listings/mine (now returns it per listing) — real typed columns per category rather than a flexible JSON blob, a deliberate choice for future Search filterability |
| Category-aware Listing-step copy (2026-07-21) | §8-PostListing | — (frontend/mobile only) | `mobile/src/screens/PostScreen.tsx` (`LISTING_COPY`), `frontend/src/app/[city]/classifieds/post/page.tsx` (same) — the generic Title/Description/Price step now shows contextual copy per category (e.g. PG/Roommate → "Monthly Rent", Education → "Course Fee") instead of one-size-fits-all "What are you selling?"; Jobs/Doctors/Businesses hide the generic price field entirely since their category-specific questions (salary, consultation fee) already cover it | — | — |
| Photo upload for Businesses and Events (2026-07-22) | §5-business_images/event_images (not yet in ARCHITECTURE.md), §6-Uploads, §8-PostListing | `models/business_image.py`, `models/event_image.py` (new — 1:1 extension pattern, same shape as `listing_images`), migration `bc6a44aafa08`, `routers/uploads.py` (`POST/DELETE /upload/business-image/{id}`, `POST/DELETE /upload/event-image/{id}`, shared `_validate_and_upload()` helper), `schemas/business.py`/`schemas/event.py` (`images` list, auto-loaded via `lazy="selectin"` relationships — no router query changes needed) | Post wizard's Photos step now shows the real upload zone for Businesses/Events instead of a "coming soon" placeholder — `mobile/src/screens/PostScreen.tsx` (`uploadPhoto()` generalized to take an endpoint segment), `frontend/src/app/[city]/businesses/add/page.tsx` + `frontend/src/app/[city]/events/post/page.tsx` (new photo picker UI, mirrors classifieds/post). Detail pages display a cover photo + thumbnail strip: `mobile/src/screens/BusinessDetailScreen.tsx`, `mobile/src/screens/EventDetailScreen.tsx`, `frontend/.../BusinessDetailClient.tsx`, `frontend/src/app/events/[id]/EventDetailClient.tsx` | `business_images`, `event_images` (both new) | POST/DELETE /upload/business-image/{business_id\|image_id}, POST/DELETE /upload/event-image/{event_id\|image_id} — same 5MB/5-image limits as listings (BL-08); 143/143 backend tests passing (5 new) |
| Homepage restructure — "why LocalsIndia" first (2026-07-22) | §8-Homepage | — (frontend only) | `frontend/src/app/page.tsx` — replaced the generic hero→category-grid→trust-badges template with hero → explicit "Why LocalsIndia" differentiators (`buildWhyUs()`) → "A Day in Your City" (`DAY_SECTIONS`, same 8 categories grouped by time-of-day instead of a flat grid) → Fresh Listings (unchanged) → single closing CTA (replaces the old 4-card trust-badges grid). Driven by user feedback that the old structure was "the same template shape every marketplace site uses"; no fabricated stats/activity introduced, all real-time claims stay derived live from `usePrefs()`/`LANGUAGES` | — | — |

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
| `models/user.py` | `users` | Registered users; phone/email/name/role/lang_pref/soft-delete; referral_code/referred_by_user_id/referral_rewards_count (2026-07-18) |
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
| `models/analytics_event.py` | `analytics_events` | One row per business view/whatsapp-click event (2026-07-18); aggregated into the owner's analytics dashboard |
| `models/ticket.py` | `tickets` | Paid event ticket (2026-07-18); created only after Razorpay verify, holds a unique `qr_token` scanned at check-in |
| `models/city_banner.py` | `city_banners` | Admin-managed sponsor banner per city with a date range (2026-07-20); deliberately its own table, not a `listings` row |
| `models/listing_details.py` | `vehicle_details`, `job_details`, `pg_roommate_details`, `real_estate_details`, `electronics_details`, `furniture_details`, `fashion_details`, `education_details`, `doctor_details`, `service_details`, `tiffin_details` | 11 tables (2026-07-21), each a 1:1 extension of `listings` (unique `listing_id` FK, `ondelete=CASCADE`) holding real typed columns per category — not a flexible JSON blob, so Search can filter/sort on them later. `DETAILS_BY_CATEGORY_SLUG` maps category slug → model. Classifieds/Businesses/Events excluded (no specific fields / have their own dedicated tables already) |
| `models/business_image.py` | `business_images` | 1:1 extension of `businesses` (2026-07-22), same shape as `listing_images`; `Business.images` relationship (`lazy="selectin"`) auto-loads it on any query |
| `models/event_image.py` | `event_images` | 1:1 extension of `events` (2026-07-22), same shape as `listing_images`; `Event.images` relationship (`lazy="selectin"`) auto-loads it on any query |

### Backend — Routers (API endpoints)

| File | Prefix | What it handles |
|------|--------|----------------|
| `routers/auth.py` | `/api/v1/auth` | OTP login, Google OAuth, JWT refresh, profile update |
| `routers/cities.py` | `/api/v1/cities` | List cities, get by slug, get active sponsor banner for city (2026-07-20) |
| `routers/categories.py` | `/api/v1/categories` | List all categories |
| `routers/listings.py` | `/api/v1` | Full listing CRUD + report + renew + fulfill + reviews |
| `routers/uploads.py` | `/api/v1/upload` | Cloudinary image upload/delete |
| `routers/search.py` | `/api/v1/search` | PostgreSQL full-text search |
| `routers/businesses.py` | `/api/v1` | Business directory CRUD + claim + reviews |
| `routers/events.py` | `/api/v1` | Events calendar CRUD |
| `routers/admin.py` | `/api/v1/admin` | Moderation queues, approve/reject, user management, city banner CRUD (2026-07-20) |
| `routers/payments.py` | `/api/v1/payments` | Razorpay featured listing orders + verification |
| `routers/users.py` | `/api/v1/users` | Public seller profiles (name, member since, active listings) |
| `routers/chat.py` | `/api/v1/chat` | AI chatbot (Gemini 2.0 Flash); rate-limited 5/min + 20/hr per IP; needs GOOGLE_AI_KEY |
| `routers/saved_searches.py` | `/api/v1/saved-searches` | Save/list search alerts for a user |
| `routers/buyer_requests.py` | `/api/v1/buyer-requests` | "Wanted" post CRUD — list by city, create, fulfill, soft-delete |
| `routers/analytics.py` | `/api/v1/analytics` | Business owner analytics dashboard data (2026-07-18) — owner/admin-only |
| `routers/tickets.py` | `/api/v1/tickets` | Event ticket purchase (Razorpay create-order/verify), owner ticket lookup, "my tickets" list (2026-07-18) |

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
| `app/[city]/businesses/[id]/dashboard/page.tsx` | `/[city]/businesses/[id]/dashboard` | (new, 2026-07-18) Owner-only analytics: 30-day views/WhatsApp-taps/reviews/avg-rating stat cards + a daily views bar chart (plain CSS, no charting library) |
| `app/[city]/events/page.tsx` | `/[city]/events` | Events calendar with filters |
| `app/[city]/events/post/page.tsx` | `/[city]/events/post` | Post event form — gained an optional "Sell tickets in-app (₹)" `ticket_price` field alongside the pre-existing external `ticket_url` field (2026-07-18); the two are mutually exclusive, price takes priority if both are somehow set |
| `app/events/[id]/page.tsx` | `/events/[id]` | (new, 2026-07-18) Event detail — first time this route existed; the events list page always linked here but it 404'd before today. Free info banner, in-app "Buy Ticket" (Razorpay) if `ticket_price` set, else external "Get Tickets" link if `ticket_url` set |
| `app/tickets/page.tsx` | `/tickets` | (new, 2026-07-18) "My Tickets" list |
| `app/tickets/[id]/page.tsx` | `/tickets/[id]` | (new, 2026-07-18) Ticket display — event info + QR code image (`ticket.qr_image`, generated server-side, not client-side — see §12) |
| `app/admin/events/scan/page.tsx` | `/admin/events/scan` | (new, 2026-07-18) Ticket check-in — camera scan via the browser's native `BarcodeDetector` API where supported, manual token-entry fallback everywhere else; no new npm dependency |
| `app/[city]/launch/page.tsx` | `/[city]/launch` | City launch celebration page |
| `app/auth/login/page.tsx` | `/auth/login` | Phone OTP + Google OAuth login (Suspense-wrapped) |
| `app/auth/callback/page.tsx` | `/auth/callback` | Google OAuth redirect handler (Suspense-wrapped) |
| `app/profile/page.tsx` | `/profile` | User settings: name, language, city; Delete account button (2026-07-14); "My Tickets" menu entry added (2026-07-18) |
| `app/account-deletion/page.tsx` | `/account-deletion` | Public page (no login required) explaining how to delete your account — in-app self-serve + email fallback for users without app access. Required by Google Play's account-deletion policy (2026-07-14) |
| `app/profile/listings/page.tsx` | `/profile/listings` | My listings: manage, renew, fulfill, promote |
| `app/profile/saved-searches/page.tsx` | `/profile/saved-searches` | List/run/delete saved searches — real content only since 2026-07-28, once a "Save search" trigger finally existed on `[city]/search/page.tsx` |
| `app/profile/alerts/page.tsx` | `/profile/alerts` | (new, 2026-07-28) Persistent Alerts & Preferences settings — interest chips + daily/weekly/never alert frequency; previously only settable once via the onboarding quiz gate, mirrors `mobile/src/screens/AlertsPrefsScreen.tsx` |
| `app/profile/listings/[id]/page.tsx` | `/profile/listings/[id]` | Static export segment stub |
| `app/profile/listings/[id]/edit/page.tsx` | `/profile/listings/[id]/edit` | Edit listing (owner view) |
| `app/admin/login/page.tsx` | `/admin/login` | Admin username+password login |
| `app/admin/layout.tsx` | `/admin/*` | Admin sidebar nav with badge counts |
| `app/admin/listings/page.tsx` | `/admin/listings` | Listing moderation queue: approve/reject |
| `app/admin/events/page.tsx` | `/admin/events` | Event moderation queue |
| `app/admin/users/page.tsx` | `/admin/users` | User list + role management |
| `app/admin/reports/page.tsx` | `/admin/reports` | Abuse reports for flagged listings |
| `app/admin/buyer-requests/page.tsx` | `/admin/buyer-requests` | (2026-07-27) Buyer-request moderation queue — mirrors `admin/reports/page.tsx`; review/restore flagged "Wanted" posts |
| `app/admin/banners/page.tsx` | `/admin/banners` | (new, 2026-07-20) City banner ads: create form (city picker + advertiser/image/link + date range), list with Active/Scheduled/Expired status pill, remove |
| `app/privacy/page.tsx` | `/privacy` | Privacy policy (static) |
| `app/terms/page.tsx` | `/terms` | Terms of service (static) |
| `app/offline/page.tsx` | `/offline` | PWA offline fallback |
| `app/invite/page.tsx` | `/invite` | Invite friends page — fetches own `referral_code` via `getMe()`, builds a real `?ref=` share link; guests without a token see a login-gate card instead of the share section (2026-07-18) |
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
| `components/city-banner/CityBanner.tsx` | (new, 2026-07-20) Fetches the current city's active sponsor banner, renders nothing if none; distinct from `AdBanner.tsx` (Google AdSense) below |
| `components/language-switcher/LanguageSwitcher.tsx` | Language toggle button |
| `components/whatsapp-button/WhatsAppButton.tsx` | Green #25D366 button opening wa.me link |
| `components/whatsapp-badge/WhatsAppBadge.tsx` | Small WhatsApp indicator badge |
| `components/bottom-nav/BottomNav.tsx` | Mobile-only 5-tab bottom nav |
| `components/empty-state/EmptyState.tsx` | "No results" state: icon + title + description + optional CTA |
| `components/ad-banner/AdBanner.tsx` | City page ad banner slot (Phase 3 monetization) |
| `components/fresh-listings/FreshListingsSection.tsx` | Homepage latest listings carousel |
| `components/pwa/ServiceWorker.tsx` | Registers PWA service worker for offline support |
| `components/buyer-requests/BuyerRequestsSection.tsx` | "Wanted" horizontal row on city home + post-request modal (category, description, budget) — WhatsApp-contact CTA per request |
| `components/referral-capture/ReferralCapture.tsx` | Invisible client component mounted in root `layout.tsx` — reads `?ref=` from the URL on any page and persists it to `localStorage` for the signup flow to pick up later (2026-07-18) |

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
                                          Accepts optional {ref_code} (2026-07-18) — only applied for new signups;
                                          unknown/stale codes and codes sent by existing users are silently ignored
POST   /api/v1/auth/password/set          {setup_token, password} -> AuthResponse (full tokens)
                                          Serves BOTH signup (create password) and forgot-password (reset) — same action
POST   /api/v1/auth/login                 {phone, password} -> AuthResponse. Replaces the old passwordless /auth/signin
                                          (which let anyone log in as any known phone number with zero verification)
                                          404 = no account, 409 = account has no password yet, 401 = wrong password
POST   /api/v1/auth/admin-login           Admin username+password login (unrelated to user password_hash)
POST   /api/v1/auth/refresh               Exchange refresh token for new access token
DELETE /api/v1/auth/logout                Client-side only (stateless)
GET    /api/v1/auth/me                    Get current user [AUTH] — now includes referral_code, lazily
                                          generating + persisting one if the user predates this feature (2026-07-18)
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
GET    /api/v1/cities/{slug}/banner       Active sponsor banner for city (null if none)
GET    /api/v1/categories                 All parent categories
```

### Listings
```
GET    /api/v1/cities/{slug}/listings     City listings (filter: category, status, page)
POST   /api/v1/listings                   Create listing -> status='pending' [AUTH]; body may include
                                           category_details (2026-07-21), validated against
                                           DETAILS_SCHEMA_BY_CATEGORY_SLUG and persisted to the
                                           matching *_details table — Classifieds/Businesses/Events ignore it
GET    /api/v1/listings/mine              My listings [AUTH]; includes category_details per listing
GET    /api/v1/listings/{id}              Listing detail; includes category_details if the category has any
PATCH  /api/v1/listings/{id}              Update listing [AUTH, owner]
DELETE /api/v1/listings/{id}              Soft-delete [AUTH, owner/admin]
POST   /api/v1/listings/{id}/report       Report listing [AUTH]
POST   /api/v1/listings/{id}/renew        Extend 30 days [AUTH, owner]
POST   /api/v1/listings/{id}/wa-click     Track WhatsApp click
GET    /api/v1/listings/{id}/reviews      Get reviews
POST   /api/v1/listings/{id}/reviews      Submit review [AUTH]
POST   /api/v1/listings/{id}/fulfill      Mark as sold [AUTH, owner]
```
Note: `GET /cities/{slug}/listings` and the trending endpoint do NOT load `category_details` — deliberately, to avoid N+1 queries on hot grid views.

### Search
```
GET    /api/v1/search?q=&city_slug=       Full-text search (tsvector + ILIKE fallback)
```

### Uploads
```
POST   /api/v1/upload/image/{listing_id}           Upload photo to Cloudinary [AUTH]
DELETE /api/v1/upload/image/{image_id}             Delete photo from Cloudinary [AUTH]
POST   /api/v1/upload/business-image/{business_id} Upload business photo (2026-07-22) [AUTH, owner/admin]
DELETE /api/v1/upload/business-image/{image_id}    Delete business photo [AUTH, owner/admin]
POST   /api/v1/upload/event-image/{event_id}       Upload event photo (2026-07-22) [AUTH, owner/admin]
DELETE /api/v1/upload/event-image/{image_id}       Delete event photo [AUTH, owner/admin]
```
Same 5MB size / 5-image count limits everywhere (BL-08), shared via `_validate_and_upload()` in `routers/uploads.py`.

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
GET    /api/v1/admin/banners             All city banners
POST   /api/v1/admin/banners             Create banner (city_id, advertiser_name, image_url, link_url, start_date, end_date)
DELETE /api/v1/admin/banners/{id}        Remove banner
GET    /api/v1/admin/buyer-requests      Flagged buyer requests + their reports (2026-07-27)
PATCH  /api/v1/admin/buyer-requests/{id}/restore  Un-flag -> status='open' (2026-07-27)
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
POST   /api/v1/saved-searches             Save a search alert [AUTH] — 409 if an identical search is already saved
GET    /api/v1/saved-searches             List user's saved searches, newest first [AUTH]
DELETE /api/v1/saved-searches/{id}        Remove a saved search [AUTH, owner only]
                                          "Save search" trigger added to both `[city]/search/page.tsx` (web) and
                                          `SearchScreen.tsx` (mobile) 2026-07-28 — previously no UI on either
                                          platform ever called POST, so the feature was inert
```

### Preferences (interests + alert frequency)
```
GET    /api/v1/preferences                Current user's interests/alert_frequency/onboarding_done [AUTH]
POST   /api/v1/preferences                Upsert preferences [AUTH]
                                          Web: /profile/alerts (persistent, new 2026-07-28) + OnboardingQuiz.tsx
                                          (one-time gate, pre-existing, never sets alert_frequency)
                                          Mobile: AlertsPrefsScreen.tsx (persistent, pre-existing)
```

### Buyer Requests ("Wanted")
```
GET    /api/v1/buyer-requests/cities/{slug}    List open (non-flagged) requests for a city (newest first, limit 20)
POST   /api/v1/buyer-requests                  Create request -> status='open' [AUTH]
POST   /api/v1/buyer-requests/{id}/report      Report [AUTH] — 3 reports -> status='flagged', hidden from public feed (mirrors BL-04)
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
| `users` | id, phone, email, password_hash, name, role, city_id, lang_pref, is_active, deleted_at, referral_code, referred_by_user_id, referral_rewards_count | Soft-delete; PDPB. `password_hash` nullable (migration `a7b8c9d0e1f2`, 2026-07-12) — null means the user has never set a password (pre-migration or Google-only account). `referral_code` (unique, indexed), `referred_by_user_id` (FK→users, SET NULL on delete), `referral_rewards_count` (denormalized counter, default 0) added migration `d3e4f5a6b7c8` (2026-07-18) |
| `cities` | id, name, state, slug, lang_default, active | slug = URL segment |
| `categories` | id, name, slug, icon, parent_id, sort_order | Self-join for sub-cats |
| `listings` | id, user_id, city_id, category_id, title, description, price, contact_phone, whatsapp_url, status, is_featured, featured_at, featured_until, report_count, expires_at, view_count, contact_click_count, last_renewed_at, search_vector, latitude, longitude, deleted_at | Core product; tsvector search; view/click counters added migration `f6a7b8c9d0e1`; `featured_until` added migration `c5d6e7f8a9b0` (2026-07-15) — dedicated featured-boost expiry, decoupled from the listing's own `expires_at` lifecycle field; `latitude`/`longitude` (both nullable `Numeric(9,6)`) added migration `f906010e814a` (2026-07-16) — optional, captured only if the seller grants location permission when posting, drives Haversine distance ordering on `GET /cities/{slug}/listings` and `GET /search` |
| `listing_images` | id, listing_id, url, cloudinary_id, display_order | Max 5; Cloudinary CDN |
| `listing_reviews` | id, listing_id, user_id, rating, body | Unique(listing_id, user_id) |
| `businesses` | id, city_id, owner_id, name, address, phone, whatsapp_url, verified, avg_rating, review_count, deleted_at | avg_rating recalculated on review |
| `reviews` | id, business_id, user_id, rating, body | Unique(business_id, user_id) |
| `events` | id, city_id, user_id, title, venue, event_date, is_free, ticket_url, ticket_price, status, deleted_at | status: pending/active/cancelled/completed. `ticket_price` (nullable, added migration `f2b3c4d5e6a7`, 2026-07-18) — if set, event sells tickets in-app instead of linking to `ticket_url` |
| `reports` | id, listing_id, user_id, reason, notes | Unique(listing_id, user_id); 3 = auto-flag |
| `otp_requests` | id, phone, otp_hash, attempts, verified, expires_at | bcrypt hash; 3-attempt max; 10-min expiry |
| `saved_searches` | id, user_id, city_slug, query_text, category_slug, created_at | Search alerts; migration `f6a7b8c9d0e1`. UI on both platforms only since 2026-07-28 — table existed and was queryable long before either app could write to it |
| `user_preferences` | id, user_id, interests (text array), budget_min, budget_max, city_prefs, timeline, alert_frequency, push_enabled, onboarding_done | Not previously in this index. Drives the interests-based feed + alert cadence; `alert_frequency` defaults `'never'` and was only ever settable once (onboarding quiz) until the web `/profile/alerts` settings page shipped 2026-07-28 |
| `buyer_requests` | id, city_id, user_id, category_id, description, budget, contact_phone, status, report_count, deleted_at, created_at | "Wanted" posts; status open/fulfilled/flagged; migration `f1a2b3c4d5e6` (2026-07-12); `report_count` + `'flagged'` status added 2026-07-27 (moderation) |
| `buyer_request_reports` | id, buyer_request_id, user_id, reason, created_at | Not previously in this index. Unique(buyer_request_id, user_id); 3 = auto-flag, same BL-04 pattern as `reports` |
| `analytics_events` | id, business_id, event_type, created_at | One row per view/whatsapp_click event; migration `e1a2b3c4d5f6` (2026-07-18); aggregated (not queried raw) by `GET /analytics/business/{id}` |
| `tickets` | id, event_id, user_id, amount, razorpay_order_id, razorpay_payment_id, qr_token (unique), used_at, created_at | Migration `f2b3c4d5e6a7` (2026-07-18); created only after Razorpay signature verification, never at order-creation time |
| `app_error_logs` | id, platform, message, stack, context, app_version, created_at | No user_id (reports must work pre-login/no-auth); platform in ('mobile','web'); migration `b3c4d5e6f7a8` (2026-07-14) |
| `city_banners` | id, city_id, advertiser_name, image_url, link_url, start_date, end_date, created_at | Admin-managed sponsor slot per city, one active banner shown per city homepage; migration `b4c5d6e7f8a9` (2026-07-20); no listing/moderation semantics — intentionally its own table, not `listings` with `category='advertisement'` |
| `vehicle_details` | id, listing_id (unique FK), brand, model, year, km_driven, fuel_type, transmission, owners_count, created_at | 1:1 with `listings` where category='vehicles'; migration `d3c3f83522ec` (2026-07-21) |
| `job_details` | id, listing_id (unique FK), company_name, salary_min, salary_max, job_type, experience_required, work_mode, created_at | category='jobs'; migration `d3c3f83522ec` |
| `pg_roommate_details` | id, listing_id (unique FK), room_type, gender_preference, deposit_amount, amenities (text array), created_at | category='pg-roommate'; migration `d3c3f83522ec` |
| `real_estate_details` | id, listing_id (unique FK), property_type, bhk, sqft, furnishing, listing_type, created_at | category='real-estate'; migration `d3c3f83522ec` |
| `electronics_details` | id, listing_id (unique FK), brand, model, condition, warranty_remaining, created_at | category='electronics'; migration `d3c3f83522ec` |
| `furniture_details` | id, listing_id (unique FK), material, dimensions, condition, created_at | category='furniture'; migration `d3c3f83522ec` |
| `fashion_details` | id, listing_id (unique FK), brand, size, gender, created_at | category='fashion'; migration `d3c3f83522ec` |
| `education_details` | id, listing_id (unique FK), course_type, mode, duration, created_at | category='education'; migration `d3c3f83522ec` |
| `doctor_details` | id, listing_id (unique FK), specialization, consultation_fee, available_timings, created_at | category='doctors'; migration `d3c3f83522ec` |
| `service_details` | id, listing_id (unique FK), service_type, experience_years, created_at | category='services'; migration `d3c3f83522ec` |
| `tiffin_details` | id, listing_id (unique FK), meal_type, delivery_area, subscription_available, created_at | category='tiffin'; migration `d3c3f83522ec` |
| `business_images` | id, business_id (FK), url, cloudinary_id, display_order, created_at | 1:1 extension of `businesses`, same shape as `listing_images`; migration `bc6a44aafa08` (2026-07-22) |
| `event_images` | id, event_id (FK), url, cloudinary_id, display_order, created_at | 1:1 extension of `events`, same shape as `listing_images`; migration `bc6a44aafa08` (2026-07-22) |

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
| `mobile/App.tsx` | Root: bottom tab navigator (Home/Search/Post/Saved/Profile) + stack (ListingDetail/SellerProfile/Login/CityPicker/Invite). Wrapped in `SafeAreaProvider`; tab bar height/padding derived from `useSafeAreaInsets().bottom` so it isn't covered by the Android gesture-nav bar or iOS home indicator. Also wrapped in `ErrorBoundary` + registers a global `ErrorUtils` handler for uncaught JS errors (2026-07-14 — previously zero crash visibility existed). (2026-07-18) `expo-linking` effect captures `?ref=` from both cold-start (`getInitialURL`) and warm (`addEventListener('url')`) deep links, persisting via `storage.setReferralRefCode` |
| `mobile/src/components/ErrorBoundary.tsx` | Catches render-time errors app-wide, reports via `errorReporting.ts`, shows a "Try again" fallback instead of a blank/crashed screen (2026-07-14) |
| `mobile/src/lib/errorReporting.ts` | `reportError(error, context)` — fire-and-forget POST to `/api/v1/errors/report`, never throws (2026-07-14) |
| `mobile/src/lib/api.ts` | FastAPI-adapted axios layer — `/cities/{slug}/listings`, `contact_phone`, `access_token`/`refresh_token` |
| `mobile/src/lib/recaptcha.tsx` | `RecaptchaWebView` (2026-08-31) — invisible `react-native-webview` running the real Google reCAPTCHA v3 widget (`EXPO_PUBLIC_RECAPTCHA_SITE_KEY`, same site key as web), since RN has no DOM to load it directly; `baseUrl` presents the inline HTML as loaded from localsindia.com to match the site key's registered domain. Exposes `getToken(action)` via a forwardRef handle, bridged through `postMessage`. Mounted once in `LoginScreen.tsx`, used before both `sendOtp` calls |
| `mobile/src/lib/storage.ts` | expo-secure-store wrapper for JWT tokens + user object |
| `mobile/src/lib/format.ts` | `formatPrice()` — shared Indian-locale price formatter (exact under ₹10k, truncated k/L above, never rounds up); Vitest tests in `format.test.ts`. Run: `cd mobile && npm test` |
| `mobile/src/lib/location.ts` | `getApproxLocation()`/`getApproxLocationWithArea()` (2026-07-16) — coarse device location + reverse-geocoded area/city guess, best-effort/never-throwing, rounded to ~110m precision; `matchCityByName()` (2026-07-26) — loose `startsWith` fuzzy-match of a geocoded place name against the seeded city list, same predicate as web's `geolocate.ts` |
| `mobile/src/lib/pushNotifications.ts` | `registerForPushNotificationsAsync()`/`unregisterCurrentDevicePushToken()` — Expo push token register/unregister, best-effort |
| `mobile/src/hooks/useSaved.ts` | AsyncStorage bookmark hook (same pattern as web, different storage layer) |
| `mobile/src/components/ListingCard.tsx` | React Native listing card: gradient image placeholder, price, WA button |
| `mobile/src/screens/HomeScreen.tsx` | Dark hero with real logo mark next to headline, city picker, trending chips, category grid (emoji `fontSize: 34`), fresh listings |
| `mobile/src/screens/SearchScreen.tsx` | Debounced search (350ms), category tabs (horizontal FlatList — `height:44`/`flexGrow:0`/centered `contentContainerStyle` to stop pills stretching to the list's full height), city chip, FlatList results; "Near Me" toggle (2026-07-16) attaches device `lat`/`lng` to the search request, sorts by real distance |
| `mobile/src/screens/ListingDetailScreen.tsx` | Photo gallery, thumbnail strip, sticky WhatsApp button, seller → SellerProfile |
| `mobile/src/screens/SellerProfileScreen.tsx` | Avatar/initials, member since, active listings count, listings list |
| `mobile/src/screens/LoginScreen.tsx` | OTP phone → code flow; stores access_token/refresh_token in SecureStore; real logo image above the wordmark. Signup path only (2026-07-18) reads any captured `li_ref` code from storage and sends it as `ref_code` on `verifyOtp` |
| `mobile/src/screens/PostScreen.tsx` | 3-step wizard: details → photos (expo-image-picker) → contact; single location row (2026-07-26, replaced the old separate "Include my location" toggle + "Set exact location on map" link) — `handleMapPinConfirm()` sets `location` from whatever `MapPinPickerScreen` returns (GPS-fetched or manually dragged, no distinction at this call site) and auto-picks City on an exact name match against the seeded city list via `matchCityByName`-equivalent inline check, never forcing a wrong city; shows "Add your exact location" when unset, "Location added — buyers nearby can find this ✕" when set (✕ clears it); (2026-07-17) picking "Businesses" category branches submit to create a real Business Directory entry instead of a classified — same wizard, no separate screen; (2026-07-18) picking "Events" similarly branches to `eventsApi.create()` — Venue/Date-Time (`@react-native-community/datetimepicker`)/Admission fields replace Price, lands on the moderation-queue success screen rather than the event's own page |
| `mobile/src/screens/MapPinPickerScreen.tsx` | "Confirm your location" — single shared location screen (route name `MapPinPicker`, reached from both `PostScreen.tsx` and, via its own `navigation.navigate`, anywhere else a precise pin is needed). Self-fetches GPS via `location.ts`'s `getApproxLocation()` on mount when no `initialRegion` route param was passed (previously showed a useless static India-wide view as the *only* behavior — 2026-07-26 fix), `mapRef.animateToRegion()`s to it once resolved, falls back gracefully to the static default if GPS never resolves (denied permission, or a device/emulator with no location provider — never crashes or hangs). Draggable `Marker` + tap-anywhere-on-map both move the pin and re-run reverse-geocode to live-refresh an editable "village/town/area" `TextInput` (`areaEditedRef` stops the auto-refresh from ever overwriting a manual correction) and a `cityGuessRef`. Returns `{latitude, longitude, areaGuess, cityGuess}` via the `onConfirm` nav-param callback |
| `mobile/src/components/CityAutoDetectPrompt.tsx` | One-time "Let LocalsIndia find your city?" bottom sheet, mounted in `HomeScreen.tsx`, shown ~1.2s after mount only if no city is already saved (`AsyncStorage` key `li_city_autodetect_done`, set on every dismissal path so it never re-prompts). This is the de facto "ask location permission once, at signup" moment — a fresh signup's `navigation.replace('Main')` lands directly on this screen (first tab, no saved city yet), and the OS permission it grants/denies via `getApproxLocationWithArea()` is silently reused by every later `MapPinPickerScreen`/`getApproxLocation()` call since `requestForegroundPermissionsAsync()` is OS-idempotent — no separate permission-caching code was needed |
| `mobile/src/screens/BusinessesScreen.tsx` | (new, 2026-07-17) Business Directory browse list for the user's city — real data via `businessesApi.list()`, verified-badge checkmark + rating per row, "Add Your Business" button opens Post with the category pre-selected via `route.params.presetCategory` |
| `mobile/src/screens/BusinessDashboardScreen.tsx` | (new, 2026-07-28 — feature parity gap) Owner-only 30-day analytics: 4 stat cards (views/WhatsApp taps/reviews/avg rating), daily views bar chart, banner-ad promo mailto CTA — mirrors `BusinessDashboardClient.tsx` on web; reached via an owner-gated "View Analytics" button on `BusinessDetailScreen.tsx` |
| `mobile/src/screens/SavedSearchesScreen.tsx` | (new, 2026-07-28 — feature parity gap) List/run/delete saved searches, mirrors web's `profile/saved-searches/page.tsx`; reached via `ProfileScreen.tsx` → "Saved Searches". A matching "Save search" chip was also added to `SearchScreen.tsx` — before this the create endpoint had no UI trigger on either platform, so the whole feature was inert |
| `mobile/src/components/BuyerRequestsSection.tsx` | (new, 2026-07-27 — feature parity gap) "Wanted" card on `HomeScreen.tsx`, placed after the category grid; post modal (category, description, budget, explicit editable contact number), "Mark fulfilled"/delete for the poster's own requests — Buyer Requests didn't exist on mobile at all before this, mirrors web's `BuyerRequestsSection.tsx` |
| `mobile/src/screens/SplashScreen.tsx` | Animated launch screen (2026-07-16, new) — logo spring-in, "LocalsIndia" wordmark fade-in, "Buy · Sell · Connect" tagline pops in word-by-word; shown while `App.tsx`'s `checkAuth()` runs, replacing the old blank placeholder View |
| `mobile/src/screens/SavedScreen.tsx` | AsyncStorage bookmark list with empty state |
| `mobile/src/screens/ProfileScreen.tsx` | User avatar, name, phone, menu (My Listings, Saved, Saved Searches (new, 2026-07-28), Invite Friends (2026-07-18), My Tickets, Edit, Alerts & Preferences, City), logout, Delete account (double-confirm, 2026-07-14) |
| `mobile/src/screens/InviteScreen.tsx` | (new, 2026-07-18) Fetches own `referral_code` via `getMe()`, builds `https://www.localsindia.com/{citySlug}?ref={code}`, shares via native `Share.share()` (same pattern as `ListingDetailScreen.tsx`) |
| `mobile/src/screens/CityPickerScreen.tsx` | Searchable modal pulling cities from `/api/v1/cities` |
| `mobile/src/screens/AdminScreen.tsx` | Admin panel: listing moderation, approve/reject, role management. Header gained a QR-code icon button (2026-07-18) → `AdminScanTickets` |
| `mobile/src/screens/EventsScreen.tsx` | (new, 2026-07-18) Events browse list for the user's city — Events didn't exist on mobile at all before today, same gap the Business Directory had until 2026-07-17. Reached via a new "Events" promo banner on `HomeScreen.tsx` (same pattern as the Business Directory promo — the "Events" category tile still goes to normal classifieds search, unchanged) |
| `mobile/src/screens/EventDetailScreen.tsx` | (new, 2026-07-18) Free-event info banner, or in-app "Buy Ticket" via the same `WebView` + injected Razorpay-checkout-HTML pattern already used by `PromoteScreen.tsx`/`BusinessDetailScreen.tsx`, or an external "Get Tickets" link — same three-way branch as the web event detail page |
| `mobile/src/screens/TicketScreen.tsx` | (new, 2026-07-18) Displays a purchased ticket + its QR code via RN's built-in `Image` component pointed at `ticket.qr_image` (a server-generated base64 PNG) — deliberately NOT `react-native-svg`/`react-native-qrcode-svg`, to avoid forcing a native rebuild for a JS-only feature |
| `mobile/src/screens/MyTicketsScreen.tsx` | (new, 2026-07-18) "My Tickets" list, reached from `ProfileScreen.tsx` |
| `mobile/src/screens/AdminScanTicketsScreen.tsx` | (new, 2026-07-18) Ticket check-in via manual token entry (paste/type the code), not a camera — `expo-camera` isn't installed and adding it would force a second native rebuild on top of the one already pending for referrals/push notifications. Camera-based scanning exists only on web (`BarcodeDetector` API, no new dependency there) |
| `mobile/src/screens/EditProfileScreen.tsx` | Edit display name (2026-07-13, was a "coming soon" placeholder) — phone shown read-only, calls `PATCH /auth/me` |
| `mobile/src/screens/EditListingScreen.tsx` | Edit a posted listing (2026-07-13, previously didn't exist on mobile at all) — title/description/price/area/WhatsApp/website/social, same fields as web's edit page, no featured-status restriction; photo add/remove added same day (was missing on initial build — uses `uploadsApi.image`/`uploadsApi.deleteImage`) |
| `mobile/eas.json` | EAS Build profiles: development (debug APK), preview (internal APK), production (AAB) |
| `mobile/app.json` | Expo config + EAS project link (`@rajeshguntupalli59/localsindia`) + splash/permission config for store builds; `googleServicesFile` (2026-07-16) points at `mobile/google-services.json` (gitignored, live API key) — required client-side for push notifications to generate a device token at all |
| `mobile/assets/icon.png`, `android-icon-foreground.png`, `favicon.png`, `splash-icon.png` | Real LocalsIndia logo (mark-only for icon sizes, full mark+wordmark for splash) |
| `mobile/assets/logo-mark-transparent.png` | Logo mark, white chroma-keyed transparent, for in-app use on colored/dark backgrounds |

**To run:** `cd mobile && npm install && npx expo start`
**To build for Play Store:** `cd mobile && eas build --platform android --profile preview|production`

---

*Last updated: 2026-07-28 (later same day) | Reloaded the mobile app on an emulator to check today's parity work, which surfaced three unrelated real bugs, all found+fixed+committed same session: (1) Play Console App Links warning — apex `localsindia.com` redirects `/.well-known/assetlinks.json` instead of serving it, Android's verifier won't follow redirects, so that host never verified; removed the dead apex entry from `intentFilters` (commit `9dba00f`). (2) Native splash screen was showing a stray white card floating on the orange background — `splash-icon.png` had a white card + full wordmark + tiny tagline baked into one 1024×1024 asset, illegible at the size Android renders splash icons; swapped to a clean `icon.png` crop on white background (commit `c63e8e0`). (3) The animated JS splash (logo→letters→tagline stagger) raced `checkAuth()` — a local-storage-only read with no network calls, so for a logged-out user it resolves in single-digit milliseconds, far faster than the animation needs — `App.tsx` was swapping the splash out before any animation frame rendered, so the name/tagline never visibly appeared at all; simplified to a static (non-animated) logo+name+tagline render per direct feedback, removing the race entirely rather than patching around it with a minimum-display-time timer (commit `2fd61c0`, superseding an interim timer-based fix that was tried and reverted). Also repositioned `LoginScreen.tsx`'s decorative glow blob off the hero logo, which was reading as an unwanted shadow. **Native splash + App Links fix need a new EAS build to reach the Play Store** — verified locally via `expo prebuild` + `expo run:android` debug rebuilds on an emulator, JS-only splash simplification is live immediately via Metro/OTA. Previous entry (2026-07-28, earlier): Full mobile-vs-web parity audit (run 2026-07-26) closed out — all 4 gaps now shipped and documented together per the audit's own deferred-doc-update plan: (1) Buyer Requests mobile parity + moderation (2026-07-27, commit `d22d0e9` — mobile `BuyerRequestsSection.tsx` didn't exist at all before; also added report/3-strike/admin-queue moderation that neither platform had, and an explicit contact-phone field replacing the silent account-phone default), (2) Saved Searches (2026-07-28 — found the feature was inert on BOTH platforms, not just missing on mobile: the backend + web's list/run/delete page already existed but nothing anywhere called `POST /saved-searches`; added a "Save search" trigger to both `[city]/search/page.tsx` and mobile `SearchScreen.tsx`, plus the mobile `SavedSearchesScreen.tsx` list/run/delete page), (3) Business Analytics Dashboard mobile parity (2026-07-28 — new `BusinessDashboardScreen.tsx`, owner-gated entry point on `BusinessDetailScreen.tsx`), (4) Alerts & Preferences web parity (2026-07-28 — new `/profile/alerts` persistent settings page; web previously could only set interests once via the onboarding quiz gate and never set `alert_frequency` at all). Also surfaced two long-standing doc gaps unrelated to this session's code and fixed them while in the area: `/api/v1/preferences` + `user_preferences` table were entirely undocumented, and `saved_searches`'s real column is `query_text` not `query`. All four verified: mobile `tsc --noEmit` clean, `frontend && npm run build && npm run lint` clean, backend 164/164 tests pass (no backend changes needed — all endpoints already existed). Previous entry (2026-07-26): Mobile location system unified into one flow, commit `2bb1fd7` (§Feature Map "Real proximity search + location-assisted posting" row, fully rewritten above) — `PostScreen.tsx` previously had two separate location affordances, a GPS-fetch toggle and a "can't find your spot?" map link; collapsed into one row, since `MapPinPickerScreen.tsx` (renamed in spirit to "Confirm your location" though the route/file name stayed `MapPinPicker` to avoid unrelated churn) now fetches GPS itself whenever opened without a known coordinate, so there's no longer a reason for two different entry points. Also added: a live-refreshing editable area/locality `TextInput` on that screen (previously reverse-geocoded once, silently, only at confirm time — now re-geocodes on every pin move but never overwrites a manual correction), and graceful fallback to the old static India-wide default if GPS never resolves. Design pattern (one shared location screen, GPS only ever decides the starting pin, never gates confirming) explicitly modeled on how Swiggy/OLX/Uber handle rural/village addressing, per Raj's direct request to research and match competitor UX. No new permission-prompt code was needed anywhere — traced the nav stack and confirmed a fresh signup already lands on `HomeScreen` (first tab after `navigation.replace('Main')`), which already fires `CityAutoDetectPrompt` once (no saved city yet), and `requestForegroundPermissionsAsync()` is OS-idempotent so that one grant/deny is silently reused by every later `getApproxLocation()` call. Verified live on an Android emulator: GPS self-fetch + `animateToRegion`, graceful no-GPS fallback, tap/drag pin with live area-field refresh, Confirm round-trip, Remove. `npx tsc --noEmit` clean, no native rebuild needed (JS/TS-only change). Same session, two real bugs found and fixed: (1) the Google Maps pin-picker crash reported as "just needs a fresh build" was actually a config bug — `react-native-maps`' own Expo config plugin (`plugin/build/android.js`) only reads its `androidGoogleMapsApiKey` plugin *option*, never the legacy `android.config.googleMaps.apiKey` static field `app.config.js` was setting; with no option passed, the plugin's else-branch silently *strips* the `com.google.android.geo.API_KEY` manifest meta-data on every build — found by decompiling the actual built APK's manifest, fixed by passing the key as the plugin option instead (commit `1ed7bc4`); (2) new-signup name collection had silently never worked for any user ever — `/auth/password/set` hardcoded `is_new_user=False`, the exact field both apps check to decide whether to show the "what's your name?" step, so every account was permanently stuck with `name == phone`; fixed to compute it from whether the account has ever completed profile setup, self-healing existing affected accounts on their next password reset (commit `fe4b7d5`, found already merged from earlier same-day work — not re-done). Previous pass 2026-07-20: (Mobile app icon assets fixed — foreground bled to the edge and clipped under adaptive-icon masks, background was a leftover design-tool guideline template, monochrome was an unrelated shape; all three rebuilt from the real `icon.png` mark via chroma-key/crop/rescale to the adaptive-icon safe zone, commit `f8d74fe`; production AAB built and shipped with the fix, versionCode 7 via `eas build`; login/signup screen redesigned — modern type scale, 48px fields/buttons across every step, pill-shaped mode switch, header glow accents, commit `2d75912`; added a password show/hide toggle to all 5 password fields, commit `c7d24c4`; fixed two floating-widget mobile overlaps — the chat widget and the "post a listing" nudge were both covering the login card's Sign In button/links on narrow phones (320-375px), both now hidden on `/auth/*`, commits `c7d24c4`/`2d75912`; soft-deleted a leftover QA test business listing from production via the admin API) | Also today: City banner ads (Phase 3) — admin CRUD + homepage display, commit `29b0dd1` (see Feature Map above for full detail) | Previous pass 2026-07-18: (Scoped live product to South India only, migration `a3b4c5d6e7f8` — reversible `cities.active` data change, zero code changes; Google Auth removed from web login via the pre-existing `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` flag, no code change either — discovered mobile already had zero Google UI from an earlier undated pass, so both platforms are now aligned; backend `/auth/google*` routes deliberately kept, not deleted, since one real user has a Google-only account with no phone fallback; corrected a stale doc claim that mobile still had a working Google Sign-In deep link) | Also today: Mobile event creation added to `PostScreen.tsx` — asked directly after the ticketing feature shipped web-only-for-creation; extends the wizard exactly like Businesses did, one new native dependency `@react-native-community/datetimepicker` accepted since a rebuild is already pending anyway; mobile `tsc`/tests clean) | Also today: Event ticketing, web + mobile — second piece of Phase 3 monetization, commit pending: new `tickets` table + `routers/tickets.py` (Razorpay create-order/verify, mirrors `payments.py`), `events.ticket_price`, admin check-in endpoint. Built the first-ever web `/events/[id]` detail page (existing links 404'd before today) and the entire mobile Events feature from scratch (didn't exist at all). QR codes generated server-side as base64 PNG specifically so mobile needs zero new native dependencies — ticket check-in is camera-based on web (`BarcodeDetector`, no new dependency) but manual-token-entry on mobile (avoiding a second pending native rebuild). 129/129 backend tests, frontend build+lint+test clean, mobile tsc clean) | Also today: Business Analytics Dashboard — first piece of Phase 3 monetization, built after Featured Listings; new `analytics_events` table + `routers/analytics.py`, owner/admin-gated; deliberately started with the pure-reporting piece before touching anything with new Razorpay payment code like ad banners or event ticketing | Also today: two-sided referral system — backend + web, commit `1f7243c`; mobile Android App Links capture + InviteScreen + signup ref_code wiring, commit `ce2ee31`; verified end-to-end live on an Android emulator via a full native rebuild, referral link fetch, and native share sheet; real Play Console App Signing SHA-256 added to `assetlinks.json`, commit `3015c0a` — only remaining gap is a new production build to actually ship the mobile intentFilters change | Previous pass 2026-07-17: Home category grid was capped at 8/14 categories + 6 missing icons fixed, commit `794434e`; Profile member-since stat added then actually fixed after a first attempt didn't merge fresh API data into displayed state, commits `794434e`/`001a55c`; Business Directory made reachable on mobile — a first attempt built a separate parallel screen and was reverted per explicit feedback to extend the existing Post Listing wizard instead, final version in commit `ff97175` | Previous pass 2026-07-16: real proximity search + Haversine distance ordering + location-assisted posting/city auto-pick, commit `3e3aeed`; search multi-word AND-matching bug fixed on both `/search` and `/cities/{slug}/listings`; MyListingsScreen "+" nav bug fixed — `navigation.navigate('Post')` failed because Post is nested inside the `Main` tab navigator, not a sibling Stack screen; animated splash screen added, commit `fb804dd`; push notifications fully wired end-to-end with Firebase/FCM V1 — both the Expo-side Admin SDK key and the app-side `google-services.json`, commit `a6c484f` | Previous pass 2026-07-13: mobile Promote button on listing detail was missing entirely — added; Edit Profile "coming soon" placeholder replaced with a real screen; Edit Listing added to mobile — previously didn't exist at all, web-only feature until now; MSG91 OTP delivery fixed — see [[msg91-otp-fix]] memory + `MSG91_SUPPORT_ISSUE.md`; CI test workflow fixed, had been silently failing since 2026-07-07 | Previous pass 2026-07-12: password-based auth (phone+OTP+password login/signup, forgot-password reset, biometric re-login on mobile confirmed pre-existing/unchanged, Google OAuth intentionally kept), buyer-requests backend feature, `/[city]` hydration fix, `/listing/[id]` + `/search` SEO metadata, root + city-level branded 404 pages, mobile price-formatter fix + Vitest setup | ⚠️ ARCHITECTURE.md §5-9, §11, §18 still not yet updated to match — index is current, full doc is stale for all of the above including today's referral system (pre-existing gap, not introduced today)*
