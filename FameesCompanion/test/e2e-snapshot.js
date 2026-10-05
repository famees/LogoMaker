// Drives the real app and saves screenshots of each state.
// Run (Linux CI):  OUT=/tmp/shots xvfb-run -a npx electron --no-sandbox test/e2e-snapshot.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');

app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'fc-e2e-')));
const out = process.env.OUT || path.join(os.tmpdir(), 'fc-shots');
fs.mkdirSync(out, { recursive: true });
const c = require('../src/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
const companion = () => BrowserWindow.getAllWindows().find(w => w.isAlwaysOnTop());
const act = id => ipcMain.emit('action', {}, id);
async function snap(name, w = companion()) {
  const img = await w.webContents.capturePage();
  fs.writeFileSync(path.join(out, name + '.png'), img.toPNG());
  console.log('saved', name);
}

app.whenReady().then(async () => {
  try {
    await wait(2500); await snap('01-greeting');
    await wait(6500);
    c.askNow('water'); await wait(1500); await snap('02-water');
    act('later'); await wait(900); await snap('03-snoozed');
    await wait(3000);
    c.askNow('water'); await wait(1000); act('later'); await wait(3200);
    c.askNow('water'); await wait(1500); await snap('04-water-firm');
    act('yes'); await wait(1200); await snap('05-water-yes');
    await wait(3500);
    c.askNow('stretch'); await wait(1500); await snap('06-stretch');
    act('routine');
    for (let i = 1; i <= 8; i++) {
      await wait(1400); await snap(`07-routine-${i}`);
      await companion().webContents.executeJavaScript("document.querySelector('#buttons button').click()");
    }
    await wait(1400); await snap('08-routine-done');
    c.openStats(); await wait(2000);
    await snap('09-stats', BrowserWindow.getAllWindows().find(w => !w.isAlwaysOnTop()));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
  app.exit();
});
