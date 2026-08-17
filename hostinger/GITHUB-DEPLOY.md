# GitHub → Hostinger auto deploy

Push to `main` → GitHub Actions builds the site → uploads to Hostinger via FTPS.

Firebase rules/functions also auto-deploy when those files change (separate workflow).

## One-time setup (15–20 min)

### 1) Hostinger FTP details

hPanel → **Files** → **FTP Accounts** (or Hosting → FTP):

- Host (e.g. `ftp.yourdomain.com` or server IP)
- Username
- Password
- Remote folder: `/` (the Hostinger FTP account is already rooted at `public_html`)

### 2) GitHub repository secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

**Hostinger**

| Secret | Example |
|--------|---------|
| `HOSTINGER_FTP_HOST` | `ftp.bashayer-logistics.com` |
| `HOSTINGER_FTP_USER` | your FTP user |
| `HOSTINGER_FTP_PASSWORD` | your FTP password |

**App build (same values as local `.env`)**

| Secret |
|--------|
| `VITE_FIREBASE_API_KEY` |
| `VITE_FIREBASE_AUTH_DOMAIN` |
| `VITE_FIREBASE_PROJECT_ID` |
| `VITE_FIREBASE_STORAGE_BUCKET` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `VITE_FIREBASE_APP_ID` |
| `VITE_FIREBASE_MEASUREMENT_ID` |
| `VITE_SUPERADMIN_EMAIL` |
| `VITE_SUPERADMIN_UID` |
| `VITE_IMGBB_API_KEY` |
| `VITE_CLERK_PUBLISHABLE_KEY` |
| `VITE_RESEND_WEBHOOK_URL` |
| `VITE_EMAIL_WEBHOOK_SECRET` |
| `VITE_RESEND_FROM_EMAIL` |

**Email PHP on Hostinger**

| Secret | Notes |
|--------|--------|
| `RESEND_API_KEY` | from [resend.com](https://resend.com) (`re_...`) |

`VITE_EMAIL_WEBHOOK_SECRET` is also injected into `resend-send.php` on deploy.

**Firebase (rules + functions)**

| Secret | How |
|--------|-----|
| `FIREBASE_TOKEN` | run locally: `npx firebase login:ci` → paste token |
| `CLERK_SECRET_KEY` | if functions need it |
| `OTP_PEPPER` | optional |
| `SMTP_USER` / `SMTP_PASSWORD` | optional |

### 3) Push to GitHub

```bash
git add .
git commit -m "Add GitHub auto-deploy to Hostinger"
git push origin main
```

Then open: GitHub → **Actions** → watch **Deploy to Hostinger**.

Manual run anytime: Actions → Deploy to Hostinger → **Run workflow**.

## Daily workflow

```
Local code change → git push → Hostinger live updates automatically
```

- Live Hostinger files do **not** sync back to GitHub.
- Admin panel / Firestore content is in Firebase, not in Git.
- To get GitHub changes on another PC: `git pull`.

## Manual ZIP (backup only)

```bash
npm run build
node scripts/make-hostinger-zip.mjs
```

Upload `hostinger-upload.zip` only if Actions/FTP is down.
