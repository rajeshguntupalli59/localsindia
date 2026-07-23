/**
 * render_html_to_png.js — Renders any standalone HTML file to a PNG at a
 * given pixel size. Generic version of render_post_image.js's approach,
 * for one-off designed assets (posters, banners) that don't fit the
 * templated headline/tag social-post shape.
 *
 * Usage:
 *   node agents/render_html_to_png.js --html /path/to/file.html --width 1600 --height 1131 --out /path/out.png
 */
const fs = require('fs');
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

async function main() {
  const { html, width, height, out } = parseArgs();
  if (!html || !width || !height || !out) {
    console.error('Usage: node render_html_to_png.js --html /path/file.html --width N --height N --out /path/out.png');
    process.exit(1);
  }

  const absHtmlPath = path.resolve(html).replace(/\\/g, '/');
  const dims = { width: parseInt(width, 10), height: parseInt(height, 10) };

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: dims });
  // Navigate to the real file (not setContent) so relative/file:// asset
  // references (logo, etc.) resolve — see render_post_image.js for why
  // setContent() silently breaks local image loading.
  await page.goto(`file:///${absHtmlPath}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  await browser.close();

  console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
