# HabitForge — Full-Stack Gamified Habit Tracker & Premium Platform

HabitForge is a full-stack gamified habit tracking web application built with **React 19**, **Vite**, **Express**, **Node.js**, and **MongoDB Atlas**. It enables users to forge consistency through daily/weekly habit check-ins, level progression, achievements, social leaderboards, activity heatmaps, a Razorpay-powered Premium subscription system, and an integrated Admin Management & Moderation Panel.

---

## 1. Project Overview

HabitForge turns daily discipline into an engaging, gamified journey. Users create custom habits, complete daily or weekly check-ins, earn XP, level up, unlock achievement badges, add friends, compare weekly progress on leaderboards, and visualize long-term consistency through interactive GitHub-style heatmaps. Administrators can monitor system-wide metrics and manage user statuses safely without data loss.

---

## 2. Features

- 🔐 **Dual Authentication & Role Controls**: Local email/password registration, native Google OAuth 2.0 flow, and persistent database role-based access (`user` / `admin`).
- 🛡️ **Admin Panel & Moderation System**:
  - Master Admin security safeguards (`sahiljadhav7414@gmail.com`).
  - System-wide overview metrics (Users, Active/Blocked counts, Premium subscribers, Total completions).
  - Reversible user blocking/unblocking without deleting MongoDB documents, XP, or habits.
  - Granular user data inspector modal.
  - Symmetrically aligned action controls and master admin protection.
- 🎯 **Gamification Engine**:
  - Earn +10 XP per habit completion, stored with an audit trail in `XPTransaction`.
  - "Today's XP" card on Dashboard calculated from current day transactions.
  - Quadratic leveling curve ($$\text{Level} = \lfloor \sqrt{\text{XP} / 100} \rfloor + 1$$).
  - Dynamic streak tracking, active streak checks, and unlockable achievement badges.
- 📅 **Habit Management**: Create, edit, archive, pause, or delete Daily and Weekly habits with color themes, custom emojis (`EmojiSelector.jsx`), and categories.
- ⚡ **Smart Streak Engine**: Consecutive period detection, Monday–Sunday calendar week alignment for weekly habits, and duplicate check-in prevention.
- 📊 **Analytics & Heatmaps**: Interactive completion charts (7d, 30d, 1m from 1st of month, 90d, 1y) with habit breakdown synchronization and Sunday–Saturday calendar heatmaps.
- 👥 **Social Accountability & Leaderboards**: Search users, send/accept friend requests, view friend lists, and compete on weekly Global and Friends leaderboards. Blocked accounts are securely excluded from rankings and displayed with `"This account is blocked by admin"` in social views.
- 🎨 **Adaptive High-Contrast Themes**: Curated Dark and High-Contrast Light mode with rich surfaces, borders, and theme selector indicators.
- 💎 **Premium Membership**: One-time payment (₹99 for 30 days) unlocking unlimited habits, 365-day heatmaps, and CSV export.
- 💳 **Razorpay Checkout**: Server-side order creation, HMAC SHA256 signature verification, idempotency checks, and PDF receipt downloads.
- ✉️ **Brevo Email Service**: Transactional emails with attached PDF receipts via official `@getbrevo/brevo` API SDK or SMTP fallback.

---

## 3. Technology Stack

- **Frontend**: React 19, Vite, TailwindCSS v4, Lucide Icons, Framer Motion, Recharts, Axios, date-fns.
- **Backend**: Node.js, Express.js, Mongoose ODM, JSON Web Tokens (JWT), bcryptjs, Razorpay SDK, PDFKit, `@getbrevo/brevo` SDK, Nodemailer.
- **Database**: MongoDB Atlas (Persistent cloud database).
- **Testing**: Node.js native test runner (`node --test`).
- **Deployment**: Vercel (Frontend), Render (Backend API), MongoDB Atlas (Database).

---

## 4. Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│      (Vite + TailwindCSS + Framer Motion + Recharts)   │
└───────────┬────────────────────────────────┬───────────┘
            │ HTTP / REST                    │ Razorpay Checkout SDK
            ▼                                ▼
┌───────────────────────────────┐   ┌────────────────────────────┐
│       Express Node.js API     │   │      Razorpay Gateway      │
│  (Controllers, Auth, Admin)   │   └────────────────────────────┘
└───────────┬───────────────────┘
            │ Mongoose ODM
            ▼
┌───────────────────────────────┐
│     MongoDB Atlas Database    │
│  (Users, Habits, Logs, XP)    │
└───────────────────────────────┘
```

The application uses a decoupled monorepo architecture. All business logic, streak calculations, badge evaluations, admin permissions, and payment validations are strictly encapsulated in backend controllers and dedicated utilities (`backend/utils/gamification.js`, `backend/utils/dateUtils.js`, `backend/utils/subscriptionUtils.js`).

---

## 5. Project Structure

```text
HabitForge/
├── backend/
│   ├── config/             # Database (db.js) & in-memory fallback stores
│   ├── controllers/        # Request handlers (admin, analytics, auth, habits, payments, social, users)
│   ├── emails/             # HTML email templates (confirmation, expiration, cancellation)
│   ├── middleware/         # Auth (JWT), Admin (requireAdmin), & Premium guards
│   ├── models/             # Mongoose schemas (User, Habit, HabitLog, Payment, FriendRequest, XPTransaction, Notification)
│   ├── routes/             # API route definitions (admin, analytics, auth, habits, payments, social, users)
│   ├── scripts/            # Diagnostic & manual migration scripts
│   ├── seed/               # Database seeding scripts
│   ├── services/           # Brevo email service, PDFKit generator, receipt builder
│   ├── tests/              # Node test suites (gamification, admin_auth, user_blocking)
│   ├── utils/              # Gamification engine, date utilities, subscription logic
│   └── server.js           # Express app initialization & server entrypoint
├── src/
│   ├── components/         # AppLayout, Sidebar, EmojiSelector, Modals, SkeletonLoaders, Toast notifications
│   ├── constants/          # Centralized badge definitions (badges.js)
│   ├── context/            # AuthContext (global state, user, habits, check-in, checkout)
│   ├── pages/              # Admin, Dashboard, Habits, Analytics, Social, Leaderboard, Achievements, Premium, Settings
│   └── services/           # Axios HTTP client & endpoint service definitions (api.js)
├── .env.example            # Root frontend environment template
├── backend/.env.example    # Backend environment template
└── package.json            # Scripts & monorepo dependencies
```

---

## 6. Admin Panel & Moderation Architecture

### Master Administrator
- **Admin Account**: `sahiljadhav7414@gmail.com`
- **Database Role**: `role: "admin"` stored persistently in MongoDB.
- **Protection Rules**: The Master Administrator account can **never** be blocked or demoted, enforced server-side with `403 Forbidden`.

### Account Status & Non-Destructive Blocking
- **Status Field**: `User.status` (`"active"` | `"blocked"`, default: `"active"`).
- **Non-Destructive Guarantee**: Blocking a user does **not** delete their MongoDB document, habits, XP history, badges, or friendship links.
- **Access Enforcement**:
  - Blocked users attempting login receive `403 Forbidden` with `"Your account has been blocked by an administrator."`.
  - Active JWT tokens of blocked users are immediately rejected by `protect` middleware.
  - Blocked users are removed from Global & Friends Leaderboards.
  - Social search and friends list display `"This account is blocked by admin"` with safe placeholders.
- **Unblocking**: Admins can restore accounts to `"active"` at any time with all progress completely intact.

---

## 7. Authentication & Security

- **Local Authentication**: Password registration & login with `bcryptjs` hashing (10 salt rounds). Issues 30-day JWT tokens stored in `localStorage`.
- **Google OAuth 2.0**: Redirect flow (`GET /api/auth/google` -> Google Consent -> `GET /api/auth/google/callback`). Automatically links matching Google email accounts.
- **Password Masking**: `select: false` on `password` field in `User.js` prevents accidental leakage in API queries.

---

## 8. Habit Management & Streak Algorithm

- **Habit Attributes**: `title`, `description`, `category`, `frequency` (`DAILY` or `WEEKLY`), `icon` (emoji), `color` (hex), `isActive`, `isPaused`, `isArchived`.
- **Free vs. Premium Limits**: Free users can maintain up to 5 active habits; Premium users enjoy unlimited active habits.
- **Streak Calculation** (`backend/utils/gamification.js`):
  - **Duplicate Check-in Guard**: Unique compound index `{ habitId: 1, completionDate: 1 }` prevents double check-ins.
  - **DAILY Habits**: Compares calendar day difference (`getDayDifference(todayStr, lastDate)`). If `diff === 1`, streak increments; if `diff > 1`, streak resets to 1.
  - **WEEKLY Habits**: Evaluates Monday–Sunday calendar week difference (`getWeekDifference(todayStr, lastDate)`).
  - **Dynamic Active Streak**: `getActiveStreak(habit, todayStr)` ensures stale streaks do not display when days are missed.

---

## 9. XP, Leveling & Achievements

- **XP Reward**: +10 XP awarded per completed habit check-in, logged in `XPTransaction`.
- **Today's XP**: Live calculation of total XP earned on the current calendar day.
- **Level Formula**:
  $$\text{Level} = \lfloor \sqrt{\frac{\text{XP}}{100}} \rfloor + 1$$
- **Badges**: Automated milestone and streak evaluations (`first_step`, `consistency_starter`, `consistency_king`, `habit_master`, `xp_hunter`, `century_club`).

---

## 10. Analytics & Social Accountability

- **Analytics**:
  - Completion trend charts (7d, 30d, 1m from month start, 90d, 1y).
  - Synchronized Habit Breakdown distribution.
  - Sunday–Saturday calendar activity heatmaps (90 days Free, 365 days Premium).
  - CSV Data Export for Premium subscribers.
- **Social**:
  - Search users by username or email.
  - Send, accept, decline, or cancel friend requests.
  - Weekly XP Leaderboards (Global and Friends-only) resetting every Monday at 00:00 UTC.

---

## 11. Premium Membership & Payments

- **Pricing Model**: One-time payment of **₹99** for **30 Days** PRO access (no auto-debit).
- **Renewal Extension**: Consecutive purchases extend `premiumExpiresAt` by 30 additional days.
- **Razorpay Verification**: HMAC SHA256 signature validation on server before granting access.
- **PDF Invoices**: Automatically generated PDF payment receipts sent via Brevo email and available for in-app download.

---

## 12. Local Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas cluster or local MongoDB instance

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Sahil7414/HabitForge.git
   cd HabitForge
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Configure Environment Variables**:
   Create `.env` in the root folder and `backend/.env` in the backend folder using the templates below.

4. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5001`

5. **Run Backend Test Suites**:
   ```bash
   node backend/tests/user_blocking.test.js
   node backend/tests/admin_auth.test.js
   node backend/tests/gamification.test.js
   ```

---

## 13. Environment Variables Guide

### Root Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5001/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Backend (`backend/.env`)
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/habitforge
JWT_SECRET=your_jwt_secret_min_32_chars

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
FRONTEND_URL=http://localhost:5173

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PREMIUM_PRICE_INR=99

# Brevo Email
EMAIL_PROVIDER=brevo
EMAIL_TRANSPORT=api
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_NAME=HabitForge
BREVO_SENDER_EMAIL=noreply@example.com

# Seeding
AUTO_SEED_DEMO=false
```

---

## 14. License

This project is licensed under the MIT License.
