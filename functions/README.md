# Email OTP setup

Customer login uses callable Cloud Functions, Firebase custom tokens, and branded transactional SMTP mail.

## 1. SMTP values

Copy `.env.example` to `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_FROM=bashayer.logistics@gmail.com
SMTP_NAME=Bashayer Al-Ataa
SMTP_REPLY_TO=bashayer.logistics@gmail.com
```

Use your real brand mailbox for `SMTP_FROM` / `SMTP_REPLY_TO` (same domain as the site when possible).

## 2–3. Secrets + deploy (one script)

Customer OTP is sent by **Clerk**. Firebase secrets are for the Clerk→Firebase bridge and order emails.

```powershell
npx firebase login
powershell -ExecutionPolicy Bypass -File .\scripts\finish-auth-deploy.ps1
```

Or manually:

```sh
firebase functions:secrets:set CLERK_SECRET_KEY
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASSWORD
firebase functions:secrets:set OTP_PEPPER
npm run deploy:functions
npm run deploy:rules
```

- `OTP_PEPPER`: long random string (script can generate it)
- Gmail: use an App Password for `SMTP_PASSWORD`, not the normal login password

Requires Firebase Blaze. See also `functions/CLERK.md`.

## Inbox delivery (not Spam / Promotions)

The OTP template is transactional (account verification), bilingual AR/EN, and branded as Bashayer Al-Ataa.

To keep mail in Primary/Inbox:

1. Prefer a custom domain sender (`noreply@yourdomain.com` or company mailbox) with SPF + DKIM + DMARC.
2. Avoid free-mail `From` mismatch when possible (authenticated SMTP user should match `SMTP_FROM`).
3. Warm the sender: send real OTPs only, no marketing content in the same template.
4. Ask users to mark the first OTP as “Not spam” / move to Primary once.
5. Keep Admin → Payment Settings brand name / from email filled — Functions read `siteSettings/payment.email`.

## Order & payment emails

Order emails are **not** sent by Clerk. Clerk only sends login/signup OTP.

When a booking is created or payment is confirmed, the app writes to Firestore `emailQueue`.  
Cloud Function `deliverEmailQueue` then sends that mail with branded SMTP (same secrets as OTP):

- order placed
- payment pending
- payment confirmed / received

Requires:

```sh
npx firebase functions:secrets:set SMTP_USER
npx firebase functions:secrets:set SMTP_PASSWORD
npm run deploy:functions
```
