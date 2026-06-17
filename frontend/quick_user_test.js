/**
 * Quick user-scenario test — 5 core flows a real user would do.
 * Run: node quick_user_test.js
 */
const { chromium } = require('playwright');
const BASE = 'https://www.localsindia.com';

let pass = 0, fail = 0;
const failures = [];

function ok(msg)  { console.log(`  ✅ ${msg}`); pass++; }
function bad(msg, detail) { console.log(`  ❌ ${msg}: ${detail}`); fail++; failures.push({ msg, detail }); }

// Wait until skeleton loaders are gone or content is visible
async function waitForCityPage(page, timeout = 20000) {
  await page.waitForFunction(() => {
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    const hasH1    = !!document.querySelector('h1');
    const hasRetry = Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Retry');
    return skeletons.length === 0 || hasH1 || hasRetry;
  }, { timeout }).catch(() => {});
  await page.waitForTimeout(500);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);

  // Capture JS console errors
  const jsErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') jsErrors.push(msg.text()); });

  // ── FLOW 1: Homepage ─────────────────────────────────────────────────────
  console.log('\n▶  FLOW 1: Homepage loads with city selector');
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const bodyText1 = await page.locator('body').textContent().catch(() => '');
  const hasHomepageHero = bodyText1.includes('Buy') && bodyText1.includes('Sell');
  const hasCityLinks = await page.locator('a[href*="/hyderabad"], a[href*="/bengaluru"]').count();
  const hasSearchInput = await page.locator('input[placeholder*="city"], input[placeholder*="search"]').count();
  if (hasHomepageHero || hasCityLinks > 0 || hasSearchInput > 0) ok(`Homepage loaded correctly (hero present, ${hasCityLinks} city links)`);
  else bad('Homepage', `None of hero/city-links/search found — body starts: "${bodyText1.slice(0,100)}"`);

  // ── FLOW 2: City page ─────────────────────────────────────────────────────
  console.log('\n▶  FLOW 2: Navigate to Hyderabad city page');
  await page.goto(`${BASE}/hyderabad`, { waitUntil: 'load' });
  await waitForCityPage(page, 20000);

  const bodyText2 = await page.locator('body').textContent().catch(() => '');
  const h1Text = await page.locator('h1').first().textContent().catch(() => 'NONE');
  const showsDiscover = bodyText2.includes('Discover');
  const showsCitySelector = bodyText2.includes('Select your city') || bodyText2.includes('Choose a city');
  const showsRetry = bodyText2.includes('Retry');
  const showsPlaceholder = bodyText2.toLowerCase().includes('placeholder');
  const listingCount = await page.locator('a[href*="/hyderabad/classifieds/"]').count();
  const hasCTA = bodyText2.includes('Have something to sell');
  const stillLoading = await page.locator('[class*="animate-pulse"]').count();

  if (showsDiscover && !showsPlaceholder) {
    ok(`City page: Hyderabad loaded — "${h1Text}"`);
    ok(`City page: ${listingCount} listing links visible`);
    if (hasCTA) ok('Post CTA "Have something to sell" banner visible');
    else bad('Post CTA banner', 'Not visible after city loaded');
  } else if (showsCitySelector) {
    bad('City page', `Still showing city SELECTOR — navigationFallback serving wrong HTML`);
  } else if (showsRetry) {
    bad('City page', 'Showing error/Retry — Hyderabad backend API failing');
  } else if (stillLoading > 0) {
    bad('City page', `Still showing skeleton after 20s — API very slow or not responding (${stillLoading} skeletons)`);
  } else if (showsPlaceholder) {
    bad('City page', `Showing PLACEHOLDER city data — useParams() returning 'placeholder' instead of 'hyderabad'. RSC mismatch.`);
  } else {
    bad('City page', `Unknown state — H1="${h1Text}", body: "${bodyText2.slice(0,150)}"`);
  }

  // ── FLOW 3: Error city → Retry button ────────────────────────────────────
  console.log('\n▶  FLOW 3: Invalid city slug → Retry button shown');
  await page.goto(`${BASE}/zzz-not-a-real-city`, { waitUntil: 'load' });
  await waitForCityPage(page, 15000);
  const retryVisible = await page.locator('button:has-text("Retry")').isVisible().catch(() => false);
  const errShowsSelector = (await page.locator('body').textContent().catch(() => '')).includes('Select your city');
  if (retryVisible) ok('Error city: Retry button shown correctly (not redirected to homepage)');
  else if (errShowsSelector) bad('Error city', 'Redirected to homepage — city component still not loading');
  else bad('Error city', 'Neither Retry button nor redirect — unknown state');

  // ── FLOW 4: Post listing form ─────────────────────────────────────────────
  console.log('\n▶  FLOW 4: Post listing form usable');
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const devBtn = await page.locator('button:has-text("Dev Login")').first().isVisible().catch(() => false);
  if (devBtn) {
    await page.locator('button:has-text("Dev Login")').first().click();
    await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
    ok('Dev login succeeded');
  } else {
    bad('Dev login', 'Dev Login button not found');
  }

  await page.goto(`${BASE}/hyderabad/classifieds/post`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const postBodyText = await page.locator('body').textContent().catch(() => '');
  const hasTitleInput = await page.locator('input[placeholder*="Honda"], input[placeholder*="e.g."], input[placeholder*="title"]').count();
  const hasCategorySection = postBodyText.includes('Pick a category') || postBodyText.includes('Category');
  const hasCategoryButtons = await page.locator('button:has-text("Tiffin"), button:has-text("Vehicles"), button:has-text("Electronics")').count();

  if (hasTitleInput > 0) ok('Post form: title input present');
  else bad('Post form title', `Title input not found — ${await page.locator('input').count()} inputs on page`);

  if (hasCategoryButtons > 0) ok(`Post form: ${hasCategoryButtons} category buttons visible`);
  else if (hasCategorySection) bad('Post form categories', 'Category section present but no buttons — API call to /categories may be failing');
  else bad('Post form categories', 'Category section not found at all');

  // Try filling and advancing step 1
  if (hasTitleInput > 0 && hasCategoryButtons > 0) {
    await page.locator('input[placeholder*="Honda"], input[placeholder*="e.g."]').first().fill('Test listing for Honda Activa 2022');
    await page.locator('textarea').first().fill('This is a test listing description that is long enough to pass validation minimum requirement.');
    await page.locator('button:has-text("Vehicles"), button:has-text("Electronics")').first().click();
    await page.waitForTimeout(500);
    const nextBtn = await page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
      const step2visible = await page.locator('text=Photos, text=Add photos, text=Upload').first().isVisible().catch(() => false);
      if (step2visible) ok('Post form: step 1 → step 2 advance works');
      else bad('Post form step advance', 'Could not advance from step 1 to step 2');
    } else bad('Post form Next button', 'Next/Continue button not found on step 1');
  }

  // ── FLOW 5: View listing detail ───────────────────────────────────────────
  console.log('\n▶  FLOW 5: View a real listing → WhatsApp button');
  await page.goto(`${BASE}/hyderabad`, { waitUntil: 'load' });
  await waitForCityPage(page, 20000);
  const firstListingLink = await page.locator('a[href*="/hyderabad/classifieds/"]').first().getAttribute('href').catch(() => null);
  if (firstListingLink) {
    ok(`Found listing: ${firstListingLink}`);
    await page.goto(`${BASE}${firstListingLink}`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const waBtn = await page.locator('a[href*="wa.me"], a:has-text("WhatsApp"), button:has-text("WhatsApp")').first().isVisible().catch(() => false);
    const detailTitle = await page.locator('h1').first().textContent().catch(() => '');
    if (waBtn) ok(`Listing detail loaded, WhatsApp visible — "${detailTitle.slice(0,40)}"`);
    else bad('WhatsApp button', `Detail page loaded but no WhatsApp button — title="${detailTitle.slice(0,40)}"`);
  } else {
    bad('Listing detail', 'No listing links on Hyderabad page — city page not loading correctly');
  }

  // ── REPORT ────────────────────────────────────────────────────────────────
  await browser.close();
  if (jsErrors.length) console.log('\n  JS ERRORS ON PAGE:', jsErrors.slice(0,3).join('\n    '));
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ PASSED: ${pass}   ❌ FAILED: ${fail}`);
  if (failures.length) {
    console.log('\n  WHAT IS BROKEN:');
    failures.forEach((f, i) => console.log(`    ${i+1}. [${f.msg}]\n       ${f.detail}`));
  } else {
    console.log('\n  ALL CORE FLOWS WORKING ✅');
  }
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
