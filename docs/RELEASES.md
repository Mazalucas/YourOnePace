# Releases and installers

## Versioning

- Use **semantic versioning** (`MAJOR.MINOR.PATCH`).
- Create a git tag **`v` + version**, for example `v1.0.1`.
- Update `CHANGELOG.md` before tagging.
- Optional: run `npm version patch` (or `minor` / `major`) locally to bump `package.json`; the release workflow also syncs `package.json` from the tag when building.

## Publishing on GitHub

1. Commit your changes on the default branch.
2. Create and push an annotated tag, for example:
   - `git tag -a v1.0.1 -m "Release v1.0.1"`
   - `git push origin v1.0.1`
3. The **Release** workflow (`.github/workflows/release.yml`) builds desktop installers on **Windows** and **macOS**, packages the **static web zip**, and attaches the artifacts to a GitHub Release for that tag.

## What users get

| Artifact | Platform | Notes |
|----------|----------|--------|
| `Your One Pace Setup x.y.z.exe` | Windows | NSIS installer (choose install directory). |
| `Your One Pace x.y.z-win.zip` | Windows | Portable app folder (no installer). |
| `Your One Pace-x.y.z[-arm64].dmg` | macOS | Drag-to-Applications style disk image (name may include CPU arch). |
| `Your One Pace-x.y.z[-arm64]-mac.zip` | macOS | Packed `.app` zip. |
| `your-one-pace-web-x.y.z.zip` | Any | Static files only; open `index.html` or serve over HTTP for PWA features. |

### macOS: “damaged” message and what we recommend

These builds are **not** signed or **notarized** with Apple. After a **browser download**, macOS often quarantines the `.app` and may say it is **“damaged”**—usually **Gatekeeper**, not a corrupt file.

**End users (no Terminal):** Prefer the **GitHub Pages** deployment of the same UI (`https://<user>.github.io/<repo>/` once Pages is enabled). That loads in the browser and avoids the downloaded `.app` problem entirely.

**Electron / DMG anyway:** The only fully reliable fix for quarantine on unsigned apps is clearing extended attributes (historically `xattr -cr` in Terminal). **Right-click → Open** or **System Settings → Privacy & Security → Open Anyway** sometimes work but are not consistent for the “damaged” wording.

**For maintainers:** A smooth double-click experience for a **downloaded** Mac app requires an **Apple Developer Program** subscription, **Developer ID** code signing, and **notarization** in CI (certificates and secrets). That pipeline is not configured in this repository by default.

## Local builds

```bash
npm ci
npm start              # run Electron locally
npm run build          # current OS targets
npm run build:win      # Windows (from Windows or cross-compile setup)
npm run build:mac      # macOS (from macOS)
node scripts/zip-web.js
```

Outputs go to the `release/` directory (ignored by git).

## PWA (web / Android-friendly)

The site includes `manifest.json` and `sw.js`. For “Add to Home Screen” / install prompts, serve the app over **HTTPS** (or `localhost`). Opening `index.html` directly from disk limits service worker support in some browsers.

## Optional: Android APK with Capacitor

This repository does not commit native Android/iOS projects. To produce an **APK** or **AAB**:

1. `npm create @capacitor/app@latest` in a branch, or add Capacitor to this project: `npm install @capacitor/core @capacitor/cli` then `npx cap init`.
2. Point `webDir` at the project root (or a `dist` folder if you add a build step).
3. `npx cap add android` then open `android/` in Android Studio and build a signed APK/AAB.

## iOS distribution

There is no GitHub-style “installer download” for iOS comparable to Windows `.exe`. Typical paths are **TestFlight** or the **App Store** using the Xcode project produced by Capacitor (`npx cap add ios`), plus an **Apple Developer Program** membership.

## App and installer icon

The desktop and PWA icons use `build/source-icon.png` as the single source. **electron-builder** converts this PNG to the platform formats it needs (for example `.icns` / installer graphics on Windows) during each desktop build—no separate manual `.ico` step is required unless you change tooling.

That artwork resembles official *One Piece* branding; it may be protected by copyright or trademark. Using it for public releases or store listings is your responsibility; consider original artwork for lower legal risk.
