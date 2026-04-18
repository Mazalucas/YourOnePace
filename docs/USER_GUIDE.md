# User Guide: Your One Pace

## Getting Started

### Web / Windows (project folder)
To open from the project folder on Windows, double-click **`Launch Your One Pace.bat`**. It opens the app in your default web browser.

### macOS (recommended: web app)

On Mac, the **simplest** experience is the hosted site—no installer, no Gatekeeper:

**[https://mazalucas.github.io/YourOnePace/](https://mazalucas.github.io/YourOnePace/)** (requires GitHub Pages to be enabled on the repo; see project README.)

Bookmark the page or add it to the Dock from Safari/Chrome. Your progress is stored in the browser like the desktop wrapper.

### macOS desktop app (optional — from GitHub Releases)

The **`.dmg`** / **`-mac.zip`** build is an unsigned **Electron** app. macOS may say **“damaged”** after a browser download—that is usually **Gatekeeper/quarantine**, not corruption.

**Prefer the web link above** if you want to avoid that friction.

If you still use the `.app`: after moving it to **Applications**, the dependable fix is clearing quarantine in **Terminal** (`xattr -cr` — see **Troubleshooting**). A no-warning downloaded `.app` needs **Apple notarization** (paid Developer account), which this project does not ship by default.

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
