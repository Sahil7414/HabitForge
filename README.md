# HabitForge — Full-Stack Gamified Habit Tracker & Premium Platform

HabitForge is a full-stack gamified habit tracking application built with React, Vite, Express, Node.js, and MongoDB.

---

## Key Features

- 🔐 **Authentication**: Local email/password login & Google OAuth integration.
- 🎯 **Gamification**: XP points, levels, streak counters, and unlockable achievement badges.
- 📊 **Analytics & Heatmap**: 90-day and 365-day activity heatmaps, completion trends, and CSV data export.
- 💎 **Premium Membership System**: One-time payment of ₹99 for 30 days of PRO benefits.
- 💳 **Razorpay Integration**: Razorpay Orders API + Standard Checkout integration in Test Mode.
- ✉️ **Email & Receipts**: HTML email notifications with attached PDF receipts generated using `pdfkit`.
- ⚙️ **Settings & Billing**: Profile management, timezone reset, visual theme switching, and Billing History.
- 👥 **Social & Leaderboards**: Friend requests, social activity feeds, and global leaderboards.

---

## Premium Pricing & Expiration Model

- **Model**: ONE-TIME payment of ₹99 grants 30 DAYS of Premium access.
- **No Subscriptions**: No automatic recurring billing or auto-renewal.
- **Server Price Enforcement**: Price configured securely on backend via `PREMIUM_PRICE_INR=99`.
- **Extension on Re-purchase**: Purchasing while Premium is active extends remaining duration by 30 days.
- **Automatic Expiration**: When `premiumExpiresAt` passes, user automatically reverts to Free tier (5 habit limit, 90-day heatmap).

---

## Environment Setup

> [!CAUTION]
> **NEVER commit `.env` files, database URIs, or secret keys to GitHub or public version control.**

### Setup Steps

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd HabitForge
   ```

2. **Configure Frontend Environment**:
   Copy `.env.example` to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
   Add your public frontend settings:
   - `VITE_API_URL`
   - `VITE_RAZORPAY_KEY_ID`

3. **Configure Backend Environment**:
   Copy `backend/.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Add your server credentials and API keys:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
   - `BREVO_API_KEY` (or SMTP credentials)

4. **Required Third-Party Services**:
   - 🍃 **MongoDB Atlas**: Database cluster connection string.
   - 🔐 **Google OAuth**: Google Cloud Console OAuth 2.0 Client ID & Secret.
   - 💳 **Razorpay**: Razorpay API Key ID & Secret for payments.
   - ✉️ **Brevo**: Official Brevo API Key for sending purchase confirmation emails & PDF receipts.

---

## Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

2. **Start Dev Servers (Frontend + Backend concurrently)**:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5001`

---

## Documentation Links

- 💳 [RAZORPAY_SETUP.md](./RAZORPAY_SETUP.md) — Razorpay Test Mode configuration, Order creation, signature verification, and testing guide.
- ✉️ [EMAIL_SETUP.md](./EMAIL_SETUP.md) — Email provider configuration (Resend/SMTP), PDF receipt setup, and expiration alerts.
- 🔐 [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) — Google OAuth consent screen & callback setup.
