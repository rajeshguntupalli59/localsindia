/**
 * render_post_image.js — Renders a branded PNG for a social post (feed or story).
 *
 * Usage:
 *   node agents/render_post_image.js --format square --headline "..." --tag "..." --out /path/out.png
 *   node agents/render_post_image.js --format story  --headline "..." --tag "..." --out /path/out.png
 *
 * Reuses the same brand tokens + Plus Jakarta Sans + logo mark as
 * play-store/feature-graphic.html, generalized for dynamic headline text
 * and two Instagram-required aspect ratios (feed square, story 9:16).
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

function buildHtml({ width, height, headline, tag }) {
  const logoPath = path.join(__dirname, '..', 'mobile', 'assets', 'logo-mark-transparent.png').replace(/\\/g, '/');
  const isStory = height > width;
  const logoSize = isStory ? 120 : 100;
  const headlineSize = isStory ? 64 : 56;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${width}px; height: ${height}px;
    overflow: hidden;
    font-family: 'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif;
  }
  .stage {
    width: ${width}px; height: ${height}px;
    position: relative;
    background: #0A0C17;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    overflow: hidden;
    padding: ${isStory ? '140px 80px' : '80px'};
  }
  .glow-orange {
    position: absolute; top: -160px; right: -140px;
    width: 480px; height: 480px; border-radius: 50%;
    background: #F7921E; opacity: 0.16;
  }
  .glow-teal {
    position: absolute; bottom: -180px; left: -140px;
    width: 440px; height: 440px; border-radius: 50%;
    background: #163D6B; opacity: 0.4;
  }
  .top-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: ${isStory ? '64px' : '48px'};
  }
  .logo { width: ${logoSize}px; height: ${logoSize}px; }
  .wordmark {
    font-size: ${isStory ? '40px' : '34px'};
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #F7921E;
  }
  .headline {
    position: relative;
    font-size: ${headlineSize}px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1.15;
    color: #FFFFFF;
    max-width: ${isStory ? '100%' : '820px'};
  }
  .tag-chip {
    position: relative;
    margin-top: ${isStory ? '48px' : '36px'};
    align-self: flex-start;
    font-size: ${isStory ? '26px' : '22px'};
    font-weight: 700;
    color: #0A0C17;
    background: #F7B731;
    padding: ${isStory ? '12px 28px' : '10px 24px'};
    border-radius: 999px;
  }
  .footer {
    position: absolute;
    bottom: ${isStory ? '100px' : '48px'};
    left: ${isStory ? '80px' : '80px'};
    font-size: ${isStory ? '24px' : '20px'};
    font-weight: 600;
    color: rgba(255,255,255,0.55);
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="glow-orange"></div>
    <div class="glow-teal"></div>
    <div class="top-row">
      <img class="logo" src="file:///${logoPath}" />
      <div class="wordmark">LocalsIndia</div>
    </div>
    <div class="headline">${headline}</div>
    ${tag ? `<div class="tag-chip">${tag}</div>` : ''}
    <div class="footer">localsindia.com</div>
  </div>
</body>
</html>`;
}

async function main() {
  const { format = 'square', headline, tag = '', out } = parseArgs();
  if (!headline || !out) {
    console.error('Usage: node render_post_image.js --format square|story --headline "..." --tag "..." --out /path/out.png');
    process.exit(1);
  }

  const dims = format === 'story' ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };
  const html = buildHtml({ ...dims, headline, tag });

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
