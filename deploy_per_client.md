# Per-Client Deployment Guide

This guide covers how to deploy a customised ENKOpenSign instance for a client — on their own server (on-premises) or on a cloud VPS — and how to manage each client as a separate branch.

---

## Workflow Overview

```
staging (your main fork, tracks upstream)
    │
    ├── client/acme-corp      ← white-label + custom features
    ├── client/beta-inc       ← different branding / email templates
    └── client/gamma-ltd      ← on-premises, air-gapped
```

Each client gets:
- A dedicated git branch for their customisations
- A `.env.prod` file stored **outside** git (on the deployment server or in a secrets vault)
- Their own running Docker Compose stack

---

## Step 1 — Create a Client Branch

```bash
# Start from your latest staging
git checkout staging && git pull origin staging

# Create the client branch
git checkout -b client/acme-corp

# Push it so you can deploy from it later
git push -u origin client/acme-corp
```

---

## Step 2 — Customise for the Client

Make branding and feature changes on this branch before deploying. See **`client_customize_guide.md`** for a full table of every customisation point and a per-client checklist. Key areas:

| Customisation | File(s) |
|---|---|
| App name (UI, emails) | `src/pages/Login.jsx`, `Title.jsx`, `Footer.jsx`, `BulkSendUi.jsx`, `AgreementContent.jsx`, `SubMenu.jsx` |
| Email sender name | `apps/OpenSignServer/Utils.js` or `APP_NAME` in `.env.prod` |
| Logo + favicon | `apps/OpenSign/src/assets/images/` + `public/favicon.svg` |
| Brand colours | `apps/OpenSign/tailwind.config.js` → `opensigncss` theme |
| Email HTML templates | `apps/OpenSignServer/files/*.html` and `*_subject.txt` |
| Sidebar Drive label | `apps/OpenSign/public/locales/en/translation.json` |
| Social media links | `apps/OpenSign/src/components/SocialMedia.jsx` |

Rebuild and test locally (`local_dev_setup.md`) before deploying to the client.

---

## Step 3 — Provision the Server

> **Deploying on AWS?** See **`client_cloud_aws_deploy.md`** for a step-by-step guide using EC2, S3, and SES with the pre-configured `DevAdmin` credentials (af-south-1). It includes exact CLI commands, IAM setup, SES sandbox notes, and a teardown checklist.

### Recommended server specs

| Clients/users | Minimum spec |
|---|---|
| < 50 users | 2 vCPU, 2 GB RAM, 40 GB SSD |
| 50–200 users | 2 vCPU, 4 GB RAM, 80 GB SSD |
| 200+ users | 4 vCPU, 8 GB RAM, 160 GB SSD + external MongoDB |

Any Linux VPS works: DigitalOcean Droplet, AWS EC2, Hetzner, Linode, Azure VM, etc.

### Install Docker on the server

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
newgrp docker
```

### Open firewall ports

```bash
# Ubuntu ufw
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (for Let's Encrypt challenge)
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Step 4 — Deploy the Code

```bash
# On the client server
git clone https://github.com/gitkgothatso/ENKOpenSign.git
cd ENKOpenSign
git checkout client/acme-corp
```

---

## Step 5 — Create `.env.prod`

Create `.env.prod` in the repo root on the server. **Never commit this file.**

```env
# ── Frontend ────────────────────────────────────────────────
PUBLIC_URL=https://sign.acme-corp.com
GENERATE_SOURCEMAP=false
REACT_APP_APPID=acmecorp                  # unique per client, 8-12 chars

# ── Backend ─────────────────────────────────────────────────
appName=Acme Corp eSign
APP_ID=acmecorp                           # must match REACT_APP_APPID
MASTER_KEY=<generate-a-strong-random-key> # openssl rand -base64 24
MONGODB_URI=mongodb://mongo-container:27017/AcmeCorpDB
PARSE_MOUNT=/app
SERVER_URL=http://server:8080/app         # internal Docker URL (overridden by docker-compose)

# ── Storage ─────────────────────────────────────────────────
# Option A: Local filesystem (simpler, no external dependency)
USE_LOCAL=true

# Option B: AWS S3 or DigitalOcean Spaces (recommended for production)
# USE_LOCAL=false
# DO_SPACE=acme-corp-docs
# DO_ENDPOINT=ams3.digitaloceanspaces.com
# DO_BASEURL=https://acme-corp-docs.ams3.digitaloceanspaces.com
# DO_ACCESS_KEY_ID=<key>
# DO_SECRET_ACCESS_KEY=<secret>
# DO_REGION=ams3

# ── Email ───────────────────────────────────────────────────
# Option A: Mailgun (recommended for transactional email)
SMTP_ENABLE=false
MAILGUN_API_KEY=<mailgun-api-key>
MAILGUN_DOMAIN=mail.acme-corp.com
MAILGUN_SENDER=noreply@acme-corp.com

# Option B: SMTP (use client's existing mail server)
# SMTP_ENABLE=true
# SMTP_HOST=smtp.acme-corp.com
# SMTP_PORT=587
# SMTP_USERNAME=noreply@acme-corp.com
# SMTP_PASS=<password>
# SMTP_USER_EMAIL=noreply@acme-corp.com

# ── PDF signing certificate ──────────────────────────────────
# REQUIRED — leaving this as a placeholder causes "something went wrong" on sign completion.
# Generate a self-signed cert (valid for 10 years) and paste the output as PFX_BASE64:
#   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes \
#     -subj "/CN=<ClientName> Sign/O=ENKOpenSign/C=ZA"
#   openssl pkcs12 -export -out cert.p12 -inkey key.pem -in cert.pem -passout pass:<yourpass>
#   base64 -w 0 cert.p12   # paste the output below
PFX_BASE64=<run the commands above and paste the base64 output here>
PASS_PHRASE=<yourpass>      # must match the -passout value above
```

### Generate a strong MASTER_KEY

```bash
openssl rand -base64 24
```

---

## Step 6 — Restore Production Ports in docker-compose.yml

The local dev version of `docker-compose.yml` has ports 80 and 443 removed to avoid host conflicts. On a production server those ports should be open so Caddy can:
- Redirect HTTP → HTTPS
- Auto-provision a Let's Encrypt TLS certificate for the client's domain

Edit `docker-compose.yml` and restore the Caddy ports:

```yaml
  caddy:
    ports:
      - "3001:3001"
      - "80:80"
      - "443:443"
      - "443:443/udp"
```

> **Do not restore these on local dev machines** where port 80 is already in use.

---

## Step 7 — Point the Domain at the Server

In the client's DNS panel, add an **A record**:

```
sign.acme-corp.com → <server IP>
```

Wait for DNS to propagate (usually 5–30 minutes). Confirm with:

```bash
dig +short sign.acme-corp.com
```

---

## Step 8 — Build and Start

```bash
# Write frontend env so REACT_APP_APPID is baked into the build
echo "REACT_APP_APPID=<APP_ID>" > apps/OpenSign/.env

# Build the frontend for this client
cd apps/OpenSign && npm install --engine-strict=false && npm run build && cd ../..

# Start all services
HOST_URL=https://sign.acme-corp.com docker compose up --build --force-recreate -d
```

Caddy will automatically obtain a Let's Encrypt TLS certificate for the domain on first start (requires port 80 to be reachable from the internet).

Verify everything is up:

```bash
docker ps
docker logs OpenSignServer-container --tail 20
```

The server log should end with:
```
opensign-server running on port 8080.
SUCCESS  Successfully ran indexed migrations directly on db.
```

---

## Step 9 — Create the First Admin Account

```bash
curl -s -X POST https://sign.acme-corp.com/api/app/functions/usersignup \
  -H "X-Parse-Application-Id: acmecorp" \
  -H "Content-Type: application/json" \
  -d '{
    "userDetails": {
      "email": "admin@acme-corp.com",
      "password": "<strong-password>",
      "name": "Acme Admin",
      "role": "contracts_Admin",
      "company": "Acme Corp"
    }
  }'
```

Use `"role": "contracts_Admin"` for the first account so the client has full admin access.

---

## Step 10 — Bootstrap Organisation and Team

> **This step is required.** `usersignup` creates the user and tenant but does NOT create the Organisation or Team records. Without them, Settings → Users throws "Something went wrong" and adding users fails with "Permission denied".

Run these commands **on the server** (or via SSM):

```bash
APP_ID=acmecorp
MASTER_KEY=<your-master-key>
HOST=http://localhost:8080/app

# 1. Get the admin's TenantId and contracts_Users objectId
curl -sG "$HOST/classes/contracts_Users" \
  --data-urlencode 'where={"Email":"admin@acme-corp.com"}' \
  -H "X-Parse-Application-Id: $APP_ID" \
  -H "X-Parse-Master-Key: $MASTER_KEY"
```

Note the `TenantId.objectId` and the top-level `objectId` from the response, then:

```bash
TENANT_ID=<TenantId.objectId from above>
EXT_USER_ID=<objectId from above>

# 2. Create the Organisation
ORG_ID=$(curl -s -X POST "$HOST/classes/contracts_Organizations" \
  -H "X-Parse-Application-Id: $APP_ID" \
  -H "X-Parse-Master-Key: $MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"Name\":\"Acme Corp\",\"TenantId\":{\"__type\":\"Pointer\",\"className\":\"partners_Tenant\",\"objectId\":\"$TENANT_ID\"}}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['objectId'])")
echo "Org ID: $ORG_ID"

# 3. Link the admin to the Organisation
curl -s -X PUT "$HOST/classes/contracts_Users/$EXT_USER_ID" \
  -H "X-Parse-Application-Id: $APP_ID" \
  -H "X-Parse-Master-Key: $MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"OrganizationId\":{\"__type\":\"Pointer\",\"className\":\"contracts_Organizations\",\"objectId\":\"$ORG_ID\"}}"

# 4. Create the default Team (must be named "All Users" to auto-select in Add User form)
curl -s -X POST "$HOST/classes/contracts_Teams" \
  -H "X-Parse-Application-Id: $APP_ID" \
  -H "X-Parse-Master-Key: $MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"Name\":\"All Users\",\"OrganizationId\":{\"__type\":\"Pointer\",\"className\":\"contracts_Organizations\",\"objectId\":\"$ORG_ID\"},\"TenantId\":{\"__type\":\"Pointer\",\"className\":\"partners_Tenant\",\"objectId\":\"$TENANT_ID\"}}"
```

After completing these steps, **log out and back in** so the browser picks up the updated session with `OrganizationId`.

Hand the credentials to the client and ask them to change the password on first login.

---

## Updating a Client Deployment

### Pull upstream fixes from staging

```bash
git checkout client/acme-corp
git merge staging           # merge latest fixes from your main fork
# resolve any conflicts, then:
git push origin client/acme-corp
```

### Redeploy on the server

```bash
git pull origin client/acme-corp
cd apps/OpenSign && npm run build && cd ../..
HOST_URL=https://sign.acme-corp.com docker compose up --build --force-recreate -d
```

---

## Backups

### Database backup (run on the server)

```bash
# Manual backup
docker exec mongo-container mongodump --out /tmp/backup-$(date +%Y%m%d)
docker cp mongo-container:/tmp/backup-$(date +%Y%m%d) ./backups/

# Restore from backup
docker cp ./backups/backup-20260101 mongo-container:/tmp/restore
docker exec mongo-container mongorestore /tmp/restore
```

### Automate daily backups with cron

```bash
crontab -e
# Add:
0 2 * * * cd /path/to/ENKOpenSign && docker exec mongo-container mongodump --archive | gzip > ~/backups/opensign-$(date +\%Y\%m\%d).gz
```

### Uploaded documents

If using local storage (`USE_LOCAL=true`), documents are in the `opensign-files` Docker volume. Back it up with:

```bash
docker run --rm -v enkopensign_opensign-files:/data -v ~/backups:/backup alpine \
  tar czf /backup/files-$(date +%Y%m%d).tar.gz /data
```

---

## Security Checklist Before Going Live

- [ ] `MASTER_KEY` is a strong random string (not the default `XnAadwKxxByMr`)
- [ ] `APP_ID` is unique to this client (not `opensign`)
- [ ] `PFX_BASE64` generated and set (not the placeholder — causes signing errors)
- [ ] MongoDB is not exposed to the internet (no external port mapping in docker-compose.yml)
- [ ] HTTPS is working and HTTP redirects to HTTPS
- [ ] `.env.prod` is not committed to git
- [ ] Organisation and Team bootstrapped (Step 10) — Settings → Users works
- [ ] Admin logged out and back in after Step 10
- [ ] End-to-end test: upload doc → request signature → sign → finish — no errors
- [ ] Admin password changed by client after first login
- [ ] Backups scheduled and tested

---

## Quick Reference — Per-Client Commands

```bash
# Start
HOST_URL=https://sign.acme-corp.com docker compose up -d

# Stop
docker compose down

# Restart server only (after backend changes)
docker compose restart server

# Logs
docker compose logs -f

# Check all containers are healthy
docker ps

# Create an additional user
curl -s -X POST https://sign.acme-corp.com/api/app/functions/usersignup \
  -H "X-Parse-Application-Id: acmecorp" \
  -H "Content-Type: application/json" \
  -d '{"userDetails":{"email":"user@acme-corp.com","password":"Pass123!","name":"Jane Doe","role":"contracts_User","company":"Acme Corp"}}'
```
