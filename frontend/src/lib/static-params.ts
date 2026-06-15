// In SSR (hybrid) mode, city pages render on demand — no pre-building needed.
// dynamicParams = true in [city]/layout.tsx allows any city slug through.
export async function getAllCityParams(): Promise<{ city: string }[]> {
  return [];
}
