# Buyer Requests → matching business owners (2026-11-23)

## Why
Claimed businesses get nothing back today, and a buyer's request sits on the
city page until someone happens to see it. Telling the owners who do that work
in that city gives buyers answers and gives owners a reason to claim and come
back. (Ranked #1 in the OLX/JustDial/Sulekha comparison: Sulekha's
"multiple quotes" model.)

## Decision (Raj)
- **A: claimed owners only.** No email to unclaimed businesses (cold email,
  breaks the "each address emailed once ever" rule, bounce-rate risk).
- **Add a type picker** to the request form so matching is exact
  (plumber ≠ tutor, both under "Services").

## State today
- 0 open requests in the big cities, ~3–4 claimed businesses → reach is tiny
  at launch; value grows with both sides.
- `buyer_requests` stores `category_id` only. Businesses have
  `category_id` + `subcategory_slug` (catalog: `app/core/category_catalog.py`).
- Sending exists: `notification_svc.notify` (in-app + push), `email_svc.send_email`
  (support@ SMTP, ~10 s per send). Buyer phone is already public on the request.

## Design
Backend
- Migration: `buyer_requests.subcategory_slug` (String 60, nullable).
- `BuyerRequestCreate.subcategory_slug` optional; must belong to the chosen
  category (422 otherwise). Out schema adds `subcategory_slug`, `subcategory_name`.
- After the request is saved, a **background task** (FastAPI BackgroundTasks,
  own DB session, so the buyer never waits on SMTP) finds matches:
  same city, same category, `owner_id` set, not deleted, not the requester;
  if the request has a type → business type must equal it; if no type and the
  category **has** types → nobody (avoids "every Services business" spam from
  old app builds); if the category has no types → category match.
  One notice per owner (distinct), capped at 20 owners per request.
- Each owner gets: in-app notification + push (`type='buyer_request_match'`,
  links to the city page's requests section) and, if their account has an
  email, one email with the request text, budget, phone and a WhatsApp link.
  Failures are logged, never raised.

Frontend (web) + mobile app
- After a category is picked, show its types as tap chips (optional; few
  questions, pick-options over typing). Request cards show the type name.
- Mobile form gets the same picker (ships with the next app build).

## Non-goals
- Emailing unclaimed businesses; quotes/replies inside the app; owner opt-out
  setting (v1: email says why they got it; add opt-out if anyone asks);
  per-area (locality) matching.

## Tests
pytest: type must belong to category; match by type; no-type + typed category
→ none; untyped category → category match; requester's own business skipped;
unclaimed/other city/deleted skipped; one notice per owner; cap 20; email only
when owner has an email. vitest/tsc for the forms; build + lint.

## Plan
1. Migration + schema + matching service, test-first → pytest green.
2. Web form picker + card label → build, lint, vitest.
3. Mobile form picker → `npx tsc --noEmit`.
4. ARCHITECTURE_INDEX / ARCHITECTURE / PROJECT_MAP. Commit; push with Raj's OK.
