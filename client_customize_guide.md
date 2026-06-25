# Client Customisation Guide

This guide documents every customisation point in this fork — what was done for the `enkopensign-clientdemo` branch and how to replicate or extend it for any future client. Use it as a checklist when setting up a new client branch.

---

## How to Start a New Client

```bash
git checkout staging && git pull origin staging
git checkout -b client/<client-slug>
git push -u origin client/<client-slug>
```

Then work through the tables below. Each row tells you what to change, where it lives, and what the clientdemo branch used as an example.

---

## 1. Identity & Branding

These are the first things a client will notice.

| Customisation | File(s) | How to apply | clientdemo value |
|---|---|---|---|
| **App name** (UI labels, page titles, T&Cs) | `src/pages/Login.jsx` · `src/components/Title.jsx` · `src/components/Footer.jsx` · `src/components/bulksend/BulkSendUi.jsx` · `src/components/pdf/AgreementContent.jsx` | Find `const appName = "OpenSign™"` in each file, replace the string | `"ClientDemo Sign"` |
| **Email sender display name** | `apps/OpenSignServer/Utils.js` line 20 | Change `process.env.APP_NAME \|\| 'ClientDemo Sign'` default, or set `APP_NAME=` in `.env.prod` | `ClientDemo Sign` |
| **Logo** | `apps/OpenSign/src/assets/images/` | Add your SVG/PNG, update import in `src/constant/appinfo.js` | `clientdemo-logo.svg` |
| **Favicon** | `apps/OpenSign/public/favicon.svg` + `apps/OpenSign/index.html` | Replace `favicon.svg`, link is already in `index.html` | Navy pen-icon SVG |
| **Sidebar "Drive" label** | `apps/OpenSign/public/locales/en/translation.json` | Find `sidebar["OpenSign™ Drive"]`, update value (keep the key as-is) | `"ClientDemo Sign Drive"` |
| **Social media links** | `apps/OpenSign/src/components/SocialMedia.jsx` | Replace links with client's own, or return `null` to hide entirely | Hidden (`null`) |

---

## 2. Colour Scheme

The app has two built-in themes: `opensigncss` (light) and `opensigndark` (dark). Update the light theme values for the client's brand — the dark theme can stay as-is unless the client requests a custom dark palette.

| Customisation | File | How to apply | clientdemo value |
|---|---|---|---|
| **Light theme colours** | `apps/OpenSign/tailwind.config.js` → `daisyui.themes[opensigncss]` | Update the DaisyUI token values | Primary `#0A2342`, Accent `#F5A623` |
| **Default theme on load** | `apps/OpenSign/src/index.jsx` | `else` branch after dark-theme check — set `data-theme` attribute | `opensigncss` (light) |

### DaisyUI token reference

| Token | Role | clientdemo |
|---|---|---|
| `primary` | Buttons, active sidebar items, card headers | `#0A2342` |
| `primary-content` | Text on primary bg | `#FFFFFF` |
| `accent` | Highlights, gold accents | `#F5A623` |
| `accent-content` | Text on accent bg | `#1A1A1A` |
| `base-100` | Page background | `#FFFFFF` |
| `base-200` | Card/panel background | `#F0F4F8` |
| `base-300` | Borders, dividers | `#E0E8F4` |
| `base-content` | Main body text | `#1A1A2E` |

---

## 3. Email Templates

All email templates live in `apps/OpenSignServer/files/`. The server reads them from disk on each send — **no rebuild needed**, just restart the server container.

| Template | Files | Variables available | What to customise |
|---|---|---|---|
| **Password reset** | `password_reset_email.html` · `password_reset_email_subject.txt` | `{{username}}` · `{{{link}}}` | Subject line, header colour, button colour/text, footer copy |
| **Email verification** | `verification_email.html` · `verification_email_subject.txt` | `{{appName}}` · `{{{link}}}` | Same as above + welcome message |
| **Account notice** | `custom_email.html` · `custom_email_subject.txt` | `{{username}}` · `{{appName}}` | Generic notice copy |

### Template structure (all three follow this pattern)

```html
<!-- Header: brand colour bar with logo text -->
<td style="background-color:#PRIMARY;">
  <span>BrandName</span> <span style="color:#ACCENT;">SIGN</span>
</td>

<!-- Body: heading, message, CTA button -->
<td style="padding:40px;">
  <p>Heading</p>
  <a href="{{{link}}}" style="background-color:#PRIMARY;">Button Text</a>
</td>

<!-- Footer: copyright + no-reply note -->
<td>© {{appName}} | This is an automated message...</td>
```

Replace `#PRIMARY` and `#ACCENT` with the client's hex values. The `{{{triple-brace}}}` syntax is Mustache unescaped HTML — required for the reset/verify link.

---

## 4. Docker Services

Both the frontend and server now build from local `Dockerfile.local` files so client customisations are served correctly. **Do not revert to Hub images** on client branches — the Hub images bake in the original OpenSign branding.

| Service | Hub image (staging default) | Local build (client branches) |
|---|---|---|
| Frontend | `opensign/opensign:main` | `apps/OpenSign/Dockerfile.local` |
| Backend | `opensign/opensignserver:main` | `apps/OpenSignServer/Dockerfile.local` |

### Rebuild commands

```bash
# Rebuild both after code changes
HOST_URL=https://<client-domain> docker compose up --build -d

# Rebuild only frontend (after UI changes)
cd apps/OpenSign && npm run build && cd ../..
HOST_URL=https://<client-domain> docker compose up --build client -d

# Restart only server (after email template or env changes)
docker compose restart server
```

---

## 5. Environment Variables (`.env.prod`)

Each client gets their own `.env.prod` — never committed to git. The table below shows every variable that changes per client.

| Variable | Purpose | Example |
|---|---|---|
| `APP_NAME` | Email sender display name | `Acme Corp Sign` |
| `appName` | Parse Server app name (email templates `{{appName}}`) | `Acme Corp Sign` |
| `APP_ID` / `REACT_APP_APPID` | Unique app identifier — must match between server and frontend | `acmecorp` |
| `MASTER_KEY` | Parse Server admin key — generate per client: `openssl rand -base64 24` | _(random)_ |
| `MONGODB_URI` | Database connection string | `mongodb://mongo-container:27017/AcmeCorpDB` |
| `PUBLIC_URL` / `SERVER_URL` | Client's domain | `https://sign.acme-corp.com` |
| `USE_LOCAL` | `true` = local file storage, `false` = S3/DO Spaces | `true` for dev |
| `SMTP_HOST` / `SMTP_PORT` | Client's mail server (or `maildev` for local dev) | `smtp.acme-corp.com` |
| `SMTP_USER_EMAIL` / `SMTP_PASS` | SMTP credentials | _(client's)_ |
| `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` | Alternative to SMTP | _(client's)_ |
| `PFX_BASE64` / `PASS_PHRASE` | PDF signing certificate | _(client's p12, base64-encoded)_ |

### AWS-specific values (when deploying on EC2 + S3 + SES)

| Variable | AWS value |
|---|---|
| `USE_LOCAL` | `false` |
| `DO_ENDPOINT` | `s3.af-south-1.amazonaws.com` |
| `DO_BASEURL` | `https://<bucket>.s3.af-south-1.amazonaws.com` |
| `DO_REGION` | `af-south-1` |
| `SMTP_HOST` | `email-smtp.af-south-1.amazonaws.com` |
| `SMTP_PORT` | `587` |

See **`client_cloud_aws_deploy.md`** for full provisioning steps including S3 bucket creation, IAM user setup, and SES domain verification.

---

## 6. Suggested Further Customisations

These were identified but not yet applied on the clientdemo branch. Apply as needed per client.

| Customisation | Priority | File(s) | Notes |
|---|---|---|---|
| Login page illustration | Medium | `apps/OpenSign/src/assets/images/login_img.svg` | Replace SVG with client's illustration or photo |
| Terms & Conditions text | Medium | `apps/OpenSign/public/locales/en/translation.json` keys `term-cond-*` | Update legal text and remove opensignlabs.com references |
| Signing request email body | High (if email-heavy client) | `apps/OpenSignServer/cloud/parsefunction/sendMailv3.js` | The email sent to document signers — most-seen email |
| Document certificate footer | Medium | `apps/OpenSignServer/cloud/parsefunction/generateCertificatebydocId.js` | Company name/logo on signed PDF certificate |
| i18n copy (other languages) | Low–Medium | `apps/OpenSign/public/locales/[lang]/translation.json` | Translate or adjust copy per locale |
| Dark theme colours | Low | `apps/OpenSign/tailwind.config.js` → `opensigndark` | If client needs a custom dark palette |
| Footer version link | Low | `apps/OpenSign/src/components/Footer.jsx` | Remove or replace GitHub release link |

---

## 7. New Client Checklist

Copy this checklist into your notes when starting a new client branch.

```
[ ] git checkout -b client/<slug>
[ ] Logo SVG/PNG created and imported in appinfo.js
[ ] Favicon updated in public/favicon.svg
[ ] App name updated in all 5 frontend files (Login, Title, Footer, BulkSendUi, AgreementContent)
[ ] App name updated in SubMenu.jsx, SelectFolder.jsx, FolderModal.jsx (drivename)
[ ] Drive label updated in public/locales/en/translation.json
[ ] Social media links updated or removed (SocialMedia.jsx)
[ ] opensigncss theme colours updated in tailwind.config.js
[ ] Default theme set in src/index.jsx
[ ] Email templates updated (3x HTML + subject lines)
[ ] appName + APP_NAME in .env.prod set to client's brand name
[ ] APP_ID / REACT_APP_APPID unique per client
[ ] MASTER_KEY generated fresh (openssl rand -base64 24)
[ ] MONGODB_URI database name unique per client
[ ] Email config (SMTP or Mailgun) set
[ ] PFX_BASE64 certificate set (real cert for production)
[ ] npm run build (frontend)
[ ] docker compose up --build -d
[ ] First admin account created via curl
[ ] Verify email sent from MailDev (local) or real inbox (production)
[ ] git push origin client/<slug>
```

---

## 8. Merging Upstream Updates

When the `staging` branch gets upstream fixes, merge them into each active client branch:

```bash
git checkout client/<slug>
git merge staging

# Resolve any conflicts in:
# - tailwind.config.js (theme values)
# - src/components/ (app name strings)
# - apps/OpenSignServer/files/ (email templates)

git push origin client/<slug>

# Then rebuild on the client's server:
# cd /path/to/ENKOpenSign
# git pull && npm run build (in apps/OpenSign) && docker compose up --build -d
```
