const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend.azurewebsites.net';
const API_URL = `${API_BASE}/api/v1`;

export async function getAllCityParams(): Promise<{ city: string }[]> {
  try {
    const res = await fetch(`${API_URL}/cities`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const cities: { slug: string }[] = await res.json();
    return cities.map((c) => ({ city: c.slug }));
  } catch {
    return [];
  }
}
