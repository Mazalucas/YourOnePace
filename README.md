# Your One Pace

<p align="center">
  <img src="docs/readme-banner.png" alt="Your One Pace" width="720" />
</p>

**Your One Pace** is a sleek tracker for your voyage through the *One Piece* anime using the [**One Pace**](https://onepace.net/) fan edit—manga-faithful pacing, less filler, one place to see every arc and tick off what you’ve watched. No accounts, no cloud login: you open the app, the timeline is there, and your progress stays on your machine until you choose to back it up.

---

## Install in one minute

### macOS (recommended — no Gatekeeper, no Terminal)

Apple often blocks **downloaded `.app` bundles** that are not signed and **notarized** (including our GitHub builds), which is why you may see **“damaged”** even though the file is fine.

**Easiest path on Mac:** use the hosted web app (same interface; progress stays in your browser):

**[Open Your One Pace (web)](https://mazalucas.github.io/YourOnePace/)**

Bookmark it, or in Safari use **File → Add to Dock**, or in Chrome use **Install app** / **Create shortcut**—all without installers.

> **Repo maintainer:** turn on GitHub Pages once: **Settings → Pages → Build and deployment → Source: GitHub Actions**. After the next push to `main`, that URL goes live.

### Windows and offline bundles

Head to **[Releases](https://github.com/Mazalucas/YourOnePace/releases)** and pick a build:

| You’re on… | Grab this | What it is |
|------------|-----------|------------|
| **Windows** | `Your One Pace Setup x.y.z.exe` | Installer—pick a folder, get Start Menu shortcuts. |
| **Windows (no install)** | `Your One Pace x.y.z-win.zip` | Unzip and run—portable folder. |
| **macOS (optional)** | `.dmg` or `-mac.zip` | Native **Electron** shell. Unsigned: macOS may still block it after download—**prefer the web link above** unless you need offline desktop. |
| **Any browser / offline folder** | `your-one-pace-web-x.y.z.zip` | Unzip and open `index.html`, or serve over HTTP for full PWA behavior. |

**macOS + Electron only:** If you insist on the downloaded app and see **“damaged”**, that is Gatekeeper/quarantine on unsigned builds. The reliable fix is a Terminal command—see [`docs/RELEASES.md`](docs/RELEASES.md). A fully click-only experience for a downloaded `.app` requires **Apple Developer** signing + **notarization** (paid program); we do not ship that by default.

---

## How to use the app

1. **Timeline** — All arcs appear as cards. Green means done; the highlighted card is your **current** arc.
2. **Episodes** — Click **View Episodes**, then tap episode rows to mark them watched (you’ll see a check). Finishing an arc? Use **Mark as Finished** on the card.
3. **Links** — Inside the episode view you’ll find handy links (e.g. Pixeldrain / torrents) for grabbing episodes—same spirit as the project overview.
4. **Never lose the map** — Use **Backup** to download a JSON file. If you switch browsers, reinstall, or move PCs, use **Restore Journey** and pick that file.

That’s the whole loop: watch → tap → backup sometimes → keep sailing.

---

## Where your progress is stored

Everything lives **locally on your device** in the browser’s **local storage** (the desktop app uses the same idea inside Electron). Two pieces are saved:

- Which arc you’ve advanced through overall  
- Per-arc episode checkmarks  

**Nothing is sent to a server** for sync—privacy-first by design. If you clear site data / uninstall without a backup, that progress is gone—so treat the **Backup** button like your personal treasure chest: use it when you’ve made a chunk of progress.

---

## Run from source (developers)

```bash
npm ci
npm start    # Electron wrapper around the web UI
```

See [`docs/RELEASES.md`](docs/RELEASES.md) for building installers and [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) for more detail.

---

## License
@LucasMazalan
MIT — see `package.json`.
