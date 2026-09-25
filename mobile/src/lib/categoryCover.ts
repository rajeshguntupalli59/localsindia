// COPY of frontend/src/lib/categoryCover.ts — keep the two in sync.
// Stock cover photos (CC0 / public domain — see public/category-covers/CREDITS.md
// and public/category-covers/v/CREDITS.md). Shown only when a listing or
// business has no photos of its own, always with a "Representative image"
// label so nobody mistakes it for the actual shop.
//
// The photo matches the TYPE of business where the name says what it is
// (a dental clinic gets a dental photo, a bakery gets bread), and lists use
// assignCovers() so neighbouring cards don't repeat the same photo.
import { COVER_POOLS } from './coverPools';

// Per category: [name pattern, photo type]. First match wins; checked only
// against businesses/listings in that category so e.g. a "Sweets" name in
// tiffin and in shops both work but a clinic named "Sweet Smile Dental" stays dental.
const NAME_RULES: Record<string, [RegExp, string][]> = {
  doctors: [
    [/dental|dentist|teeth|tooth|smile|orthodon/, 'dental'],
    [/eye|netra|vision|optic|lasik/, 'eye'],
    [/lab\b|labs\b|diagnos|scan|path(o|ology)|x-?ray|imaging|blood/, 'lab'],
    [/hospital|nursing home|institute|multi.?speciality|super.?speciality|care cent|maternity|trust|medical college/, 'hospital'],
    [/pharma|medical|medicals|chemist|drug|medicine/, 'pharmacy'],
    [/vet|pets?|animal/, 'vet'],
  ],
  tiffin: [
    [/biryani|biriyani|briyani|mandi/, 'biryani'],
    [/bakery|bakers|bake|cake|bread|patisserie/, 'bakery'],
    [/sweet|mithai|misthan/, 'sweets'],
    [/juice|shake|lassi|ice ?cream|fruit/, 'juice'],
    [/tea|chai|coffee|cafe|café|chaat/, 'tea'],
    [/pizza|burger|fries|fast ?food|chicken|kfc|shawarma|grill|bbq|fried/, 'fastfood'],
    [/tiffin|idli|dosa|udupi|udipi|bhavan|mess|meals|veg|sagar|annapurna/, 'southindian'],
    [/restaurant|hotel|dhaba|kitchen|family|dine|dining|bar\b/, 'restaurant'],
  ],
  education: [
    [/kids|play ?school|montessori|kindergarten|nursery|pre.?school/, 'kindergarten'],
    [/college|university|engineering|polytechnic|medical college|institute of/, 'college'],
    [/coaching|academy|tuition|classes|training|institute|centre|center|library/, 'coaching'],
    [/school|vidyalaya|vidyalayam|high|primary|convent|public|matric/, 'school'],
  ],
  'pg-roommate': [[/./, 'hostel']],
  services: [
    [/salon|beauty|parlou?r|hair|barber|spa\b|makeover|bridal|unisex/, 'salon'],
    [/laundry|dry ?clean|wash|ironing/, 'laundry'],
    [/optic|optical|eye|spectacle|lens/, 'eye'],
    [/photo|studio|digital|camera|video/, 'photo'],
    [/vet|pets?|animal|dogs?|cats?/, 'vet'],
    [/tailor|stitch|boutique/, 'tailor'],
    [/xerox|print|copy|computer/, 'stationery'],
  ],
  fashion: [
    [/jewel|gold|diamond|silver|ornament/, 'jewellery'],
    [/shoe|footwear|chappal|sandal|slipper/, 'footwear'],
    [/saree|sari|silk|textile|handloom|fabric|cloth house|cottons/, 'textiles'],
    [/tailor|stitch/, 'tailor'],
  ],
  vehicles: [
    [/tyre|tire|garage|service|repair|mechanic|works|auto ?care|wash|spares|parts/, 'garage'],
    [/cars?|motors|automobile|maruti|hyundai|toyota|mahindra|tata/, 'car'],
  ],
  electronics: [
    [/mobile|phone|cell|telecom/, 'mobile'],
    [/computer|laptop|systems|infotech|it solutions/, 'computer'],
    [/appliance|electrical|home needs|tv|refriger/, 'appliance'],
  ],
  businesses: [
    [/supermarket|super market|hypermarket|mart\b|mall/, 'supermarket'],
    [/kirana|grocery|groceries|provision|rice|dal|oil|general stores?/, 'grocery'],
    [/hardware|paint|sanitary|electricals|tools|plumb|steel|cement/, 'hardware'],
    [/stationery|stationary|book|xerox|print|pens?/, 'stationery'],
    [/sweet|mithai/, 'sweets'],
    [/bakery|bakers|cake/, 'bakery'],
    [/medical|pharma|chemist/, 'pharmacy'],
    [/mobile|phone/, 'mobile'],
    [/jewel|gold/, 'jewellery'],
  ],
};

// When the name doesn't say what it is: a mix of that category's photos
const CATEGORY_DEFAULTS: Record<string, string[]> = {
  doctors: ['clinic', 'hospital'],
  tiffin: ['restaurant', 'southindian', 'curry', 'biryani'],
  education: ['school', 'coaching', 'college'],
  'pg-roommate': ['hostel'],
  services: ['general', 'salon', 'laundry'],
  fashion: ['clothes', 'textiles'],
  vehicles: ['bike', 'garage', 'car'],
  electronics: ['mobile', 'computer', 'appliance'],
  events: ['events'],
  businesses: ['general', 'supermarket', 'grocery'],
  'real-estate': ['realestate'],
  furniture: ['furniture'],
  jobs: ['office'],
  classifieds: ['general'],
};

// When a list has used up every photo of a type, continue with related
// photos (still the same kind of place) before repeating one.
const SPILL: Record<string, string[]> = {
  hospital: ['clinic', 'lab'], clinic: ['hospital', 'lab'], dental: ['clinic'], pharmacy: ['clinic', 'lab'],
  lab: ['clinic', 'hospital'], eye: ['clinic'],
  restaurant: ['curry', 'southindian', 'biryani'], southindian: ['curry', 'restaurant'], curry: ['restaurant', 'southindian'],
  biryani: ['curry', 'restaurant'], fastfood: ['restaurant', 'curry'], bakery: ['sweets'], sweets: ['bakery'],
  tea: ['juice', 'restaurant'], juice: ['tea', 'fastfood'],
  school: ['coaching', 'college'], college: ['school', 'coaching'], coaching: ['school', 'college'], kindergarten: ['school'],
  salon: ['general'], laundry: ['general'], tailor: ['textiles', 'clothes'], clothes: ['textiles'], textiles: ['clothes'],
  jewellery: ['clothes'], footwear: ['clothes'], bike: ['garage', 'car'], car: ['garage', 'bike'], garage: ['bike', 'car'],
  mobile: ['computer', 'appliance'], computer: ['mobile'], appliance: ['mobile'],
  supermarket: ['grocery', 'general'], grocery: ['supermarket', 'general'], general: ['supermarket', 'grocery'],
  hardware: ['general'], stationery: ['general'], hostel: [], realestate: [], furniture: [], office: [], events: [],
};

export interface CoverSubject {
  id?: string;
  category_slug?: string | null;
  /** business name or listing title */
  name?: string | null;
}

function types(subject: CoverSubject): string[] {
  const cat = subject.category_slug ?? '';
  const name = (subject.name ?? '').toLowerCase();
  const rule = (NAME_RULES[cat] ?? []).find(([re]) => re.test(name));
  return rule ? [rule[1]] : (CATEGORY_DEFAULTS[cat] ?? ['general']);
}

function pool(subject: CoverSubject): string[] {
  const files = types(subject).flatMap(t => COVER_POOLS[t] ?? []);
  return files.length ? files : COVER_POOLS.general;
}

/** The item's own photos first, then related types' photos (for lists). */
function extendedPool(subject: CoverSubject): string[] {
  const own = pool(subject);
  const extra = types(subject).flatMap(t => SPILL[t] ?? []).flatMap(t => COVER_POOLS[t] ?? []);
  return [...own, ...extra.filter(f => !own.includes(f))];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Cover photo for one listing/business — stable per item. */
export function coverFor(subject: CoverSubject): string {
  const files = pool(subject);
  return files[hash(subject.id ?? subject.name ?? '') % files.length];
}

/** Covers for a whole list, so neighbouring cards don't repeat the same photo
 *  (as long as the photo type has enough photos). Returns id -> url. */
export function assignCovers(subjects: CoverSubject[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const s of subjects) {
    const own = pool(s);
    const start = hash(s.id ?? s.name ?? '') % own.length;
    // own photos (from this item's usual one), then related types, before repeating
    const order = [...own.slice(start), ...own.slice(0, start), ...extendedPool(s).slice(own.length)];
    let pick = order.find(f => !used.has(f));
    if (!pick) {
      // every suitable photo is already on the page: start a fresh cycle so
      // repeats are spread out evenly instead of piling onto one photo
      order.forEach(f => used.delete(f));
      pick = order[0];
    }
    used.add(pick);
    if (s.id) out.set(s.id, pick);
  }
  return out;
}

/** Category-level cover (no name/id known). Kept for simple call sites. */
export function categoryCover(slug?: string | null): string {
  return coverFor({ category_slug: slug, id: slug ?? '' });
}

/** assignCovers for listings (their title plays the role of the name). */
export function listingCovers(listings: { id: string; category_slug?: string | null; title: string }[]): Map<string, string> {
  return assignCovers(listings.map(l => ({ id: l.id, category_slug: l.category_slug, name: l.title })));
}

/** assignCovers for businesses. */
export function businessCovers(businesses: { id: string; category_slug?: string | null; name: string }[]): Map<string, string> {
  return assignCovers(businesses.map(b => ({ id: b.id, category_slug: b.category_slug, name: b.name })));
}
