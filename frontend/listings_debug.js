const { chromium } = require('playwright');
const BASE = 'https://www.localsindia.com';
const API = 'https://localsindia-backend-in.azurewebsites.net';

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  page.on('response', r => {
    if (r.url().includes('/api/') && !r.ok()) console.log(`  [${r.status()}] ${r.url()}`);
  });

  // Dev login
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'load', timeout: 20000 });
  await page.locator('button:has-text("Dev Login")').click();
  await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  const user = await page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}'));
  console.log('User ID:', user.id, 'Role:', user.role);

  // Post a listing
  await page.goto(`${BASE}/hyderabad/classifieds/post`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.locator('input').first().fill('Test Debug Listing Item 123');
  await page.locator('textarea').first().fill('Test description that is at least twenty characters long here.');
  await page.locator('[class*="rounded-2xl border-2"]').first().click();
  await page.locator('button:has-text("Next")').click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Next")').click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Post Free Listing"), button:has-text("Submit")').first().click();
  await page.waitForTimeout(3000);
  const successVisible = await page.locator('text=Listing submitted').isVisible().catch(() => false);
  console.log('Listing posted:', successVisible, '| URL:', page.url());

  // Check /listings/mine directly via API
  console.log('\n--- Direct API call to /listings/mine ---');
  const mineResp = await page.evaluate(async (apiBase) => {
    const token = localStorage.getItem('access_token');
    const r = await fetch(`${apiBase}/api/v1/listings/mine`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await r.text();
    return { status: r.status, body: text.substring(0, 500) };
  }, API);
  console.log('Status:', mineResp.status);
  console.log('Body:', mineResp.body);

  // Visit My Listings page
  console.log('\n--- My Listings Page ---');
  await page.goto(`${BASE}/profile/listings`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(3000);
  const body = await page.locator('body').textContent().catch(() => '');
  console.log('Page content:', body.substring(0, 400));

  await browser.close();
}

run().catch(console.error);
