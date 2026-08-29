# HabitForge — Brevo Email Service Integration Setup

This guide details setting up **Brevo (formerly Sendinblue)** for transactional payment receipts with attached PDFs, support requests, and subscription expiration alerts.

---

## 1. Setup Brevo Account & Credentials

1. **Create Account**: Sign up or log in at [brevo.com](https://www.brevo.com).
2. **Generate Brevo API Key**:
   - Go to **Account Profile -> SMTP & API -> API Keys**.
   - Click **Generate a new API key** (e.g. `xkeysib-...`).
3. **Generate Brevo SMTP Credentials**:
   - Go to **Account Profile -> SMTP & API -> SMTP**.
   - Note your SMTP Login / User (e.g., `7x8a9b@smtp-brevo.com`).
   - Generate an **SMTP Key** (Do NOT use your API key as the SMTP password).
4. **Verify Sender / Domain**:
   - Go to **Senders & IP -> Senders** and verify your sender email (e.g. `no-reply@yourdomain.com` or your Brevo registered login email).

---

## 2. Environment Variables Configuration (`backend/.env`)

Configure the credentials in `backend/.env` (NEVER in frontend `.env` files):

```env
# Brevo Email Provider Configuration
EMAIL_PROVIDER=brevo
EMAIL_TRANSPORT=api

# Brevo API Transport Credentials (Official SDK @getbrevo/brevo)
BREVO_API_KEY=xkeysib-YOUR_ACTUAL_BREVO_API_KEY_HERE
BREVO_SENDER_NAME=HabitForge
BREVO_SENDER_EMAIL=your_verified_sender@domain.com

# Brevo SMTP Transport Credentials (Alternative)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_SECURE=false
BREVO_SMTP_USER=your_brevo_smtp_login
BREVO_SMTP_KEY=your_actual_brevo_smtp_key
```

> [!IMPORTANT]
> `BREVO_API_KEY` is for the API transport (`EMAIL_TRANSPORT=api`). `BREVO_SMTP_KEY` is for the SMTP transport (`EMAIL_TRANSPORT=smtp`). Never use the API key as the SMTP password.

---

## 3. Environment Variables Template (`backend/.env.example`)

Maintain placeholders only in `backend/.env.example`:

```env
EMAIL_PROVIDER=brevo
EMAIL_TRANSPORT=api

BREVO_API_KEY=
BREVO_SENDER_NAME=HabitForge
BREVO_SENDER_EMAIL=

BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_SECURE=false
BREVO_SMTP_USER=
BREVO_SMTP_KEY=
```

---

## 4. Single Transport Architecture & Workflows

Set `EMAIL_TRANSPORT=api` (or `EMAIL_TRANSPORT=smtp`). The system executes **exactly one** transport per email event:

1. **Payment Activation & Receipt**:
   - Signature verified -> 30-day Premium activated -> In-Memory PDF generated (`pdfkit`) -> Brevo emails user with PDF attachment (`HabitForge-Payment-Receipt-<receiptNumber>.pdf`).
2. **Resend Receipt**:
   - Authenticated user calls `POST /api/payments/:paymentId/resend-receipt` -> Re-dispatches PDF receipt via Brevo.
3. **Email Status Health Check**:
   - `GET /api/email/status` returns `{ provider: 'brevo', transport: 'api', configured: true, senderConfigured: true }` without revealing secrets.
4. **Test Email**:
   - Authenticated user calls `POST /api/email/test` -> Dispatches test email via Brevo.

---

## 5. Non-Blocking Email Resilience

If Brevo API or SMTP delivery fails:
- Payment status remains **`paid`**.
- Premium membership remains **100% ACTIVE**.
- Payment `receiptEmailStatus` is marked as `'failed'`.
- The user can download the PDF receipt directly or click **"Email Receipt"** anytime from **Settings -> Billing History**.
