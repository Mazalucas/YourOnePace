# User Guide: Your One Pace

## Getting Started

### Web / Windows (project folder)
To open from the project folder on Windows, double-click **`Launch Your One Pace.bat`**. It opens the app in your default web browser.

### macOS desktop app (from GitHub Releases)
If you installed from the **`.dmg`** or **`-mac.zip`** and macOS says the app is **“damaged”** or won’t open, that is usually **Gatekeeper**, not a bad download.

1. Put **Your One Pace** in your **Applications** folder (drag from the DMG, or unzip the zip and move the `.app` there).
2. Open **Terminal** and run:

   ```bash
   xattr -cr "/Applications/Your One Pace.app"
   ```

3. Open the app from **Applications** (or run `open "/Applications/Your One Pace.app"`).

First launch: you can also **right-click** the app → **Open** → **Open**, or use **System Settings → Privacy & Security** if macOS shows an **Open Anyway** option.

These releases are not Apple-signed; clearing quarantine with `xattr` is the most dependable approach.

## Tracking Your Journey
1. **The Timeline**: The main screen shows all One Piece arcs. Green cards are "Completed", and the glowy card is your **Current Arc**.
2. **Marking Progress**: 
    - Click **"View Episodes"** to see details for an arc.
    - Inside the modal, click on individual episode bars to mark them as watched. A checkmark (✓) will appear.
    - Once you've finished an entire arc, click **"Mark as Finished"** on the main timeline card.
3. **Episode Links**: Click "View Episodes" and scroll down to see direct links for high-quality downloads (Pixeldrain/Torrents).

## Backup & Restore
Never lose your progress!
- **To Save Your Progress**: Click the **"Backup"** button at the top of the page. This will download a file named `your-one-pace-progress-DATE.json`. Save this file somewhere safe.
- **To Restore Your Progress**: If you clear your browser history or move to a new computer, click **"Restore Journey"** and select your latest backup file.

## Troubleshooting
- **Missing Data?**: If the timeline seems empty, try refreshing the page.
- **Progress Not Saving?**: Ensure you aren't in "Incognito/Private" mode, as some browsers block `localStorage` in that mode.
- **macOS: “damaged” or won’t open**: See **macOS desktop app** above—run `xattr -cr` on the `.app` in Applications after installing from the release.
