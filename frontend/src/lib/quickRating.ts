// A star tapped before login is kept for this tab only. It isn't put in the URL,
// so a shared link can never post a rating from someone else's account.
const KEY = 'li_pending_rating';

export function savePendingRating(businessId: string, rating: number): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ businessId, rating }));
  } catch { /* private mode: they just tap again after login */ }
}

/** Returns the rating waiting for this business, and clears it so it's only sent once. */
export function takePendingRating(businessId: string): number | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (pending.businessId !== businessId) return null;
    sessionStorage.removeItem(KEY);
    return Number.isInteger(pending.rating) && pending.rating >= 1 && pending.rating <= 5 ? pending.rating : null;
  } catch {
    return null;
  }
}
