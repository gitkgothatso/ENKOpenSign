# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

OpenSign is an open-source e-signature platform (DocuSign alternative). It is a monorepo with two main apps:

- `apps/OpenSign` — React 19 frontend (Vite)
- `apps/OpenSignServer` — Node.js backend built on [Parse Server](https://parseplatform.org/)

## Commands

### Frontend (`apps/OpenSign`)

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build (fetches version from GitHub first)
npm test             # Run tests with vitest
npm run test:watch   # Vitest in watch mode
npm start            # Serve production build via server.cjs
```

### Backend (`apps/OpenSignServer`)

```bash
npm start            # Start server (node index.js)
npm run watch        # Start with nodemon (auto-reload)
npm run lint         # Lint cloud/, index.js, spec/
npm run lint-fix     # Auto-fix lint issues
npm run prettier     # Format cloud/ and spec/ JS files
npm test             # Run jasmine tests (spins up mongodb-runner)
npm run coverage     # Run tests with nyc coverage
```

### Root / Docker

```bash
make build           # Build frontend + docker compose up --build
make run             # docker compose up -d (no rebuild)
docker compose up -d # Run all services (server, mongo, client, caddy)
```

## Architecture

### Frontend (`apps/OpenSign/src/`)

- **State**: Redux Toolkit (`redux/store.js`, `redux/reducers/`) for global state; Zustand for local component state
- **Routing**: `react-router` v7, routes defined in `App.jsx`; most page components are lazy-loaded via `lazyWithRetry()`
- **Backend communication**: Parse JS SDK (`parse` package). `serverUrl_fn()` in `constant/appinfo.js` resolves the API URL. App ID is stored in `localStorage` as `parseAppId`.
- **PDF**: `pdf-lib` for manipulation, `react-pdf` for rendering, `react-konva` for drag-and-drop field placement on PDFs
- **UI**: MUI v5 + Tailwind CSS v3 + DaisyUI + Radix UI
- **i18n**: i18next with HTTP backend and browser language detector
- **Env vars**: `REACT_APP_*` prefix (CRA-style), mapped to `process.env` at build time via `vite.config.js`

### Backend (`apps/OpenSignServer/`)

- **Runtime**: Node.js ESM (`"type": "module"`)
- **Framework**: Express + Parse Server mounted at `/app` (configurable via `PARSE_MOUNT`)
- **Cloud Functions**: All Parse Cloud Functions, triggers (BeforeSave, AfterSave, BeforeFind, AfterFind), and Parse jobs live in `cloud/parsefunction/`. They are registered in `cloud/main.js`.
- **Custom REST routes**: Express routes outside Parse are in `cloud/customRoute/customApp.js`
- **File storage**: S3/DigitalOcean Spaces when `USE_LOCAL` is not `true`; falls back to local filesystem adapter
- **Email**: Mailgun (default) or SMTP via `SMTP_ENABLE=true`
- **PDF signing**: `@signpdf/*` packages for digital certificate signing; certificates supplied as base64-encoded PFX/P12 via `PFX_BASE64` env var
- **Database migrations**: `migrationdb/index.js` runs on startup

### Docker services

| Service | Port | Description |
|---|---|---|
| `server` | 8080 | OpenSignServer (Parse Server) |
| `mongo` | 27018→27017 | MongoDB |
| `client` | 3000 | OpenSign frontend |
| `caddy` | 3001 | Reverse proxy + TLS (ports 80/443 removed locally to avoid host conflicts) |
| `maildev` | 1025 (SMTP), 1080 (UI) | Email catcher for local dev — all outgoing email lands here |

On client branches, `server` and `client` build from `apps/OpenSignServer/Dockerfile.local` and `apps/OpenSign/Dockerfile.local` respectively instead of pulling Hub images, so local code changes are served correctly.

## Environment Setup

Copy `.env.local_dev` to `.env` at the repo root for local Docker development. For frontend-only development against the hosted UAT backend, copy `.env.local_dev` into `apps/OpenSign/.env`.

Key variables:
- `REACT_APP_SERVERURL` / `SERVER_URL` — must point to the same Parse Server URL from client and server sides respectively
- `REACT_APP_APPID` / `APP_ID` — must match (default: `opensign`)
- `MASTER_KEY` — Parse Server master key; required for admin dashboard access
- `MONGODB_URI` — MongoDB connection string
- `USE_LOCAL=true` — use local filesystem instead of S3
- `APP_NAME` — email sender display name (e.g. `Acme Corp Sign`)

## Documentation

| File | Purpose |
|---|---|
| `local_dev_setup.md` | Full local environment setup from scratch |
| `deploy_per_client.md` | Server provisioning, domain, TLS, and deployment steps per client |
| `client_customize_guide.md` | Every customisation point (branding, colours, email templates, env vars) with a per-client checklist |
