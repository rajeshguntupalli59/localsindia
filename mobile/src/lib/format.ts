function trimTrailingZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/**
 * Indian-locale price display. Always truncates (never rounds up) once we
 * switch to k/L notation — rounding up misleads a buyer about the real price.
 */
export function formatPrice(price: number): string {
  if (price < 10000) return `₹${price.toLocaleString('en-IN')}`;
  if (price < 100000) {
    const thousands = Math.floor(price / 100) / 10;
    return `₹${trimTrailingZero(thousands)}k`;
  }
  const lakhs = Math.floor(price / 10000) / 10;
  return `₹${trimTrailingZero(lakhs)}L`;
}

export function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  const months = Math.floor(days / 30);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${months} month${months > 1 ? 's' : ''} ago`;
}
