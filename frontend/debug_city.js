/**
 * Deep diagnostic — tracks network requests, URL changes, and console errors
 * for /hyderabad vs /zzz-not-a-city to find the exact failure point.
 */
const { chromium } = require('playwright');
const BASE = 'https://www.localsindia.com';

async function diagnose(cityPath) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const requests = [];
  const errors = [];
  const urlChanges = [];

  page.on('request', req => {
    const url = req.url();
    if (!url.includes('fonts.g') && !url.includes('gtag') && !url.includes('google')) {
      requests.push(`${req.resourceType().padEnd(8)} ${req.method()} ${url.replace(BASE,'')}`);
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 120));
  });
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) urlChanges.push(frame.url());
  });

  console.log(`\n${'═'.repeat(60)}\n  DIAGNOSING: ${BASE}${cityPath}\n${'═'.repeat(60)}`);

  await page.goto(`${BASE}${cityPath}`, { waitUntil: 'load', timeout: 30000 });

  // Wait up to 15s for any content to settle
  await page.waitForFunction(() => {
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    const h1 = document.querySelector('h1');
    const retry = Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Retry');
    return skeletons.length === 0 || h1 || retry;
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);

  const finalUrl = page.url();
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const h1 = await page.locator('h1').first().textContent().catch(() => 'NONE');
  const hasDiscover = bodyText.includes('Discover');
  const hasCitySelector = bodyText.includes('Select your city') || bodyText.includes('Choose a city') || bodyText.includes('Your City');
  const hasRetry = bodyText.includes('Retry');
  const hasPlaceholder = bodyText.toLowerCase().includes('placeholder');

  console.log(`\nFinal URL: ${finalUrl}`);
  console.log(`H1: "${h1}"`);
  console.log(`Has "Discover": ${hasDiscover}`);
  console.log(`Has city selector: ${hasCitySelector}`);
  console.log(`Has Retry button: ${hasRetry}`);
  console.log(`Has "placeholder": ${hasPlaceholder}`);

  console.log(`\nURL changes during navigation:`);
  urlChanges.forEach(u => console.log(`  → ${u}`));

  const rscRequests = requests.filter(r => r.includes('_rsc') || r.includes('?_rsc'));
  if (rscRequests.length > 0) {
    console.log(`\nRSC fetch requests (critical):`);
    rscRequests.forEach(r => console.log(`  ${r}`));
  }

  if (errors.length > 0) {
    console.log(`\nConsole errors:`);
    errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
  }

  console.log(`\nBody text (first 300 chars): "${bodyText.slice(0, 300)}"`);

  await browser.close();
}

async function main() {
  await diagnose('/hyderabad');
  await diagnose('/zzz-not-a-city');
}

main().catch(console.error);
