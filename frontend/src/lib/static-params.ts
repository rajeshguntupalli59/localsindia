// Return only a placeholder slug so the static export stays small.
// All real city pages are rendered client-side via Next.js routing +
// Azure SWA navigationFallback → serving /index.html on unknown slugs.
// Fetching all 500+ cities at build time bloats the output to 200 MB
// and causes Azure CDN content-distribution timeouts.
export async function getAllCityParams(): Promise<{ city: string }[]> {
  return [{ city: 'placeholder' }];
}
