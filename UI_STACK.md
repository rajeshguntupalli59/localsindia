# LocalIndia — UI/UX Stack & Design Decisions

## Stack Decision

| Layer | Choice | Version | Why |
|---|---|---|---|
| Component Foundation | shadcn/ui | latest (114k stars Q2 2026) | Copy-owned, Radix UI accessibility, Tailwind-native, App Router compatible — no version-lock |
| Animation | Framer Motion | v11 | City selector transitions, listing card hovers, bottom sheet |
| Animated Components | Magic UI | selective copy-paste | Cleaner than Aceternity, works light/dark, no package lock |
| Icons | Lucide React | latest | Already referenced in architecture for category icons |
| Fonts | next/font + Noto Sans | — | 11 language scripts, zero FOUT, loaded via Google Fonts |
| i18n | next-intl | v3 | App Router native, SSR-compatible, query param routing |
| Image CDN | Cloudinary | free tier | Auto-WebP, CDN, direct upload from browser |

## shadcn/ui Components to Install

```bash
npx shadcn@latest add button card badge sheet dialog input select
npx shadcn@latest add skeleton tabs avatar dropdown-menu
npx shadcn@latest add toast form label separator scroll-area
```

## Key UX Decisions

### Homepage — Search-First (not category grid first)
- Full-screen city selector on first visit
- After city selected: hero search bar front-and-center
- Category chips below search (horizontal scroll on mobile)
- Featured listings as cards below categories

### Listing Card Design
- Image-first (60% of card height)
- Price badge top-right on image
- Category chip bottom-left on image
- Title (2 lines max, ellipsis)
- Location chip + time ago
- WhatsApp CTA button — full width at card bottom, always green (#25D366)

### Mobile Navigation — Bottom Tab Bar
```
[Home] [Post +] [Search] [My Listings] [Profile]
```
- Post button: orange/saffron accent, slightly raised
- Active tab: underline indicator
- Uses shadcn Sheet for mobile slide-up panels

### City Header (Sticky)
```
[LocalIndia logo] [Hyderabad ▼] [Language: EN ▼] [Post Free]
```
- City name is tappable → opens city switcher
- Language chip shows current language code
- "Post Free" CTA button always visible

### Listing Detail — Mobile Layout
```
[Image carousel — swipeable]
[Title]
[Price | Category | Time ago]
[Description (expandable)]
[Contact Info]
[WhatsApp button — FULL WIDTH, fixed bottom]  ← above fold priority
[Report this listing link]
```

### Post Listing Form — 3-Step Wizard
```
Step 1: Details    → title, category, description, price
Step 2: Images     → drag-drop up to 5 images, preview
Step 3: Contact    → phone, WhatsApp URL (optional), city confirm
```
- Progress bar at top
- Each step validates before Next
- Submits to pending status with success screen

### Admin Panel Layout
```
Sidebar: [Pending (count)] [Flagged (count)] [Reports (count)] [Users] [Settings]
Main: Data table with approve/reject inline actions
```

## Color Palette

```css
--primary:     #FF6B35   /* saffron-orange — post CTA, primary actions */
--secondary:   #1A1A2E   /* deep navy — header, text */
--success:     #25D366   /* WhatsApp green — WhatsApp buttons */
--warning:     #F7B731   /* amber — featured badge */
--background:  #FAFAFA   /* off-white — page background */
--card:        #FFFFFF   /* white — listing cards */
--border:      #E5E7EB   /* light gray — card borders */
--muted:       #6B7280   /* gray — secondary text */
```

## Typography

```
Headings:  Noto Sans (weight 600-700)
Body:      Noto Sans (weight 400)
Price:     Noto Sans (weight 700, primary color)
Script fonts loaded per language:
  Hindi/Marathi: Noto Sans Devanagari
  Telugu:        Noto Sans Telugu
  Tamil:         Noto Sans Tamil
  Kannada:       Noto Sans Kannada
  Bengali:       Noto Sans Bengali
  Gujarati:      Noto Sans Gujarati
  Punjabi:       Noto Sans Gurmukhi
  Malayalam:     Noto Sans Malayalam
  Odia:          Noto Sans Oriya
```

## Responsive Breakpoints (Tailwind defaults)

```
sm:  640px  — large phones (landscape)
md:  768px  — tablets
lg:  1024px — laptops
xl:  1280px — desktops
```

Grid:
- Listing cards: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- City selector: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`
- Business directory: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

## Performance Rules (NFR-01)

- All listing pages use ISR (revalidate: 3600)
- City home page: SSG with `generateStaticParams` for top 50 cities
- Images: `next/image` with Cloudinary loader, WebP format, sizes attr
- Skeleton loading on all list pages (no layout shift)
- Fonts: `display: swap` via next/font
- Bundle: no heavy chart libraries in Phase 1

## Accessibility (NFR-12 — WCAG 2.1 AA)

- All interactive elements have aria-labels
- Color contrast: minimum 4.5:1 for text
- Focus indicators visible (shadcn/ui handles this via Radix)
- Form errors announced to screen readers
- Images have alt text (listing title as fallback)
