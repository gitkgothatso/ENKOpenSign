# Local Development Setup Guide

This guide documents how to set up ENKOpenSign (a customised fork of OpenSign) on your local machine for development, testing, and client training.

---

## Prerequisites

| Tool | Required version | Install |
|---|---|---|
| Docker | 28+ | https://docs.docker.com/engine/install/ |
| Docker Compose | v2.17+ | bundled with Docker Desktop |
| Node.js | 18, 20, or 22 | https://nodejs.org (use nvm to manage versions) |
| npm | 10+ | bundled with Node.js |

> **Node 23 note:** The repo declares engines `18 \|\| 20 \|\| 22` but Node 23 works in practice. Use `--engine-strict=false` if npm warns about it.

---

## One-Time Setup

### 1. Clone the repo

```bash
git clone https://github.com/gitkgothatso/ENKOpenSign.git
cd ENKOpenSign
```

### 2. Create environment files

```bash
# Root .env (used by docker compose to resolve ${HOST_URL})
cp .env.local_dev .env

# Frontend .env (used by Vite dev server)
cp .env.local_dev apps/OpenSign/.env
```

Then create `.env.prod` — this is the env file the Docker containers read at runtime. Copy the block below and save it as `.env.prod` in the repo root:

```env
# Frontend
PUBLIC_URL=https://localhost:3001
GENERATE_SOURCEMAP=false
REACT_APP_APPID=opensign

# Backend
appName=open_sign_server
APP_ID=opensign
MASTER_KEY=XnAadwKxxByMr
MONGODB_URI=mongodb://mongo-container:27017/OpenSignDB
PARSE_MOUNT=/app
SERVER_URL=http://server:8080/app

# Storage — local filesystem (no S3 needed for dev)
USE_LOCAL=true

# Email — MailDev catches all outgoing emails locally (no real SMTP needed)
SMTP_ENABLE=true
SMTP_HOST=maildev
SMTP_PORT=1025
SMTP_USER_EMAIL=noreply@opensign.local
SMTP_PASS=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=mail.yourdomain.com
MAILGUN_SENDER=postmaster@mail.yourdomain.com

# PDF signing — default test certificate (works out of the box)
PFX_BASE64='MIIKCQIBAzCCCc8GCSqGSIb3DQEHAaCCCcAEggm8MIIJuDCCBG8GCSqGSIb3DQEH...'
PASS_PHRASE=opensign
```

> **Important:** `.env.prod` is gitignored. Each developer keeps their own copy. For client deployments, create a separate `.env.prod` with real SMTP/S3/domain values.

> **Important:** The full `PFX_BASE64` value is in `.env.local_dev` — copy it from there.

### 3. Install dependencies

Run both in parallel (they are independent):

```bash
# Frontend
cd apps/OpenSign && npm install --engine-strict=false && cd ../..

# Backend
cd apps/OpenSignServer && npm install && cd ../..
```

### 4. Build the frontend

```bash
cd apps/OpenSign && npm run build && cd ../..
```

This produces the production bundle in `apps/OpenSign/build/`. It also fetches the upstream version tag from GitHub — requires internet access.

---

## Starting the Stack

```bash
HOST_URL=https://localhost:3001 docker compose up --force-recreate -d
```

This starts 5 Docker containers:

| Container | Role | Exposed port |
|---|---|---|
| `mongo-container` | MongoDB database | `27018` (host) → `27017` (container) |
| `OpenSignServer-container` | Parse Server API | internal only (via Caddy) |
| `OpenSign-container` | React frontend | `3000` |
| `caddy-container` | Reverse proxy + TLS | `3001` |
| `maildev-container` | Email catcher (local only) | `1025` (SMTP), `1080` (web UI) |

> **Why `HOST_URL` must include `https://`:** The docker-compose.yml builds `SERVER_URL` as `${HOST_URL}/api/app`. Parse Server requires this URL to start with `https://`. Omitting the scheme causes the server container to exit immediately.

> **Ports 80 and 443:** These were removed from the Caddy service in `docker-compose.yml` because port 80 is used by another service on this machine. For a fresh machine or a client server, you can restore them.

Access the app at: **https://localhost:3001**

Accept the self-signed certificate warning in the browser (Caddy generates one for `localhost` automatically).

**MailDev web UI** — view all outgoing emails at: **http://localhost:1080**

No emails leave the machine. MailDev intercepts everything the server sends (password resets, verification emails, signing notifications) and displays them in its inbox.

---

## Creating the First Account

With MailDev running, you can use the sign-up form in the UI at https://localhost:3001. Any verification email will be caught by MailDev at http://localhost:1080.

Alternatively, create an account directly via the Parse Cloud Function (skips email verification entirely):

```bash
curl -s -X POST https://localhost:3001/api/app/functions/usersignup \
  -H "X-Parse-Application-Id: opensign" \
  -H "Content-Type: application/json" \
  --insecure \
  -d '{
    "userDetails": {
      "email": "admin@enk.local",
      "password": "Admin123!",
      "name": "ENK Admin",
      "role": "contracts_User",
      "company": "ENK Consulting"
    }
  }'
```

Expected response: `{"result":{"message":"User sign up"}}`

You can then log in at https://localhost:3001 with those credentials.

> **Roles:** `contracts_User` is the standard user role. Use `contracts_Admin` to create an admin account.

---

## Day-to-Day Commands

```bash
# Start (after first setup — no rebuild needed)
HOST_URL=https://localhost:3001 docker compose up -d

# Stop
docker compose down

# Restart a single service (e.g. after a backend code change)
docker compose restart server

# View live logs from all services
docker compose logs -f

# View logs from one service
docker compose logs -f server

# Rebuild after frontend code changes
cd apps/OpenSign && npm run build && cd ../..
docker compose restart client

# Run frontend in hot-reload dev mode (connects to hosted UAT backend)
cd apps/OpenSign && npm run dev
# → http://localhost:3000
```

---

## Troubleshooting

### Server container exits immediately

Check logs:
```bash
docker logs OpenSignServer-container
```

| Error message | Fix |
|---|---|
| `Please provide valid SMTP credentials` | Ensure `SMTP_HOST=maildev` and `SMTP_PORT=1025` are set; `SMTP_PASS` must be empty (not a placeholder) |
| `publicServerURL should be a valid HTTPS URL` | Run with `HOST_URL=https://localhost:3001` (include `https://`) |
| MongoDB connection errors | Ensure `mongo-container` is running: `docker ps` |

### Port already in use

If port 3001, 3000, or 27018 is taken:

```bash
# Find what's using it
ss -tlnp | grep :3001

# Kill it or change the port mapping in docker-compose.yml
```

### Stale containers from a previous run

```bash
docker rm -f mongo-container caddy-container OpenSign-container OpenSignServer-container maildev-container
docker compose up --force-recreate -d
```

### DNS / GitHub not reachable

The frontend build script fetches the latest version tag from GitHub. If DNS fails:
```bash
sudo systemctl restart systemd-resolved
```

---

## Per-Client Customisation

For each client, work on a dedicated branch:

```bash
git checkout -b client/acme-corp
```

Key files to customise per client:

| What to change | Where |
|---|---|
| Logo | `apps/OpenSign/src/assets/images/` |
| App name in emails | `appName` in `.env.prod` |
| Brand colours | `apps/OpenSign/tailwind.config.js` |
| Email templates | `apps/OpenSignServer/cloud/parsefunction/sendMailv3.js` |
| Dashboard layout | `apps/OpenSign/src/components/dashboard/` |

Each client also gets their own `.env.prod` with their domain, real SMTP credentials, and S3 storage config. Never commit `.env.prod` to git.
