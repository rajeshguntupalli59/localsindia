// Owner outreach: the admin sends each message themselves from their own
// WhatsApp — these helpers only pre-fill it. No bulk or automated sending.

const SITE = 'https://www.localsindia.com';

export const OUTCOME_LABELS: Record<string, string> = {
  whatsapp_sent: 'WhatsApp sent',
  no_answer: 'No answer',
  callback: 'Call back later',
  interested: 'Interested',
  not_interested: 'Not interested',
  wrong_number: 'Wrong number',
};

export function businessUrl(b: { id: string; city_slug: string }): string {
  return `${SITE}/${b.city_slug}/businesses/${b.id}`;
}

export function outreachMessage(b: { id: string; name: string; city_slug: string; city_name: string }): string {
  return [
    `Namaste! Your business "${b.name}" is listed for free on LocalsIndia, the local directory for ${b.city_name}:`,
    businessUrl(b),
    '',
    'You can claim it for free to update your phone number, timings and photos, and reply to customer reviews — open the link and tap "Claim this Business".',
    '',
    "If you'd rather not hear from us, just reply STOP.",
  ].join('\n');
}

/** wa.me link with the message pre-filled; null when the number isn't an Indian mobile. */
export function whatsappLink(mobile: string | null, text: string): string | null {
  const digits = (mobile ?? '').replace(/\D/g, '');
  if (!/^91[6-9]\d{9}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
