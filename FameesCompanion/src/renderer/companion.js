// Renders what the main process tells it to show, runs the guided stretch
// routine, and speaks out loud.
const api = window.companion;
const $ = id => document.getElementById(id);
const stage = $('stage'), textEl = $('text'), buttonsEl = $('buttons');
const character = createCharacter($('character'));
let routineTimer = null;

// --- Voice ------------------------------------------------------------------
const MALE = /(daniel|alex|aaron|fred|tom|oliver|arthur|rishi|david|mark|guy|james|george)/i;
function pickVoice() {
  const voices = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith('en'));
  return voices.find(v => v.lang === 'en-IN' && MALE.test(v.name)) || voices.find(v => MALE.test(v.name)) || voices[0];
}
function say(text) {
  if (!text || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = pickVoice() || null;
  u.rate = 1.0;
  speechSynthesis.speak(u);
}

function pop() {
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(520, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.26);
  } catch { /* no audio */ }
}

// --- Click-through: only the buttons catch the mouse ------------------------
let interactive = false;
document.addEventListener('mousemove', e => {
  const over = !!e.target.closest('.interactive button');
  if (over !== interactive) { interactive = over; api.setInteractive(over); }
});

// --- Rendering ---------------------------------------------------------------
function setButtons(buttons) {
  buttonsEl.replaceChildren(...(buttons || []).map(b => {
    const el = document.createElement('button');
    el.textContent = b.label;
    if (b.primary) el.className = 'primary';
    el.addEventListener('click', b.onClick || (() => api.action(b.id)));
    return el;
  }));
}

// Put text in the outlined heading, wrapping emoji so they keep their colors.
const EMOJI = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u;
function setText(text) {
  textEl.replaceChildren(...text.split(EMOJI).filter(Boolean).map(part => {
    if (!EMOJI.test(part)) return document.createTextNode(part);
    const span = document.createElement('span');
    span.className = 'emoji';
    span.textContent = part;
    return span;
  }));
}

function render(msg) {
  stopRoutine();
  $('routine').hidden = true;
  setText(msg.text);
  textEl.style.fontSize = '';
  setButtons(msg.buttons);
  character.setPose(msg.pose || 'idle');
  if (msg.speak) say(msg.speak);
}

api.on('show', msg => {
  render(msg);
  stage.classList.remove('hidden');
  pop();
});
api.on('reply', msg => render(msg));
api.on('hide', () => {
  stopRoutine();
  stage.classList.add('hidden');
  if (interactive) { interactive = false; api.setInteractive(false); }
});

// --- Guided routine ------------------------------------------------------------
function stopRoutine() {
  if (routineTimer) clearInterval(routineTimer);
  routineTimer = null;
}

api.on('routine', ({ steps, voice }) => {
  stopRoutine();
  let i = -1, left = 0;
  $('routine').hidden = false;
  textEl.style.fontSize = '30px';
  setButtons([
    { label: 'Next ⏭', onClick: () => next() },
    { label: 'Stop', onClick: () => { stopRoutine(); api.action('routine-stop'); } },
  ]);

  function next() {
    i++;
    if (i >= steps.length) { stopRoutine(); api.action('routine-done'); return; }
    const s = steps[i];
    left = s.seconds;
    setText(s.title);
    $('tip').textContent = s.tip;
    $('step-count').textContent = `Step ${i + 1} of ${steps.length}`;
    character.setPose(s.pose);
    if (voice) say(`${s.title}. ${s.tip}.`);
    tick();
  }
  function tick() {
    const s = steps[i];
    $('timer-num').textContent = left;
    $('bar-fill').style.width = `${((s.seconds - left) / s.seconds) * 100}%`;
  }
  next();
  routineTimer = setInterval(() => {
    left--;
    if (left <= 0) next(); else tick();
  }, 1000);
});

speechSynthesis.getVoices();
api.ready();
