const { chromium } = require('playwright');
const BASE = 'https://www.localsindia.com';

(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: 'load', timeout: 20000 });

  const googleBtn = await p.locator('a:has-text("Continue with Google")').isVisible().catch(() => false);
  const otpForm = await p.locator('input#phone').isVisible().catch(() => false);

  console.log('Google button visible:', googleBtn);
  console.log('OTP form visible:', otpForm);

  if (googleBtn) {
    // Check the href points to our backend
    const href = await p.locator('a:has-text("Continue with Google")').getAttribute('href');
    console.log('Google button href:', href);
  }

  await b.close();
})().catch(console.error);
