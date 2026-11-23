# Owner "Edit business" page — design (2026-11-23)

## Why
Owners who claim a business (claim emails, SMS code) have no way to fix their
own listing. First real case: Carewell Homoeo Clinic (Bengaluru) moved and
asked by email to change address + map pin. Support has to do it by hand today.

## Decision (Raj)
Owner edits go **live instantly**. The owner already proved ownership (SMS /
email code / document review). No review queue. Admin can still fix anything.

## Goals
- Owner (or admin) can edit on the web: name, description, address, map pin,
  phone, WhatsApp link, website, opening hours, photos (add/remove).
- Reached from an "Edit business details" button on the business page, shown
  only to the owner (and admins).

## Non-goals (v1)
- Mobile app screen (web first; app later, needs a build).
- Changing category / subcategory / city (moves the business between SEO pages;
  admin-only for now).
- Re-computing `locality` when the pin moves. Locality comes from OSM place
  nodes via `agents/assign_localities.py`; it stays as is until that runs.
- Multiple time ranges per day in the hours editor (e.g. lunch break). Existing
  hours the simple editor can't represent are shown as text and kept unless the
  owner replaces them.

## Backend (PATCH /api/v1/businesses/{id}, owner or admin)
- `BusinessUpdate` gains `latitude`, `longitude`, `opening_hours` (≤255).
- `phone` validated `^\+91[6-9]\d{9}$` when sent (hard rule). The page only
  sends fields that changed, so an old OSM landline doesn't block other edits.
- `latitude`/`longitude` must be sent together and inside India
  (lat 6–38, lng 68–98).
- Switch from `exclude_none` to `exclude_unset` so an owner can clear a field
  (send `null`): description, website, WhatsApp, hours, address. `name` can't
  be null/blank.
- Photos: existing `POST/DELETE /upload/business-image/...` (owner/admin
  already enforced). No change.

## Frontend
- New `/[city]/businesses/[id]/edit` client page, same pattern as
  `profile/listings/[id]/edit` (localStorage token + user, owner/admin check).
- Map pin: reuse `components/map-pin-picker/MapPinPicker` (dynamic, no SSR).
- Hours: 7 day rows (Closed toggle, open/close time). Serialised to OSM syntax
  with consecutive equal days grouped, e.g. `Mo-Sa 09:00-21:00; Su off`.
  New pure helpers in `lib/openingHours.ts`: `weekToRows`, `rowsToOpeningHours`.
- Save sends only changed fields; toast on success/failure; back to the page.
- Public page server fetch is cached up to 1h (`revalidate: 3600`); the
  client view refetches, so the owner sees the change immediately.

## Tests
- pytest: owner can edit (incl. pin + hours), stranger 403, bad phone 422,
  lat without lng 422, outside India 422, null clears website, null name 422.
- vitest: rows ↔ OSM string round-trip, grouping, all closed, unsupported input.

## Plan
1. Backend tests → schema + endpoint change → pytest green.
2. `openingHours` helpers test-first → vitest green.
3. Edit page + "Edit business details" button → build + lint + vitest green.
4. ARCHITECTURE_INDEX.md, ARCHITECTURE.md, PROJECT_MAP §6.
5. Commit; push/deploy only with Raj's OK.
