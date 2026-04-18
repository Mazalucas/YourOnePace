# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

