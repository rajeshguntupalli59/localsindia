const { chromium } = require('playwright');
const BASE = 'https://www.localsindia.com';
const API = 'https://localsindia-backend.azurewebsites.net';

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Capture all API responses on profile/listings
  const apiResponses = [];
  page.on('response', async r => {
    if (r.url().includes('/api/')) {
      try {
        const body = await r.text().catch(() => '');
        apiResponses.push({ status: r.status(), url: r.url(), body: body.substring(0, 300) });
      } catch { /**/ }
    }
  });

  // Dev login
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'load', timeout: 20000 });
  await page.locator('button:has-text("Dev Login")').click();
  await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  console.log('Token obtained:', token ? 'YES' : 'NO');

  // Test /listings/mine directly from page context
  const mineResult = await page.evaluate(async (apiUrl) => {
    const token = localStorage.getItem('access_token');
    try {
      const r = await fetch(`${apiUrl}/api/v1/listings/mine`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await r.text();
      return { status: r.status, body };
    } catch (e) {
      return { error: e.message };
    }
  }, API);
  console.log('\n--- /listings/mine direct call ---');
  console.log('Status:', mineResult.status);
  console.log('Body:', mineResult.body?.substring(0, 500));

  // Now navigate to My Listings and capture all API calls
  apiResponses.length = 0;
  await page.goto(`${BASE}/profile/listings`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log('\n--- API calls on My Listings page ---');
  apiResponses.forEach(r => console.log(`  [${r.status}] ${r.url}\n    ${r.body.substring(0, 200)}`));

  const pageText = await page.locator('body').textContent().catch(() => '');
  console.log('\n--- Page text (first 400) ---');
  console.log(pageText.substring(0, 400));

  await browser.close();
}

run().catch(console.error);
