// Short regional-language keyword phrases for SEO metadata (city/blog page
// titles and descriptions) — reused verbatim from the app's own live,
// already-translated UI strings (messages/{lang}.json `listing.post` key),
// not newly composed sentences, to avoid introducing grammar errors in
// languages this codebase can't natively proofread.
//
// Note: this is metadata-only enrichment on the existing single-URL city
// pages, not full multi-language SEO — there's no locale-prefixed routing
// (no middleware.ts, no /te/[city] routes) for hreflang alternates to point
// at. That would be a real routing/architecture change, a separate decision.
export const REGIONAL_LISTING_PHRASE: Record<string, string> = {
  te: 'ఉచిత జాబితా పోస్ట్',
  ta: 'இலவச விளம்பரம் பதிவிடு',
  kn: 'ಉಚಿತ ಜಾಹೀರಾತು ಪ್ರಕಟಿಸಿ',
  ml: 'സൗജന്യ പരസ്യം നൽകൂ',
};

export function regionalPhraseFor(langDefault: string): string | null {
  return REGIONAL_LISTING_PHRASE[langDefault] ?? null;
}
