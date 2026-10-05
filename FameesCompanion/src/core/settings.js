// User settings, stored as settings.json in the app's data folder.
// "Edit settings…" in the menu opens that file; changes apply as soon as it's saved.
const fs = require('fs');

const DEFAULTS = {
  name: 'Famees',
  waterEveryMinutes: 30,
  stretchEveryMinutes: 15,
  waterGoalGlasses: 8,
  // Snooze length for the 1st, 2nd, 3rd+ "Remind me later" in a row.
  snoozeMinutes: [5, 3, 2],
  // Away from the computer this long = you took a real break (stretch timer restarts).
  awayAfterMinutes: 5,
  // Wait for you to stop typing this long before popping up...
  pauseSeconds: 2,
  // ...but don't wait longer than this.
  maxPauseWaitSeconds: 90,
  // Don't interrupt calls (mic/camera in use, Zoom meeting) or full-screen apps.
  waitForCallsAndFullscreen: true,
  quietHours: { start: '23:00', end: '08:00' },
  voice: true,
  // Hide an unanswered question after this long (counts as a snooze).
  hideUnansweredAfterSeconds: 120,
};

function load(file) {
  let user = {};
  try {
    user = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('settings.json is not valid JSON, using defaults:', e.message);
  }
  const merged = { ...DEFAULTS, ...user, quietHours: { ...DEFAULTS.quietHours, ...(user.quietHours || {}) } };
  if (!Array.isArray(merged.snoozeMinutes) || !merged.snoozeMinutes.length) merged.snoozeMinutes = DEFAULTS.snoozeMinutes;
  for (const k of ['waterEveryMinutes', 'stretchEveryMinutes', 'waterGoalGlasses', 'awayAfterMinutes']) {
    if (!(Number(merged[k]) > 0)) merged[k] = DEFAULTS[k];
  }
  return merged;
}

function ensureFile(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(DEFAULTS, null, 2) + '\n');
}

function save(file, settings) {
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
}

module.exports = { DEFAULTS, load, ensureFile, save };
