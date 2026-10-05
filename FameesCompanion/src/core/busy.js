// "Is Famees busy right now?" — on a call, presenting, or in a full-screen app.
// Best effort: every check fails safe (returns not busy) if anything goes wrong.
//
// Windows: any app using the microphone or camera (Teams, Zoom, Meet in a browser…),
//          plus full-screen apps, games and presentation mode.
// Mac:     camera or microphone in use by another app, plus Zoom meetings.
// Both:    a Zoom meeting window (CptHost) is running.
const { execFile } = require('child_process');

function run(cmd, args, timeout = 5000) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout) => resolve(err ? '' : String(stdout)));
  });
}

// --- Windows -------------------------------------------------------------

const CONSENT = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\';

// Windows records when each app last stopped using the mic/camera; 0 means "still using it".
async function winDeviceInUse(device) {
  const out = await run('reg', ['query', CONSENT + device, '/s', '/v', 'LastUsedTimeStop']);
  return /LastUsedTimeStop\s+REG_QWORD\s+0x0\s*$/m.test(out);
}

// SHQueryUserNotificationState: 2 = full-screen app, 3 = full-screen game, 4 = presentation, 7 = full-screen Store app.
const PS_FULLSCREEN = `
Add-Type -Namespace FC -Name N -MemberDefinition '[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int s);'
$s = 0; [void][FC.N]::SHQueryUserNotificationState([ref]$s); $s`;

async function winFullscreen() {
  const encoded = Buffer.from(PS_FULLSCREEN, 'utf16le').toString('base64');
  const out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], 8000);
  return [2, 3, 4, 7].includes(parseInt(out.trim(), 10));
}

async function winZoomMeeting() {
  const out = await run('tasklist', ['/FI', 'IMAGENAME eq CptHost.exe', '/NH']);
  return /CptHost\.exe/i.test(out);
}

// --- Mac -----------------------------------------------------------------

// JavaScript for Automation can ask AVFoundation whether another app is using
// a camera or microphone, without opening the device itself.
const JXA_DEVICES = `
ObjC.import('AVFoundation');
function inUse(type) {
  const list = $.AVCaptureDevice.devicesWithMediaType(type);
  for (let i = 0; i < list.count; i++) if (list.objectAtIndex(i).isInUseByAnotherApplication) return true;
  return false;
}
inUse($.AVMediaTypeVideo) || inUse($.AVMediaTypeAudio) ? 'busy' : 'free';`;

async function macDevicesInUse() {
  const out = await run('osascript', ['-l', 'JavaScript', '-e', JXA_DEVICES]);
  return out.trim() === 'busy';
}

async function macZoomMeeting() {
  const out = await run('pgrep', ['-x', 'CptHost']);
  return out.trim().length > 0;
}

// --- Public --------------------------------------------------------------

async function isBusy(platform = process.platform) {
  try {
    if (platform === 'win32') {
      const r = await Promise.all([winDeviceInUse('microphone'), winDeviceInUse('webcam'), winFullscreen(), winZoomMeeting()]);
      return r.some(Boolean);
    }
    if (platform === 'darwin') {
      const r = await Promise.all([macDevicesInUse(), macZoomMeeting()]);
      return r.some(Boolean);
    }
  } catch (e) {
    console.error('busy check failed', e);
  }
  return false;
}

module.exports = { isBusy };
