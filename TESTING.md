# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your
instincts, and ship with confidence — without them, vibe coding is just yolo coding. With
tests, it's a superpower.

## Frontend (Next.js)

**Framework:** Vitest + @testing-library/react + jsdom

**Run tests:**
```bash
cd frontend
npm test          # run once
npm run test:watch # watch mode
```

**Where tests live:** colocated with source, `*.test.ts` / `*.test.tsx` next to the file
under test (e.g. `src/lib/utils.test.ts` next to `src/lib/utils.ts`).

## Test layers

- **Unit tests** — pure functions and business logic (`src/lib/*.test.ts`). Run on every
  push via `.github/workflows/test.yml`.
- **Integration tests** — not yet set up. Would cover component behavior with mocked API
  calls (MSW or similar).
- **E2E tests** — not yet set up. Would use Playwright against a running dev server for
  full user flows (login → post listing → view listing).

## Conventions

- File naming: `<module>.test.ts` colocated with `<module>.ts`
- Use `describe`/`it` blocks, one `describe` per function/concept
- Assert real behavior and edge cases (null inputs, boundary values, pluralization) —
  never `expect(x).toBeDefined()` as the only assertion
- Use `vi.useFakeTimers()` + `vi.setSystemTime()` for anything time-dependent (see
  `timeAgo` tests in `src/lib/utils.test.ts`)

## Backend (FastAPI)

**Framework:** pytest

**Run tests:**
```bash
cd backend
python -m pytest tests/ -x -q
```
