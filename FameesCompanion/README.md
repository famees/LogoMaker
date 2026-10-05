# Famees Companion 🧍‍♂️💧

A small desktop buddy for macOS: a cartoon man in a red shirt and blue jeans who
appears in the bottom-right corner of your screen, waves, and talks to you.

| Every | He asks |
|---|---|
| 30 minutes | "Hey Famees! Have you had water? Did you have water, Famees?" |
| 15 minutes | "Famees, have you stretched your body or not?" |

At the 30-minute mark he asks both questions, one after the other. He also says
each question out loud. Click **Yes! ✅** or **Not yet** and he answers back.

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

Edit the top of `main.swift` (`waterInterval`, `stretchInterval`, `userName`, the
messages) and run `bash install.sh` again.

## Remove

```bash
bash uninstall.sh
```
