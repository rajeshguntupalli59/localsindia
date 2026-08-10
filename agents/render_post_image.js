/**
 * render_post_image.js — Renders a branded PNG for a social post (feed or story).
 *
 * Usage:
 *   node agents/render_post_image.js --format square --headline "..." --tag "..." --topic app_feature --style glass --out /path/out.png
 *
 * Reuses the same brand tokens + Plus Jakarta Sans + logo mark as
 * play-store/feature-graphic.html, generalized for dynamic headline text
 * and two Instagram-required aspect ratios (feed square, story 9:16).
 *
 * Two independent axes of variety, both CSS/SVG only (no per-post AI image
 * generation — stays fast, free, and consistent for an unsupervised daily
 * pipeline):
 *   --topic  drives icon + accent color + eyebrow label (see TOPIC_THEMES)
 *   --style  drives the whole layout/composition (see STYLE_RENDERERS) —
 *            meta_poster.py rotates this round-robin-no-repeat, same as
 *            topic, so two consecutive posts never look identical even if
 *            they land on the same topic.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'playwright'));

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    out[args[i].replace(/^--/, '')] = args[i + 1];
  }
  return out;
}

// Lucide-style line icons (matches the app's own icon set per UI_STACK.md),
// 24x24 viewBox, stroke-based — kept as inline SVG so no extra asset files.
const TOPIC_ICON_PATHS = {
  app_feature: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  category_tip: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  safety_tip: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.79 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  city_spotlight: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  app_launch: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
};

// Duotone gradient + accent per topic, built from brand colors only
// (#F7921E orange, #F7B731 amber, #163D6B navy, #25D366 WhatsApp green) —
// no off-brand hues, just different weighting so each topic feels distinct.
const TOPIC_THEMES = {
  app_feature: { eyebrow: 'APP FEATURE', accent: '#F7921E', glowA: '#F7921E', glowB: '#163D6B' },
  category_tip: { eyebrow: 'QUICK TIP', accent: '#F7B731', glowA: '#163D6B', glowB: '#F7B731' },
  safety_tip: { eyebrow: 'STAY SAFE', accent: '#FF7A45', glowA: '#FF7A45', glowB: '#163D6B' },
  city_spotlight: { eyebrow: 'CITY SPOTLIGHT', accent: '#25D366', glowA: '#163D6B', glowB: '#25D366' },
  app_launch: { eyebrow: 'GET STARTED', accent: '#F7921E', glowA: '#F7921E', glowB: '#F7B731' },
};
const DEFAULT_THEME = TOPIC_THEMES.app_feature;
const STYLES = ['glass', 'bold', 'duotone'];

const SKYLINE_SVG = `<svg class="skyline" viewBox="0 0 1080 160" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="60" width="70" height="100"/><rect x="80" y="30" width="55" height="130"/>
  <rect x="145" y="75" width="90" height="85"/><rect x="245" y="45" width="60" height="115"/>
  <rect x="315" y="90" width="75" height="70"/><rect x="400" y="20" width="50" height="140"/>
  <rect x="460" y="65" width="100" height="95"/><rect x="570" y="40" width="65" height="120"/>
  <rect x="645" y="85" width="80" height="75"/><rect x="735" y="55" width="55" height="105"/>
  <rect x="800" y="25" width="70" height="135"/><rect x="880" y="70" width="90" height="90"/>
  <rect x="980" y="50" width="100" height="110"/>
</svg>`;

const SHARED_HEAD = `<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>* { margin: 0; padding: 0; box-sizing: border-box; } html, body { overflow: hidden; font-family: 'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif; }</style>`;

// ---- Style 1: glassmorphic card over a rich diagonal gradient wash ----
function renderGlass({ width, height, headline, tag, theme, iconPath, logoPath, isStory }) {
  const logoSize = isStory ? 88 : 76;
  const headlineSize = isStory ? 56 : 50;
  const cardPad = isStory ? '64px 56px' : '56px';
  return `<!doctype html><html><head>${SHARED_HEAD}<style>
  .stage { width: ${width}px; height: ${height}px; position: relative; background: linear-gradient(135deg, ${theme.glowA} 0%, #14162A 45%, ${theme.glowB} 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: ${isStory ? '100px 56px' : '64px'}; }
  .light-pool-a { position: absolute; top: -220px; left: -160px; width: 620px; height: 620px; border-radius: 50%; background: radial-gradient(circle, #ffffff 0%, transparent 70%); opacity: 0.14; }
  .light-pool-b { position: absolute; bottom: -260px; right: -200px; width: 680px; height: 680px; border-radius: 50%; background: radial-gradient(circle, ${theme.accent} 0%, transparent 70%); opacity: 0.35; }
  .skyline { position: absolute; bottom: 0; left: 0; right: 0; height: ${isStory ? '160px' : '120px'}; opacity: 0.16; fill: #000; }
  .top-row { position: relative; width: 100%; display: flex; align-items: center; gap: 12px; margin-bottom: ${isStory ? '40px' : '28px'}; }
  .logo { width: ${logoSize}px; height: ${logoSize}px; }
  .wordmark { font-size: ${isStory ? '30px' : '26px'}; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; }
  .glass-card { position: relative; width: 100%; background: rgba(255,255,255,0.10); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); border: 1px solid rgba(255,255,255,0.22); border-radius: 32px; padding: ${cardPad}; box-shadow: 0 24px 60px -20px rgba(0,0,0,0.45); }
  .badge { display: inline-flex; align-items: center; gap: 10px; background: ${theme.accent}; color: #0A0C17; font-size: ${isStory ? '22px' : '19px'}; font-weight: 700; letter-spacing: 1px; padding: ${isStory ? '10px 22px' : '8px 18px'}; border-radius: 999px; margin-bottom: ${isStory ? '32px' : '24px'}; }
  .badge svg { width: ${isStory ? '22px' : '19px'}; height: ${isStory ? '22px' : '19px'}; }
  .headline { font-size: ${headlineSize}px; font-weight: 800; letter-spacing: -1px; line-height: 1.16; color: #FFFFFF; }
  .subtext { margin-top: ${isStory ? '24px' : '18px'}; font-size: ${isStory ? '24px' : '20px'}; font-weight: 600; color: rgba(255,255,255,0.78); }
  .cta { margin-top: ${isStory ? '36px' : '28px'}; display: inline-block; background: #FFFFFF; color: #0A0C17; font-size: ${isStory ? '24px' : '21px'}; font-weight: 700; padding: ${isStory ? '16px 32px' : '13px 26px'}; border-radius: 999px; }
  .footer { position: relative; margin-top: ${isStory ? '36px' : '28px'}; display: flex; align-items: center; gap: 10px; }
  .footer-dot { width: 9px; height: 9px; border-radius: 50%; background: #25D366; }
  .footer-text { font-size: ${isStory ? '20px' : '17px'}; font-weight: 600; color: rgba(255,255,255,0.85); }
  </style></head><body>
  <div class="stage">
    <div class="light-pool-a"></div><div class="light-pool-b"></div>
    ${SKYLINE_SVG}
    <div class="top-row"><img class="logo" src="file:///${logoPath}" /><div class="wordmark">LocalsIndia</div></div>
    <div class="glass-card">
      <div class="badge"><svg viewBox="0 0 24 24" fill="none" stroke="#0A0C17" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>${theme.eyebrow}</div>
      <div class="headline">${headline}</div>
      ${tag ? `<div class="subtext">${tag}</div>` : ''}
      <div class="cta">Post free on LocalsIndia →</div>
      <div class="footer"><div class="footer-dot"></div><div class="footer-text">Free to post · WhatsApp contact · localsindia.com</div></div>
    </div>
  </div></body></html>`;
}

// ---- Style 2: bold oversized typography on a flat ink card, no blur ----
function renderBold({ width, height, headline, tag, theme, iconPath, logoPath, isStory }) {
  const logoSize = isStory ? 96 : 80;
  const headlineSize = isStory ? 78 : 68;
  return `<!doctype html><html><head>${SHARED_HEAD}<style>
  .stage { width: ${width}px; height: ${height}px; position: relative; background: #0A0C17; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; overflow: hidden; padding: ${isStory ? '140px 76px' : '76px'}; }
  .diag-stripe { position: absolute; top: -400px; right: -300px; width: 900px; height: 900px; background: ${theme.accent}; opacity: 0.9; transform: rotate(35deg); clip-path: polygon(60% 0%, 100% 0%, 100% 100%, 20% 100%); }
  .diag-stripe-2 { position: absolute; top: -400px; right: -300px; width: 900px; height: 900px; background: ${theme.glowB}; opacity: 0.6; transform: rotate(35deg); clip-path: polygon(80% 0%, 100% 0%, 100% 40%); }
  .top-row { position: relative; display: flex; align-items: center; gap: 14px; margin-bottom: ${isStory ? '64px' : '44px'}; }
  .logo { width: ${logoSize}px; height: ${logoSize}px; }
  .wordmark { font-size: ${isStory ? '34px' : '28px'}; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; }
  .icon-badge { position: relative; width: ${isStory ? '64px' : '54px'}; height: ${isStory ? '64px' : '54px'}; border-radius: 16px; background: ${theme.accent}; display: flex; align-items: center; justify-content: center; margin-bottom: ${isStory ? '24px' : '18px'}; }
  .icon-badge svg { width: 55%; height: 55%; }
  .eyebrow { position: relative; font-size: ${isStory ? '24px' : '20px'}; font-weight: 700; letter-spacing: 3px; color: ${theme.accent}; margin-bottom: ${isStory ? '16px' : '12px'}; }
  .headline { position: relative; font-size: ${headlineSize}px; font-weight: 900; letter-spacing: -2px; line-height: 1.05; color: #FFFFFF; max-width: ${isStory ? '100%' : '820px'}; }
  .underline { position: relative; margin-top: ${isStory ? '28px' : '20px'}; width: ${isStory ? '120px' : '90px'}; height: 8px; border-radius: 4px; background: ${theme.accent}; }
  .tag-chip { position: relative; margin-top: ${isStory ? '32px' : '24px'}; font-size: ${isStory ? '26px' : '22px'}; font-weight: 700; color: rgba(255,255,255,0.7); }
  .footer { position: absolute; bottom: ${isStory ? '90px' : '44px'}; left: ${isStory ? '76px' : '76px'}; display: flex; align-items: center; gap: 10px; }
  .footer-dot { width: 9px; height: 9px; border-radius: 50%; background: #25D366; }
  .footer-text { font-size: ${isStory ? '22px' : '18px'}; font-weight: 600; color: rgba(255,255,255,0.55); }
  </style></head><body>
  <div class="stage">
    <div class="diag-stripe"></div><div class="diag-stripe-2"></div>
    <div class="top-row"><img class="logo" src="file:///${logoPath}" /><div class="wordmark">LocalsIndia</div></div>
    <div class="icon-badge"><svg viewBox="0 0 24 24" fill="none" stroke="#0A0C17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg></div>
    <div class="eyebrow">${theme.eyebrow}</div>
    <div class="headline">${headline}</div>
    <div class="underline"></div>
    ${tag ? `<div class="tag-chip">${tag}</div>` : ''}
    <div class="footer"><div class="footer-dot"></div><div class="footer-text">Free to post · WhatsApp contact · localsindia.com</div></div>
  </div></body></html>`;
}

// ---- Style 3: high-contrast diagonal duotone split, poster-like ----
function renderDuotone({ width, height, headline, tag, theme, iconPath, logoPath, isStory }) {
  const logoSize = isStory ? 92 : 78;
  const headlineSize = isStory ? 64 : 56;
  return `<!doctype html><html><head>${SHARED_HEAD}<style>
  .stage { width: ${width}px; height: ${height}px; position: relative; background: ${theme.glowB}; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; overflow: hidden; padding: ${isStory ? '90px 72px 120px' : '72px 72px 96px'}; }
  .split { position: absolute; top: 0; right: 0; width: 62%; height: 100%; background: ${theme.accent}; clip-path: polygon(38% 0, 100% 0, 100% 100%, 0% 100%); }
  .watermark { position: absolute; top: ${isStory ? '60px' : '40px'}; right: ${isStory ? '40px' : '30px'}; width: ${isStory ? '260px' : '220px'}; height: ${isStory ? '260px' : '220px'}; opacity: 0.16; }
  .top-row { position: absolute; top: ${isStory ? '90px' : '64px'}; left: ${isStory ? '72px' : '72px'}; display: flex; align-items: center; gap: 12px; }
  .logo { width: ${logoSize}px; height: ${logoSize}px; }
  .wordmark { font-size: ${isStory ? '32px' : '27px'}; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; }
  .eyebrow-chip { position: relative; display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; font-size: ${isStory ? '22px' : '18px'}; font-weight: 700; letter-spacing: 1.5px; padding: ${isStory ? '9px 20px' : '7px 16px'}; border-radius: 999px; margin-bottom: ${isStory ? '28px' : '20px'}; }
  .eyebrow-chip svg { width: ${isStory ? '20px' : '17px'}; height: ${isStory ? '20px' : '17px'}; }
  .headline { position: relative; font-size: ${headlineSize}px; font-weight: 800; letter-spacing: -1px; line-height: 1.15; color: #FFFFFF; max-width: ${isStory ? '100%' : '640px'}; text-shadow: 0 4px 24px rgba(0,0,0,0.25); }
  .tag-chip { position: relative; margin-top: ${isStory ? '32px' : '24px'}; display: inline-block; background: #FFFFFF; color: #0A0C17; font-size: ${isStory ? '24px' : '20px'}; font-weight: 700; padding: ${isStory ? '11px 26px' : '9px 22px'}; border-radius: 999px; }
  .footer { position: relative; margin-top: ${isStory ? '36px' : '26px'}; display: flex; align-items: center; gap: 10px; }
  .footer-dot { width: 9px; height: 9px; border-radius: 50%; background: #25D366; }
  .footer-text { font-size: ${isStory ? '20px' : '17px'}; font-weight: 600; color: rgba(255,255,255,0.85); }
  </style></head><body>
  <div class="stage">
    <div class="split"></div>
    <svg class="watermark" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
    <div class="top-row"><img class="logo" src="file:///${logoPath}" /><div class="wordmark">LocalsIndia</div></div>
    <div class="eyebrow-chip"><svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>${theme.eyebrow}</div>
    <div class="headline">${headline}</div>
    ${tag ? `<div class="tag-chip">${tag}</div>` : ''}
    <div class="footer"><div class="footer-dot"></div><div class="footer-text">Free to post · WhatsApp contact · localsindia.com</div></div>
  </div></body></html>`;
}

// ---- Style 4: light-background quote card ----
// Research note: the Facebook/Instagram feed is dominated by dark-mode UI
// and dark-background posts (this file's other 3 styles included) — a
// light card creates real value-contrast against that, and quote-style
// cards are specifically called out as high-share, high-authenticity
// content vs. polished dark gradient ads.
function renderQuote({ width, height, headline, tag, theme, iconPath, logoPath, isStory }) {
  const logoSize = isStory ? 84 : 70;
  const headlineSize = isStory ? 58 : 50;
  return `<!doctype html><html><head>${SHARED_HEAD}<style>
  .stage { width: ${width}px; height: ${height}px; position: relative; background: #FBF7F0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; overflow: hidden; padding: ${isStory ? '120px 76px' : '76px'}; }
  .corner-block { position: absolute; top: 0; left: 0; width: ${isStory ? '180px' : '150px'}; height: ${isStory ? '180px' : '150px'}; background: ${theme.accent}; }
  .quote-mark { position: relative; font-size: ${isStory ? '160px' : '130px'}; font-weight: 900; line-height: 0.6; color: ${theme.accent}; margin-bottom: ${isStory ? '8px' : '4px'}; font-family: Georgia, serif; }
  .headline { position: relative; font-size: ${headlineSize}px; font-weight: 800; letter-spacing: -1px; line-height: 1.18; color: #14162A; max-width: ${isStory ? '100%' : '820px'}; }
  .badge { position: relative; display: inline-flex; align-items: center; gap: 9px; margin-top: ${isStory ? '36px' : '28px'}; font-size: ${isStory ? '22px' : '19px'}; font-weight: 700; letter-spacing: 1.5px; color: ${theme.accent}; }
  .badge svg { width: ${isStory ? '24px' : '20px'}; height: ${isStory ? '24px' : '20px'}; }
  .tag-chip { position: relative; margin-top: ${isStory ? '28px' : '20px'}; display: inline-block; background: #14162A; color: #FFFFFF; font-size: ${isStory ? '22px' : '19px'}; font-weight: 700; padding: ${isStory ? '10px 24px' : '8px 20px'}; border-radius: 999px; }
  .bottom-row { position: absolute; bottom: ${isStory ? '90px' : '52px'}; left: ${isStory ? '76px' : '76px'}; display: flex; align-items: center; gap: 12px; }
  .logo { width: ${logoSize}px; height: ${logoSize}px; }
  .wordmark { font-size: ${isStory ? '26px' : '22px'}; font-weight: 800; letter-spacing: -0.5px; color: #14162A; }
  </style></head><body>
  <div class="stage">
    <div class="corner-block"></div>
    <div class="quote-mark">"</div>
    <div class="headline">${headline}</div>
    <div class="badge"><svg viewBox="0 0 24 24" fill="none" stroke="${theme.accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>${theme.eyebrow}</div>
    ${tag ? `<div class="tag-chip">${tag}</div>` : ''}
    <div class="bottom-row"><img class="logo" src="file:///${logoPath}" /><div class="wordmark">LocalsIndia · localsindia.com</div></div>
  </div></body></html>`;
}

// ---- Style 5: billboard — solid saturated color, headline in the
// center-upper third where eye-tracking studies show attention lands
// first, minimal chrome, maximal value contrast ----
function renderSpotlight({ width, height, headline, tag, theme, iconPath, logoPath, isStory }) {
  const logoSize = isStory ? 84 : 72;
  const headlineSize = isStory ? 72 : 62;
  return `<!doctype html><html><head>${SHARED_HEAD}<style>
  .stage { width: ${width}px; height: ${height}px; position: relative; background: ${theme.accent}; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; overflow: hidden; padding: ${isStory ? '110px 68px' : '68px'}; }
  .watermark-icon { position: absolute; bottom: ${isStory ? '-60px' : '-40px'}; right: ${isStory ? '-60px' : '-40px'}; width: ${isStory ? '440px' : '360px'}; height: ${isStory ? '440px' : '360px'}; opacity: 0.14; }
  .top-row { position: relative; display: flex; align-items: center; gap: 12px; margin-bottom: ${isStory ? '48px' : '32px'}; }
  .logo { width: ${logoSize}px; height: ${logoSize}px; }
  .wordmark { font-size: ${isStory ? '28px' : '24px'}; font-weight: 800; letter-spacing: -0.5px; color: #0A0C17; }
  .eyebrow { position: relative; display: inline-block; background: #0A0C17; color: #FFFFFF; font-size: ${isStory ? '22px' : '19px'}; font-weight: 700; letter-spacing: 1.5px; padding: ${isStory ? '9px 20px' : '7px 16px'}; border-radius: 8px; margin-bottom: ${isStory ? '28px' : '20px'}; }
  .headline { position: relative; font-size: ${headlineSize}px; font-weight: 900; letter-spacing: -2px; line-height: 1.08; color: #0A0C17; max-width: ${isStory ? '100%' : '780px'}; }
  .tag-chip { position: relative; margin-top: ${isStory ? '36px' : '26px'}; display: inline-block; background: #0A0C17; color: #FFFFFF; font-size: ${isStory ? '24px' : '20px'}; font-weight: 700; padding: ${isStory ? '11px 26px' : '9px 22px'}; border-radius: 999px; }
  .footer { position: absolute; bottom: ${isStory ? '90px' : '48px'}; left: ${isStory ? '68px' : '68px'}; font-size: ${isStory ? '20px' : '17px'}; font-weight: 700; color: rgba(10,12,23,0.7); }
  </style></head><body>
  <div class="stage">
    <svg class="watermark-icon" viewBox="0 0 24 24" fill="none" stroke="#0A0C17" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
    <div class="top-row"><img class="logo" src="file:///${logoPath}" /><div class="wordmark">LocalsIndia</div></div>
    <div class="eyebrow">${theme.eyebrow}</div>
    <div class="headline">${headline}</div>
    ${tag ? `<div class="tag-chip">${tag}</div>` : ''}
    <div class="footer">Free to post · WhatsApp contact · localsindia.com</div>
  </div></body></html>`;
}

const STYLE_RENDERERS = {
  glass: renderGlass, bold: renderBold, duotone: renderDuotone,
  quote: renderQuote, spotlight: renderSpotlight,
};

function buildHtml({ width, height, headline, tag, topic, style }) {
  const logoPath = path.join(__dirname, '..', 'mobile', 'assets', 'logo-mark-transparent.png').replace(/\\/g, '/');
  const isStory = height > width;
  const theme = TOPIC_THEMES[topic] || DEFAULT_THEME;
  const iconPath = TOPIC_ICON_PATHS[topic] || TOPIC_ICON_PATHS.app_feature;
  const renderer = STYLE_RENDERERS[style] || STYLE_RENDERERS.glass;
  return renderer({ width, height, headline, tag, theme, iconPath, logoPath, isStory });
}

async function main() {
  const { format = 'square', headline, tag = '', topic = '', style = '', out } = parseArgs();
  if (!headline || !out) {
    console.error('Usage: node render_post_image.js --format square|story --headline "..." --tag "..." --topic app_feature --style glass|bold|duotone|quote|spotlight --out /path/out.png');
    process.exit(1);
  }

  const dims = format === 'story' ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };
  const html = buildHtml({ ...dims, headline, tag, topic, style });

  // page.setContent() leaves the page on an about:blank-ish origin, which
  // Chromium blocks from loading local file:// images (broken img icon).
  // Writing to a real temp .html file and navigating to it gives the page
  // an actual file:// origin, so the local logo asset loads correctly.
  const tempHtmlPath = path.join(os.tmpdir(), `localsindia-post-${Date.now()}.html`);
  fs.writeFileSync(tempHtmlPath, html, 'utf-8');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: dims });
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
