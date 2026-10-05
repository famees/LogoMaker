// Daily counts (glasses of water, stretches, guided routines, snoozes, breaks)
// stored in stats.json in the app's data folder.
const fs = require('fs');

const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const EMPTY = () => ({ water: 0, stretch: 0, routines: 0, snoozes: 0, breaks: 0 });

class Stats {
  constructor(file) {
    this.file = file;
    this.days = {};
    if (file) {
      try { this.days = JSON.parse(fs.readFileSync(file, 'utf8')).days || {}; } catch { /* first run */ }
    }
  }

  day(date) {
    const k = dayKey(date);
    return { ...EMPTY(), ...(this.days[k] || {}) };
  }

  add(field, date, n = 1) {
    const k = dayKey(date);
    this.days[k] = { ...EMPTY(), ...(this.days[k] || {}) };
    this.days[k][field] += n;
    this.persist();
    return this.days[k][field];
  }

  persist() {
    if (!this.file) return;
    try { fs.writeFileSync(this.file, JSON.stringify({ days: this.days }, null, 2)); } catch (e) { console.error(e); }
  }

  // Days in a row the water goal was reached, counting today only once it's reached.
  streak(goal, today) {
    let n = 0;
    const d = new Date(today);
    if (this.day(d).water < goal) d.setDate(d.getDate() - 1);
    while (this.day(d).water >= goal) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  lastDays(count, today) {
    const out = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      out.push({ date: dayKey(d), label: d.toLocaleDateString('en-US', { weekday: 'short' }), ...this.day(d) });
    }
    return out;
  }
}

module.exports = { Stats, dayKey };
