/** "96631 22267", "096631-22267", "+91 96631 22267" → "+919663122267".
 *  null if it isn't a 10-digit Indian mobile (starts 6–9) — the backend rule. */
export function toIndianMobile(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}
