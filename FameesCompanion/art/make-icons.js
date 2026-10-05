// Draws the app icon and the menu bar / tray icons into ../assets.
// Run: npm run icons   (uses Playwright's Chromium; only needed if you change the icons)
const path = require('path');
const { chromium } = require('playwright');

const drop = fill => `<path d="M50 8 C50 8 18 46 18 66 a32 32 0 0 0 64 0 C82 46 50 8 50 8 Z" fill="${fill}"/>`;
const ICONS = [
  // Menu bar (Mac): black silhouette, macOS tints it for light/dark menu bars.
  { file: 'trayTemplate.png', size: 16, svg: `${drop('#000')}<circle cx="38" cy="64" r="5" fill="#fff"/><circle cx="62" cy="64" r="5" fill="#fff"/><path d="M36 78 q14 12 28 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>` },
  { file: 'trayTemplate@2x.png', size: 32, same: 'trayTemplate.png' },
  // Windows tray: colored.
  { file: 'tray.png', size: 32, svg: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#1f6fe0"/></linearGradient></defs>${drop('url(#g)')}<circle cx="38" cy="62" r="5" fill="#fff"/><circle cx="62" cy="62" r="5" fill="#fff"/><path d="M36 76 q14 12 28 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>` },
  // App icon (electron-builder makes .icns / .ico from this).
  { file: 'icon.png', size: 1024, svg: `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd84d"/><stop offset="1" stop-color="#ff8a00"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9bd3ff"/><stop offset="1" stop-color="#1f6fe0"/></linearGradient></defs><rect x="4" y="4" width="92" height="92" rx="22" fill="url(#bg)"/><g transform="translate(18 12) scale(.64)">${drop('url(#g)')}<circle cx="38" cy="62" r="5" fill="#fff"/><circle cx="62" cy="62" r="5" fill="#fff"/><path d="M36 76 q14 12 28 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/></g>` },
];

(async () => {
  const browser = await chromium.launch();
  for (const icon of ICONS) {
    const src = icon.same ? ICONS.find(i => i.file === icon.same) : icon;
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
    await page.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${icon.size}" height="${icon.size}">${src.svg}</svg></body></html>`);
    await page.locator('svg').screenshot({ path: path.join(__dirname, '..', 'assets', icon.file), omitBackground: true });
    await page.close();
  }
  await browser.close();
})();
