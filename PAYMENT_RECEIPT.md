# HabitForge — PDF Payment Receipt & Email System Documentation

This document describes the PDF receipt generation, Resend email dispatching, receipt download endpoints, and email failure resilience in HabitForge.

---

## 1. System Architecture & Component Overview

- **PDF Generation**: Powered by `pdfkit` in `backend/services/receiptService.js`. Generates A4 PDF binary streams containing receipt number, customer details, transaction metadata, itemized breakdown, and branding.
- **Email Service**: Powered by Resend API SDK (`resend`) in `backend/services/emailService.js`. Sends HTML emails with attached PDF receipts.
- **Templates**: Modular HTML templates stored in `backend/emails/`:
  - `premiumActivated.js` (Welcome & Activation)
  - `paymentReceipt.js` (Attached PDF Receipt notice)
  - `paymentFailed.js` (Payment attempt failure notice)
  - `premiumExpired.js` (Subscription expiration notice)
  - `cancellationRequest.js` (Support & Refund request notice)

---

## 2. API Endpoints

### 1. Payment Verification & Receipt Trigger
- **`POST /api/payments/verify`**
- Signature verification -> Calculates Expiry -> Assigns `HF-2026-XXXXXX` -> Activates Premium -> Generates PDF -> Dispatches Resend email.

### 2. Download PDF Receipt
- **`GET /api/payments/:paymentId/receipt`**
- **Authentication**: Required (`Bearer JWT`).
- **Authorization**: Enforces data isolation (user can only download receipts belonging to their own account).
- **Response**: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=HabitForge-Payment-Receipt-HF-2026-XXXXXX.pdf`.

### 3. Resend Receipt Email
- **`POST /api/payments/:paymentId/resend-receipt`**
- **Authentication**: Required.
- **Behavior**: Reuses existing receipt number, generates PDF receipt, and emails it to the user's registered email via Resend. Updates `receiptEmailSentAt` and `receiptEmailStatus = 'sent'`.

### 4. Support & Refund Inquiry
- **`POST /api/payments/support-request`**
- **Payload**: `{ paymentId, reason }`
- **Behavior**: Generates support inquiry ticket and sends confirmation email.

---

## 3. Resend Provider Configuration

Configure the following environment variables in `backend/.env`:

```env
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=onboarding@resend.dev
```

> [!NOTE]
> `onboarding@resend.dev` is Resend's default test sender address. For custom domains in production, verify your domain in Resend Dashboard and set `EMAIL_FROM="HabitForge <noreply@yourdomain.com>"`.

---

## 4. Non-Blocking Email Resilience

If Resend API delivery fails or email credentials are misconfigured:
- Premium activation remains **100% active**.
- Payment record status remains **`paid`**.
- Payment `receiptEmailStatus` is marked as `'failed'`.
- The user can download the PDF receipt directly or click **"Email Receipt"** anytime from **Settings -> Billing History**.
