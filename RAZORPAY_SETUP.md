# HabitForge — Razorpay Test & Production Integration Guide

This guide outlines the complete setup, configuration, and operation of the Razorpay payment integration in HabitForge.

---

## Payment Architecture Overview

- **Pricing Model**: One-time payment of ₹99 for 30 days of HabitForge Premium access.
- **No Recurring Subscription**: Does not use Razorpay Subscriptions. Uses **Razorpay Orders API + Standard Checkout**.
- **Server-Side Price Control**: The backend reads `PREMIUM_PRICE_INR` from environment variables (default: 99). The frontend cannot manipulate the price.
- **Server-Side Verification**: Verification uses HMAC SHA256 signature calculation using `RAZORPAY_KEY_SECRET`.
- **Payment Idempotency**: Payment ID deduplication prevents double-crediting or duplicate notification/email sending.
- **Subscription Extension**: Purchasing while an active subscription exists extends the remaining duration by 30 days.

---

## 1. Environment Variables Setup

Configure the following environment variables in `backend/.env` (and root `.env`):

```env
# Backend Environment (.env or backend/.env)
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
PREMIUM_PRICE_INR=99

# Frontend Environment (.env)
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
```

> [!IMPORTANT]
> `RAZORPAY_KEY_SECRET` must **only** exist on the backend and must **never** be committed to Git or exposed in browser JavaScript or public API responses.

---

## 2. Razorpay Dashboard & Test Mode

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Toggle the mode switch at the top right to **Test Mode**.
3. Go to **Settings -> API Keys**.
4. Click **Generate Test Key**.
5. Copy `Key ID` into `RAZORPAY_KEY_ID` and `VITE_RAZORPAY_KEY_ID`.
6. Copy `Key Secret` into `RAZORPAY_KEY_SECRET`.

---

## 3. End-to-End Payment Flow

1. **User Action**: Click **"Get Premium"** on the `/premium` page.
2. **Order Creation**:
   - `POST /api/payments/create-order`
   - Backend calculates price in paise (`99 * 100 = 9900 paise`).
   - Razorpay Order is created via SDK.
   - Initial payment record stored in MongoDB with status `created`.
3. **Checkout UI**:
   - Frontend loads Razorpay Checkout modal dynamically (`https://checkout.razorpay.com/v1/checkout.js`).
   - Standard Razorpay Checkout UI opens presenting ₹99 payment options (Test Cards, UPI, Netbanking).
4. **Signature Verification**:
   - User completes payment in Test Mode.
   - `POST /api/payments/verify`
   - Backend verifies signature: `HMAC_SHA256(order_id + "|" + payment_id, secret)`.
   - On verification:
     - Payment status set to `paid`.
     - User `isPremium` set to `true`.
     - `premiumExpiresAt` set to 30 days from current expiry (or now).
     - In-app notification created.
     - Confirmation email + PDF receipt sent asynchronously.
     - Frontend UI updates instantly without browser reload.

---

## 4. Testing Instructions (Razorpay Test Mode)

To perform test transactions:

- **Netbanking**: Select any test bank (e.g. SBI, HDFC) and click **Success**.
- **UPI**: Enter any mock VPA (e.g., `success@razorpay`) and click **Pay**.
- **Card**: Use Razorpay Test Card numbers (e.g., `4111 1111 1111 1111`, expiry any future date, CVV 123).

---

## 5. Webhook Configuration (Production Ready)

To configure Razorpay Webhooks for async production reconciliation:

1. Go to **Razorpay Dashboard -> Settings -> Webhooks**.
2. Click **Add New Webhook**.
3. Webhook URL: `https://your-domain.com/api/payments/webhook`
4. Secret: Set a secure random string and add `RAZORPAY_WEBHOOK_SECRET=your_secret` to `backend/.env`.
5. Active Events: Select `payment.captured`.

---

## 6. Troubleshooting & Gotchas

- **Order creation fallback**: If backend test keys are mock strings (`rzp_test_...`), order creation gracefully falls back to mock order objects so UI flow can be fully validated during local testing.
- **Idempotency**: Submitting the same payment verification payload twice will return the existing successful payment response without adding double 30-day periods.
- **CORS**: Ensure `CLIENT_URL` in `backend/.env` matches your frontend port (default: `http://localhost:5173`).
