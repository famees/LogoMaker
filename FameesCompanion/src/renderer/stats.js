async function draw() {
  const s = await window.companion.getStats();
  document.getElementById('name').textContent = s.name;
  document.getElementById('water').textContent = `${s.today.water} / ${s.goal}`;
  document.getElementById('stretch').textContent = s.today.stretch;
  document.getElementById('streak').textContent = s.streak;

  const W = 380, H = 170, top = 10, bottom = 22, left = 6;
  const max = Math.max(s.goal, ...s.days.map(d => Math.max(d.water, d.stretch)), 1);
  const y = v => H - bottom - (v / max) * (H - top - bottom);
  const slot = (W - left) / s.days.length, bw = Math.min(16, slot / 3);
  let out = `<line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--grid)"/>`;
  out += `<line x1="0" x2="${W}" y1="${y(s.goal)}" y2="${y(s.goal)}" stroke="var(--water)" stroke-dasharray="4 4" opacity=".6"/>`;
  s.days.forEach((d, i) => {
    const cx = left + slot * i + slot / 2;
    const bar = (v, x, color) => v > 0
      ? `<rect x="${x}" y="${y(v)}" width="${bw}" height="${H - bottom - y(v)}" rx="4" fill="${color}"><title>${v}</title></rect>`
      : '';
    out += bar(d.water, cx - bw - 1, 'var(--water)') + bar(d.stretch, cx + 1, 'var(--stretch)');
    out += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${d.label}</text>`;
  });
  document.getElementById('chart').innerHTML = out;
}
draw();
window.companion.on('stats', draw);
