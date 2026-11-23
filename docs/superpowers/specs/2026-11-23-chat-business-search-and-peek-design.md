# Chatbot: business search + greeting card (2026-11-23)

## Why
Visitors don't notice the chat icon (Raj). And the bot could only search
classified ads (~19 live site-wide), not the 35k businesses people come for
(GSC queries are business names + "contact number") — so suggesting questions
would mostly lead to "nothing found".

## Decisions (Raj)
- A **small greeting card** pops up next to the icon (not the full window —
  on phones a full-screen pop-up covers the page and Google penalises
  intrusive mobile pop-ups; most traffic is from Google).
- **First teach the bot to search businesses**, then add the card.

## Backend
- `search_svc.search_businesses(db, city_id, type=None, name=None, area=None, limit=5)`
  → (items, total). Filters: city, not deleted; `subcategory_slug == type`;
  every name word in `name` (ILIKE, max 5 words); `area` ILIKE on `locality`.
  Order same as the businesses list (verified, owned, rating, has phone, name).
- New Gemini tool `search_businesses(city_slug, type?, name?, area?)`. `type`
  is an enum of catalog subcategory slugs, listed with their names in the tool
  description. System prompt: shops/doctors/services/places → businesses;
  things to buy/rent, PG, jobs → listings.
- `ChatResponse.businesses: [{id, name, locality, phone, city_slug, type_name}]`.
  Tool loop handles either tool; question log records the search + count.
- Tests: service (type, name words, area, city isolation, deleted, order,
  limit) + chat endpoint with a fake Gemini that calls `search_businesses`.

## Frontend (`components/chat-widget/ChatWidget.tsx`)
- Business cards in replies: name, area · type, Call + View buttons.
- Suggested question chips under the welcome message (until the first message).
- Greeting card: ~3 s after load, above the icon, "Need help finding something
  in {City}?" + 3 tap questions + ✕. Tapping a question opens the chat and asks
  it. Shown once per visitor (localStorage `li_chat_peek`, try/catch) until
  used or closed. Not on /auth, /admin, or while the chat is open.
- Questions from `lib/chatSuggestions.ts` (tested): city-aware, OSM-rich types
  (Dentists, Hospitals, Restaurants); generic wording when no city is known.

## Non-goals
Mobile app chat (none exists); "open now" filtering; changing the
listings search.

## Checks
pytest (full), vitest, build, lint. Commit; push with Raj's OK.
