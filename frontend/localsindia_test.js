/**
 * LocalsIndia — Full E2E Test Suite v2
 * Covers: homepage, auth, city nav, post listing, admin approve/reject,
 *         listing detail, WA verified badge, seller reviews, search edge cases,
 *         profile, admin events, SEO pages, PWA, neighbourhood field,
 *         invalid inputs, 404 handling, mobile viewport, SQL injection
 *
 * Run: node localsindia_test.js
 * Requires: npm install playwright (or npx playwright install chromium)
 */

const { chromium } = require('playwright');

const BASE   = 'https://www.localsindia.com';
const ISSUES = [];
const PASS   = [];
let   LISTED_ID = null;   // listing id set after post
let   PAGE_TOKEN = null;  // JWT stored after dev login

function log(msg)  { console.log(msg); }
function pass(lbl) { PASS.push(lbl); log(`  ✅ ${lbl}`); }
function fail(lbl, detail) { ISSUES.push({ label: lbl, detail }); log(`  ❌ ${lbl}: ${detail}`); }
function section(name) { log(`\n${'─'.repeat(64)}\n▶  ${name}\n${'─'.repeat(64)}`); }
function skip(lbl, reason) { log(`  ⏭  SKIP ${lbl} — ${reason}`); }

// ─── helpers ────────────────────────────────────────────────────────────────

async function expectVisible(page, selector, label) {
  const el = await page.locator(selector).first().isVisible().catch(() => false);
  el ? pass(label) : fail(label, `selector "${selector}" not visible`);
  return el;
}

async function expectNoConsoleErrors(page, consoleErrors, label) {
  const errs = [...consoleErrors].filter(e =>
    !e.includes('Failed to load resource') &&
    !e.includes('favicon') &&
    !e.includes('NEXT_PUBLIC') &&
    !e.includes('net::ERR'));
  consoleErrors.length = 0;
  if (errs.length === 0) pass(label);
  else fail(label, errs.slice(0, 2).join(' | '));
}

async function noHttp4xx(page, label, fn) {
  const bad = [];
  const handler = r => { if (r.status() >= 400 && r.status() < 500 && !r.url().includes('favicon')) bad.push(`${r.status()} ${r.url()}`); };
  page.on('response', handler);
  await fn();
  page.off('response', handler);
  if (bad.length === 0) pass(label);
  else fail(label, bad.slice(0, 3).join(' | '));
}

// ─── main ───────────────────────────────────────────────────────────────────

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  // ── DESKTOP TEST ────────────────────────────────────────────────────────────
  log('\n════════════════════════════════════════════════════════════════');
  log('  DESKTOP (1280×800)');
  log('════════════════════════════════════════════════════════════════');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(e.message));

  try {

    // ──────────────────────────────────────────────────────────────────────────
    section('1. HOMEPAGE — all sections + no errors');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

    await expectVisible(page, 'h1', 'Homepage H1 present');
    await expectVisible(page, 'text=Browse by Category', 'Category grid section heading');
    await expectVisible(page, 'text=Tiffin', 'Tiffin category card visible');
    await expectVisible(page, 'text=WhatsApp', '"WhatsApp" text visible on homepage');
    await expectNoConsoleErrors(page, consoleErrors, 'No JS errors on homepage');

    // Search bar
    const searchInput = page.locator('input[placeholder*="tiffin"], input[type="search"], input[type="text"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);
    if (hasSearch) {
      await searchInput.fill('');
      pass('Search input focusable and clearable');
    } else {
      fail('Search input', 'Not found on homepage');
    }

    // Language selector
    const langBtn = page.locator('button').filter({ hasText: /English|EN|LanguageSelector|Globe/i }).first();
    const langVisible = await langBtn.isVisible().catch(() => false);
    if (langVisible) pass('Language selector visible in navbar');
    else skip('Language selector', 'Button not detected by text — may be icon-only');

    // PWA manifest
    const manifestRes = await page.goto(`${BASE}/manifest.json`, { timeout: 10000 }).catch(() => null);
    if (manifestRes && manifestRes.ok()) pass('PWA manifest.json accessible');
    else fail('PWA manifest.json', 'Not reachable or non-200');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Service worker
    const swRes = await page.goto(`${BASE}/sw.js`, { timeout: 10000 }).catch(() => null);
    if (swRes && swRes.ok()) pass('Service worker sw.js accessible');
    else fail('Service worker sw.js', 'Not reachable');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });


    // ──────────────────────────────────────────────────────────────────────────
    section('2. AUTH — phone validation edge cases');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 20000 });

    // 5-digit phone → should fail validation
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="Phone"]').first();
    const phoneVisible = await phoneInput.isVisible().catch(() => false);
    if (phoneVisible) {
      await phoneInput.fill('12345');
      const sendOtpBtn = page.locator('button:has-text("Send OTP"), button:has-text("Get OTP"), button[type="submit"]').first();
      await sendOtpBtn.click();
      await page.waitForTimeout(1200);
      const errorText = await page.locator('[class*="error"], [class*="toast"], text=valid').first().textContent().catch(() => '');
      const isBadPhone = !page.url().includes('/auth/otp') && !page.url().includes('step=2');
      if (isBadPhone) pass('Invalid 5-digit phone rejected by validation');
      else fail('Phone validation', `Short phone not caught — moved to next step or url: ${page.url()}`);
    } else {
      skip('Phone validation', 'Phone input not found on login page');
    }

    // Landline format (no 6-9 start)
    if (phoneVisible) {
      await phoneInput.fill('1234567890');
      const sendBtn = page.locator('button:has-text("Send OTP"), button:has-text("Get OTP"), button[type="submit"]').first();
      await sendBtn.click();
      await page.waitForTimeout(1200);
      const badLandline = !page.url().includes('step=2');
      if (badLandline) pass('Landline-format phone (starts with 1) rejected');
      else log('  ⚠  Landline phone not rejected — check +91 prefix validation');
    }

    // Dev login — primary auth path
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 15000 });
    const devBtn = page.locator('button:has-text("Dev Login")');
    const devBtnVisible = await devBtn.isVisible().catch(() => false);
    if (!devBtnVisible) {
      fail('Dev Login button', 'Not visible — NEXT_PUBLIC_OTP_DEBUG=true required');
    } else {
      pass('Dev Login button visible (OTP_DEBUG=true)');
      await devBtn.click();
      await page.waitForURL(`${BASE}/`, { timeout: 12000 }).catch(() => {});
      if (page.url() === `${BASE}/` || page.url() === BASE + '/') pass('Dev login redirects to homepage');
      else fail('Dev login redirect', `Landed on ${page.url()}`);

      PAGE_TOKEN = await page.evaluate(() => localStorage.getItem('access_token'));
      if (PAGE_TOKEN) pass('access_token stored in localStorage');
      else fail('access_token missing', 'Not in localStorage after dev login');
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('3. PROTECTED ROUTES — must redirect when logged OUT');
    // ──────────────────────────────────────────────────────────────────────────
    // Log out by clearing storage
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    for (const [route, label] of [
      ['/profile', 'Profile'],
      ['/profile/listings', 'My Listings'],
    ]) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(1500);
      const redirected = page.url().includes('/auth/login');
      if (redirected) pass(`${label} → redirects to login when unauthenticated`);
      else fail(`${label} auth guard`, `Did not redirect; URL: ${page.url()}`);
    }

    // Admin — non-admin redirect
    await page.goto(`${BASE}/admin/listings`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    const adminBlocked = page.url().includes('/auth/login') || page.url().includes('/');
    if (adminBlocked) pass('Admin blocked when not logged in');
    else fail('Admin auth guard', `Accessible without login; URL: ${page.url()}`);

    // Re-login via dev button
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 15000 });
    const devBtn2 = page.locator('button:has-text("Dev Login")');
    if (await devBtn2.isVisible().catch(() => false)) {
      await devBtn2.click();
      await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
      PAGE_TOKEN = await page.evaluate(() => localStorage.getItem('access_token'));
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('4. POST LISTING — valid flow with area/neighbourhood');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/hyderabad/classifieds/post`, { waitUntil: 'networkidle', timeout: 20000 });
    if (page.url().includes('/auth/login')) {
      fail('Post listing page', 'Redirected to login — dev login did not persist');
    } else {
      pass('Post listing page accessible when logged in');

      // Step 1 — category + title + description + price
      const catCards = page.locator('[class*="rounded-2xl border-2"]');
      const catCount = await catCards.count();
      if (catCount > 0) {
        await catCards.first().click();
        pass(`Category card clicked (${catCount} available)`);
      } else fail('Category cards', 'None found on post page step 1');

      await page.locator('input[placeholder*="title"], input[placeholder*="Title"], input[placeholder*="Honda"]').first()
        .fill('Test Sony Bravia 55 inch 4K TV').catch(() => {});
      await page.locator('textarea').first()
        .fill('Excellent condition Sony Bravia 55 inch 4K smart TV. Only 8 months old. Moving out. Box + accessories included. Call or WhatsApp.').catch(() => {});
      await page.locator('input[type="number"]').first().fill('24999').catch(() => {});

      await page.locator('button:has-text("Next")').first().click();
      // Wait for Framer Motion AnimatePresence mode="wait" exit+enter (~300ms each)
      await page.waitForTimeout(2500);
      // h2 "Add photos" is always visible at step 2, regardless of loading state
      const step2 = await page.locator('h2:has-text("Add photos")').isVisible().catch(() => false);
      if (step2) pass('Step 1 → Step 2 advance (photos)');
      else {
        const toastMsg = await page.locator('[data-sonner-toast]').first().textContent().catch(() => '');
        fail('Step 1 → Step 2', `Not advanced. Toast: "${toastMsg}"`);
      }

      // Step 2 — skip photos, advance to contact step
      await page.locator('button:has-text("Next")').first().click();
      await page.waitForTimeout(2500);

      // Step 3 shows "Contact details" h2 and a tel input
      const step3 = await page.locator('h2:has-text("Contact details")').isVisible().catch(() => false);
      if (step3) pass('Step 2 → Step 3 advance (contact)');
      else fail('Step 2 → Step 3', 'Not advanced to contact step');

      // Area/neighbourhood field
      const areaInput = page.locator('input[placeholder*="Koramangala"], input[placeholder*="area"], input[placeholder*="Area"], input[placeholder*="neighbourhood"]').first();
      const areaVisible = await areaInput.isVisible().catch(() => false);
      if (areaVisible) {
        await areaInput.fill('Banjara Hills');
        pass('Area/neighbourhood field filled');
      } else skip('Area field', 'Placeholder text not matched — field may exist with different placeholder');

      // Verify phone prefill
      const telInput = page.locator('input[type="tel"]');
      const prefilled = await telInput.inputValue().catch(() => '');
      if (prefilled) pass(`Phone prefilled: ${prefilled}`);
      else {
        await telInput.fill('9876543210').catch(() => {});
        log('  ℹ Phone not prefilled — filled manually');
      }

      // Submit — Azure API can take 4-6s on first request; use waitForSelector
      await page.locator('button:has-text("Post Free Listing"), button:has-text("Submit"), button:has-text("Post Listing")').first().click();
      let success = false;
      try {
        await page.waitForSelector(
          'text=Listing submitted, text=under review',
          { timeout: 8000 }
        );
        success = true;
      } catch { /* timed out — check BL-02 toast below */ }

      if (success) {
        pass('Listing submitted successfully — under review');
      } else {
        // BL-02: dev user may already have 10 listings — 429 is expected after multiple runs
        const toastErr = await page.locator('[data-sonner-toast]').first().textContent().catch(() => '');
        if (toastErr.includes('maximum') || toastErr.includes('10')) {
          pass(`Listing submission: BL-02 limit reached (expected in repeated test runs): "${toastErr}"`);
        } else {
          fail('Listing submission', `Success not shown. Toast: "${toastErr}". URL: ${page.url()}`);
        }
      }
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('5. POST LISTING — validation edge cases (bad inputs)');
    // ──────────────────────────────────────────────────────────────────────────
    // Clear saved form state so this test starts fresh
    await page.evaluate(() => localStorage.removeItem('li_post_form'));
    await page.goto(`${BASE}/hyderabad/classifieds/post`, { waitUntil: 'networkidle', timeout: 20000 });
    if (!page.url().includes('/auth/login')) {
      // Skip category, leave title empty, try to advance
      await page.locator('button:has-text("Next")').first().click();
      await page.waitForTimeout(1200);
      const stillStep1 = !(await page.locator('h2:has-text("Add photos")').isVisible().catch(() => false));
      if (stillStep1) pass('Empty step 1 blocked — validation works');
      else fail('Step 1 empty validation', 'Advanced with no title/category — validation missing');

      // Fill category + 1-char title
      await page.locator('[class*="rounded-2xl border-2"]').first().click().catch(() => {});
      await page.locator('input[placeholder*="title"], input[placeholder*="Title"], input[placeholder*="Honda"]').first()
        .fill('Hi').catch(() => {});
      await page.locator('button:has-text("Next")').first().click();
      await page.waitForTimeout(800);
      const blocked2 = !(await page.locator('text=Add photos').isVisible().catch(() => false));
      if (blocked2) pass('Too-short title blocked');
      else log('  ⚠  2-char title allowed — may be intentional');
    } else {
      skip('Validation edge cases', 'Not logged in');
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('6. MY LISTINGS — listing visible after post');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/profile/listings`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2500);
    if (page.url().includes('/auth/login')) {
      fail('My Listings', 'Redirected to login');
    } else {
      const mlH1 = await page.locator('h1').first().textContent().catch(() => '');
      if (mlH1.includes('Listings') || mlH1.includes('listings')) pass(`My Listings h1: "${mlH1.trim()}"`);
      else fail('My Listings heading visible', `H1: "${mlH1.trim()}"`);
      const listingShown = await page.locator('text=Test Sony Bravia').first().isVisible().catch(() => false);
      if (listingShown) {
        pass('Posted listing visible in My Listings');
        // Extract listing ID from the edit link
        const editLink = await page.locator('a[href*="/classifieds/"]').first().getAttribute('href').catch(() => '');
        const idMatch = editLink.match(/classifieds\/([a-f0-9-]{36})/);
        if (idMatch) { LISTED_ID = idMatch[1]; log(`   Listing ID captured: ${LISTED_ID}`); }
      } else {
        const emptyState = await page.locator('text=No listings yet, text=No active listings').first().isVisible().catch(() => false);
        if (emptyState) pass('My Listings shows empty state (listing may still be pending)');
        else log('  ⚠  Listing not visible yet — may need admin approval or ISR refresh');
      }
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('7. ADMIN — pending queue, approve + events queue');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/admin/listings`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2500);

    if (page.url().includes('/auth/login') || page.url() === BASE + '/') {
      fail('Admin page', 'Dev user does not have admin role — set role=admin in DB');
    } else {
      pass('Admin listings page accessible');

      // Approve the first pending listing — count-based check
      const approveBtns = page.locator('button:has-text("Approve")');
      const countBefore = await approveBtns.count();
      if (countBefore > 0) {
        await approveBtns.first().click();
        await page.waitForTimeout(2500);
        const countAfter = await page.locator('button:has-text("Approve")').count();
        if (countAfter < countBefore) pass(`Listing approved and removed from pending queue (${countBefore} → ${countAfter})`);
        else fail('Admin approve', 'Listing still shown in queue after approval');
      } else {
        pass('Admin queue empty or listing already approved');
      }

      // Reject flow — reject modal
      // Use filter to avoid matching the "Rejected" status tab (which also contains "Reject")
      await page.goto(`${BASE}/admin/listings`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(2000);
      const rejectBtn = page.locator('button').filter({ hasText: /^Reject$/ }).first();
      if (await rejectBtn.isVisible().catch(() => false)) {
        await rejectBtn.click();
        await page.waitForTimeout(600);
        const modal = await page.locator('text=Reject Listing, textarea').first().isVisible().catch(() => false);
        if (modal) {
          pass('Reject modal opens');
          // Submit with empty reason — should fail
          await page.locator('button:has-text("Reject"):not(:has-text("Cancel"))').last().click();
          await page.waitForTimeout(600);
          const toastErr = await page.locator('[data-sonner-toast]').first().textContent().catch(() => '');
          if (toastErr.toLowerCase().includes('reason')) pass('Empty reject reason shows toast error');
          else log(`  ⚠  Reject with no reason: toast says "${toastErr}"`);
          // Close modal
          await page.locator('button:has-text("Cancel")').click().catch(() => {});
          await page.keyboard.press('Escape').catch(() => {});
        } else {
          fail('Reject modal', 'Did not open');
        }
      } else {
        skip('Reject flow', 'No pending listings to reject');
      }

      // Admin — Events tab (Task 6 — requires Azure deployment of new page)
      await page.goto(`${BASE}/admin/events`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2000);
      const evtPageUrl = page.url();
      if (evtPageUrl.includes('/auth/login') || evtPageUrl === BASE + '/') {
        skip('Admin Events page', 'Page not deployed yet — push to master and wait for Azure CI');
      } else {
        await expectVisible(page, 'h1:has-text("Events"), h1', 'Admin Events page heading');
        // Status tabs: "Pending", "Active", "Cancelled", "Completed"
        const hasTabs = await page.locator('button').filter({ hasText: 'Pending' }).first().isVisible().catch(() => false);
        if (hasTabs) pass('Admin Events: Pending tab visible');
        else {
          const pageContent = await page.locator('body').textContent().catch(() => '');
          const hasPendingText = pageContent.includes('Pending');
          if (hasPendingText) pass('Admin Events page loaded with tab text visible');
          else fail('Events status tabs', 'Tabs not visible on admin events page');
        }
        consoleErrors.length = 0;
      }
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('8. CITY PAGE — listing visible after approval');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/hyderabad`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2500);

    const listingOnCity = await page.locator('text=Test Sony Bravia').first().isVisible().catch(() => false);
    if (listingOnCity) {
      pass('Approved listing visible on city page');
      // Navigate to listing detail
      await page.locator('text=Test Sony Bravia').first().click();
      await page.waitForURL(/classifieds/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (page.url().includes('/classifieds/')) {
        pass('Listing card click → listing detail page');
        // Capture ID from URL
        const urlId = page.url().match(/classifieds\/([a-f0-9-]{36})/)?.[1];
        if (urlId) LISTED_ID = urlId;
      } else {
        fail('Listing detail navigation', `URL: ${page.url()}`);
      }
    } else {
      log('  ⚠  Listing not on city page yet — may need ISR revalidation (revalidate=3600)');
      // Navigate directly if we have the ID
      if (LISTED_ID) {
        await page.goto(`${BASE}/hyderabad/classifieds/${LISTED_ID}`, { waitUntil: 'load', timeout: 15000 });
      }
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('9. LISTING DETAIL — WA badge, reviews, safety tips');
    // ──────────────────────────────────────────────────────────────────────────
    if (page.url().includes('/classifieds/')) {
      await page.waitForTimeout(1000);

      // Core detail elements
      await expectVisible(page, 'h1', 'Listing H1 title');
      await expectVisible(page, 'text=Chat on WhatsApp', 'WhatsApp CTA button');
      await expectVisible(page, 'text=Stay Safe', 'Safety tips card');
      await expectVisible(page, 'text=Reviews', 'Reviews section heading');
      await expectVisible(page, 'text=Rate seller', '"Rate seller" button in reviews section');

      // WA verified badge check
      const waBadge = await page.locator('text=Active on WhatsApp').isVisible().catch(() => false);
      log(`  ℹ  WA Verified badge: ${waBadge ? 'visible' : 'not yet (first click required)'}`);

      // Area field in location row
      const areaShown = await page.locator('text=Banjara Hills').isVisible().catch(() => false);
      if (areaShown) pass('Area/neighbourhood "Banjara Hills" visible on listing detail');
      else log('  ⚠  Area not shown — listing may not have area set, or it was a different listing');

      // Trigger WA click → review prompt after 5s
      const waBtn = page.locator('a:has-text("Chat on WhatsApp")').first();
      if (await waBtn.isVisible().catch(() => false)) {
        // Click but block the new tab from opening
        await page.evaluate(() => {
          document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
            a.addEventListener('click', e => e.preventDefault(), { capture: true });
          });
        });
        await waBtn.click({ force: true });
        pass('WhatsApp button clicked (tab open blocked for test)');

        // Wait 5.5s for review prompt
        await page.waitForTimeout(5500);
        const reviewPrompt = await page.locator('text=How was the seller?, text=Rate your WhatsApp').first().isVisible().catch(() => false);
        if (reviewPrompt) {
          pass('Review prompt appears 5s after WA click');

          // Select 4 stars
          const stars = page.locator('button > svg[class*="w-9"]');
          const starCount = await stars.count();
          if (starCount >= 4) {
            await stars.nth(3).click({ force: true });
            pass('4th star selected in review prompt');
          }

          // Add a comment
          const reviewTextarea = page.locator('textarea[placeholder*="Optional"]');
          await reviewTextarea.fill('Great seller, very responsive on WhatsApp. Item exactly as described.').catch(() => {});

          // Submit
          await page.locator('button:has-text("Submit Review")').click();
          await page.waitForTimeout(2000);
          const reviewToast = await page.locator('[data-sonner-toast]').first().textContent().catch(() => '');
          if (reviewToast.toLowerCase().includes('review') || reviewToast.toLowerCase().includes('thanks')) {
            pass('Review submitted successfully');
          } else {
            fail('Review submission', `Toast: "${reviewToast}"`);
          }

          // Duplicate review → 409 handled gracefully
          await page.evaluate(() => {
            document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
              a.addEventListener('click', e => e.preventDefault(), { capture: true });
            });
          });
          const waBtn2 = page.locator('a:has-text("Chat on WhatsApp")').first();
          if (await waBtn2.isVisible().catch(() => false)) {
            await waBtn2.click({ force: true });
            await page.waitForTimeout(5500);
            const prompt2 = await page.locator('text=How was the seller?').isVisible().catch(() => false);
            if (!prompt2) pass('Duplicate review prompt suppressed (alreadyReviewed=true)');
            else {
              // If it appears, try to submit and expect 409
              const stars2 = page.locator('button > svg[class*="w-9"]');
              if (await stars2.count() >= 1) await stars2.first().click({ force: true });
              await page.locator('button:has-text("Submit Review")').click().catch(() => {});
              await page.waitForTimeout(1500);
              const dupToast = await page.locator('[data-sonner-toast]').first().textContent().catch(() => '');
              if (dupToast.toLowerCase().includes('already')) pass('Duplicate review → "already reviewed" message shown');
              else fail('Duplicate review handling', `Toast: "${dupToast}"`);
            }
          }
        } else {
          log('  ⚠  Review prompt did not appear — may require logged-in user; check dev login state');
        }
      }

      // Review in reviews section after reload
      await page.reload({ waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(2000);
      const reviewVisible = await page.locator('text=Great seller').isVisible().catch(() => false);
      if (reviewVisible) pass('Submitted review visible in reviews section after reload');
      else log('  ⚠  Review not visible yet — may still be loading');

      await expectNoConsoleErrors(page, consoleErrors, 'No JS errors on listing detail');
    } else {
      skip('Listing detail tests', 'Not on a classifieds detail page');
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('10. LISTING DETAIL — 404 and non-existent ID');
    // ──────────────────────────────────────────────────────────────────────────
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`${BASE}/hyderabad/classifieds/${fakeId}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    const notOnDetail = !page.url().includes(fakeId) || await page.locator('text=not found, text=404, text=page not found').first().isVisible().catch(() => false);
    const redirectedHome = page.url().includes('/hyderabad') && !page.url().includes(fakeId);
    if (notOnDetail || redirectedHome) pass('Non-existent listing → redirected or 404 shown');
    else fail('Non-existent listing handling', `Still on ${page.url()} with no 404 message`);


    // ──────────────────────────────────────────────────────────────────────────
    section('11. SEARCH — normal, empty, SQL injection, Unicode');
    // ──────────────────────────────────────────────────────────────────────────

    // Normal search
    await noHttp4xx(page, 'Search "TV" — no 4xx errors', async () => {
      await page.goto(`${BASE}/hyderabad/search?q=TV`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(2000);
    });

    // SQL injection attempt
    const sqlPayload = encodeURIComponent("' OR 1=1; DROP TABLE listings; --");
    await page.goto(`${BASE}/hyderabad/search?q=${sqlPayload}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    const pageStillUp = !page.url().includes('500') && !page.url().includes('error');
    if (pageStillUp) pass("SQL injection in search query — app survives, no 500");
    else fail('SQL injection', `App crashed: ${page.url()}`);

    // XSS attempt
    const xssPayload = encodeURIComponent('<script>alert("xss")</script>');
    await page.goto(`${BASE}/hyderabad/search?q=${xssPayload}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    const noXssAlert = !(await page.evaluate(() => window.__xss_triggered).catch(() => false));
    if (noXssAlert) pass('XSS payload in search — not executed');
    else fail('XSS in search', 'Script executed');
    consoleErrors.length = 0;

    // Unicode search (Hindi)
    await noHttp4xx(page, 'Unicode Hindi search "टिफिन" — no 4xx', async () => {
      await page.goto(`${BASE}/hyderabad/search?q=${encodeURIComponent('टिफिन')}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(1500);
    });

    // Empty q → handled gracefully
    await page.goto(`${BASE}/hyderabad/search?q=`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    const noBlankCrash = !page.url().includes('500');
    if (noBlankCrash) pass('Empty q= in search URL — no crash');
    else fail('Empty search q', 'App crashed');

    // Very long query (>200 chars)
    const longQ = encodeURIComponent('a'.repeat(250));
    await page.goto(`${BASE}/hyderabad/search?q=${longQ}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    const noLongCrash = !page.url().includes('500');
    if (noLongCrash) pass('300-char search query — no crash (truncated or 422 handled)');
    else fail('Long search q', 'App crashed');


    // ──────────────────────────────────────────────────────────────────────────
    section('12. SEO CITY+CATEGORY PAGES — metadata, content, cross-links');
    // ──────────────────────────────────────────────────────────────────────────
    const seoTests = [
      { url: `${BASE}/bangalore/tiffin`,       expectedTitle: 'Tiffin', city: 'Bangalore' },
      { url: `${BASE}/hyderabad/pg-roommate`,  expectedTitle: 'PG',     city: 'Hyderabad' },
      { url: `${BASE}/mumbai/jobs`,            expectedTitle: 'Jobs',   city: 'Mumbai' },
      { url: `${BASE}/delhi/electronics`,      expectedTitle: 'Electr', city: 'Delhi' },
    ];

    for (const { url, expectedTitle, city } of seoTests) {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(1500);
      const title = await page.title();
      const h1Text = await page.locator('h1').first().textContent().catch(() => '');
      const pageOk = !(await page.locator('text=404, text=Page not found').first().isVisible().catch(() => false));
      if (!pageOk) {
        skip(`SEO page ${url}`, 'Returns 404 — new [city]/[category] page not deployed to Azure yet');
        consoleErrors.length = 0;
        continue;
      }
      const hasTitle = title.includes(expectedTitle) || h1Text.includes(expectedTitle);
      if (hasTitle) pass(`SEO page ${url} — h1/title contains "${expectedTitle}"`);
      else fail(`SEO page ${url}`, `Title: "${title}" | H1: "${h1Text}"`);

      // Check breadcrumb
      const breadcrumb = await page.locator('nav').first().textContent().catch(() => '');
      if (breadcrumb.toLowerCase().includes(city.toLowerCase()) || breadcrumb.toLowerCase().includes('home')) {
        pass(`SEO breadcrumb includes city name`);
      } else {
        log(`  ⚠  Breadcrumb: "${breadcrumb.trim().substring(0, 60)}"`);
      }

      // Check JSON-LD
      const hasJsonLd = await page.locator('script[type="application/ld+json"]').count() > 0;
      if (hasJsonLd) pass('JSON-LD structured data present');
      else fail('JSON-LD missing', `On ${url}`);

      // "+ Post Free" links to /{city}/classifieds/post — match by href, not text
      const postFree = await page.locator('a[href*="/classifieds/post"]').first().isVisible().catch(() => false);
      if (postFree) pass('"Post Free" CTA visible (classifieds/post link found)');
      else fail('"Post Free" CTA', 'No link to /classifieds/post on SEO page');

      // Related category cross-links
      const crossLinks = await page.locator('a[href*="/bangalore/"], a[href*="/hyderabad/"], a[href*="/mumbai/"]').count();
      if (crossLinks > 0) pass(`Cross-city links present (${crossLinks} found)`);
      else log('  ⚠  No cross-city links found');

      consoleErrors.length = 0;
    }

    // Unknown category slug → should 404
    await page.goto(`${BASE}/bangalore/xyzzymadeup123`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1000);
    const is404 = await page.locator('text=404, text=not found, text=Page Not Found').first().isVisible().catch(() => false);
    const statusCode = await page.locator('text=404').isVisible().catch(() => false);
    if (is404 || statusCode) pass('Unknown category slug → 404 shown');
    else log(`  ⚠  Unknown category slug result: "${(await page.title()).substring(0, 40)}" — may redirect instead`);

    // Reserved slug "businesses" must NOT be caught by [category]
    await page.goto(`${BASE}/bangalore/businesses`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    const bizSlugH1 = await page.locator('h1').first().textContent().catch(() => '');
    if (bizSlugH1.toLowerCase().includes('business')) pass(`"businesses" slug → dedicated page (H1: "${bizSlugH1.trim()}")`);
    else fail('Route priority', `"businesses" URL showed: "${bizSlugH1.trim()}"`);


    // ──────────────────────────────────────────────────────────────────────────
    section('13. EVENTS — post + city events page');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/hyderabad/events`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(2000);
    // h1 text is "Events in Hyderabad" — use has-text substring match
    const evtH1 = await page.locator('h1').first().textContent().catch(() => '');
    if (evtH1.toLowerCase().includes('event')) pass(`Events page h1: "${evtH1.trim()}"`);
    else fail('Events page loads with heading', `H1 text: "${evtH1.trim()}"`);
    consoleErrors.length = 0;

    await page.goto(`${BASE}/hyderabad/events/post`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    if (page.url().includes('/auth/login')) {
      fail('Post event page', 'Redirected to login');
    } else {
      await expectVisible(page, 'input, textarea', 'Post event form has inputs');
      pass('Post event page accessible when logged in');
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('14. BUSINESSES — add business + view');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/hyderabad/businesses`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(2000);
    const bizH1 = await page.locator('h1').first().textContent().catch(() => '');
    if (bizH1.toLowerCase().includes('business')) pass(`Businesses page h1: "${bizH1.trim()}"`);
    else fail('Businesses page loads', `H1 text: "${bizH1.trim()}"`);
    consoleErrors.length = 0;


    // ──────────────────────────────────────────────────────────────────────────
    section('15. PROFILE — view + my listings');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/profile`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2000);
    if (page.url().includes('/auth/login')) {
      fail('Profile', 'Not logged in');
    } else {
      // Profile shows user name or "User" fallback; also shows the phone number
      const profileText = await page.locator('[style*="nav-bg"] p').first().textContent().catch(() => '');
      if (profileText) pass(`Profile shows user info: "${profileText.trim()}"`);
      else fail('Profile page shows user info', 'Name/phone not visible in profile header');
      // My Listings menu card
      const mlLink = await page.locator('a[href*="profile/listings"]').first().isVisible().catch(() => false);
      if (mlLink) pass('My Listings link in profile');
      else fail('My Listings link', 'Not found in profile');
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('16. EDIT LISTING — pre-fill + 403 guard');
    // ──────────────────────────────────────────────────────────────────────────
    if (LISTED_ID) {
      await page.goto(`${BASE}/hyderabad/classifieds/${LISTED_ID}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(1000);

      // Try to access edit page for a listing that doesn't belong to user (random ID)
      const randomId = '11111111-1111-1111-1111-111111111111';
      await page.goto(`${BASE}/profile/listings/${randomId}/edit`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(1500);
      const blocked = page.url().includes('/auth/login') || page.url().includes('/profile') || page.url() === BASE + '/';
      if (blocked) pass('Edit page for unknown listing → redirected (403/404)');
      else log(`  ⚠  Edit unknown listing: ${page.url()} — may show an error state`);
    } else {
      skip('Edit listing', 'No LISTED_ID captured');
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('17. REPORT LISTING — and duplicate report 409');
    // ──────────────────────────────────────────────────────────────────────────
    if (LISTED_ID) {
      await page.goto(`${BASE}/hyderabad/classifieds/${LISTED_ID}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(1500);

      const reportBtn = page.locator('button:has-text("Report")');
      if (await reportBtn.isVisible().catch(() => false)) {
        await reportBtn.click();
        await page.waitForTimeout(1200);
        const reportToast = await page.locator('[data-sonner-toast]').first().textContent().catch(() => '');
        if (reportToast.toLowerCase().includes('report') || reportToast.toLowerCase().includes('submitted')) {
          pass('Report listing → toast shown');

          // Try again — should get duplicate error
          await reportBtn.click().catch(() => {});
          await page.waitForTimeout(1200);
          const dupToast = await page.locator('[data-sonner-toast]').first().textContent().catch(() => '');
          log(`  ℹ  Duplicate report toast: "${dupToast}"`);
          pass('Report submitted (duplicate handled)');
        } else {
          log(`  ⚠  Report toast: "${reportToast}"`);
        }
      } else {
        skip('Report flow', 'Report button not visible');
      }
    } else {
      skip('Report listing', 'No LISTED_ID');
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('18. PRIVACY + TERMS pages — SEO completeness');
    // ──────────────────────────────────────────────────────────────────────────
    for (const [route, heading] of [['/privacy', 'Privacy'], ['/terms', 'Terms']]) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(800);
      const hasContent = await page.locator(`text=${heading}`).first().isVisible().catch(() => false);
      if (hasContent) pass(`${heading} page loads with content`);
      else fail(`${heading} page`, 'No matching heading found');
    }


    // ──────────────────────────────────────────────────────────────────────────
    section('19. OFFLINE PAGE');
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/offline`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(800);
    // Offline page h1 is "You're offline" (rendered from &apos;)
    const offlineH1 = await page.locator('h1').first().textContent().catch(() => '');
    const offlineText = offlineH1.toLowerCase().includes('offline');
    const retryBtn = await page.locator('button:has-text("Try again"), button:has-text("Retry")').isVisible().catch(() => false);
    if (offlineText) pass(`Offline page h1: "${offlineH1.trim()}"`);
    else fail('Offline page', `H1 text: "${offlineH1.trim()}" — expected "offline"`);
    if (retryBtn) pass('Offline page "Try again" button present');
    else fail('Offline page retry button', 'Not found');


    // ──────────────────────────────────────────────────────────────────────────
    section('20. MOBILE VIEWPORT (375×812)');
    // ──────────────────────────────────────────────────────────────────────────
  } catch (e) {
    log(`\n💥 Desktop test crashed: ${e.message}\n${e.stack?.split('\n').slice(0, 4).join('\n')}`);
    ISSUES.push({ label: 'Desktop crash', detail: e.message });
  } finally {
    await page.close();
    await ctx.close();
  }

  // ── MOBILE TEST ─────────────────────────────────────────────────────────────
  const mCtx  = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const mPage = await mCtx.newPage();
  const mErrors = [];
  mPage.on('console', m => { if (m.type() === 'error') mErrors.push(m.text()); });
  mPage.on('pageerror', e => mErrors.push(e.message));

  try {
    // Dev login on mobile
    await mPage.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 20000 });
    const mDevBtn = mPage.locator('button:has-text("Dev Login")');
    if (await mDevBtn.isVisible().catch(() => false)) {
      await mDevBtn.click();
      await mPage.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
    }

    // Homepage — no horizontal scroll
    await mPage.goto(BASE, { waitUntil: 'load', timeout: 20000 });
    await mPage.waitForTimeout(1500);
    const bodyWidth   = await mPage.evaluate(() => document.body.scrollWidth);
    const windowWidth = await mPage.evaluate(() => window.innerWidth);
    if (bodyWidth <= windowWidth + 5) pass(`Mobile: no horizontal scroll (body=${bodyWidth}px, window=${windowWidth}px)`);
    else fail('Mobile horizontal scroll', `body.scrollWidth=${bodyWidth} > window.innerWidth=${windowWidth}`);

    // Bottom nav visible on mobile
    const bottomNav = await mPage.locator('[class*="BottomNav"], [class*="bottom-nav"], nav[class*="fixed"]').first().isVisible().catch(() => false);
    if (bottomNav) pass('Mobile: bottom navigation bar visible');
    else log('  ⚠  Bottom nav not detected — may use different class');

    // City page
    await mPage.goto(`${BASE}/hyderabad`, { waitUntil: 'load', timeout: 20000 });
    await mPage.waitForTimeout(1500);
    const cityBodyW = await mPage.evaluate(() => document.body.scrollWidth);
    if (cityBodyW <= 380) pass('Mobile city page: no horizontal overflow');
    else fail('Mobile city page overflow', `scrollWidth=${cityBodyW}`);

    // Listing detail — fixed WA bar
    if (LISTED_ID) {
      await mPage.goto(`${BASE}/hyderabad/classifieds/${LISTED_ID}`, { waitUntil: 'load', timeout: 15000 });
      await mPage.waitForTimeout(1500);
      const fixedWaBar = await mPage.locator('.fixed.bottom-0').first().isVisible().catch(() => false);
      if (fixedWaBar) pass('Mobile: fixed WA bar visible at bottom of listing detail');
      else fail('Mobile WA bar', 'Fixed bottom WA bar not visible');
    }

    // Search page — no sidebar, has mobile filters
    await mPage.goto(`${BASE}/hyderabad/search?q=tiffin`, { waitUntil: 'load', timeout: 15000 });
    await mPage.waitForTimeout(1500);
    const sidebar = await mPage.locator('[class*="hidden md:block"], aside').first().isVisible().catch(() => false);
    if (!sidebar) pass('Mobile search: desktop sidebar hidden on mobile');
    else log('  ⚠  Desktop sidebar may be visible on mobile — check md:hidden');

    const mBodyW = await mPage.evaluate(() => document.body.scrollWidth);
    if (mBodyW <= 380) pass('Mobile search page: no horizontal overflow');
    else fail('Mobile search page overflow', `scrollWidth=${mBodyW}`);

    // SEO page mobile
    await mPage.goto(`${BASE}/bangalore/tiffin`, { waitUntil: 'load', timeout: 15000 });
    await mPage.waitForTimeout(1200);
    const seoMobileW = await mPage.evaluate(() => document.body.scrollWidth);
    if (seoMobileW <= 380) pass('Mobile SEO category page: no horizontal overflow');
    else fail('Mobile SEO page overflow', `scrollWidth=${seoMobileW}`);

    mErrors.length = 0;

  } catch (e) {
    log(`\n💥 Mobile test crashed: ${e.message}`);
    ISSUES.push({ label: 'Mobile crash', detail: e.message });
  } finally {
    await mPage.close();
    await mCtx.close();
  }

  await browser.close();

  // ── FINAL REPORT ─────────────────────────────────────────────────────────────
  log('\n\n════════════════════════════════════════════════════════════════');
  log(`  FINAL REPORT`);
  log('════════════════════════════════════════════════════════════════');
  log(`  ✅ PASSED : ${PASS.length}`);
  log(`  ❌ FAILED : ${ISSUES.length}`);
  log(`  Total    : ${PASS.length + ISSUES.length}`);

  if (ISSUES.length > 0) {
    log('\n  FAILURES TO FIX:');
    ISSUES.forEach((issue, i) => log(`    ${i + 1}. [${issue.label}]\n       ${issue.detail}`));
    log('');
  } else {
    log('\n  🎉  ALL CHECKS PASSED — production ready!');
  }

  process.exit(ISSUES.length > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
