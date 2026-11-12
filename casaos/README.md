# Dogar's Fire & Flavour on CasaOS / ZimaOS

This directory holds the app store manifest and assets that let Dogar's Fire & Flavour install as a one-click app on [CasaOS](https://casaos.io) and [ZimaOS](https://zimaspace.com) (ZimaOS uses the identical `x-casaos` compose schema).

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | The app manifest itself — standard Compose plus a top-level `x-casaos:` block CasaOS reads to render the store listing and install form. |
| `icon.png` | 512×512 square app icon. |
| `thumbnail.png` | 1024×1024 store-listing banner. |
| `screenshot-1.png` … `screenshot-3.png` | POS, Kitchen Display, and Tables — the same images used in the main [README](../README.md). |

## Install it right now (before official app store approval)

CasaOS and ZimaOS can both install directly from a compose file URL — you don't need to wait for this to land in the official app store:

1. In CasaOS/ZimaOS, go to **App Store → + (top right) → Install a customized app** (CasaOS) or the equivalent **Custom Install / Install via Compose** option in ZimaOS.
2. Paste this URL (or the raw file contents):
   ```
   <compose-url>
   ```
3. Set a unique strong `POSTGRES_PASSWORD` before starting the Compose file. The manifest intentionally refuses to start if it is missing and uses the same value in both services. In the CasaOS app settings, set `CORS_ORIGIN` to the exact URL staff will open (for example `http://192.168.1.20:2006`) so login and realtime requests are allowed.
4. Install. CasaOS pulls the pre-built images — there is no build step, so it works even though CasaOS never touches this repo's source.
5. Open it from the CasaOS dashboard, or go straight to `http://<your-casaos-box>:2006`. From there, sign up for a new restaurant account via `/signup` — no manual configuration needed.

Your data (Postgres database + uploaded images) persists at `/DATA/AppData/nodedr-restaurant-pos/` on the CasaOS box, following the same convention CasaOS's own backup/restore UI expects for every other app.

## Why three containers

Unlike a SQLite-based two-container app, this app uses Postgres for concurrency across 500+ tables/100+ staff — see the main [ARCHITECTURE.md](../ARCHITECTURE.md). The manifest declares `main: web` since that's the browsable service; `postgres` and `backend` are helper containers CasaOS never opens directly.

The backend generates and persists its JWT signing secret on first boot. The Postgres password remains an operator-provided secret; this manifest deliberately fails closed when it is missing.

This manifest still needs publisher-specific metadata and images before public distribution: update the GHCR image namespace, icon and screenshot URLs, repository/support links, and release version to match the publisher who will build and maintain it. The current values are not a release-ready public listing.

## Publishing new image versions

`docker-compose.yml` here pins exact image tags (CasaOS requires pinned, not `:latest`, tags). To publish a new version:

1. Bump the version everywhere it's referenced — the two `image:` tags in this file, `version:` and `update_at:` under `x-casaos:`, and `release_notes.en_US`.
2. Run the **Publish Docker images** workflow (`.github/workflows/docker-publish.yml`) via `workflow_dispatch` with that version, or just push to `master` — it also tags a build from the latest git tag automatically. It builds both images for `linux/amd64` **and** `linux/arm64` (a lot of CasaOS/ZimaOS boxes are ARM SBCs) and pushes them to the container registry.
3. Confirm both new tags exist before updating this file — CasaOS installs will fail outright if the pinned tag doesn't exist yet.
4. **First publish only:** Container registry packages default to private even when pushed from a public repo — a CasaOS install on someone else's box would get an auth error pulling a private image. Check/set visibility to Public once under each package's own Settings. Not needed again on later pushes to the same package.

## Submitting to the official CasaOS App Store

This manifest is written to be usable as-is (see "Install it right now" above) and is also submission-ready, but submitting the actual pull request to the CasaOS App Store is a deliberate, separate step — not done as part of preparing this manifest, since it's a one-way action against someone else's public repo. When you're ready:

1. Fork the CasaOS App Store repo and add a new `Apps/nodedr-restaurant-pos/` directory containing this directory's `docker-compose.yml`, `icon.png`, `thumbnail.png`, and the `screenshot-*.png` files.
2. Update the `icon:`, `thumbnail:`, and `screenshot_link:` URLs in the copied `docker-compose.yml` to point at the CasaOS-AppStore repo instead of this one, following the same jsdelivr CDN pattern every other app in that store uses.
3. Open the PR against the CasaOS App Store repo. Their own `CONTRIBUTING.md` documents the current review checklist — re-check it at submission time, since it can change independently of this file. CI there pulls/inspects the actual image digests referenced in the compose file, so the Docker images must already be live (step above) before opening the PR.

Only `en_US` is filled in for the multi-locale fields (`title`, `tagline`, `description`, `release_notes`) — every real app in the store also supports more locales, but translating into them is a separate, ongoing effort best done post-submission rather than guessed at here.
