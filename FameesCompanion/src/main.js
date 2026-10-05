// Famees Companion — main process (Mac + Windows).
// Owns the schedule, the menu bar / tray icon, stats, and the see-through
// companion window that pops up in the middle of the screen.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, powerMonitor, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { Scheduler, inQuietHours, MIN } = require('./core/scheduler');
const settingsStore = require('./core/settings');
const { Stats } = require('./core/stats');
const msg = require('./core/messages');
const { isBusy } = require('./core/busy');

if (!app.requestSingleInstanceLock()) app.quit();

const IS_MAC = process.platform === 'darwin';
const asset = name => path.join(__dirname, '..', 'assets', name);

let settings, scheduler, stats, win, statsWin, tray;
let settingsFile;
let visible = false;          // companion window currently on screen
let current = null;           // { kind, level } of the reminder being shown
let hideTimer = null;
let rendererReady = false, pending = [];
let paused = false, meetingUntil = 0, awaySince = null;
const busy = { value: false, at: 0, checking: false };

// ---------------------------------------------------------------- startup

app.whenReady().then(() => {
  if (IS_MAC && app.dock) app.dock.hide();

  const data = app.getPath('userData');
  settingsFile = path.join(data, 'settings.json');
  settingsStore.ensureFile(settingsFile);
  settings = settingsStore.load(settingsFile);
  stats = new Stats(path.join(data, 'stats.json'));
  scheduler = new Scheduler(settings, Date.now());

  createTray();
  enableLoginOnFirstRun(data);

  fs.watchFile(settingsFile, { interval: 2000 }, () => {
    settings = settingsStore.load(settingsFile);
    scheduler.updateSettings(settings, Date.now());
    updateTray();
  });

  // Sleep / lock counts as being away from the computer.
  for (const ev of ['suspend', 'lock-screen']) powerMonitor.on(ev, () => { awaySince = awaySince || Date.now(); });
  for (const ev of ['resume', 'unlock-screen']) powerMonitor.on(ev, () => {
    if (awaySince) scheduler.markAway(awaySince);
    awaySince = null;
  });

  const greet = msg.greeting(settings.name, settings);
  show('show', { ...greet, speak: settings.voice ? greet.speak : null });
  armHide(7000);

  setInterval(loop, 2000);
  setInterval(updateTray, 30 * 1000);
});

app.on('second-instance', () => openStats());
app.on('window-all-closed', () => { /* keep running in the menu bar / tray */ });

// ---------------------------------------------------------------- main loop

async function loop() {
  const now = Date.now();
  if (paused || visible || awaySince) return;
  if (meetingUntil) {
    if (now < meetingUntil) return;
    meetingUntil = 0;
    scheduler.wasBusy = true; // so the next question says "Call's over"
    updateTray();
  }

  const quiet = inQuietHours(settings.quietHours, new Date(now));
  const somethingDue = Object.values(scheduler.untilDue(now)).some(ms => ms === 0);
  if (somethingDue && !quiet && settings.waitForCallsAndFullscreen && now - busy.at > 15000) {
    refreshBusy();
    return; // decide once we know whether you're on a call
  }

  const events = scheduler.tick({
    now,
    idleSec: powerMonitor.getSystemIdleTime(),
    busy: settings.waitForCallsAndFullscreen && busy.value,
    quiet,
  });
  for (const e of events) {
    if (e.type === 'autoBreak') { stats.add('breaks', new Date()); updateTray(); }
    if (e.type === 'show') showReminder(e.kind, e.level, e.afterCall);
  }
}

function refreshBusy() {
  if (busy.checking) return;
  busy.checking = true;
  isBusy().then(v => Object.assign(busy, { value: v, at: Date.now(), checking: false }));
}

// ---------------------------------------------------------------- companion window

// The window only exists while he's on screen; between reminders it's closed so
// it uses no memory or CPU.
function createCompanionWindow() {
  rendererReady = false;
  win = new BrowserWindow({
    width: 600, height: 760, show: false,
    transparent: true, frame: false, hasShadow: false, backgroundColor: '#00000000',
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false, acceptFirstMouse: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'renderer', 'companion.html'));
  win.on('closed', () => { win = null; rendererReady = false; pending = []; });
}

// Center on whichever screen the mouse is on.
function placeWindow() {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const width = Math.min(600, workArea.width), height = Math.min(760, workArea.height);
  win.setBounds({
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width, height,
  });
}

function send(channel, payload) {
  if (!win || !rendererReady) { pending.push([channel, payload]); return; }
  win.webContents.send(channel, payload);
}

function show(channel, payload) {
  clearTimeout(hideTimer);
  if (!win) createCompanionWindow();
  if (!visible) { placeWindow(); win.showInactive(); }
  visible = true;
  send(channel, payload);
}

function hideWindow() {
  clearTimeout(hideTimer);
  send('hide');
  visible = false;
  current = null;
  scheduler.lastHidden = Date.now();
  if (win) win.setIgnoreMouseEvents(true, { forward: true });
  setTimeout(() => { if (!visible && win) win.destroy(); }, 450);
  updateTray();
}

function armHide(ms, onTimeout = hideWindow) {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(onTimeout, ms);
}

const speakable = text => (settings.voice ? msg.spoken(text) : null);

function showReminder(kind, level, afterCall) {
  current = { kind, level };
  const snoozes = settings.snoozeMinutes;
  const p = msg.prompt(kind, level, settings.name, { afterCall, nextSnooze: snoozes[Math.min(level, snoozes.length - 1)] });
  show('show', { ...p, speak: speakable(p.text) });
  armHide(settings.hideUnansweredAfterSeconds * 1000, () => {
    if (current) { scheduler.answered(current.kind, 'ignored', Date.now()); stats.add('snoozes', new Date()); }
    hideWindow();
  });
}

function reply(r, hideAfterMs) {
  show('reply', { ...r, speak: speakable(r.text) });
  armHide(hideAfterMs);
}

function startRoutine() {
  clearTimeout(hideTimer);
  show('routine', { steps: msg.ROUTINE, voice: settings.voice });
}

// ---------------------------------------------------------------- answers from the window

ipcMain.on('ready', e => {
  if (!win || e.sender !== win.webContents) return;
  rendererReady = true;
  for (const [c, p] of pending) win.webContents.send(c, p);
  pending = [];
});

ipcMain.on('interactive', (_e, on) => { if (win) win.setIgnoreMouseEvents(!on, { forward: true }); });

ipcMain.on('action', (_e, id) => {
  if (!current) return;
  const { kind, level } = current;
  const now = Date.now(), today = new Date();

  if (id === 'yes') {
    scheduler.answered(kind, 'done', now);
    if (kind === 'water') reply(msg.waterDone(settings.name, stats.add('water', today), settings.waterGoalGlasses, level), 3500);
    else reply(msg.stretchDone(settings.name, stats.add('stretch', today)), 3500);
  } else if (id === 'later') {
    const minutes = scheduler.answered(kind, 'later', now);
    stats.add('snoozes', today);
    reply(msg.snoozed(minutes, level), 2800);
  } else if (id === 'routine') {
    startRoutine();
  } else if (id === 'routine-done' || id === 'routine-stop') {
    scheduler.answered('stretch', 'done', now);
    stats.add('stretch', today);
    if (id === 'routine-done') {
      stats.add('routines', today);
      reply(msg.routineDone(settings.name), 4000);
    } else {
      reply({ text: `Nice, ${settings.name}!\nEvery bit counts 👍`, pose: 'thumbs' }, 2500);
    }
  }
  updateTray();
  if (statsWin && !statsWin.isDestroyed()) statsWin.webContents.send('stats');
});

ipcMain.handle('get-stats', () => {
  const today = new Date();
  return {
    name: settings.name,
    goal: settings.waterGoalGlasses,
    today: stats.day(today),
    streak: stats.streak(settings.waterGoalGlasses, today),
    days: stats.lastDays(7, today),
  };
});

// ---------------------------------------------------------------- menu bar / tray

function askNow(kind) {
  if (visible) return;
  const e = scheduler.show(kind, Date.now());
  showReminder(e.kind, e.level, false);
}

function stretchNow() {
  if (visible && current && current.kind === 'stretch') return startRoutine();
  if (visible) return;
  scheduler.show('stretch', Date.now());
  current = { kind: 'stretch', level: 0 };
  startRoutine();
}

// Logged from the menu: counts a glass and restarts the water timer.
function logGlass() {
  if (visible && current && current.kind === 'water') return;
  stats.add('water', new Date());
  if (scheduler.showing !== 'water') scheduler.answered('water', 'done', Date.now());
  updateTray();
}

function createTray() {
  let icon;
  if (IS_MAC) {
    icon = nativeImage.createFromPath(asset('trayTemplate.png'));
    icon.setTemplateImage(true);
  } else {
    icon = nativeImage.createFromPath(asset('tray.png'));
  }
  tray = new Tray(icon);
  tray.on('click', () => { if (!IS_MAC) tray.popUpContextMenu(); });
  updateTray();
}

const mins = ms => Math.max(1, Math.ceil(ms / MIN));

function statusLine(now) {
  if (paused) return 'Reminders paused';
  if (meetingUntil > now) {
    return `In a meeting until ${new Date(meetingUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (inQuietHours(settings.quietHours, new Date(now))) return `Quiet hours until ${settings.quietHours.end}`;
  const u = scheduler.untilDue(now);
  return `Next: water in ${mins(u.water)} min · stretch in ${mins(u.stretch)} min`;
}

function loginSupported() { return app.isPackaged || process.platform === 'win32'; }
function loginOptions() {
  return process.platform === 'win32' && !app.isPackaged ? { path: process.execPath, args: [path.resolve(app.getAppPath())] } : {};
}
function enableLoginOnFirstRun(dataDir) {
  const marker = path.join(dataDir, '.login-configured');
  if (!loginSupported() || fs.existsSync(marker)) return;
  app.setLoginItemSettings({ openAtLogin: true, ...loginOptions() });
  fs.writeFileSync(marker, '');
}

function updateTray() {
  if (!tray) return;
  const now = Date.now(), today = new Date();
  const d = stats.day(today), goal = settings.waterGoalGlasses;
  const streak = stats.streak(goal, today);
  if (IS_MAC) tray.setTitle(` ${d.water}/${goal}`);
  tray.setToolTip(`${settings.name}'s Companion — 💧 ${d.water}/${goal} · 🧘 ${d.stretch} · 🔥 ${streak}`);

  const menu = Menu.buildFromTemplate([
    { label: `Today: 💧 ${d.water}/${goal} glasses · 🧘 ${d.stretch} stretches`, enabled: false },
    { label: `🔥 ${streak}-day water streak`, enabled: false },
    { label: statusLine(now), enabled: false },
    { type: 'separator' },
    { label: 'Ask about water now', click: () => askNow('water') },
    { label: 'Stretch with me now (1 min)', click: stretchNow },
    { label: 'I just drank a glass 💧', click: logGlass },
    { label: 'Show my week…', click: openStats },
    { type: 'separator' },
    { label: "I'm in a meeting (pause 1 hour)", click: () => { meetingUntil = Date.now() + 60 * MIN; updateTray(); } },
    {
      label: 'Pause reminders', type: 'checkbox', checked: paused,
      click: () => { paused = !paused; if (!paused) scheduler.restart(Date.now()); updateTray(); },
    },
    {
      label: 'Voice', type: 'checkbox', checked: settings.voice,
      click: () => { settings.voice = !settings.voice; settingsStore.save(settingsFile, settings); updateTray(); },
    },
    {
      label: loginSupported() ? 'Start at login' : 'Start at login (installed app only)',
      type: 'checkbox', enabled: loginSupported(),
      checked: loginSupported() && app.getLoginItemSettings(loginOptions()).openAtLogin,
      click: item => { app.setLoginItemSettings({ openAtLogin: item.checked, ...loginOptions() }); },
    },
    { label: 'Edit settings…', click: () => shell.openPath(settingsFile) },
    { type: 'separator' },
    { label: 'Quit Companion', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function openStats() {
  if (statsWin && !statsWin.isDestroyed()) { statsWin.show(); statsWin.focus(); return; }
  statsWin = new BrowserWindow({
    width: 460, height: 440, resizable: false, title: 'Your week',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  statsWin.loadFile(path.join(__dirname, 'renderer', 'stats.html'));
  if (IS_MAC) app.focus({ steal: true });
}

// Used by the screenshot test (test/e2e-snapshot.js).
module.exports = { askNow, stretchNow, openStats };
