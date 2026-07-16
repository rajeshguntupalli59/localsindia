# Content Rating Questionnaire (IARC) — draft answers

Fill this out in Play Console → Policy → App content → Content ratings.

| Question | Answer | Why |
|---|---|---|
| Violence | None | No violent content anywhere in the app |
| Sexual content / nudity | None | Not present, not permitted |
| Profanity / crude humor | None | Not present in app-authored content |
| Controlled substances (alcohol/tobacco/drugs) | None | Not depicted or promoted |
| Gambling | None (simulated or real) | No gambling features |
| User-generated content | **Yes** | Listings, descriptions, photos, business reviews are posted by users |
| Users can interact / share location | **No location shared with other users** — never shown on a listing, profile, or anywhere public. **Updated 2026-07-16:** the app now collects approximate device location internally (to sort search results by distance), but this is never displayed to or shared with anyone else. | See the Location row in the Data Safety section below |
| Users can communicate with each other | **No in-app messaging.** Contact happens by handing off to WhatsApp (an external app) via a `wa.me` link. There is no in-app chat between users — the only in-app chat is an AI assistant (Gemini-backed), not user-to-user. | Matters because it avoids the stricter "unmoderated live chat" content-rating bump |
| Digital purchases | **Yes** | Razorpay payments for: featured-listing promotion (₹99/week, ₹199/month) and business verified badges (₹499–1,299) |
| Restricted content the developer wants excluded from minors | Not specifically restricted, but UGC (see below) | See moderation note |

**UGC moderation note to add if the questionnaire asks about moderation:** every listing goes through an admin approval queue before becoming publicly visible (`status='pending'` until approved — see `BL-11` in this repo's business rules), and a 3-report threshold auto-hides a listing pending review (`BL-04`). This is a real, enforced moderation pipeline, not a policy-only claim.

Expected outcome: this profile should land on the **lowest/mildest rating tier** in most regions (e.g., PEGI 3 / Everyone), since there's no violence, sexual content, or unmoderated user-to-user chat — the digital-purchases flag is the only thing that typically nudges a rating up slightly, and only for the purchases disclosure, not content maturity.

---

# Data Safety Form — draft declarations

Fill this out in Play Console → Policy → App content → Data safety. Answer **"Does your app collect or share any of the required user data types?" → Yes**, then declare:

## Personal info

| Data type | Collected? | Shared? | Purpose | Required or optional |
|---|---|---|---|---|
| Name | Yes | Yes — shown publicly on the user's listings and business reviews | App functionality | Required |
| Phone number | Yes | Yes — shown on listings as the contact number / WhatsApp link | Account management, App functionality | Required |
| Email address | Yes, only if signing in with Google | No — not shown publicly | Account management | Optional (only Google sign-in users) |

## Photos and videos

| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| Photos | Yes — listing images the user chooses to upload | Yes — publicly visible to all app users on that listing | App functionality |

## Financial info

| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| Purchase history | Yes — which listing/business was promoted, plan, amount | Shared with Razorpay (payment processor) to process the transaction | App functionality |
| Payment info (card/UPI details) | **Not collected by us** — entered directly into Razorpay's own checkout, we never see or store card/UPI numbers | — | — |

## App activity

| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| App interactions (listing views, WhatsApp-click counts, searches) | Yes | No | Analytics (first-party only — see note below), App functionality |

## Location — added 2026-07-16

| Data type | Collected? | Shared? | Purpose | Required or optional |
|---|---|---|---|---|
| Approximate location | **Yes** — captured once (not continuously/in background) when a seller posts a listing, and again if a buyer taps the "Near Me" toggle in search | **No** — never shown publicly on a listing/profile, never shared with any third party, not used for ads | App functionality — three uses, all from the same one-time optional permission grant: (1) sorting search results by distance, (2) suggesting a neighbourhood/locality name when posting (editable/clearable by the user), (3) suggesting which of our listed cities to post under, only when it exact-matches a real city we already have — never forces a wrong city, never invents one for an area we don't cover | **Optional** — posting and search both work fully if the user declines the permission prompt; every auto-suggested value (area text and city) remains manually editable |
| Precise location | No — the app only ever requests `Accuracy.Low` and rounds coordinates to ~110m before use/storage | — | — | — |

**Manifest note for whoever fills out the Play Console form:** the Android manifest will show both `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` — the Expo `expo-location` config plugin adds both by default and there's no supported plugin option to declare coarse-only. If Play Console's automated permission scanner flags `ACCESS_FINE_LOCATION` and expects a "Precise location: Yes" answer to match, answer based on actual app behavior (coarse only, as above) rather than the raw permission list — the app code never requests or stores precise coordinates.

**City auto-suggest note (added 2026-07-16):** this reuses the same reverse-geocode call already made for the Area suggestion — no new permission, no new data collected, no coordinates stored for our 496 cities (we don't have any; this works by name-matching the geocoded city/district string against our existing city list, not by distance). A village or area with no matching city in our list simply isn't auto-selected — the user picks manually, same as before this feature existed.

## Data NOT collected (explicitly answer "No" for these)

- **Device or other IDs** — no analytics/crash-reporting SDK is integrated (checked `package.json` — no Firebase, Sentry, Amplitude, Mixpanel, or similar). All usage data is first-party, sent only to our own backend.
- **Contacts, calendar, messages, files/docs** — not accessed.
- **Microphone / audio** — not accessed (an unused `RECORD_AUDIO` Android permission was found in `app.json` during this prep pass and has been removed — it had no corresponding code, so it would have forced an inaccurate/confusing disclosure here).

## Security practices section (Play Console asks these as yes/no + explanation)

- **Data is encrypted in transit?** Yes — HTTPS everywhere (Azure App Service backend, Cloudinary, Razorpay, MSG91 all over TLS).
- **Users can request data deletion?** Yes — see `/account-deletion` page (in-app self-serve in Profile, plus a public web page + email for users without app access). Link: `https://www.localsindia.com/account-deletion`.
- **Committed to Play Families Policy?** No — app is not directed at children.

## Third parties data is shared with (for the "who do you share data with" section)

- **Cloudinary** — listing photo hosting
- **Razorpay** — payment processing (featured listings, business badges)
- **MSG91** — SMS delivery for OTP verification (receives phone number + OTP code only)
- **Google** — only if the user chooses Google Sign-In (name, email, profile picture)

No data is sold, and no data is shared with advertising or analytics networks.
