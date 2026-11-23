// Questions the chat greeting card and empty chat offer as one-tap chips.
// Types with lots of real businesses in every city (OpenStreetMap-rich), so the
// first answer a visitor sees has results. The bot searches businesses by type.

const CITY_SLUG = /^[a-z0-9-]+$/;

export function cityNameFromSlug(slug: string): string {
  return slug.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export function chatSuggestions(citySlug: string | null | undefined): string[] {
  const slug = (citySlug ?? '').trim();
  if (!slug || !CITY_SLUG.test(slug)) {
    return ['Find a dentist near me', 'Hospitals near me', 'Is LocalsIndia free?'];
  }
  const city = cityNameFromSlug(slug);
  return [`Dentists in ${city}`, `Hospitals in ${city}`, `Restaurants in ${city}`];
}
