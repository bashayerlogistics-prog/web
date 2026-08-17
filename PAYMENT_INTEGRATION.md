# Payment Integration — Bashayer Al-Ataa Car Booking

This document describes the payment system: WhatsApp, bank transfer, and Moyasar online payments.

## Overview

| Method | Customer flow | `paymentStatus` after checkout |
|--------|---------------|--------------------------------|
| WhatsApp | Order created → WhatsApp opens with booking details | `pending` |
| Bank transfer | Bank details shown → optional receipt upload | `proof_submitted` or `pending` |
| Moyasar (Visa, Mastercard, Mada, Apple Pay, STC Pay) | Order created → Moyasar form → redirect → server verification | `paid` (after Cloud Function) |

All booking prices use **SAR**.

---

## 1. Moyasar account setup

1. Sign up at [Moyasar Dashboard](https://dashboard.moyasar.com).
2. Use **Test mode** first (keys prefixed with `pk_test_` / `sk_test_`).
3. Copy your **publishable** test key for the frontend.
4. Copy your **secret** test key for Firebase Functions only.

Never commit real keys to git.

---

## 2. Sandbox setup

### Frontend (`.env`)

```env
VITE_MOYASAR_PUBLISHABLE_KEY=pk_test_xxxxxxxx
```

Alternatively, set the publishable key in **Admin → Payment Settings** (Firestore `siteSettings/payment`).  
Environment variable takes precedence when valid.

### Backend (Firebase secret)

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
    → Cloud Function verifyMoyasarPayment → paymentStatus = paid
```

### Security

- Card data handled only by Moyasar (CDN script).
- Secret key only in Firebase Functions.
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
2. Update env + Firebase secret.
3. Redeploy frontend and functions.

---

## 10. Testing

Use Moyasar sandbox test cards. See [Moyasar testing docs](https://docs.moyasar.com/guides/testing).

Test WhatsApp, bank transfer, card payments, failed/cancelled flows, admin toggles, and mobile checkout.

---

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_MOYASAR_PUBLISHABLE_KEY` | Frontend `.env` | Moyasar form |
| `MOYASAR_SECRET_KEY` | Firebase secret | Payment verification |
