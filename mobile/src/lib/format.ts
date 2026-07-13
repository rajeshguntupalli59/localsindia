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
