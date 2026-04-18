# Technical Guide: Your One Pace

## Technology Stack
- **Structure**: Semantic HTML5.
- **Styling**: Vanilla CSS3 with:
    - Custom Properties (Variables) for easy skinning.
    - Flexbox & Grid for responsive layouts.
    - Glassmorphism effects (backdrop-filter: blur, transparency).
    - CSS Animations (Keyframes) for a premium feel.
- **Logic**: Vanilla JavaScript (ES6+).
- **Data Persistence**: Browser `localStorage` for progress saving.
- **Data Format**: CSV parsing for arc metadata and JSON for extended episode info.

## Project Structure
- `index.html`: Main entry point and layout templates.
- `index.css`: Design system, tokens, and component styling.
- `app.js`: Core application logic (parsing, rendering, state management).
- `data.js`: Extended metadata for episodes (descriptions, direct links).
- `electron/main.js`: Electron shell for desktop builds (loads `index.html` locally).
- `manifest.json` / `sw.js`: PWA metadata and service worker for installable web use.
- `One Pace Episode Guide - Arc Overview.csv`: The source of truth for arc counts and time savings.
- `Launch Your One Pace.bat`: Windows launcher for quick access.

For desktop installers, GitHub Releases, and optional mobile paths, see [RELEASES.md](RELEASES.md).

## Core Logic Details

### CSV Parsing
The application uses a robust character-by-character CSV parser in `app.js` to handle quoted fields and empty columns from the official One Pace spreadsheet. This ensures that arcs like "Gaimon" or "Little Garden" are correctly identified even with minimal data.

### State Management
Progress is tracked using `watchedUpToIndex` (for the overall arc timeline) and `episodeProgress` (an object mapping arc names to arrays of watched episode numbers).

### Persistence
All state is synced to the browser's `localStorage` every time a click event occurs. The **Backup/Restore** feature uses the `Blob` API to generate a JSON file that you can download and save safely.

### Performance
The app is a lightweight Single Page Application (SPA). All rendering is done on the client side using the `<template>` element for efficient DOM manipulation.
