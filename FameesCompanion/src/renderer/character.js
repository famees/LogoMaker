// The companion: denim jacket, grey tee, jeans, white sneakers.
// Drawn as SVG with movable joints so he can act out stretches.
//
//   const c = createCharacter(document.getElementById('character'));
//   c.setPose('reach');
(function () {
  const OUT = '#2b1a12';
  const SHOULDER_L = [104, 208], SHOULDER_R = [216, 208];
  const UPPER = 86, FORE = 62;

  // Joint angles in degrees (SVG rotate: positive = clockwise; arms hang straight down at 0).
  // aL/bL = left upper arm / forearm, aR/bR = right; lean = upper body; tilt = head.
  const POSES = {
    idle:      { aL: 8,   bL: -6,   aR: -8,   bR: 6,    lean: 0,   tilt: 0,   bottle: 0 },
    water:     { aL: 18,  bL: -192, aR: -8,   bR: 6,    lean: 0,   tilt: 3,   bottle: 1 },
    wave:      { aL: 8,   bL: -6,   aR: -140, bR: -30,  lean: 0,   tilt: -4,  bottle: 0, loop: 'wave' },
    thumbs:    { aL: 8,   bL: -6,   aR: -25,  bR: 185,  lean: 0,   tilt: 4,   bottle: 0 },
    insist:    { aL: 38,  bL: -88,  aR: -38,  bR: 88,   lean: 0,   tilt: -6,  bottle: 0 },
    celebrate: { aL: 145, bL: 15,   aR: -145, bR: -15,  lean: 0,   tilt: 0,   bottle: 0, loop: 'jump' },
    reach:     { aL: 172, bL: 4,    aR: -172, bR: -4,   lean: 0,   tilt: 0,   bottle: 0, loop: 'reach' },
    bendLeft:  { aL: 4,   bL: 0,    aR: -168, bR: -28,  lean: -14, tilt: -8,  bottle: 0 },
    bendRight: { aL: 168, bL: 28,   aR: -4,   bR: 0,    lean: 14,  tilt: 8,   bottle: 0 },
    neckLeft:  { aL: 8,   bL: -6,   aR: -8,   bR: 6,    lean: 0,   tilt: -22, bottle: 0 },
    neckRight: { aL: 8,   bL: -6,   aR: -8,   bR: 6,    lean: 0,   tilt: 22,  bottle: 0 },
    rolls:     { aL: 10,  bL: -6,   aR: -10,  bR: 6,    lean: 0,   tilt: 0,   bottle: 0, loop: 'rolls' },
    open:      { aL: 84,  bL: 12,   aR: -84,  bR: -12,  lean: 0,   tilt: -4,  bottle: 0, loop: 'breathe' },
    point:     { aL: 8,   bL: -6,   aR: -94,  bR: -4,   lean: 0,   tilt: 8,   bottle: 0, eyes: 3 },
  };

  // Extra motion layered on top of a pose: (seconds) => partial offsets.
  const LOOPS = {
    wave: t => ({ bR: Math.sin(t * 9) * 22 }),
    jump: t => ({ bob: -Math.abs(Math.sin(t * 5)) * 14 }),
    reach: t => ({ bob: -Math.abs(Math.sin(t * 1.6)) * 5 }),
    rolls: t => ({ shoulders: Math.sin(t * 4) * 7, aL: Math.cos(t * 4) * 4, aR: -Math.cos(t * 4) * 4 }),
    breathe: t => ({ aL: Math.sin(t * 2) * 6, aR: -Math.sin(t * 2) * 6 }),
  };

  const limb = (x1, y1, x2, y2, w, fill) => `
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${OUT}" stroke-width="${w + 6}" stroke-linecap="round"/>
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`;

  function armSVG(side, [x, y]) {
    const elbowY = y + UPPER, handY = elbowY + FORE + 6;
    const bottle = side === 'L' ? `
      <g class="bottle">
        <rect x="${x - 17}" y="${handY - 16}" width="34" height="104" rx="13" fill="rgba(215,235,255,0.65)" stroke="#8aa6bb" stroke-width="3"/>
        <rect x="${x - 12}" y="${handY - 14}" width="24" height="74" rx="9" fill="rgba(70,150,230,0.75)"/>
        <rect x="${x - 8}" y="${handY + 86}" width="16" height="14" fill="rgba(215,235,255,0.8)" stroke="#8aa6bb" stroke-width="3"/>
        <rect x="${x - 12}" y="${handY + 98}" width="24" height="16" rx="4" fill="url(#cap)" stroke="#555" stroke-width="2.5"/>
        <path d="M${x + 10} ${handY} L${x + 10} ${handY + 80}" stroke="white" stroke-width="4" stroke-linecap="round" opacity=".7"/>
      </g>` : '';
    return `
      <g id="arm${side}">
        ${limb(x, y, x, elbowY - 4, 34, '#5b80b6')}
        <g id="fore${side}">
          ${limb(x, elbowY + 6, x, elbowY + FORE, 24, '#cf9568')}
          ${limb(x, elbowY - 8, x, elbowY + 4, 38, '#35558a')}
          ${bottle}
          <ellipse cx="${x}" cy="${handY}" rx="14" ry="15" fill="url(#skinS)" stroke="${OUT}" stroke-width="3"/>
          <path d="M${x - 7} ${handY - 4} q5 3 0 8 M${x} ${handY - 5} q5 4 0 10 M${x + 7} ${handY - 4} q5 3 0 8" stroke="#8f5531" stroke-width="1.8" fill="none"/>
        </g>
      </g>`;
  }

  const SVG = `
  <svg viewBox="0 0 320 640" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skin" x1="0" x2="1"><stop offset="0" stop-color="#e2ab7e"/><stop offset="1" stop-color="#bf7f51"/></linearGradient>
      <linearGradient id="skinS" x1="0" x2="1"><stop offset="0" stop-color="#dba277"/><stop offset="1" stop-color="#b8784a"/></linearGradient>
      <linearGradient id="denim" x1="0" x2="1"><stop offset="0" stop-color="#7499cc"/><stop offset="1" stop-color="#43659b"/></linearGradient>
      <linearGradient id="denimS" x1="0" x2="1"><stop offset="0" stop-color="#7499cc"/><stop offset="1" stop-color="#4f72a8"/></linearGradient>
      <linearGradient id="tee" x1="0" x2="1"><stop offset="0" stop-color="#75787d"/><stop offset="1" stop-color="#55585d"/></linearGradient>
      <linearGradient id="jeans" x1="0" x2="1"><stop offset="0" stop-color="#525865"/><stop offset="1" stop-color="#2d3139"/></linearGradient>
      <linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#eee"/><stop offset="1" stop-color="#999"/></linearGradient>
    </defs>
    <ellipse id="shadow" cx="160" cy="612" rx="78" ry="9" fill="black" opacity=".28"/>
    <g id="body"><g transform="translate(0,40)">
      <path d="M110 335 L159 335 L155 385 L152 540 L116 540 L108 400 Z" fill="url(#jeans)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M161 335 L210 335 L212 400 L204 540 L168 540 L165 385 Z" fill="url(#jeans)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M122 420 q10 6 26 2 M124 470 q10 5 24 0 M172 430 q12 6 28 0 M172 485 q10 5 26 0" stroke="#6a717d" stroke-width="2" fill="none" opacity=".7"/>
      <path d="M114 532 Q104 556 108 566 L162 566 Q166 548 152 534 Z" fill="#fafafa" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M168 534 Q154 548 158 566 L212 566 Q216 556 206 532 Z" fill="#fafafa" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M108 560 L162 560 M158 560 L212 560" stroke="#c9c9c9" stroke-width="5"/>
      <g id="upper">
        <path d="M120 190 L200 190 L210 350 L110 350 Z" fill="url(#tee)" stroke="${OUT}" stroke-width="3"/>
        <path d="M128 186 Q100 192 94 216 L98 358 L147 358 L145 252 L138 200 Z" fill="url(#denim)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M192 186 Q220 192 226 216 L222 358 L173 358 L175 252 L182 200 Z" fill="url(#denim)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M128 186 L150 236 L138 200 Z M192 186 L170 236 L182 200 Z" fill="#35558a" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M104 238 h30 v8 h-30 Z M186 238 h30 v8 h-30 Z" fill="#35558a" stroke="${OUT}" stroke-width="2"/>
        <path d="M105 246 h28 v24 h-28 Z M187 246 h28 v24 h-28 Z" fill="none" stroke="#d6b06a" stroke-width="1.6" stroke-dasharray="4 3"/>
        <circle cx="119" cy="242" r="3" fill="#c9a24d"/><circle cx="201" cy="242" r="3" fill="#c9a24d"/>
        <circle cx="140" cy="290" r="3.5" fill="#c9a24d"/><circle cx="140" cy="322" r="3.5" fill="#c9a24d"/>
        <path d="M98 344 h49 v14 h-49 Z M173 344 h49 v14 h-49 Z" fill="#35558a" stroke="${OUT}" stroke-width="2.5"/>
        <path d="M142 256 L143 340 M178 256 L177 340" stroke="#d6b06a" stroke-width="1.6" stroke-dasharray="4 3"/>
        <g id="arms">${armSVG('L', SHOULDER_L)}${armSVG('R', SHOULDER_R)}</g>
        <rect x="146" y="150" width="28" height="46" fill="#b0713f" stroke="${OUT}" stroke-width="3"/>
        <path d="M146 190 Q160 202 174 190" stroke="#4d5054" stroke-width="4" fill="none"/>
        <g id="head">
          <ellipse cx="114" cy="118" rx="9" ry="14" fill="url(#skin)" stroke="${OUT}" stroke-width="3"/>
          <ellipse cx="206" cy="118" rx="9" ry="14" fill="url(#skin)" stroke="${OUT}" stroke-width="3"/>
          <path d="M116 92 Q114 150 136 168 Q160 184 184 168 Q206 150 204 92 Q200 52 160 50 Q120 52 116 92 Z" fill="url(#skin)" stroke="${OUT}" stroke-width="3"/>
          <path d="M117 118 Q118 158 138 172 Q160 188 182 172 Q202 158 203 118 Q198 140 190 146 Q176 139 160 140 Q144 139 130 146 Q122 140 117 118 Z" fill="#24170f" opacity=".92"/>
          <path d="M136 142 Q150 130 160 135 Q170 130 184 142 Q170 138 160 140 Q150 138 136 142 Z" fill="#1d120c"/>
          <path d="M141 146 Q160 168 179 146 Q160 152 141 146 Z" fill="white" stroke="#5a2a20" stroke-width="2"/>
          <path d="M156 110 Q151 126 157 131 Q163 133 167 129" stroke="#9c5f38" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <ellipse cx="142" cy="106" rx="9" ry="7.5" fill="white"/><ellipse cx="178" cy="106" rx="9" ry="7.5" fill="white"/>
          <g id="eyes">
            <circle cx="143" cy="107" r="5.2" fill="#3b2416"/><circle cx="177" cy="107" r="5.2" fill="#3b2416"/>
            <circle cx="143" cy="107" r="2.4" fill="black"/><circle cx="177" cy="107" r="2.4" fill="black"/>
            <circle cx="141" cy="105" r="1.7" fill="white"/><circle cx="175" cy="105" r="1.7" fill="white"/>
          </g>
          <path d="M129 95 Q141 86 154 92 M191 95 Q179 86 166 92" stroke="#15100d" stroke-width="5.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="128" cy="126" rx="7" ry="4" fill="#e07a6a" opacity=".25"/><ellipse cx="192" cy="126" rx="7" ry="4" fill="#e07a6a" opacity=".25"/>
          <path d="M114 100 Q106 60 132 44 Q150 28 178 34 Q204 34 212 60 Q214 80 206 100 Q204 80 194 72 Q178 64 160 66 Q140 66 126 74 Q118 84 114 100 Z" fill="#15100d" stroke="${OUT}" stroke-width="3"/>
          <path d="M114 96 L117 122 L122 122 L121 94 Z M206 96 L203 122 L198 122 L199 94 Z" fill="#15100d"/>
          <path d="M136 46 Q162 30 192 44 M146 56 Q166 44 186 52" stroke="#4a382c" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>
        </g>
      </g>
    </g></g>
  </svg>`;

  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const KEYS = ['aL', 'bL', 'aR', 'bR', 'lean', 'tilt', 'bottle', 'eyes'];

  window.createCharacter = function (container) {
    container.innerHTML = SVG;
    const $ = id => container.querySelector('#' + id);
    const el = { body: $('body'), upper: $('upper'), arms: $('arms'), armL: $('armL'), foreL: $('foreL'),
      armR: $('armR'), foreR: $('foreR'), head: $('head'), eyes: $('eyes'), bottle: container.querySelector('.bottle') };

    const norm = p => Object.fromEntries(KEYS.map(k => [k, p[k] || 0]));
    let from = norm(POSES.idle), to = from, start = 0, loop = null, poseName = 'idle';
    const DURATION = 550;

    function frame(now) {
      const t = Math.min(1, (now - start) / DURATION), e = ease(t);
      const s = {};
      for (const k of KEYS) s[k] = from[k] + (to[k] - from[k]) * e;
      const secs = now / 1000;
      const extra = { bob: Math.sin(secs * 2.6) * 2, ...(loop ? LOOPS[loop](secs) : {}) };
      for (const k of KEYS) if (extra[k]) s[k] += extra[k];
      const [lx, ly] = SHOULDER_L, [rx, ry] = SHOULDER_R;
      el.body.setAttribute('transform', `translate(0 ${extra.bob || 0})`);
      el.upper.setAttribute('transform', `rotate(${s.lean} 160 340)`);
      el.arms.setAttribute('transform', `translate(0 ${-(extra.shoulders || 0)})`);
      el.armL.setAttribute('transform', `rotate(${s.aL} ${lx} ${ly})`);
      el.foreL.setAttribute('transform', `rotate(${s.bL} ${lx} ${ly + UPPER})`);
      el.armR.setAttribute('transform', `rotate(${s.aR} ${rx} ${ry})`);
      el.foreR.setAttribute('transform', `rotate(${s.bR} ${rx} ${ry + UPPER})`);
      el.head.setAttribute('transform', `rotate(${s.tilt} 160 190)`);
      el.eyes.setAttribute('transform', `translate(${s.eyes} 0)`);
      el.bottle.setAttribute('opacity', Math.max(0, Math.min(1, s.bottle)).toFixed(2));
      current = s;
      if (running) requestAnimationFrame(frame);
    }
    let running = true;
    let current = from;
    requestAnimationFrame(frame);

    return {
      // Stop/start the animation loop (no CPU use while he's hidden).
      pause() { running = false; },
      resume() { if (!running) { running = true; requestAnimationFrame(frame); } },
      poses: Object.keys(POSES),
      get pose() { return poseName; },
      setPose(name, { instant = false } = {}) {
        const p = POSES[name] || POSES.idle;
        poseName = POSES[name] ? name : 'idle';
        from = instant ? norm(p) : { ...current };
        to = norm(p);
        loop = p.loop || null;
        start = performance.now();
      },
    };
  };
})();
