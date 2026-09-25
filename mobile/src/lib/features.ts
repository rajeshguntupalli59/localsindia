// Same switch as frontend/src/lib/features.ts. Paid "Get Verified" badge
// offers (Rs 499/month) are paused — nothing is being sold for now.
export const PAID_BADGES_ENABLED = false;

// Cover photos live on the website; lib/categoryCover returns site paths.
export const SITE_URL = 'https://www.localsindia.com';
export const siteImage = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);
