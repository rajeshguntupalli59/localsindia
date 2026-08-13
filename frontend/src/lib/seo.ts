import fs from 'node:fs';
import path from 'node:path';

const SEO_DIR = path.join(process.cwd(), 'src/content/seo');

export interface CitySeo {
  citySlug: string;
  city: string;
  state: string;
  lang: string;
  titleTag: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  h1: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  jsonLd: Record<string, unknown>;
  generatedAt: string;
}

/**
 * AI-generated SEO metadata for a city, written by agents/seo_agent.py.
 * Most cities won't have one yet (seo_agent.py only generates for cities
 * that already qualify for Google's index — see MIN_LISTINGS_FOR_INDEX in
 * both seo_agent.py and [city]/page.tsx) — callers must handle null and
 * fall back to the plain template (see regionalSeo.ts for that path).
 */
export function loadCitySeo(citySlug: string): CitySeo | null {
  const file = path.join(SEO_DIR, `${citySlug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}
