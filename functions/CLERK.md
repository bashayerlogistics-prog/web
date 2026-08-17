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
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Never put `CLERK_SECRET_KEY` in Vite/`VITE_` vars.

## Deploy Firebase bridge + order email sender

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
