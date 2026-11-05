# ENK Sign deployment

Every client gets its own isolated instance (database, documents, certificates) running the same
versioned images, on a cloud VM or on the client's own server. The only per-client inputs are
`.env` and the `config/` folder.

```
deploy/
├── docker-compose.prod.yml   mongo + server + web + caddy (automatic HTTPS)
├── Caddyfile
├── .env.example              every setting, documented
├── bin/enk-sign              install / upgrade / backup CLI
└── (created per instance, git-ignored)
    ├── .env                  settings and secrets
    ├── config/brand/         logo.svg, favicon.svg (served at /brand/), theme.json, runtime.json
    ├── config/email/         verification and password-reset templates
    ├── config/certs/         optional client TLS certificate
    └── backups/
```

## Requirements

- Linux host with Docker Engine 24+ and the Compose plugin; `openssl`.
- 2 vCPU, 4 GB RAM, 40 GB disk for a typical client (LibreOffice in the server image needs the memory).
- Ports 80 and 443 reachable by users. For automatic certificates, a DNS record pointing at the host.
- Linux kernel **not** in 6.19 – 7.0.13: MongoDB 8.0 refuses to start on those kernels
  ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912), an rseq bug). LTS kernels such as
  Ubuntu 24.04's 6.8, and 7.0.14+, are fine. Check with `uname -r`; Docker Desktop's VM kernel counts too.

## Install

```bash
# 1. Get the bundle for the release you are deploying
git clone --depth 1 --branch v1.0.0-enk.1 https://github.com/gitkgothatso/ENKOpenSign.git
cd ENKOpenSign/deploy

# 2. Generate .env with a master key and a self-signed document-signing certificate
bin/enk-sign init

# 3. Edit .env: ENK_VERSION, PUBLIC_URL, SITE_ADDRESS, BRAND_KEY, BRAND_NAME, SMTP_* (see comments in the file)
#    and drop the client's logo.svg / favicon.svg / theme.json into config/brand/

# 4. Start and create the first administrator
bin/enk-sign up
bin/enk-sign create-admin
```

`up` copies the default email templates into `config/email/` on first start; edit them there for the
client and run `bin/enk-sign up` again.

### Cloud (AWS EC2)

- Ubuntu 24.04, `t3.medium`, 40 GB gp3, Elastic IP, security group allowing 80/443 (and 22 from your IP).
- DNS `A` record for the client's domain → Elastic IP; `SITE_ADDRESS=sign.client.com`, `PUBLIC_URL=https://sign.client.com`.
- Email: Amazon SES SMTP (`SMTP_HOST=email-smtp.<region>.amazonaws.com`, `SMTP_PORT=587`). SES SMTP is not
  offered in every region (for example af-south-1); eu-west-1 is known to work.
- Documents: keep `USE_LOCAL=true` (backed up by `enk-sign backup`), or set `USE_LOCAL=false` with an S3 bucket in `DO_*`.
- Off-host backups: set `BACKUP_S3_URI` and give the instance role `s3:PutObject` on that bucket.

### On-prem

- No public DNS: `SITE_ADDRESS=https://sign.client.local` with `CADDY_TLS=tls internal` (Caddy's own CA; have
  the client trust it), or put the client's certificate in `config/certs/` and set
  `CADDY_TLS=tls /certs/cert.pem /certs/key.pem`.
- Email through the client's relay (`SMTP_*`).
- **Air-gapped:** download every `enk-sign-images-<version>.tar.gz.part-NN` file and the `.sha256` from the GitHub
  release (the bundle is split to stay under GitHub's 2 GiB file limit), copy them into one folder on the host
  with the bundle, then `bin/enk-sign load-images enk-sign-images-<version>.tar.gz.part-00` before `up`; it
  checks the checksum of the joined archive.

## Branding

Built on OpenSign's own white-label support: `bin/enk-sign up` turns the settings below into the web
app's runtime config (`APP_RUNTIME_CONFIG_BASE64`) and the server's `APP_*` brand variables.

| Setting / file | Effect |
|---|---|
| `BRAND_KEY` (required) | Slug identifying the client, e.g. `acme-sign`. Any value but `opensign` switches off OpenSign's hosted defaults: Google Analytics tags, OpenSign SSO/Google sign-in, socials, docs links, app switcher |
| `BRAND_NAME` | Product name in the UI, page titles, emails and the digital signature |
| `config/brand/logo.svg` + `BRAND_LOGO_URL=/brand/logo.svg` | Logo in the app |
| `config/brand/favicon.svg` + `BRAND_FAVICON_URL=/brand/favicon.svg` | Browser tab icon |
| `config/brand/theme.json` | Colours (below) |
| `EMAIL_LOGO_URL` | Logo in emails; must be an absolute URL, e.g. `https://sign.client.com/brand/logo.png` (PNG renders in more mail clients than SVG) |
| `config/email/*` | Verification and password-reset emails |
| `SUPPORT_EMAIL`, `COMPLAINTS_EMAIL` | Contact addresses in the app and in email footers |
| `SOURCE_URL` | Repository the footer version links to (AGPL source offer) |
| `config/brand/runtime.json` | Optional overrides merged into the runtime config last, e.g. `{"features": {"passkeys": true}}` |

`theme.json` uses DaisyUI colour names with hex values, per theme:

```json
{
  "light": { "primary": "#0a2342", "primary-content": "#ffffff", "accent": "#f5a623", "base-100": "#ffffff" },
  "dark": {},
  "emailAccent": "#f5a623"
}
```

Branding changes need `bin/enk-sign up` (it regenerates the runtime config; containers re-read it at start), not a new image.

## Operations

| Task | Command |
|---|---|
| Status / logs | `bin/enk-sign status`, `bin/enk-sign logs server` |
| Backup (database, documents, config) | `bin/enk-sign backup` → `backups/<time>-<version>/` |
| Restore | `bin/enk-sign restore backups/<dir>` |
| Upgrade | `bin/enk-sign upgrade v1.1.0-enk.1` (backs up first; migrations run on start) |
| Roll back | `bin/enk-sign rollback`, then `restore` the pre-upgrade backup if the database was migrated |
| Stop | `bin/enk-sign down` (volumes are kept) |

Schedule backups with cron, e.g. `0 2 * * * /opt/ENKOpenSign/deploy/bin/enk-sign backup >> /var/log/enk-sign-backup.log 2>&1`.

## Security checklist

- `.env` is mode 600 and never committed; keep a copy of it (and the signing certificate) in your secrets vault.
- MongoDB and the API are only reachable inside the Docker network; only Caddy publishes ports.
- Replace the self-signed signing certificate with a CA-issued document-signing certificate if the client needs
  signatures that validate in Adobe Reader without warnings (`PFX_BASE64`, `PASS_PHRASE`).
- Test `restore` on a spare host before go-live; keep at least one backup off the host (`BACKUP_S3_URI`).
- OpenSign is AGPL-3.0: keep `SOURCE_URL` pointing at the public repository so users can get the source.
