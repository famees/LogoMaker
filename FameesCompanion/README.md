# Famees Companion 🧍‍♂️💧

A desktop buddy for **Mac and Windows**. A cartoon man in a denim jacket and jeans pops
up in the middle of your screen to check that you're drinking water and stretching. He
calls you by name, talks out loud, and gets firmer when you keep snoozing.

| Every | He asks | Buttons |
|---|---|---|
| 30 min | "Hey, Famees. Have you had water?" (holding a bottle) | **YES 💧** · Remind me later |
| 15 min | "Hey, Famees. Have you stretched your body or not?" | **Let's stretch (1 min)** · Already did · Remind me later |

## What makes him smart

**1. Smart timing: he doesn't interrupt at bad moments**
- **Calls and full-screen apps:** he waits while you're on a call or using a full-screen app, then asks with "Call's over, Famees!"
  - Windows: he notices any app using your mic or camera (Teams, Zoom, Meet in a browser…), plus full-screen apps, games and presentations.
  - Mac: he notices any app using your camera or mic, plus Zoom meetings.
- **Pauses in typing:** he waits until you stop typing for a moment, but never more than 90 seconds.
- **Real breaks count:** if you were away from the computer for 5+ minutes (or it was asleep or locked), that was a break, so the stretch timer starts over.
- **Quiet hours:** 11pm–8am by default, so he never bothers you at night.
- **Meeting mode:** the menu has "I'm in a meeting (pause 1 hour)".

**2. Tracking, so you actually do it**
- **Counts:** YES counts a glass of water or a stretch. The menu bar shows `💧 5/8`.
- **Goal and streak:** a daily water goal (8 glasses) with a 🔥 streak of days you reached it.
- **Your week:** a chart of glasses and stretches for the last 7 days.
- **Getting firmer:** each snooze in a row makes the next ask firmer and the snooze shorter (5 → 3 → 2 minutes): "Famees, it's me again" → "Famees. Water. Now. I'm waiting. 😤"

**3. Guided 1-minute stretch**
Press **Let's stretch** and he does each move with you, with a countdown and spoken
instructions: reach up, lean left/right, neck tilts, shoulder rolls, open your chest. It
ends with an eye break (look at something far away).

## Install

### Option A: download the installer (easiest)
1. Open the [Actions tab of the repo](https://github.com/famees/LogoMaker/actions/workflows/famees-companion.yml)
   and click the latest green run.
2. Under **Artifacts**, download **Famees-Companion-Mac** or **Famees-Companion-Windows**, and unzip it.
3. **Mac:** open the `.dmg` and drag **Famees Companion** into Applications. The app isn't
   signed with an Apple developer account, so the first time, open Terminal and run
   ```bash
   xattr -dr com.apple.quarantine "/Applications/Famees Companion.app"
   ```
   Then open it normally.
   **Windows:** run `Famees-Companion-Windows-Setup.exe`. If SmartScreen appears, click
   **More info → Run anyway**.

The installed app sets itself to start when you log in. You can turn that off from the menu.

### Option B: run from source (needs [Node.js](https://nodejs.org) 20+)
```bash
cd FameesCompanion
npm install
npm start
```

## The menu (💧 in the Mac menu bar / Windows system tray)

- Today's glasses, stretches and streak, and when the next reminder is due
- **Ask about water now** / **Stretch with me now (1 min)**
- **I just drank a glass 💧**: logs one without waiting for him
- **Show my week…**
- **I'm in a meeting (pause 1 hour)** / **Pause reminders**
- **Voice** on/off · **Start at login** · **Edit settings…** · **Quit**

## Settings

**Edit settings…** opens `settings.json`. Changes apply as soon as you save.

| Setting | Default | |
|---|---|---|
| `name` | `"Famees"` | what he calls you |
| `waterEveryMinutes` / `stretchEveryMinutes` | `30` / `15` | |
| `waterGoalGlasses` | `8` | daily goal for the streak |
| `snoozeMinutes` | `[5, 3, 2]` | 1st, 2nd, 3rd+ "Remind me later" in a row |
| `awayAfterMinutes` | `5` | away this long = a real break |
| `pauseSeconds` / `maxPauseWaitSeconds` | `2` / `90` | wait for a pause in typing |
| `waitForCallsAndFullscreen` | `true` | |
| `quietHours` | `{"start": "23:00", "end": "08:00"}` | |
| `voice` | `true` | |
| `hideUnansweredAfterSeconds` | `120` | |

## For developers

- `npm test`: unit tests for the timing rules, stats and messages
- `src/core/`: scheduling, busy detection, stats, settings and messages (plain Node, no Electron)
- `src/main.js`: menu bar/tray, windows, loop · `src/renderer/`: the companion and the stats window
- `src/renderer/character.js`: the character as an SVG with movable joints; poses live in `POSES`
- Installers are built by `.github/workflows/famees-companion.yml` on every push
  (`npm run dist:mac` on a Mac, `npm run dist:win` on Windows)
