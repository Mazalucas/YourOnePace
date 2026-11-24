---
version: 1
mode: consumer
framework_version: "1.18.0"
source:
  remote: dt-upstream
  ref: main
preserve_paths:
  - README.md
  - CHANGELOG.md
  - package.json
  - package-lock.json
  - .github/workflows/
  - docs/PROJECT_OVERVIEW.md
  - docs/RELEASES.md
  - docs/RESOURCES.md
  - docs/TECHNICAL_GUIDE.md
  - docs/USER_GUIDE.md
  - docs/readme-banner.png
  - scripts/fetch_episode_anime_map.py
  - scripts/fetch_onepace_watch_links.py
  - scripts/make-win-icon.js
  - scripts/zip-web.js
  - .cursor/skills/github-save/
---

# Upstream El DT — Your One Pace (consumidor)

- **`mode: consumer`** — este repo es el producto. Recibe avisos de release en `/actualizar`. No publica al repo del framework.
- **`framework_version`** — semver del DT incorporado (v1.18.0). No es la versión de la app (`package.json`).
- **`preserve_paths`** — docs, scripts y el skill de release de Your One Pace. `/actualizar-dt` no debe pisarlos.

Remote Git: `git remote add dt-upstream https://github.com/Mazalucas/El-DT-Lightweight-Army.git`
