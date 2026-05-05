# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.19] - 2026-05-05

### Changed

- **Progress card placement**: move the journey stats card **into the hero** (below subtitle, above search) instead of a **fixed** header under the nav with a spacer slot and scroll-hide behaviour.
- **Layout/CSS**: drop `--progress-header-top`, slot height logic, and scroll listeners; style `.hero .progress-header` as a normal in-flow card (`max-width: 600px`, centered).

## [1.0.18] - 2026-05-05

### Changed

- **Progress toolbar reveal**: animate open/close with a **CSS grid row** (`grid-template-rows` 0fr → 1fr) instead of toggling `hidden` on the button row alone.
- **Accessibility**: **`inert`** on the collapsed toolbar wrapper; `aria-hidden` on the panel; expansion state tracked explicitly so outside-click logic stays correct when the panel is not `hidden`.
- **Expand control styling**: circular glass-style button, stronger focus-visible ring, gold accent when expanded; **`prefers-reduced-motion`** short-circuits transitions.

## [1.0.17] - 2026-05-05

### Changed

- **Progress header**: replace the Actions **dropdown** with an **expandable toolbar** (chevron toggle) that reveals Reset / Backup / Restore in a full-width row under the stats; chevron rotates when expanded.
- **Behaviour**: keep outside-click and Escape dismissal; dynamic `aria-label` on the toggle; `updateProgressChrome` runs when expansion state changes.

## [1.0.16] - 2026-05-05

### Changed

- **Progress header UX**: consolidate Reset Progress, Backup, and Restore behind an **Actions** menu with dropdown styling; close on outside click, Escape, or after invoking an action.
- **Progress stats layout**: group arc completion and “Total Time Saved” in a dedicated `.progress-stats` row with responsive tweaks for narrow viewports.

## [1.0.15] - 2026-04-30

### Added

- **Footer version line** (“Version X.Y.Z”) above the copyright, driven by `<meta name="app-version">`; hidden locally when `%APP_VERSION%` is unresolved.
- **CI injection** of `%APP_VERSION%` from `package.json` on **GitHub Pages**; release builds inject after syncing `package.json` to the tag (with optional GA4 in the same step).

## [1.0.14] - 2026-04-30

### Added

- **Google Analytics 4** (gtag): loads only when the Measurement ID is valid `G-…` after CI substitution; local/source checkout keeps a placeholder and skips loading scripts.
- **GitHub Pages** deploy injects `GA4_MEASUREMENT_ID` from repository secrets; **Release** workflow optionally injects the same for desktop and web zip artifacts.

## [1.0.1] - 2026-04-18

### Fixed

- Windows NSIS installer: generate a valid `.ico` from `build/source-icon.png` (NSIS does not accept PNG for installer UI; the source asset may be JPEG data with a `.png` extension, so conversion uses `sharp` before `png-to-ico`).
- Disable electron-builder auto-publish to GitHub in CI so tagged builds do not require `GH_TOKEN` (releases are attached by GitHub Actions).

## [1.0.0] - 2026-04-18

### Added

- Electron desktop builds for Windows (NSIS installer + portable zip) and macOS (DMG + zip).
- Static web bundle zip for offline or simple hosting.
- Progressive Web App manifest and service worker for installable web usage (e.g. Android Chrome / desktop).
- GitHub Actions workflow to publish release assets when a `v*` tag is pushed.

