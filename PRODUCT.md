# Product

## Register

product

## Users

Everyday Indians browsing on mid-range Android phones over 4G — auto-drivers looking for a spare part, a college student hunting for a PG near campus, a home cook offering tiffin service to 20 neighbours. 80% mobile, mix of Hindi and regional-language speakers across Tier 2–3 cities. They want to find something locally, fast, and contact the seller directly without friction.

## Product Purpose

LocalIndia is a hyperlocal Indian classifieds platform — 86+ cities, 8 categories (Tiffin & Food, PG/Rooms, Jobs, Vehicles, Electronics, Events, Businesses, Education). Users browse, post free listings, and connect via WhatsApp. Success looks like a real local person posting a listing and a real neighbour discovering it the same day. The platform competes on trust and locality depth, not SEO volume.

## Brand Personality

Trustworthy, Vibrant, Local

- **Trustworthy**: Real people, real listings, WhatsApp-verified sellers, no spam wall. Design choices reinforce legibility and honesty — not hype.
- **Vibrant**: Saffron orange (#F7921E) as a primary anchor. Category cards use bold distinct colours (not uniform orange). Energy comes from colour and contrast, not clutter.
- **Local**: Neighbourhood-first, not metro-first. Feels like a community board, not a corporate directory. Supports 11 Indian scripts (Noto Sans). Respects slow 4G — every page loads fast.

## Anti-references

- **OLX / Quikr**: Cluttered listing grids, spam-heavy, untrustworthy seller signals, visually chaotic. LocalIndia must feel cleaner and more trustworthy.
- **JustDial**: Corporate yellow, dense text walls, aggressive lead-gen pressure, paid-listing bias. LocalIndia must feel community-owned and free-first.
- Do NOT use: uniform card grids with no visual hierarchy, gray-on-gray palettes, heavy-handed sales-pressure CTAs, or patterns that look like the same SaaS template every AI produces.

## Design Principles

1. **Mobile-first, 4G-honest** — Every interaction must work on a 375px screen over a slow connection. Skeleton states, lazy images, lightweight JS.
2. **Colour carries meaning** — Each category has its own bold colour identity (not all orange). Colour signals category at a glance without reading the label.
3. **Trust through clarity** — Price, location, time posted, and WhatsApp contact must always be visible without scrolling. No dark patterns, no paid-listing ambiguity.
4. **Community, not corporate** — Tone is warm and direct ("Post Free", "Chat on WhatsApp") not formal. Empty states are friendly, not blank.
5. **Locality over scale** — City name always in context. Neighbourhood field prominent. Don't make a Mumbai user feel like they're on a national grid.

## Accessibility & Inclusion

- WCAG AA minimum, AAA on body text (current: #163D6B on #F9FAFB = 9.2:1 ✓)
- 11 Indian scripts via Noto Sans (Devanagari, Telugu, Tamil, Kannada, Bengali, Gujarati, Punjabi, Malayalam, Odia + Latin)
- Minimum touch target 44×44pt (iOS) / 48×48dp (Android)
- Reduced-motion support via `prefers-reduced-motion`
- No colour-only meaning — icons + labels always accompany colour signals
