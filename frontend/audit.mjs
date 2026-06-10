import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const SS = 'C:\\Users\\rajes\\localindia\\frontend\\audit-screenshots';
mkdirSync(SS, { recursive: true });

const findings = [];
let stepNum = 0;

function log(emoji, label, detail = '') {
  stepNum++;
  const line = `${stepNum}. ${emoji} ${label}${detail ? ' → ' + detail : ''}`;
  console.log(line);
  return line;
}

function flag(severity, area, issue) {
  const entry = { severity, area, issue };
  findings.push(entry);
  console.log(`   ⚡ [${severity}] ${area}: ${issue}`);
}

async function ss(page, name) {
  await page.screenshot({ path: `${SS}\\${name}.png`, fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ── 1. HOMEPAGE ──────────────────────────────────────────────────────────
  log('🏠', 'Homepage load');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await ss(page, '01-homepage');

  const title = await page.title();
  log('✅', 'Page title', title);

  // Hero heading
  const heroH1 = await page.locator('h1').first().textContent().catch(() => null);
  log(heroH1 ? '✅' : '❌', 'Hero H1', heroH1 ?? 'MISSING');

  // Search bar
  const searchInput = await page.locator('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]').first();
  const hasSearch = await searchInput.isVisible().catch(() => false);
  log(hasSearch ? '✅' : '❌', 'Search bar visible', hasSearch ? 'yes' : 'NOT FOUND');
  if (!hasSearch) flag('HIGH', 'Homepage', 'Search bar not visible on load');

  // Category grid
  const catCards = await page.locator('[class*="category"], [class*="Category"]').count();
  log(catCards > 0 ? '✅' : '⚠️', 'Category cards', `${catCards} found`);

  // "Post a Listing" CTA in nav
  const navCTA = await page.locator('a, button').filter({ hasText: /Post a Listing/i }).count();
  log(navCTA > 0 ? '✅' : '❌', 'Nav CTA "Post a Listing"', `${navCTA} instances`);
  if (navCTA === 0) flag('HIGH', 'Homepage Nav', '"Post a Listing" CTA missing');

  // Check for leftover "Post Free Ad" text
  const badCopy = await page.locator('text=Post Free Ad').count();
  log(badCopy === 0 ? '✅' : '❌', '"Post Free Ad" remnants', badCopy === 0 ? 'none' : `${badCopy} found!`);
  if (badCopy > 0) flag('MEDIUM', 'Copy', `"Post Free Ad" still present (${badCopy} places)`);

  // Stats row
  const statsNums = await page.locator('[class*="font-black"], [class*="text-3xl"]').count();
  log(statsNums > 0 ? '✅' : '⚠️', 'Stats row numbers', `${statsNums} found`);

  // Footer
  const footerEl = await page.locator('footer').isVisible().catch(() => false);
  log(footerEl ? '✅' : '❌', 'Footer visible', footerEl ? 'yes' : 'NOT FOUND');
  if (!footerEl) flag('HIGH', 'Footer', 'Footer not visible on homepage');

  // Footer "Post a Listing" link
  const footerPostLink = await page.locator('footer').locator('text=Post a Listing').count().catch(() => 0);
  log(footerPostLink > 0 ? '✅' : '⚠️', 'Footer "Post a Listing" link', `${footerPostLink} found`);

  // ── 2. CITY NAVIGATION ───────────────────────────────────────────────────
  log('🏙️', 'Navigating to city: hyderabad');
  await page.goto(`${BASE}/hyderabad`, { waitUntil: 'networkidle' });
  await ss(page, '02-city-hyderabad');

  const cityH1 = await page.locator('h1, h2').first().textContent().catch(() => null);
  log(cityH1 ? '✅' : '❌', 'City page heading', cityH1 ?? 'MISSING');

  // Category chips
  const chips = await page.locator('[class*="pill"], [class*="chip"], button').filter({ hasText: /Tiffin|Jobs|PG|Vehicles|Electronics/i }).count();
  log(chips > 0 ? '✅' : '⚠️', 'Category filter chips', `${chips} found`);

  // "Post a Listing" button on city page hero
  const cityPostBtn = await page.locator('a, button').filter({ hasText: /Post a Listing/i }).count();
  log(cityPostBtn > 0 ? '✅' : '❌', 'City hero "Post a Listing" btn', `${cityPostBtn} found`);
  if (cityPostBtn === 0) flag('HIGH', 'City Page', 'No "Post a Listing" button on city hero');

  // Empty state when no listings
  const emptyState = await page.locator('text=/No listings yet/i').count();
  log(emptyState > 0 ? '✅' : '⚠️', 'Empty state message', emptyState > 0 ? 'shown' : 'not shown (may have listings)');

  // ── 3. SIGN IN PAGE ───────────────────────────────────────────────────────
  log('🔐', 'Sign-in page');
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await ss(page, '03-signin');

  const signInH1 = await page.locator('h1').first().textContent().catch(() => null);
  log(signInH1 ? '✅' : '❌', 'Sign-in heading', signInH1 ?? 'MISSING');

  // Check it's centered (card should not be at x=0)
  const cardEl = page.locator('div.rounded-2xl, div[class*="rounded-2xl"]').first();
  const cardBox = await cardEl.boundingBox().catch(() => null);
  if (cardBox) {
    const isCentered = cardBox.x > 200;
    log(isCentered ? '✅' : '❌', 'Sign-in card centered', isCentered ? `x=${Math.round(cardBox.x)}` : `HUGGING LEFT x=${Math.round(cardBox.x)}`);
    if (!isCentered) flag('HIGH', 'Sign-in', 'Card not centered on desktop');
  }

  // Phone input present
  const phoneInput = await page.locator('input[placeholder*="+91"]').isVisible().catch(() => false);
  log(phoneInput ? '✅' : '❌', 'Phone input visible', phoneInput ? 'yes' : 'NOT FOUND');
  if (!phoneInput) flag('HIGH', 'Sign-in', 'Phone number input missing');

  // Send OTP button
  const sendOtpBtn = await page.locator('button').filter({ hasText: /Send OTP/i }).isVisible().catch(() => false);
  log(sendOtpBtn ? '✅' : '❌', '"Send OTP" button', sendOtpBtn ? 'yes' : 'NOT FOUND');

  // Try invalid phone
  if (phoneInput) {
    await page.fill('input[placeholder*="+91"]', '12345');
    await page.locator('button').filter({ hasText: /Send OTP/i }).click().catch(() => {});
    await page.waitForTimeout(500);
    const stillOnStep1 = await page.locator('input[placeholder*="+91"]').isVisible().catch(() => false);
    log(stillOnStep1 ? '✅' : '⚠️', 'Invalid phone rejected', stillOnStep1 ? 'stays on step 1' : 'advanced (bug?)');
  }

  // ── 4. POST A LISTING ────────────────────────────────────────────────────
  log('📝', 'Post a Listing page (unauthenticated — should redirect)');
  await page.goto(`${BASE}/hyderabad/classifieds/post`, { waitUntil: 'networkidle' });
  // Wait up to 2s for client-side auth redirect
  await page.waitForURL(url => url.href.includes('/auth/login'), { timeout: 2000 }).catch(() => {});
  await ss(page, '04-post-listing');

  const postUrl = page.url();
  const redirectedToLogin = postUrl.includes('/auth/login');
  log(redirectedToLogin ? '✅' : '❌', 'Post listing auth gate',
    redirectedToLogin ? 'correctly redirects to login' : 'OPEN — unauthenticated users can see the form');
  if (!redirectedToLogin) {
    flag('HIGH', 'Auth Gate', '/post has no login redirect — unauthenticated users can see the form');
  }

  const postH1 = await page.locator('h1, h2').first().textContent().catch(() => null);
  log(postH1 ? '✅' : '⚠️', 'Post page heading', postH1 ?? 'MISSING');

  const stepProgress = await page.locator('[class*="step"], [class*="progress"]').count();
  log(stepProgress > 0 ? '✅' : '⚠️', 'Step progress indicator', `${stepProgress} elements found`);

  // ── 5. SEARCH ────────────────────────────────────────────────────────────
  log('🔍', 'Search page');
  await page.goto(`${BASE}/hyderabad/search?q=tiffin`, { waitUntil: 'networkidle' });
  await ss(page, '05-search');

  const searchUrl = page.url();
  log(searchUrl.includes('/search') ? '✅' : '❌', 'Search URL', searchUrl);

  const searchHeading = await page.locator('h1, h2').first().textContent().catch(() => null);
  log(searchHeading ? '✅' : '⚠️', 'Search page heading', searchHeading ?? 'MISSING');

  const filterSidebar = await page.locator('[class*="filter"], [class*="sidebar"]').count();
  log(filterSidebar > 0 ? '✅' : '⚠️', 'Filter sidebar/panel', `${filterSidebar} elements`);

  const searchEmpty = await page.locator('text=/No results|No listings/i').count();
  log(searchEmpty > 0 ? '✅' : '⚠️', 'Search empty state', searchEmpty > 0 ? 'shown (0 results)' : 'not shown');

  // ── 6. LISTING DETAIL (check with a dummy ID) ───────────────────────────
  log('📋', 'Listing detail page (dummy ID — should redirect to city)');
  await page.goto(`${BASE}/hyderabad/classifieds/abc-123`, { waitUntil: 'networkidle' });
  await page.waitForURL(url => !url.href.includes('/abc-123'), { timeout: 2000 }).catch(() => {});
  await ss(page, '06-listing-detail');

  const detailUrl = page.url();
  const redirectedFromBadId = !detailUrl.includes('/abc-123');
  const is404 = await page.locator('text=/404|not found/i').count();
  log(redirectedFromBadId || is404 > 0 ? '✅' : '⚠️', 'Detail page handles bad ID',
    redirectedFromBadId ? `redirected to ${detailUrl}` : is404 > 0 ? '404 shown' : 'blank/unknown');

  // ── 7. FOOTER ────────────────────────────────────────────────────────────
  log('🦶', 'Footer audit (back to homepage)');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await ss(page, '07-footer');

  const footerLinks = await page.locator('footer a').count();
  log(footerLinks > 0 ? '✅' : '⚠️', 'Footer links count', `${footerLinks} links`);

  const socialIcons = await page.locator('footer svg').count();
  log(socialIcons > 0 ? '✅' : '⚠️', 'Footer social icons (SVG)', `${socialIcons} found`);

  const copyrightText = await page.locator('footer').textContent().catch(() => '');
  const hasYear = /2024|2025|2026/.test(copyrightText);
  log(hasYear ? '✅' : '⚠️', 'Footer copyright year', hasYear ? 'present' : 'MISSING');
  if (!hasYear) flag('LOW', 'Footer', 'Copyright year missing or wrong');

  // ── 8. ADMIN PANEL ───────────────────────────────────────────────────────
  log('🛡️', 'Admin panel');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.waitForURL(url => url.href.includes('/auth/login'), { timeout: 2000 }).catch(() => {});
  await ss(page, '08-admin');

  const adminUrl = page.url();
  const adminBlocked = adminUrl.includes('/auth/login') || adminUrl.includes('/403');
  log(adminBlocked ? '✅' : '❌', 'Admin auth gate',
    adminBlocked ? 'redirects to login (secure)' : 'OPEN — no auth gate on /admin!');
  if (!adminBlocked) flag('CRITICAL', 'Admin', '/admin is publicly accessible — NO auth gate!');

  // ── 9. MOBILE VIEWPORT ───────────────────────────────────────────────────
  log('📱', 'Mobile viewport check (375px)');
  await ctx.close();
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(BASE, { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: `${SS}\\09-mobile-home.png`, fullPage: false });

  const mobileScroll = await mobilePage.evaluate(() => document.body.scrollWidth > window.innerWidth);
  log(!mobileScroll ? '✅' : '❌', 'No horizontal scroll on mobile', mobileScroll ? 'OVERFLOW DETECTED' : 'clean');
  if (mobileScroll) flag('HIGH', 'Mobile', 'Horizontal overflow on 375px — layout broken on phones');

  await mobilePage.goto(`${BASE}/hyderabad`, { waitUntil: 'networkidle' });
  const bottomNav = await mobilePage.locator('nav.fixed').count();
  log(bottomNav > 0 ? '✅' : '⚠️', 'Bottom nav on mobile', `${bottomNav} found`);

  // Sign-in mobile
  await mobilePage.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: `${SS}\\10-mobile-signin.png`, fullPage: true });
  const mobileSignInCard = await mobilePage.locator('div.rounded-2xl').first().boundingBox().catch(() => null);
  log(mobileSignInCard ? '✅' : '⚠️', 'Sign-in card on mobile', mobileSignInCard ? `width=${Math.round(mobileSignInCard.width)}px` : 'not found');

  await mobileCtx.close();

  // ── 10. API HEALTH CHECK ─────────────────────────────────────────────────
  log('🔌', 'Backend API health');
  const apiCtx2 = await browser.newContext();
  const apiPage = await apiCtx2.newPage();
  const apiResp = await apiPage.goto('http://localhost:8000/api/v1/health');
  const apiStatus = apiResp?.status() ?? 0;
  log(apiStatus === 200 ? '✅' : '❌', 'API /health', `HTTP ${apiStatus}`);

  const citiesResp = await apiPage.goto('http://localhost:8000/api/v1/cities');
  const citiesStatus = citiesResp?.status() ?? 0;
  const citiesBody = await citiesResp?.json().catch(() => []);
  log(citiesStatus === 200 ? '✅' : '❌', 'API /cities', `HTTP ${citiesStatus}, ${Array.isArray(citiesBody) ? citiesBody.length : '?'} cities`);
  if (Array.isArray(citiesBody) && citiesBody.length === 0) flag('HIGH', 'Data', 'Zero cities in DB — seed_cities.py not run');

  const categoriesResp = await apiPage.goto('http://localhost:8000/api/v1/categories');
  const catStatus = categoriesResp?.status() ?? 0;
  const catBody = await categoriesResp?.json().catch(() => []);
  log(catStatus === 200 ? '✅' : '❌', 'API /categories', `HTTP ${catStatus}, ${Array.isArray(catBody) ? catBody.length : '?'} categories`);
  if (Array.isArray(catBody) && catBody.length === 0) flag('HIGH', 'Data', 'Zero categories in DB — seed_categories.py not run');

  await apiCtx2.close();
  await browser.close();

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('  BA GO-LIVE AUDIT — FINDINGS SUMMARY');
  console.log('═══════════════════════════════════════════════');
  const critical = findings.filter(f => f.severity === 'CRITICAL');
  const high = findings.filter(f => f.severity === 'HIGH');
  const medium = findings.filter(f => f.severity === 'MEDIUM');
  const low = findings.filter(f => f.severity === 'LOW');
  console.log(`🔴 CRITICAL: ${critical.length}`);
  critical.forEach(f => console.log(`   • [${f.area}] ${f.issue}`));
  console.log(`🟠 HIGH:     ${high.length}`);
  high.forEach(f => console.log(`   • [${f.area}] ${f.issue}`));
  console.log(`🟡 MEDIUM:   ${medium.length}`);
  medium.forEach(f => console.log(`   • [${f.area}] ${f.issue}`));
  console.log(`🟢 LOW:      ${low.length}`);
  low.forEach(f => console.log(`   • [${f.area}] ${f.issue}`));
  console.log('\nScreenshots saved to: ' + SS);
})();
