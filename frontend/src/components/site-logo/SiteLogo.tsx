import Link from 'next/link';
import Image from 'next/image';

/**
 * SiteLogo — the canonical LocalsIndia logo component.
 *
 * Renders the real brand mark (public/logo-mark.png — the same interlocked-
 * rings-and-pin artwork used for the mobile app icon and Play Store assets)
 * alongside the "LocalsIndia" wordmark.
 *
 * This used to render a hand-drawn inline SVG approximation ("stacked
 * figure-blobs") that never actually matched the real mark — fixed by
 * switching to the verified-correct source image instead of re-deriving
 * bezier paths by hand.
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

// ── Logo mark colours (exact logo values, used by the wordmark text only) ─────
const PIN    = '#163D6B';
const ORANGE = '#F7921E';

// Real source asset is 218×198 — keep every rendered size on that exact ratio.
const MARK_ASPECT = 218 / 198;

// ── Mark (real artwork) ────────────────────────────────────────────────────────
function LogoMark({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const h = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const w = Math.round(h * MARK_ASPECT);

  return (
    <Image
      src="/logo-mark.png"
      alt=""
      width={w}
      height={h}
      style={{ display: 'block', flexShrink: 0, height: h, width: w }}
    />
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
