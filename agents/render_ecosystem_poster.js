/**
 * render_ecosystem_poster.js — Renders the LocalsIndia "ecosystem" explainer
 * poster (two-sided Searching/Offering layout, phone mockup, benefits row,
 * footer CTA). Structure is fixed (reviewed/approved layout); the tagline
 * and which 4 benefit cards appear rotate per call so repeat posts don't
 * look identical.
 *
 * Usage:
 *   node agents/render_ecosystem_poster.js --tagline "..." --benefits "always_free,languages,local_community,direct_contact" --out /path/out.png
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'playwright'));

const LOGO_MARK = path.join(__dirname, '..', 'mobile', 'assets', 'logo-mark-transparent.png').replace(/\\/g, '/');
const APP_ICON = path.join(__dirname, '..', 'mobile', 'assets', 'icon.png').replace(/\\/g, '/');

// Pool of real, true benefits — the caller picks 4 of these per post so
// repeat posts vary without ever drifting into an unbuilt/fabricated claim.
const BENEFIT_LIBRARY = {
  always_free: {
    icon: '<span style="font-size:20px; font-weight:800; line-height:1;">&#8377;</span>',
    title: 'Always Free',
    sub: 'No listing fees, no subscription',
  },
  languages: {
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h11M4 10h7M4 15h11M15 15l3 3 5-6"/></svg>',
    title: 'Your Own Language',
    sub: 'English, Telugu, Tamil, Kannada, Malayalam',
  },
  local_community: {
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    title: 'Real Local Community',
    sub: 'City-specific, not a national list',
  },
  direct_contact: {
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>',
    title: 'Direct Contact',
    sub: 'WhatsApp only, no hidden middlemen',
  },
  all_categories: {
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    title: 'All Categories, One App',
    sub: 'Jobs, PG, tiffin, vehicles, events &amp; more',
  },
  no_commission: {
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>',
    title: 'No Commission',
    sub: 'Sellers keep 100% of what they earn',
  },
  post_in_minutes: {
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    title: 'Post in Minutes',
    sub: 'Simple wizard, photos included',
  },
  verified_trust: {
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    title: 'Trust You Can See',
    sub: 'Verified badges for real businesses',
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    out[args[i].replace(/^--/, '')] = args[i + 1];
  }
  return out;
}

function buildBenefitsHtml(benefitKeys) {
  return benefitKeys
    .map((key) => {
      const b = BENEFIT_LIBRARY[key];
      if (!b) throw new Error(`Unknown benefit key: ${key}`);
      return `
      <div class="benefit-card">
        <div class="benefit-icon">${b.icon}</div>
        <div class="benefit-title">${b.title}</div>
        <div class="benefit-sub">${b.sub}</div>
      </div>`;
    })
    .join('\n');
}

function buildHtml({ tagline, benefitsHtml }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --li-primary: #F7921E;
    --li-primary-light: #FEF3E2;
    --li-primary-dark: #E07B0A;
    --li-teal: #3DADA8;
    --li-teal-light: #E7F5F4;
    --li-navy: #163D6B;
    --li-wa-green: #25D366;
    --li-featured: #F7B731;
    --li-nav-bg: #0A0C17;
    --li-page-bg: #F9FAFB;
    --li-border: #E8E8F0;
    --li-muted: #6B7280;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1600px; height: 1260px;
    font-family: 'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif;
    background: var(--li-page-bg);
    color: var(--li-navy);
  }
  .stage { width: 1600px; height: 1260px; display: flex; flex-direction: column; position: relative; }
  .header { padding: 40px 72px 20px; text-align: center; position: relative; }
  .header-logo-row { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 14px; }
  .header-logo-row img { width: 52px; height: 52px; }
  .header-wordmark { font-size: 26px; font-weight: 800; color: var(--li-primary); letter-spacing: -0.5px; }
  .title { font-size: 46px; font-weight: 800; letter-spacing: -1px; color: var(--li-navy); }
  .subtitle { font-size: 17px; font-weight: 700; color: var(--li-teal); letter-spacing: 1.5px; margin-top: 6px; text-transform: uppercase; }
  .tagline { font-size: 16px; font-weight: 500; color: var(--li-muted); margin-top: 12px; max-width: 760px; margin-left: auto; margin-right: auto; line-height: 1.5; }

  .middle { flex: 1; display: flex; align-items: stretch; padding: 10px 60px 0; gap: 20px; }
  .side-col { width: 460px; display: flex; flex-direction: column; justify-content: center; }
  .side-col.right { align-items: flex-end; }
  .side-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; letter-spacing: 1px; padding: 8px 20px; border-radius: 999px; color: white; margin-bottom: 20px; }
  .side-badge.searching { background: var(--li-teal); }
  .side-badge.offering { background: var(--li-primary); }
  .persona { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
  .side-col.right .persona { flex-direction: row-reverse; }
  .avatar { width: 66px; height: 66px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .avatar.searching { background: var(--li-teal-light); }
  .avatar.offering { background: var(--li-primary-light); }
  .persona-label { font-size: 19px; font-weight: 700; color: var(--li-navy); }
  .persona-sub { font-size: 14px; color: var(--li-muted); font-weight: 500; }
  .feature-list { display: flex; flex-direction: column; gap: 18px; }
  .feature-row { display: flex; align-items: flex-start; gap: 14px; }
  .side-col.right .feature-row { flex-direction: row-reverse; text-align: right; }
  .feature-icon { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .feature-icon.searching { background: var(--li-teal-light); color: var(--li-teal); }
  .feature-icon.offering { background: var(--li-primary-light); color: var(--li-primary-dark); }
  .feature-title { font-size: 16px; font-weight: 700; color: var(--li-navy); }
  .feature-sub { font-size: 13.5px; color: var(--li-muted); font-weight: 500; margin-top: 2px; }

  .center-col { flex: 1; display: flex; flex-direction: column; align-items: center; }
  .connects-banner { background: var(--li-navy); color: white; font-size: 15px; font-weight: 800; letter-spacing: 1.5px; padding: 10px 28px; border-radius: 999px; margin-bottom: 18px; text-transform: uppercase; }
  .arrows-row { display: flex; justify-content: space-between; width: 100%; padding: 0 6px; margin-bottom: 8px; }
  .arrow-label { font-size: 12.5px; font-weight: 700; color: var(--li-muted); max-width: 130px; text-align: center; }
  .phone { width: 240px; height: 480px; background: var(--li-nav-bg); border-radius: 34px; padding: 12px; box-shadow: 0 30px 60px -20px rgba(22,61,107,0.35); }
  .phone-screen { width: 100%; height: 100%; background: white; border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; }
  .phone-status { height: 22px; background: white; }
  .phone-search { margin: 10px 12px 8px; background: var(--li-page-bg); border: 1px solid var(--li-border); border-radius: 10px; height: 32px; display: flex; align-items: center; padding: 0 10px; gap: 6px; }
  .phone-search span { font-size: 10.5px; color: var(--li-muted); font-weight: 500; }
  .phone-cats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 6px 12px; }
  .phone-cat { aspect-ratio: 1; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .phone-card { margin: 8px 12px; background: var(--li-page-bg); border-radius: 10px; padding: 8px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .phone-card-row { height: 8px; border-radius: 4px; background: var(--li-border); }
  .phone-card-row.w60 { width: 60%; }
  .phone-card-row.w80 { width: 80%; }
  .phone-post-btn { margin: 8px 12px 14px; background: var(--li-primary); border-radius: 10px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: white; }

  .benefits { padding: 30px 60px 0; }
  .benefits-header { text-align: center; background: var(--li-navy); color: white; font-size: 15px; font-weight: 800; letter-spacing: 1.5px; padding: 10px; border-radius: 10px; margin-bottom: 20px; text-transform: uppercase; }
  .benefits-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .benefit-card { background: white; border: 1px solid var(--li-border); border-radius: 14px; padding: 18px 16px; text-align: center; }
  .benefit-icon { width: 42px; height: 42px; border-radius: 50%; background: var(--li-primary-light); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: var(--li-primary-dark); }
  .benefit-title { font-size: 14.5px; font-weight: 800; color: var(--li-navy); }
  .benefit-sub { font-size: 12px; color: var(--li-muted); margin-top: 4px; font-weight: 500; }

  .footer-bar { margin-top: 28px; background: var(--li-nav-bg); padding: 22px 60px; display: flex; align-items: center; justify-content: space-between; }
  .footer-title-row { display: flex; align-items: center; gap: 12px; }
  .footer-title-row img { width: 36px; height: 36px; border-radius: 9px; }
  .footer-title { font-size: 18px; font-weight: 800; color: white; letter-spacing: 0.5px; }
  .stat-row { display: flex; gap: 34px; }
  .stat { text-align: center; }
  .stat-num { font-size: 20px; font-weight: 800; color: var(--li-featured); }
  .stat-label { font-size: 10.5px; color: rgba(255,255,255,0.65); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer-cta { background: var(--li-primary); color: white; font-size: 14.5px; font-weight: 800; padding: 12px 26px; border-radius: 999px; }

  svg { display: block; }
</style>
</head>
<body>
<div class="stage">

  <div class="header">
    <div class="header-logo-row">
      <img src="file:///${LOGO_MARK}" />
      <div class="header-wordmark">LocalsIndia</div>
    </div>
    <div class="title">LOCALSINDIA ECOSYSTEM</div>
    <div class="subtitle">Connecting Neighbours &middot; Buying, Selling, Hiring Locally</div>
    <div class="tagline">${tagline}</div>
  </div>

  <div class="middle">

    <div class="side-col">
      <div class="side-badge searching">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
        SEARCHING
      </div>
      <div class="persona">
        <div class="avatar searching">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3DADA8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg>
        </div>
        <div>
          <div class="persona-label">Needs Something</div>
          <div class="persona-sub">A room, a job, a tiffin, a ride</div>
        </div>
      </div>
      <div class="feature-list">
        <div class="feature-row">
          <div class="feature-icon searching"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div>
          <div><div class="feature-title">Browse Categories</div><div class="feature-sub">Jobs, PG, Tiffin, Vehicles &amp; more</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon searching"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg></div>
          <div><div class="feature-title">Filter by Your City</div><div class="feature-sub">140 cities across South India</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon searching"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg></div>
          <div><div class="feature-title">Contact via WhatsApp</div><div class="feature-sub">Direct chat, zero middlemen</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon searching"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg></div>
          <div><div class="feature-title">Rate &amp; Review</div><div class="feature-sub">Help the community trust each other</div></div>
        </div>
      </div>
    </div>

    <div class="center-col">
      <div class="connects-banner">THE APP THAT CONNECTS</div>
      <div class="arrows-row">
        <div class="arrow-label">&larr; Searches &amp; Contacts</div>
        <div class="arrow-label">Lists &amp; Responds &rarr;</div>
      </div>
      <div class="phone">
        <div class="phone-screen">
          <div class="phone-status"></div>
          <div class="phone-search"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg><span>Search tiffin, PG, jobs...</span></div>
          <div class="phone-cats">
            <div class="phone-cat" style="background:#FEF3E2"></div>
            <div class="phone-cat" style="background:#E7F5F4"></div>
            <div class="phone-cat" style="background:#FEF3E2"></div>
            <div class="phone-cat" style="background:#E7F5F4"></div>
            <div class="phone-cat" style="background:#FEF3E2"></div>
            <div class="phone-cat" style="background:#E7F5F4"></div>
            <div class="phone-cat" style="background:#FEF3E2"></div>
            <div class="phone-cat" style="background:#E7F5F4"></div>
          </div>
          <div class="phone-card">
            <div class="phone-card-row w80"></div>
            <div class="phone-card-row w60"></div>
          </div>
          <div class="phone-post-btn">POST FREE</div>
        </div>
      </div>
    </div>

    <div class="side-col right">
      <div class="side-badge offering">
        OFFERING
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <div class="persona">
        <div class="avatar offering">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#E07B0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg>
        </div>
        <div style="text-align:right">
          <div class="persona-label">Has Something to Offer</div>
          <div class="persona-sub">A service, a listing, a business</div>
        </div>
      </div>
      <div class="feature-list">
        <div class="feature-row">
          <div class="feature-icon offering"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
          <div><div class="feature-title">Post for Free</div><div class="feature-sub">No fees, ever</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon offering"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9v6h3l6 4V5L6 9H3z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/></svg></div>
          <div><div class="feature-title">Reach Your Neighbourhood</div><div class="feature-sub">Hyperlocal, not a national feed</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon offering"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg></div>
          <div><div class="feature-title">Chat Directly</div><div class="feature-sub">Respond instantly via WhatsApp</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon offering"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"/><path d="M9 12l2 2 4-4"/></svg></div>
          <div><div class="feature-title">Get Verified</div><div class="feature-sub">Build trust with a badge</div></div>
        </div>
      </div>
    </div>

  </div>

  <div class="benefits">
    <div class="benefits-header">BENEFITS TO THE COMMUNITY</div>
    <div class="benefits-grid">
      ${benefitsHtml}
    </div>
  </div>

  <div class="footer-bar">
    <div class="footer-title-row">
      <img src="file:///${APP_ICON}" />
      <div class="footer-title">ONE APP. ENDLESS POSSIBILITIES.</div>
    </div>
    <div class="stat-row">
      <div class="stat"><div class="stat-num">140</div><div class="stat-label">Cities</div></div>
      <div class="stat"><div class="stat-num">12</div><div class="stat-label">Categories</div></div>
      <div class="stat"><div class="stat-num">5</div><div class="stat-label">Languages</div></div>
      <div class="stat"><div class="stat-num">&#8377;0</div><div class="stat-label">To Post</div></div>
    </div>
    <div class="footer-cta">Post Free at localsindia.com</div>
  </div>

</div>
</body>
</html>`;
}

async function main() {
  const { tagline, benefits, out } = parseArgs();
  if (!tagline || !benefits || !out) {
    console.error('Usage: node render_ecosystem_poster.js --tagline "..." --benefits "key1,key2,key3,key4" --out /path/out.png');
    process.exit(1);
  }

  const benefitKeys = benefits.split(',').map((s) => s.trim());
  const benefitsHtml = buildBenefitsHtml(benefitKeys);
  const html = buildHtml({ tagline, benefitsHtml });

  const tempHtmlPath = path.join(os.tmpdir(), `localsindia-ecosystem-${Date.now()}.html`);
  fs.writeFileSync(tempHtmlPath, html, 'utf-8');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1260 } });
  await page.goto(`file:///${tempHtmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  await browser.close();
  fs.unlinkSync(tempHtmlPath);

  console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
