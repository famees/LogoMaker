// Renders the companion character (denim jacket, grey tee, jeans, sneakers)
// to transparent PNGs in ../assets. Run: node art/make-art.js  (needs playwright)
const path = require('path');
const { chromium } = require('playwright');

const OUT = '#2b1a12';
const limb = (pts, w, fill) => {
  const d = 'M' + pts.map(p => p.join(' ')).join(' L');
  return `<path d="${d}" stroke="${OUT}" stroke-width="${w + 6}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="${d}" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
};
const arm = (shoulder, elbow, wrist) =>
  limb([shoulder, elbow], 34, 'url(#denimS)') +
  limb([[elbow[0] + (shoulder[0] - elbow[0]) * 0.12, elbow[1] + (shoulder[1] - elbow[1]) * 0.12],
        [elbow[0] + (wrist[0] - elbow[0]) * 0.1, elbow[1] + (wrist[1] - elbow[1]) * 0.1]], 38, '#35558a') +
  limb([[elbow[0] + (wrist[0] - elbow[0]) * 0.12, elbow[1] + (wrist[1] - elbow[1]) * 0.12], wrist], 24, 'url(#skinS)');

const bottle = `
  <g>
    <rect x="62" y="150" width="32" height="100" rx="12" fill="rgba(215,235,255,0.55)" stroke="#8aa6bb" stroke-width="3"/>
    <rect x="66" y="180" width="24" height="66" rx="9" fill="rgba(90,160,225,0.65)"/>
    <rect x="70" y="136" width="16" height="18" rx="3" fill="rgba(215,235,255,0.7)" stroke="#8aa6bb" stroke-width="3"/>
    <rect x="67" y="122" width="22" height="16" rx="4" fill="url(#cap)" stroke="#555" stroke-width="2.5"/>
    <path d="M70 160 L70 238" stroke="white" stroke-width="4" stroke-linecap="round" opacity=".7"/>
  </g>`;

const fist = (x, y) => `
  <ellipse cx="${x}" cy="${y}" rx="17" ry="14" fill="url(#skinS)" stroke="${OUT}" stroke-width="3"/>
  <path d="M${x - 9} ${y - 7} q4 6 0 12 M${x - 1} ${y - 9} q4 7 0 14 M${x + 7} ${y - 7} q4 6 0 12" stroke="#8f5531" stroke-width="2" fill="none"/>`;

const hand = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="13" ry="16" fill="url(#skinS)" stroke="${OUT}" stroke-width="3"/>`;

function figure(pose) {
  const arms = pose === 'water'
    ? arm([104, 208], [84, 294], [78, 240]) + bottle + fist(78, 230)
      + arm([216, 208], [236, 296], [240, 358]) + hand(241, 370)
    : arm([104, 208], [74, 128], [138, 26]) + arm([216, 208], [246, 128], [182, 26])
      + `<ellipse cx="160" cy="18" rx="30" ry="17" fill="url(#skinS)" stroke="${OUT}" stroke-width="3"/>
         <path d="M148 8 v20 M160 4 v26 M172 8 v20" stroke="#8f5531" stroke-width="2"/>`;

  return `
  <ellipse cx="160" cy="572" rx="78" ry="9" fill="black" opacity=".28"/>
  <!-- jeans -->
  <path d="M110 335 L159 335 L155 385 L152 540 L116 540 L108 400 Z" fill="url(#jeans)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M161 335 L210 335 L212 400 L204 540 L168 540 L165 385 Z" fill="url(#jeans)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M122 420 q10 6 26 2 M124 470 q10 5 24 0 M172 430 q12 6 28 0 M172 485 q10 5 26 0" stroke="#6a717d" stroke-width="2" fill="none" opacity=".7"/>
  <!-- sneakers -->
  <path d="M114 532 Q104 556 108 566 L162 566 Q166 548 152 534 Z" fill="#fafafa" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M168 534 Q154 548 158 566 L212 566 Q216 556 206 532 Z" fill="#fafafa" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M108 560 L162 560 M158 560 L212 560" stroke="#c9c9c9" stroke-width="5"/>
  <!-- tee -->
  <path d="M120 190 L200 190 L210 350 L110 350 Z" fill="url(#tee)" stroke="${OUT}" stroke-width="3"/>
  <!-- jacket -->
  <path d="M128 186 Q100 192 94 216 L98 358 L147 358 L145 252 L138 200 Z" fill="url(#denim)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M192 186 Q220 192 226 216 L222 358 L173 358 L175 252 L182 200 Z" fill="url(#denim)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M128 186 L150 236 L138 200 Z M192 186 L170 236 L182 200 Z" fill="#35558a" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M104 238 h30 v8 h-30 Z M186 238 h30 v8 h-30 Z" fill="#35558a" stroke="${OUT}" stroke-width="2"/>
  <path d="M105 246 h28 v24 h-28 Z M187 246 h28 v24 h-28 Z" fill="none" stroke="#d6b06a" stroke-width="1.6" stroke-dasharray="4 3"/>
  <circle cx="119" cy="242" r="3" fill="#c9a24d"/><circle cx="201" cy="242" r="3" fill="#c9a24d"/>
  <circle cx="140" cy="290" r="3.5" fill="#c9a24d"/><circle cx="140" cy="322" r="3.5" fill="#c9a24d"/>
  <path d="M98 344 h49 v14 h-49 Z M173 344 h49 v14 h-49 Z" fill="#35558a" stroke="${OUT}" stroke-width="2.5"/>
  <path d="M142 256 L143 340 M178 256 L177 340" stroke="#d6b06a" stroke-width="1.6" stroke-dasharray="4 3"/>
  ${arms}
  <!-- neck -->
  <rect x="146" y="150" width="28" height="46" fill="#b0713f" stroke="${OUT}" stroke-width="3"/>
  <path d="M146 190 Q160 202 174 190" stroke="#4d5054" stroke-width="4" fill="none"/>
  <!-- head -->
  <ellipse cx="114" cy="118" rx="9" ry="14" fill="url(#skin)" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="206" cy="118" rx="9" ry="14" fill="url(#skin)" stroke="${OUT}" stroke-width="3"/>
  <path d="M116 92 Q114 150 136 168 Q160 184 184 168 Q206 150 204 92 Q200 52 160 50 Q120 52 116 92 Z" fill="url(#skin)" stroke="${OUT}" stroke-width="3"/>
  <path d="M117 118 Q118 158 138 172 Q160 188 182 172 Q202 158 203 118 Q198 140 190 146 Q176 139 160 140 Q144 139 130 146 Q122 140 117 118 Z" fill="#24170f" opacity=".92"/>
  <path d="M136 142 Q150 130 160 135 Q170 130 184 142 Q170 138 160 140 Q150 138 136 142 Z" fill="#1d120c"/>
  <path d="M141 146 Q160 168 179 146 Q160 152 141 146 Z" fill="white" stroke="#5a2a20" stroke-width="2"/>
  <path d="M156 110 Q151 126 157 131 Q163 133 167 129" stroke="#9c5f38" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="142" cy="106" rx="9" ry="7.5" fill="white"/><ellipse cx="178" cy="106" rx="9" ry="7.5" fill="white"/>
  <circle cx="143" cy="107" r="5.2" fill="#3b2416"/><circle cx="177" cy="107" r="5.2" fill="#3b2416"/>
  <circle cx="143" cy="107" r="2.4" fill="black"/><circle cx="177" cy="107" r="2.4" fill="black"/>
  <circle cx="141" cy="105" r="1.7" fill="white"/><circle cx="175" cy="105" r="1.7" fill="white"/>
  <path d="M129 95 Q141 86 154 92 M191 95 Q179 86 166 92" stroke="#15100d" stroke-width="5.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="128" cy="126" rx="7" ry="4" fill="#e07a6a" opacity=".25"/><ellipse cx="192" cy="126" rx="7" ry="4" fill="#e07a6a" opacity=".25"/>
  <!-- hair -->
  <path d="M114 100 Q106 60 132 44 Q150 28 178 34 Q204 34 212 60 Q214 80 206 100 Q204 80 194 72 Q178 64 160 66 Q140 66 126 74 Q118 84 114 100 Z" fill="#15100d" stroke="${OUT}" stroke-width="3"/>
  <path d="M114 96 L117 122 L122 122 L121 94 Z M206 96 L203 122 L198 122 L199 94 Z" fill="#15100d"/>
  <path d="M136 46 Q162 30 192 44 M146 56 Q166 44 186 52" stroke="#4a382c" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>`;
}

const defs = `<defs>
  <linearGradient id="skin" x1="0" x2="1"><stop offset="0" stop-color="#e2ab7e"/><stop offset="1" stop-color="#bf7f51"/></linearGradient>
  <linearGradient id="skinS" gradientUnits="userSpaceOnUse" x1="0" x2="320"><stop offset="0" stop-color="#dba277"/><stop offset="1" stop-color="#b8784a"/></linearGradient>
  <linearGradient id="denim" x1="0" x2="1"><stop offset="0" stop-color="#7499cc"/><stop offset="1" stop-color="#43659b"/></linearGradient>
  <linearGradient id="denimS" gradientUnits="userSpaceOnUse" x1="0" x2="320"><stop offset="0" stop-color="#7499cc"/><stop offset="1" stop-color="#43659b"/></linearGradient>
  <linearGradient id="tee" x1="0" x2="1"><stop offset="0" stop-color="#75787d"/><stop offset="1" stop-color="#55585d"/></linearGradient>
  <linearGradient id="jeans" x1="0" x2="1"><stop offset="0" stop-color="#525865"/><stop offset="1" stop-color="#2d3139"/></linearGradient>
  <linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#eee"/><stop offset="1" stop-color="#999"/></linearGradient>
</defs>`;

const svg = pose => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 620" width="320" height="620">
  ${defs}<g transform="translate(0,40)">${figure(pose)}</g></svg>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 620 }, deviceScaleFactor: 2 });
  for (const pose of ['water', 'stretch']) {
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg(pose)}</body></html>`);
    await page.locator('svg').screenshot({ path: path.join(__dirname, '..', 'assets', `${pose}.png`), omitBackground: true });
  }
  await browser.close();
})();
