const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Capture ALL failed requests
  page.on('response', r => {
    if (!r.ok() && r.status() !== 304) {
      console.log(`  [HTTP ${r.status()}] ${r.url()}`);
    }
  });
  page.on('request', r => {
    const url = r.url();
    if (url.includes('/api/')) console.log(`  [REQ] ${r.method()} ${url}`);
  });
  page.on('console', m => {
    if (m.type() === 'error') console.log(`  [ERR] ${m.text()}`);
  });

  // Dev login first
  await page.goto('https://www.localsindia.com/auth/login', { waitUntil: 'load', timeout: 20000 });
  await page.locator('button:has-text("Dev Login")').click();
  await page.waitForURL('https://www.localsindia.com/', { timeout: 10000 }).catch(() => {});

  console.log('\n--- Navigating to search page ---');
  await page.goto('https://www.localsindia.com/hyderabad/search?q=TV', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('\nDone');

  await browser.close();
}

run().catch(console.error);
