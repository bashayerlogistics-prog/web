# Clerk + Firebase auth

Customer login uses **Clerk** (Email OTP + Google). Firestore still uses Firebase Auth sessions via `exchangeClerkSession`.

## Clerk Dashboard (already mostly done)

Email tab:
- Sign-up with email: ON
- Verify at sign-up: Email verification code
- Sign-in with email OTP: ON
- Password: OFF

Google:
1. Open **Configure → SSO connections**
2. Add **Google**
3. Enable for sign-in and sign-up
4. Add redirect URL: `http://localhost:5173/sso-callback` and your production domain `/sso-callback`

Allowed origins:
- `http://localhost:5173`
- your live site URL

## Env

Frontend `.env`:

```env
# Local / Clerk Development instance
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
# Production domain must use a Clerk Production instance (pk_live_… + matching sk_live_…)
# VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_CLERK_EXCHANGE_URL=https://bashayer-logistics.com/clerk-exchange.php
```

Never put `CLERK_SECRET_KEY` in Vite/`VITE_` vars.

### Production checklist (bashayer-logistics.com)

1. Clerk Dashboard → create / switch to a **Production** instance  
2. Add allowed origins + `/sso-callback` for `https://bashayer-logistics.com`  
3. GitHub secrets (or Hostinger inject):
   - `VITE_CLERK_PUBLISHABLE_KEY` = `pk_live_…`
   - `CLERK_SECRET_KEY` = `sk_live_…` (same Production instance)
4. Redeploy Hostinger so `clerk-exchange.php` gets the live secret  
5. Confirm the browser console no longer warns about development keys

## Hostinger bridge (recommended — no Blaze)

Customer login needs a server that turns a Clerk session into a Firebase custom token.
If the Firebase project is still on **Spark**, Cloud Functions cannot deploy. Use Hostinger PHP instead:

1. File: `hostinger/clerk-exchange.php` (copied into `hostinger-upload/` / live `public_html`)
2. Inject secrets (GitHub Action does this automatically), or locally:

```powershell
npm run hostinger
powershell -ExecutionPolicy Bypass -File .\scripts\inject-hostinger-local.ps1
npm run zip:hostinger
```

Required secrets on Hostinger PHP:
- `CLERK_SECRET_KEY`
- Firebase service account (`FIREBASE_SERVICE_ACCOUNT` JSON)

After upload, login → OTP → `/dashboard` should work.

## Deploy Firebase bridge + order email sender (optional, needs Blaze)

One interactive script (recommended):

```powershell
npx firebase login
powershell -ExecutionPolicy Bypass -File .\scripts\finish-auth-deploy.ps1
```

It sets `CLERK_SECRET_KEY`, `SMTP_USER`, `SMTP_PASSWORD`, `OTP_PEPPER`, then deploys rules + functions.

Or manually:

```sh
npx firebase login
npx firebase functions:secrets:set CLERK_SECRET_KEY
npx firebase functions:secrets:set SMTP_USER
npx firebase functions:secrets:set SMTP_PASSWORD
npx firebase functions:secrets:set OTP_PEPPER
npm run deploy:functions
npm run deploy:rules
```

Paste the Clerk **Secret key** (`sk_test_...`) when prompted for `CLERK_SECRET_KEY`.  
For Gmail order mail, use an **App Password** as `SMTP_PASSWORD`.

Without this deploy, Clerk OTP still works in the UI, but Firestore sync (`exchangeClerkSession`) and order emails (`deliverEmailQueue`) will not.
