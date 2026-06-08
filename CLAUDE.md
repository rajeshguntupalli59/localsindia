# LocalIndia â€” Autonomous Build Spec
> localsindia.com | India's hyperlocal community platform | Start by reading START_HERE.md

---

## Commands
```bash
docker-compose up -d                          # start local Postgres + services
cd backend && uvicorn app.main:app --reload   # backend dev server :8000
cd frontend && npm run dev                    # frontend dev server :3000
cd backend && alembic upgrade head            # run DB migrations
cd backend && python scripts/seed_cities.py  # seed 140 cities

# VERIFICATION â€” run after every task, iterate until green
cd backend && pytest tests/ -x -q
cd frontend && npm run build && npm run lint
```

## Token Efficiency Rules (FOLLOW EVERY SESSION)
- Run `/clear` between backend and frontend sessions â€” never mix context
- Use subagents for any codebase exploration â€” never read 10+ files in main context
- Use `phase1-mvp` skill for Week 1-6 tasks â€” load on demand, not upfront
- CLAUDE.md must stay under 500 tokens â€” never add file descriptions here
- After 2 failed correction loops on same issue â†’ `/clear` + fresh prompt
- Use `/compact` when context reaches 60% â€” don't wait for the limit

## Hard Rules (business logic â€” never violate)
- Soft-delete only â€” NEVER hard-delete users, listings, events, businesses (PDPB)
- New listing â†’ always `status='pending'`, never `'active'` (BL-11)
- Phone: `/^\+91[6-9]\d{9}$/` â€” Pydantic validator, server-side always
- WhatsApp URL: `/^https:\/\/wa\.me\/91\d{10}$/` â€” Pydantic validator
- 3 reports â†’ `status='flagged'`, hide from public (BL-04)
- Max 10 active listings per user per city (BL-02)
- OTP: bcrypt-hash before storing, 3 attempts max, 15-min lockout (BL-06)
- Images: JPEG/PNG/WebP only, 5MB max, Cloudinary mandatory (BL-08)
- City slug: `/^[a-z0-9-]+$/` only

## UI Quality Bar (every page, no exceptions)
- **Skeleton loading** â€” every list/detail page shows skeleton before data loads
- **Mobile-first** â€” design for 375px, then scale up. 80% of users are on phones
- **WhatsApp button** â€” green (#25D366), always above the fold on listing detail, full-width on mobile
- **Empty states** â€” friendly illustration + message, not blank white
- **Error states** â€” toast notifications (shadcn Toaster), never silent failures
- **Transitions** â€” Framer Motion `fadeIn` on page entry, `scale` on card hover
- **No layout shift** â€” `next/image` with explicit width/height on all images
- **Loading feedback** â€” spinner or skeleton within 100ms of any action

## UI Stack (use these, nothing else)
- Components: shadcn/ui (Radix primitives â€” copy-owned)
- Animation: Framer Motion v11
- Icons: Lucide React
- Fonts: next/font + Noto Sans family (11 scripts, zero FOUT)
- i18n: next-intl (query param: `?lang=te`)
- Images: Cloudinary + next/image

## Phase Skills (load only when working on that phase)
- @.claude/skills/phase1-mvp/SKILL.md     â€” Weeks 1-6
- @.claude/skills/phase2-community/SKILL.md â€” Weeks 7-10
- @.claude/skills/phase3-monetize/SKILL.md  â€” Weeks 11-14

## Agents (invoke when needed)
- Security review auth/search: use `.claude/agents/security-reviewer.md`
- DB migration review: use `.claude/agents/db-reviewer.md`

## Verification Gate
Every session ends only when BOTH pass:
```
pytest tests/ -x -q       # exit 0
npm run build && npm run lint # exit 0
```
Show test output as evidence â€” never claim "it works" without proof.

