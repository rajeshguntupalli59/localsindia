const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  page.on('console', m => console.log(`  [${m.type()}] ${m.text()}`));
  page.on('response', r => { if (!r.ok() && r.status() !== 304) console.log(`  [HTTP ${r.status()}] ${r.url()}`); });

  // Step 1: Dev login
  console.log('\n--- Dev Login ---');
  await page.goto('https://www.localsindia.com/auth/login', { waitUntil: 'load', timeout: 20000 });
  const devBtn = page.locator('button:has-text("Dev Login")');
  await devBtn.waitFor({ timeout: 5000 });
  await devBtn.click();
  await page.waitForURL('https://www.localsindia.com/', { timeout: 10000 }).catch(() => {});
  console.log('  URL after login:', page.url());
  const user = await page.evaluate(() => localStorage.getItem('user'));
  console.log('  User in localStorage:', user);

  // Step 2: Navigate to admin
  console.log('\n--- Admin Page ---');
  await page.goto('https://www.localsindia.com/admin/listings', { waitUntil: 'load', timeout: 20000 });
  console.log('  URL after navigate:', page.url());
  await page.waitForTimeout(3000);
  console.log('  URL after wait:', page.url());
  const h1 = await page.locator('h1').first().textContent().catch(() => 'no h1');
  console.log('  h1:', h1);
  const bodyText = await page.locator('body').textContent().catch(() => '');
  console.log('  body (first 300):', bodyText.substring(0, 300));

  await browser.close();
}

run().catch(console.error);
