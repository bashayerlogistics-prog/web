# Payment Integration — Bashayer Al-Ataa Car Booking

This document describes the payment system: WhatsApp, bank transfer, and Moyasar online payments.

## Overview

| Method | Customer flow | `paymentStatus` after checkout |
|--------|---------------|--------------------------------|
| WhatsApp | Order created → WhatsApp opens with booking details | `pending` |
| Bank transfer | Bank details shown → optional receipt upload | `proof_submitted` or `pending` |
| Moyasar (Visa, Mastercard, Mada, Apple Pay, STC Pay) | Order created → Moyasar form → redirect → Hostinger PHP verification | `paid` |

All booking prices use **SAR**.

---

## 1. Moyasar account setup

1. Sign up at [Moyasar Dashboard](https://dashboard.moyasar.com).
2. Use **Test mode** first (keys prefixed with `pk_test_` / `sk_test_`).
3. Copy your **publishable** test key for the frontend (`pk_test_`).
4. Copy your **secret** test key for Hostinger PHP only (`sk_test_`). Never put it in `.env` with `VITE_`.

Never commit real keys to git.

---

## 2. Sandbox setup

### Frontend (`.env`)

```env
VITE_MOYASAR_PUBLISHABLE_KEY=pk_test_xxxxxxxx
VITE_MOYASAR_VERIFY_URL=https://bashayer-logistics.com/moyasar-verify.php
```

Alternatively, set the publishable key in **Admin → Payment Settings** (Firestore `siteSettings/payment`).  
Environment variable takes precedence when valid.

### Backend (Hostinger PHP — free Spark plan)

Auto-Paid does **not** need Firebase Blaze. `hostinger/moyasar-verify.php` talks to Moyasar and writes Firestore.

GitHub secrets:

| Secret | Where |
|--------|--------|
| `MOYASAR_SECRET_KEY` | Moyasar dashboard (`sk_test_` then `sk_live_`) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project settings → Service accounts → Generate new private key (paste the whole JSON) |
| `VITE_MOYASAR_PUBLISHABLE_KEY` | `pk_test_` / `pk_live_` |
| `VITE_MOYASAR_VERIFY_URL` | `https://bashayer-logistics.com/moyasar-verify.php` |

Then push to `main` so Actions injects keys into the PHP file on Hostinger.

Optional: Moyasar Dashboard → Webhooks → `https://bashayer-logistics.com/moyasar-verify.php`

### Backend (Firebase Functions — Blaze only, unused on Spark)

```bash
firebase functions:secrets:set MOYASAR_SECRET_KEY
# paste sk_test_xxxxxxxx when prompted

npm run deploy:functions
```

---

## 3. Admin payment settings

Path: **Admin → Payment Settings** (`/admin/payment-settings`)

Firestore document: `siteSettings/payment`

Admins can enable/disable WhatsApp, bank transfer, Moyasar, and individual card/wallet methods.

---

## 4. Bank transfer

1. Customer selects **Bank Transfer**.
2. Bank details and instructions are shown.
3. Customer uploads payment proof to Firebase Storage.
4. Admin confirms or rejects in **Orders**.

---

## 5. WhatsApp payment

1. Order created with `paymentMethod: whatsapp`.
2. WhatsApp opens with booking summary and amount in SAR.

---

## 6. Moyasar online payment

### Flow

```
Customer → Checkout/Cart → Order (pending) → Moyasar form
    → 3DS / wallet → /payment/return?bookingId=…&id=…
    → Hostinger moyasar-verify.php → paymentStatus = paid
```

### Security

- Card data handled only by Moyasar (CDN script).
- Secret key only in Hostinger `moyasar-verify.php` (not in the browser).
- Server validates amount, currency, duplicate payments.

---

## 7. Apple Pay

Requires domain registration and merchant setup in Moyasar dashboard.  
Test on Safari with a supported Apple device.

---

## 8. STC Pay

Requires STC Pay activation on your Moyasar merchant account.

---

## 9. Sandbox → Live

1. Get `pk_live_` and `sk_live_` after account activation.
2. Update GitHub secrets (`VITE_MOYASAR_PUBLISHABLE_KEY`, `MOYASAR_SECRET_KEY`).
3. Redeploy frontend (push to `main`).

---

## 10. Testing

Use Moyasar sandbox test cards. See [Moyasar testing docs](https://docs.moyasar.com/guides/testing).

Test WhatsApp, bank transfer, card payments, failed/cancelled flows, admin toggles, and mobile checkout.

---

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_MOYASAR_PUBLISHABLE_KEY` | Frontend `.env` / GitHub | Moyasar form |
| `VITE_MOYASAR_VERIFY_URL` | Frontend `.env` / GitHub | Hostinger verify PHP |
| `MOYASAR_SECRET_KEY` | GitHub secret → PHP | Payment verification |
| `FIREBASE_SERVICE_ACCOUNT` | GitHub secret → PHP | Mark order paid in Firestore |
