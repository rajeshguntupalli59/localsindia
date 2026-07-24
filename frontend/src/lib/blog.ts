import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export interface BlogPost {
  schemaVersion: number;
  city: string;
  citySlug: string;
  state: string;
  slug: string;
  category: string;
  topicTemplateId: string;
  title: string;
  metaDescription: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  cta: { text: string; href: string };
  publishedAt: string;
  wordCount: number;
}

export function listCitySlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

export function listPostSlugs(citySlug: string): string[] {
  const dir = path.join(BLOG_DIR, citySlug);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));
}

export function loadPost(citySlug: string, slug: string): BlogPost | null {
  const file = path.join(BLOG_DIR, citySlug, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

export function listAllPosts(): BlogPost[] {
  return listCitySlugs()
    .flatMap(city => listPostSlugs(city).map(slug => loadPost(city, slug)))
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
