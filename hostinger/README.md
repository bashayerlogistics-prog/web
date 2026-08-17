# Resend via Hostinger (free, no Firebase Blaze)

Order emails: app → this PHP file → Resend → customer inbox.  
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

Test: place an order with your email. First tests can use Resend’s `onboarding@resend.dev` from-address; later verify your domain in Resend and switch `from` to `noreply@yourdomain.com`.
