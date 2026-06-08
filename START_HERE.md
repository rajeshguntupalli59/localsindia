# START HERE — LocalIndia Build Handoff
> Give Claude this file at the start of every session. Claude reads this first, then picks the right skill file.

---

## What is this project?
**LocalIndia** (localindia.in) — India's hyperlocal community platform. City-wise classifieds, events, business directory in 11 Indian languages. WhatsApp-native. Mobile-first. 140 South Indian cities at launch.

Think: OLX + Sulekha + local culture — but with regional language UI and WhatsApp as the contact method.

## Where everything lives
```
C:\Users\rajes\localindia\
  START_HERE.md          ← you are here
  CLAUDE.md              ← build rules, commands, hard constraints
  ARCHITECTURE.md        ← full DB schema, API spec, all requirements
  BUILD_PLAN.md          ← 14-week plan, 140 seed cities, weekly tasks
  UI_STACK.md            ← UI decisions, colors, component patterns
  SETUP_GUIDE.md         ← MSG91 / Cloudinary / Google OAuth setup steps
  .claudeignore          ← files Claude must not touch
  .claude/
    settings.json        ← allowed/denied bash commands
    skills/
      phase1-mvp/        ← Week 1-6 detailed task list (load when building Phase 1)
      phase2-community/  ← Week 7-10 (load when Phase 1 is deployed)
      phase3-monetize/   ← Week 11-14 (load when Phase 2 is live)
    agents/
      security-reviewer.md  ← run on auth + search code
      db-reviewer.md        ← run on migrations
```

## Current build status
```
Phase 0 — DONE: All architecture docs, CLAUDE.md, skill files, config ready
Phase 1 — NOT STARTED: Start here tomorrow
Phase 2 — NOT STARTED
Phase 3 — NOT STARTED
```

## How to start each session

### Session 1 (first time — scaffold + backend foundation)
Tell Claude:
> "Read START_HERE.md and CLAUDE.md. Load the phase1-mvp skill. Start from Week 1-2: scaffold the full folder structure and build the backend foundation."

### Session 2+ (continuing)
Tell Claude:
> "Read START_HERE.md. We're in Phase 1 Week [X]. Last thing done: [describe last completed task]. Continue from there."

### If Claude seems confused or context is bloated
Run `/clear` and start fresh — just hand Claude this file again.

---

## The build goal in plain English

Build a website where someone in Hyderabad opens localindia.in, sees their city automatically, browses classifieds in Telugu, finds a tiffin service, taps WhatsApp to contact the seller — in under 30 seconds, on a slow 4G phone.

**Beautiful = fast + familiar + local.**
Not corporate. Not cold. Feels like it was built for India.

---

## Account status (do NOT block build on these — mock modes exist)
| Account | Status | Needed by |
|---|---|---|
| MSG91 (OTP SMS) | NOT SET UP — see SETUP_GUIDE.md | Week 1-2 (mock works) |
| Cloudinary (images) | NOT SET UP — see SETUP_GUIDE.md | Week 2-3 (mock works) |
| Google OAuth | NOT SET UP — see SETUP_GUIDE.md | Week 1-2 (mock works) |
| Railway (deploy) | NOT SET UP | Week 5-6 only |
| GitHub repo | NOT SET UP | Week 5-6 only |

---

## Non-negotiable quality bar
Every page Claude builds must have:
1. **Skeleton loading** — never a blank white screen
2. **Mobile layout tested** — 375px width minimum
3. **WhatsApp button** — always visible above fold on detail pages
4. **Error states** — empty state design, not just "no results"
5. **Smooth transitions** — Framer Motion on page entry and card hover
6. See UI_STACK.md for full design system
