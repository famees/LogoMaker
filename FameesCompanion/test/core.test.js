const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os'), fs = require('fs'), path = require('path');
const { Scheduler, inQuietHours, MIN } = require('../src/core/scheduler');
const { DEFAULTS, load } = require('../src/core/settings');
const { Stats } = require('../src/core/stats');
const msg = require('../src/core/messages');

const T0 = new Date(2026, 9, 5, 10, 0, 0).getTime();
const run = (s, { from, to, idleSec = 0, busy = false, quiet = false, step = 2000 }) => {
  const events = [];
  for (let now = from; now <= to; now += step) {
    for (const e of s.tick({ now, idleSec: typeof idleSec === 'function' ? idleSec(now) : idleSec, busy, quiet })) {
      events.push({ ...e, at: now });
    }
  }
  return events;
};

test('stretch at 15 min, water at 30 min, waiting for a pause in typing', () => {
  const s = new Scheduler(DEFAULTS, T0);
  // Typing constantly (idle 0): stretch waits up to 90 s for a pause.
  const ev = run(s, { from: T0, to: T0 + 15 * MIN + 100 * 1000, idleSec: 0 });
  assert.equal(ev.length, 1);
  assert.equal(ev[0].kind, 'stretch');
  assert.ok(ev[0].at >= T0 + 15 * MIN + 90 * 1000, 'waited for max pause wait');
});

test('shows immediately once you stop typing', () => {
  const s = new Scheduler(DEFAULTS, T0);
  const ev = run(s, { from: T0 + 15 * MIN, to: T0 + 15 * MIN + 10000, idleSec: 3 });
  assert.equal(ev[0].kind, 'stretch');
  assert.equal(ev[0].at, T0 + 15 * MIN);
});

test('water and stretch both due at 30 min: water first, then stretch', () => {
  const s = new Scheduler(DEFAULTS, T0);
  s.due.stretch = T0 + 30 * MIN;
  let ev = run(s, { from: T0 + 30 * MIN, to: T0 + 30 * MIN + 4000, idleSec: 5 });
  assert.deepEqual(ev.map(e => e.kind), ['water']);
  s.answered('water', 'done', T0 + 30 * MIN + 5000);
  ev = run(s, { from: T0 + 30 * MIN + 6000, to: T0 + 30 * MIN + 20000, idleSec: 5 });
  assert.deepEqual(ev.map(e => e.kind), ['stretch']);
});

test('waits during a call and says so afterwards', () => {
  const s = new Scheduler(DEFAULTS, T0);
  let ev = run(s, { from: T0 + 15 * MIN, to: T0 + 40 * MIN, idleSec: 5, busy: true });
  assert.equal(ev.length, 0);
  ev = run(s, { from: T0 + 40 * MIN, to: T0 + 40 * MIN + 2000, idleSec: 5 });
  assert.equal(ev[0].kind, 'water');
  assert.equal(ev[0].afterCall, true);
});

test('being away 5+ minutes counts as a break and restarts the stretch timer', () => {
  const s = new Scheduler(DEFAULTS, T0);
  // Away from 10:05 to 10:13 (idle grows), back at 10:13.
  const awayFrom = T0 + 5 * MIN, back = T0 + 13 * MIN;
  const idle = now => (now >= awayFrom && now < back ? (now - awayFrom) / 1000 : 0);
  const ev = run(s, { from: awayFrom, to: back + 4000, idleSec: idle });
  const brk = ev.find(e => e.type === 'autoBreak');
  assert.ok(brk);
  assert.equal(brk.minutes, 8);
  assert.ok(s.due.stretch >= back + 15 * MIN - 2000, 'stretch pushed to 15 min after return');
  assert.equal(s.due.water, T0 + 30 * MIN, 'water unchanged');
});

test('short absence is not a break; nothing shows while away', () => {
  const s = new Scheduler(DEFAULTS, T0);
  const ev = run(s, { from: T0 + 15 * MIN, to: T0 + 16 * MIN, idleSec: 6 * 60 });
  assert.equal(ev.filter(e => e.type === 'show').length, 0);
});

test('sleep counts as away', () => {
  const s = new Scheduler(DEFAULTS, T0);
  s.markAway(T0 + 10 * MIN);
  const ev = run(s, { from: T0 + 40 * MIN, to: T0 + 40 * MIN, idleSec: 0 });
  assert.equal(ev[0].type, 'autoBreak');
});

test('snoozing escalates and shortens; yes resets', () => {
  const s = new Scheduler(DEFAULTS, T0);
  const now = T0 + 30 * MIN;
  s.show('water', now);
  assert.equal(s.answered('water', 'later', now), 5);
  assert.equal(s.level.water, 1);
  assert.equal(s.answered('water', 'later', now), 3);
  assert.equal(s.answered('water', 'ignored', now), 2);
  assert.equal(s.answered('water', 'later', now), 2);
  assert.equal(s.due.water, now + 2 * MIN);
  s.answered('water', 'done', now);
  assert.equal(s.level.water, 0);
  assert.equal(s.due.water, now + 30 * MIN);
});

test('quiet hours wrap past midnight', () => {
  const q = { start: '23:00', end: '08:00' };
  assert.equal(inQuietHours(q, new Date(2026, 0, 1, 23, 30)), true);
  assert.equal(inQuietHours(q, new Date(2026, 0, 1, 7, 59)), true);
  assert.equal(inQuietHours(q, new Date(2026, 0, 1, 8, 0)), false);
  assert.equal(inQuietHours({ start: '13:00', end: '14:00' }, new Date(2026, 0, 1, 13, 30)), true);
});

test('stats: counts, streak, last 7 days, persistence', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fc-')), 'stats.json');
  const st = new Stats(file);
  const day = n => new Date(2026, 9, n, 12);
  for (const n of [2, 3, 4]) for (let i = 0; i < 8; i++) st.add('water', day(n));
  st.add('water', day(5));
  assert.equal(st.streak(8, day(5)), 3, "today not reached yet doesn't break the streak");
  for (let i = 0; i < 7; i++) st.add('water', day(5));
  assert.equal(st.streak(8, day(5)), 4);
  assert.equal(new Stats(file).day(day(5)).water, 8, 'persisted');
  const week = st.lastDays(7, day(5));
  assert.equal(week.length, 7);
  assert.equal(week[6].water, 8);
});

test('settings: bad values fall back to defaults', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fc-')), 'settings.json');
  fs.writeFileSync(file, JSON.stringify({ name: 'Famees', waterEveryMinutes: 0, quietHours: { end: '07:00' } }));
  const s = load(file);
  assert.equal(s.waterEveryMinutes, 30);
  assert.deepEqual(s.quietHours, { start: '23:00', end: '07:00' });
  fs.writeFileSync(file, '{ not json');
  assert.equal(load(file).name, 'Famees');
});

test('messages get firmer and use the name', () => {
  assert.match(msg.prompt('water', 0, 'Famees').text, /Hey, Famees\nHave you had water\?/);
  assert.match(msg.prompt('water', 2, 'Famees', { nextSnooze: 2 }).text, /Water\. Now\./);
  assert.equal(msg.prompt('water', 2, 'Famees', { nextSnooze: 2 }).buttons[1].label, 'Okay, 2 more minutes…');
  assert.match(msg.prompt('stretch', 0, 'Famees').text, /stretched your body or not/);
  assert.equal(msg.prompt('stretch', 0, 'Famees').buttons[0].id, 'routine');
  assert.match(msg.waterDone('Famees', 8, 8, 0).text, /Goal reached/);
  assert.equal(msg.spoken('Great job! 💧\n3 of 8'), 'Great job! 3 of 8');
  assert.ok(msg.ROUTINE.reduce((a, s) => a + s.seconds, 0) <= 70);
});
