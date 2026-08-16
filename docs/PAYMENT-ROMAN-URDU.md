# Online Payment System — Roman Urdu Guide
**Project:** Bashayer Al-Ataa (saudia_project-2027)

---

## Payment Options (WhatsApp aur Bank Transfer)

- **WhatsApp Payment** — Customer order place karta hai, WhatsApp khul jati hai payment receipt bhejne ke liye
- **Bank Transfer (Saudi Banking)** — Customer ko IBAN / account details dikhte hain, transfer ke baad screenshot upload karta hai
- **Online Gateway** — Abhi band hai (Coming Soon); future mein Moyasar, HyperPay, Tap Payments

**Default Saudi banks support:** Al Ahli (SNB) aur doosre banks — IBAN format `SA...`

**Admin se enable/disable:** Super Admin → Payment Settings → methods checkboxes

---

## User Payment Kaise Karega (Step by Step)

### Website se (Cart / Checkout)

1. Website par trip select karein aur **Cart** ya **Checkout** par jayein
2. **Naam, mobile (WhatsApp), email** bharein (checkout ke liye login zaroori)
3. **Payment method** choose karein:
   - **WhatsApp** → Order save hota hai + WhatsApp message auto open
   - **Bank Transfer** → Bank details copy karein, amount transfer karein, **screenshot upload** karein
4. **Confirm Booking** dabayein
5. Order number milta hai — **Track Booking** se status dekh sakte hain
6. Admin confirm karne ke baad booking **Confirmed** ho jati hai

### Purana simple WhatsApp flow (fleet pages)

- Kuch pages par seedha **"Book via WhatsApp"** button hai — ye sirf message bhejta hai, admin manually order bana sakta hai

---

## Super Admin Payment Settings

**Path:** `/admin/payment-settings` (Admin sidebar → Payment Settings)

| Section | Kya set hota hai |
|---------|------------------|
| **Payment Methods** | WhatsApp ✓, Bank Transfer ✓, Online Gateway (future) |
| **Bank Details** | Bank name (AR/EN), account holder, IBAN, account number |
| **WhatsApp** | Business WhatsApp number (+966...) |
| **Instructions** | Customer ko dikhne wali guide (AR/EN) — screenshot upload ke baad kya hoga |
| **Email** | Brand name, from email, reply-to, **Webhook URL** (email bhejne ke liye) |
| **Gateway (Future)** | Provider (Moyasar / HyperPay / Tap), publishable key |

**Save:** Settings Firestore `siteSettings/payment` mein save hoti hain

---

## Admin Payment Confirm Kaise Karega

**Path:** `/admin/orders`

1. Orders list kholo — filter: **Payment Status** (Pending / Proof Submitted / Paid / Rejected)
2. Order par click → **Order Detail** modal
3. **Payment proof screenshot** dekho (agar bank transfer hai)
4. Actions:
   - **Confirm Payment** → status `paid`, booking `confirmed`, emails + notifications jati hain
   - **Reject Payment** → reason likho, customer ko reject notification
   - Manual status buttons bhi hain (pending, proof_submitted, paid, rejected, refunded)
5. **Manual Order (+)** — WhatsApp / phone se aaye orders admin khud add kar sakta hai

**Activity log:** `/admin/activity` — payment confirm/reject ki history

---

## Orders Management (WooCommerce jaisa)

- **Order ID** auto number (#1001, #1002...)
- **Status:** Pending → Confirmed → Completed / Cancelled
- **Payment Status:** Pending → Proof Submitted → Paid / Rejected / Refunded
- **Search:** Order ID, customer name, email, phone
- **Sources:** `website`, `manual` (WhatsApp orders admin ne add kiye)
- **Timeline:** Har step ki history order detail mein
- **Revenue stats:** Admin Settings overview mein total revenue

**Related pages:**
- `/admin/price-requests` — "Your Price" custom quotes
- `/admin/notifications` — manual notifications bhejna

---

## WhatsApp Orders Tracking (Admin)

| Tarika | Kaise track hota hai |
|--------|----------------------|
| Website + WhatsApp payment | Order Firebase mein save → `/admin/orders` |
| Website + Bank transfer | Same + screenshot `paymentProofUrl` |
| Sirf WhatsApp button (bina checkout) | Admin **Manual Order** se entry kare |
| Custom price request | `/admin/price-requests` |

---

## Email Notifications

Emails **Arabic + English** dono bheji jati hain (customer email par).

| Event | Email Subject (idea) |
|-------|---------------------|
| **Order placed** | "Order Received #1234" / "تم استلام الطلب" |
| **Payment pending** | "Payment Pending" — screenshot ya payment complete karein |
| **Payment confirmed** | "Payment & Booking Confirmed" — driver contact karega |

**Extra:** In-app notification bell (Dashboard) + admin manual notify button

**Email kaise bhejti hai:**
1. Email `emailQueue` collection mein queue hoti hai
2. Agar **Webhook URL** set hai → POST request se external service email bhejti hai (SMTP / Resend / Cloud Function)
3. Webhook khali ho to sirf queue mein save — SMTP setup zaroori hai live emails ke liye

---

## Aap Se Kya Chahiye (Setup Checklist)

### Zaroori (abhi chalane ke liye)

- [ ] **IBAN** — Saudi bank account (SA...)
- [ ] **Account number** aur **bank name**
- [ ] **Account holder** naam (company legal name)
- [ ] **WhatsApp business number** (+966...)
- [ ] **Brand name** (AR + EN) — emails aur site par
- [ ] **From email** aur **Reply-to** (e.g. `bashayer.logistics@gmail.com`)

### Email SMTP / Webhook

- [ ] **Webhook URL** — jo emails actually bheje (Firebase Function + Nodemailer, Resend, SendGrid, etc.)
- [ ] SMTP credentials us service mein configure karein (site par password save nahi hota — sirf webhook)

### Future (Online Gateway)

- [ ] **Moyasar** / **HyperPay** / **Tap** merchant account
- [ ] **Publishable key** (+ secret key backend par — abhi UI mein publishable field hai)
- [ ] Payment Settings mein gateway enable karein jab integration complete ho

---

## Future: Online Gateway (Moyasar, HyperPay, Tap)

- Saudi Arabia ke popular payment gateways
- Customer card / Apple Pay / STC Pay se direct pay karega — screenshot ki zaroorat nahi
- Admin Payment Settings mein provider select + API key
- Abhi UI mein **"Coming Soon"** — bank transfer + WhatsApp fully active hain

---

## Quick Reference — Admin URLs

| Page | URL |
|------|-----|
| Payment Settings | `/admin/payment-settings` |
| Orders | `/admin/orders` |
| Price Requests | `/admin/price-requests` |
| Notifications | `/admin/notifications` |
| Activity Log | `/admin/activity` |

## Quick Reference — Customer URLs

| Page | URL |
|------|-----|
| Cart | `/cart` |
| Checkout | `/checkout` |
| Track Booking | `/track?ref=BOOKING_ID` |
| Dashboard | `/dashboard` |

---

*Last updated: August 2026 — codebase: `src/firebase/payment.js`, `src/pages/admin/AdminPaymentSettings.jsx`, `src/pages/Checkout.jsx`, `src/pages/Cart.jsx`*
