// Category-specific safety tips shown on listing pages and /trust.
// Keep each list short (3-4 tips) — people skim these right before contacting.

const GENERAL = [
  'Meet in a public place for exchanges',
  'Never share your OTP or banking details',
  'Check the item or service before paying',
  'Report suspicious listings with the Report button',
];

export const SAFETY_TIPS: Record<string, string[]> = {
  jobs: [
    'Never pay money to get a job — no registration fee or deposit',
    'Check the company exists before sharing ID documents',
    'Go to interviews at an office, not a private home',
    'Report anyone asking for payment up front',
  ],
  'pg-roommate': [
    'Visit the room in person before paying any advance',
    'Get a written receipt for every rent or deposit payment',
    'Ask to see the owner\'s ID or a rental agreement',
    'Never pay a "token amount" for a room you haven\'t seen',
  ],
  vehicles: [
    'Check the RC, insurance and pollution certificate match the seller',
    'Take a test ride and get it checked by a mechanic',
    'Complete the RC transfer before handing over full payment',
    'Avoid paying advance for a vehicle you haven\'t seen',
  ],
  electronics: [
    'Test the device in person — calls, camera, charging',
    'Ask for the original bill and check the IMEI or serial number',
    'Meet in a public place, ideally near a service centre',
    'Don\'t pay before you have the device in hand',
  ],
  tiffin: [
    'Try a single meal before paying for a monthly plan',
    'Ask about the kitchen and whether they have an FSSAI registration',
    'Agree on refund terms for missed deliveries up front',
  ],
  education: [
    'Take a trial class before paying for a full course',
    'For home tutors, keep a family member around for the first sessions',
    'Pay monthly rather than a large amount up front',
  ],
  events: [
    'Buy tickets only through the organiser\'s listed link',
    'Be wary of tickets resold at a discount by strangers',
  ],
  businesses: [
    'Confirm the address and phone before visiting',
    'Ask for a written quote before work starts',
    'Pay after the work is done, or in stages',
  ],
};

export function safetyTips(categorySlug?: string | null): string[] {
  return SAFETY_TIPS[categorySlug ?? ''] ?? GENERAL;
}

export const GENERAL_SAFETY_TIPS = GENERAL;
