// Decides *when* the companion should appear. Pure logic, no Electron, so it
// can be unit-tested with a fake clock.
//
// Smart timing rules:
//  - A reminder that is due waits for a natural pause (you stopped typing for a
//    couple of seconds) before showing, but never more than `maxPauseWaitMs`.
//  - While you're on a call / in a full-screen app ("busy"), due reminders wait.
//    When the call ends they show, mentioning the call.
//  - While you're away from the computer nothing shows. If you were away long
//    enough, that counts as a real break and the stretch timer starts over.
//  - "Remind me later" (or ignoring him) snoozes, and each snooze in a row makes
//    the next ask a bit firmer and the snooze a bit shorter.

const MIN = 60 * 1000;
const KINDS = ['water', 'stretch'];

class Scheduler {
  constructor(settings, now) {
    this.settings = settings;
    this.level = { water: 0, stretch: 0 };
    this.showing = null;
    this.awayStart = null;
    this.wasBusy = false;
    this.pauseWaitStart = null;
    this.lastHidden = 0;
    this.restart(now);
  }

  interval(kind) {
    return (kind === 'water' ? this.settings.waterEveryMinutes : this.settings.stretchEveryMinutes) * MIN;
  }

  restart(now) {
    this.due = { water: now + this.interval('water'), stretch: now + this.interval('stretch') };
  }

  // Called when settings change: keep progress but respect new intervals.
  updateSettings(settings, now) {
    this.settings = settings;
    for (const k of KINDS) this.due[k] = Math.min(this.due[k], now + this.interval(k));
  }

  // The computer slept or was locked from `since` until now.
  markAway(since) {
    if (this.awayStart === null || since < this.awayStart) this.awayStart = since;
  }

  // One step of the loop. Returns a list of events for the app to act on:
  //   { type: 'show', kind, level, afterCall }
  //   { type: 'autoBreak', minutes }
  tick({ now, idleSec, busy, quiet }) {
    const s = this.settings;
    const events = [];

    // Away from the computer: show nothing, remember when it started.
    if (idleSec * 1000 >= s.awayAfterMinutes * MIN) {
      this.markAway(now - idleSec * 1000);
      this.pauseWaitStart = null;
      return events;
    }
    if (this.awayStart !== null) {
      const minutes = (now - this.awayStart) / MIN;
      this.awayStart = null;
      if (minutes >= s.awayAfterMinutes) {
        this.due.stretch = Math.max(this.due.stretch, now + this.interval('stretch'));
        this.level.stretch = 0;
        events.push({ type: 'autoBreak', minutes: Math.round(minutes) });
      }
    }

    if (this.showing || quiet || now - this.lastHidden < 3000) return events;

    const kind = KINDS.find(k => now >= this.due[k]);
    if (!kind) {
      this.wasBusy = false;
      this.pauseWaitStart = null;
      return events;
    }
    if (busy) {
      this.wasBusy = true;
      this.pauseWaitStart = null;
      return events;
    }

    // Wait for a natural pause in typing/mousing.
    if (this.pauseWaitStart === null) this.pauseWaitStart = now;
    if (idleSec < s.pauseSeconds && now - this.pauseWaitStart < s.maxPauseWaitSeconds * 1000) return events;

    events.push(this.show(kind, now));
    return events;
  }

  // Show something right now (also used by "Ask now" in the menu).
  show(kind, now) {
    const event = { type: 'show', kind, level: this.level[kind], afterCall: this.wasBusy };
    this.showing = kind;
    this.wasBusy = false;
    this.pauseWaitStart = null;
    this.shownAt = now;
    return event;
  }

  // outcome: 'done' | 'later' | 'ignored'. Returns the snooze length in minutes (or 0).
  answered(kind, outcome, now) {
    this.showing = null;
    this.lastHidden = now;
    if (outcome === 'done') {
      this.level[kind] = 0;
      this.due[kind] = now + this.interval(kind);
      return 0;
    }
    const snoozes = this.settings.snoozeMinutes;
    const minutes = snoozes[Math.min(this.level[kind], snoozes.length - 1)];
    this.level[kind] += 1;
    this.due[kind] = now + minutes * MIN;
    return minutes;
  }

  // Milliseconds until each reminder, for the menu.
  untilDue(now) {
    return { water: Math.max(0, this.due.water - now), stretch: Math.max(0, this.due.stretch - now) };
  }
}

// "23:00"–"08:00" style quiet hours (may wrap past midnight).
function inQuietHours(quiet, date) {
  if (!quiet || !quiet.start || !quiet.end) return false;
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const start = toMin(quiet.start), end = toMin(quiet.end);
  const cur = date.getHours() * 60 + date.getMinutes();
  if (start === end) return false;
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

module.exports = { Scheduler, inQuietHours, KINDS, MIN };
