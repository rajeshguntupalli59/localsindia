import Link from 'next/link';

/**
 * SiteLogo — the canonical LocalsIndia logo component.
 *
 * Renders the SVG mark (three interlocked-figure community icon + location pin)
 * alongside the "LocalsIndia" wordmark in the exact logo color scheme.
 *
 * To use the actual PNG file instead of the inline SVG:
 *   1. Export your logo (transparent bg) as /public/logo.png  (400×160px ideal)
 *   2. Replace <LogoMark> below with <Image src="/logo.png" width={120} height={48} alt="LocalsIndia" />
 *   3. Remove the text <Wordmark> span — the image already includes it.
 *
 * Props:
 *   variant   — "default": colored mark + dark text (white bg headers)
 *               "light":   colored mark + white text (dark footers)
 *   showMark  — show/hide the icon mark (default true)
 *   tagline   — show "buy · sell · connect" beneath the name (default false)
 *   href      — wraps in a <Link> when provided
 *   size      — sm | md | lg  (controls mark height)
 */

interface SiteLogoProps {
  variant?:  'default' | 'light';
  showMark?: boolean;
  tagline?:  boolean;
  href?:     string;
  size?:     'sm' | 'md' | 'lg';
  className?: string;
}

// ── Logo mark colours (exact logo values) ─────────────────────────────────────
const TEAL   = '#3DADA8';
const NAVY   = '#1A6FAD';
const ORANGE = '#F7921E';
const PIN    = '#163D6B';

// ── Inline SVG mark ───────────────────────────────────────────────────────────
function LogoMark({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const h = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;

  return (
    /**
     * The mark: three interlocked person-figures (teal, navy, orange)
     * arranged in a circular community cluster, with a drop-pin at the top.
     *
     * Layer order (back → front):
     *   1. Teal figure body + head
     *   2. Navy figure body + head
     *   3. Orange figure body + head (foreground)
     *   4. Location pin (topmost)
     */
    <svg
      viewBox="0 0 82 90"
      height={h}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* ── Teal figure (back-left, tilted left) ──────────── */}
      <ellipse
        cx="26" cy="56"
        rx="13.5" ry="20"
        transform="rotate(-20 26 56)"
        fill={TEAL}
      />
      <circle cx="20" cy="33" r="10" fill={TEAL} />

      {/* ── Navy figure (back-right, tilted right) ─────────── */}
      <ellipse
        cx="56" cy="56"
        rx="13.5" ry="20"
        transform="rotate(20 56 56)"
        fill={NAVY}
      />
      <circle cx="62" cy="33" r="10" fill={NAVY} />

      {/* ── Orange figure (front-center, upright) ──────────── */}
      <ellipse cx="41" cy="63" rx="13.5" ry="20" fill={ORANGE} />
      <circle  cx="41" cy="40" r="10"            fill={ORANGE} />

      {/* ── Subtle overlap shadow (depth hint at center) ───── */}
      <ellipse
        cx="41" cy="57"
        rx="10" ry="10"
        fill="#00000018"
      />

      {/* ── Location drop-pin ───────────────────────────────── */}
      {/* Outer body */}
      <path
        d="M41 4 C35.2 4 30.5 8.7 30.5 14.5 C30.5 22.8 41 34 41 34 C41 34 51.5 22.8 51.5 14.5 C51.5 8.7 46.8 4 41 4Z"
        fill={PIN}
      />
      {/* Inner white dot */}
      <circle cx="41" cy="14.5" r="4.5" fill="white" />
    </svg>
  );
}

// ── Wordmark text ─────────────────────────────────────────────────────────────
function Wordmark({
  variant,
  tagline,
  size,
}: {
  variant: 'default' | 'light';
  tagline: boolean;
  size: 'sm' | 'md' | 'lg';
}) {
  const localsColor = variant === 'light' ? '#FFFFFF' : PIN;
  const fontSize    = size === 'sm' ? 15 : size === 'lg' ? 22 : 18;
  const taglineSize = size === 'sm' ? 9  : size === 'lg' ? 12 : 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <span
        style={{
          fontSize,
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: localsColor,
          fontFamily: 'var(--font-jakarta, var(--font-sans, sans-serif))',
        }}
      >
        Locals
        <span style={{ color: ORANGE }}>India</span>
      </span>

      {tagline && (
        <span
          style={{
            fontSize: taglineSize,
            fontWeight: 500,
            letterSpacing: '0.06em',
            marginTop: 3,
            color: variant === 'light' ? '#6B7280' : '#9CA3AF',
          }}
        >
          buy · sell · connect
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SiteLogo({
  variant   = 'default',
  showMark  = true,
  tagline   = false,
  href,
  size      = 'md',
  className = '',
}: SiteLogoProps) {
  const gap = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;

  const inner = (
    <span
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        gap,
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      {showMark && <LogoMark size={size} />}
      <Wordmark variant={variant} tagline={tagline} size={size} />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={className} style={{ display: 'inline-flex' }}>
        {inner}
      </Link>
    );
  }

  return <span className={className}>{inner}</span>;
}
