# Famees Companion 🧍‍♂️💧

A small desktop buddy for macOS: a cartoon man in a denim jacket, grey tee and
jeans who pops up in the middle of your screen, with a big yellow question above
him, and talks to you.

| Every | He asks |
|---|---|
| 30 minutes | "Hey, Famees. Have you had water?" (holding a water bottle) |
| 15 minutes | "Hey, Famees. Have you stretched your body or not?" (arms up, stretching) |

At the 30-minute mark he asks both questions, one after the other. He also says
each question out loud. Click **YES** and he cheers you on, or **Remind me later**
and he asks again in 5 minutes.

## Install (one time)

1. Copy this `FameesCompanion` folder to your Mac (e.g. into Downloads).
2. Open **Terminal** and run:
   ```bash
   cd ~/Downloads/FameesCompanion
   bash install.sh
   ```
   If your Mac asks to install the "Command Line Tools", click **Install**,
   wait for it to finish, then run `bash install.sh` again.

After that he starts on his own every time you log in.

## Menu bar controls (🧍‍♂️ icon)

- **Ask about water now** / **Ask about stretching now**: show him right away
- **Mute voice**: show the bubble without speaking
- **Pause reminders**: the icon changes to 💤 until you turn reminders back on
- **Quit Companion**

## Change the timing or text

Edit the top of `main.swift` (`waterInterval`, `stretchInterval`, `snoozeInterval`,
`userName`, the messages) and run `bash install.sh` again.

## Use your own character (e.g. a 3D avatar of you)

The character pictures are `assets/water.png` (holding water) and
`assets/stretch.png` (stretching). Replace them with any PNGs that have a
transparent background, for example a 3D cartoon of yourself made with an AI
image tool, keeping the same file names. Then run `bash install.sh` again.

`art/make-art.js` is the script that drew the default character (`node art/make-art.js`).

## Remove

```bash
bash uninstall.sh
```
