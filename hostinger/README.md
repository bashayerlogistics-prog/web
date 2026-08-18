# Resend + Moyasar via Hostinger (free, no Firebase Blaze)

Order emails: app → `resend-send.php` → Resend → customer inbox.  
Card payments: app → Moyasar → `moyasar-verify.php` → Firestore `paymentStatus = paid`.  
Login OTP stays on **Clerk** (unchanged).

**Preferred deploy:** GitHub Actions → see [GITHUB-DEPLOY.md](./GITHUB-DEPLOY.md).

## Manual steps (if not using GitHub yet)

1. Sign up at [resend.com](https://resend.com) → **API Keys** → create key (`re_...`).
2. Edit `resend-send.php`:
   - Replace `__RESEND_API_KEY__` with your `re_...`
   - Replace `__WEBHOOK_SECRET__` with any long random string
   - Add your live site to `$allowedOrigins`
3. Upload `resend-send.php` to Hostinger `public_html`.
4. In project `.env`:

```env
VITE_RESEND_WEBHOOK_URL=https://YOUR-DOMAIN.com/resend-send.php
VITE_EMAIL_WEBHOOK_SECRET=same-as-WEBHOOK_SECRET-in-php
VITE_RESEND_FROM_EMAIL=onboarding@resend.dev
```

5. Restart `npm run dev`.

## Moyasar auto-Paid (same Hostinger, still free)

1. Moyasar dashboard → copy `sk_test_...` (secret) and `pk_test_...` (publishable).
2. Firebase Console → Project settings → **Service accounts** → **Generate new private key**.
3. GitHub → Settings → Secrets:
   - `MOYASAR_SECRET_KEY` = `sk_test_...`
   - `FIREBASE_SERVICE_ACCOUNT` = paste the whole JSON file
   - `VITE_MOYASAR_PUBLISHABLE_KEY` = `pk_test_...`
   - `VITE_MOYASAR_VERIFY_URL` = `https://bashayer-logistics.com/moyasar-verify.php`
4. Push to `main`. Actions uploads `moyasar-verify.php` with keys injected.
5. Admin → Payment Settings → Online Gateway ON + publishable key → Save.

Do not put `sk_` keys in the website `.env` as `VITE_`.

## Email test

Test: place an order with your email. First tests can use Resend’s `onboarding@resend.dev` from-address; later verify your domain in Resend and switch `from` to `noreply@yourdomain.com`.
