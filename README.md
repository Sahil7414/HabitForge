# HabitForge — Full-Stack Gamified Habit Tracker & Premium Platform

HabitForge is a full-stack gamified habit tracking web application built with **React 19**, **Vite**, **Express**, **Node.js**, and **MongoDB Atlas**. It enables users to forge consistency through daily/weekly habit check-ins, level progression, achievements, social leaderboards, activity heatmaps, and a Razorpay-powered Premium subscription system.

---

## 1. Project Overview

HabitForge turns daily discipline into an engaging, gamified journey. Users create custom habits, complete daily or weekly check-ins, earn XP, level up, unlock achievement badges, add friends, compare weekly progress on leaderboards, and visualize long-term consistency through interactive GitHub-style heatmaps.

---

## 2. Features

- 🔐 **Dual Authentication**: Local email/password registration & native Google OAuth 2.0 flow.
- 🎯 **Gamification Engine**: Earn +10 XP per completion, quadratic level progression (`Level = Math.floor(Math.sqrt(XP / 100)) + 1`), streak tracking, and unlockable achievement badges.
- 📅 **Habit Management**: Create, edit, archive, pause, or delete Daily and Weekly habits with color themes, icons, and categories.
- ⚡ **Smart Streak Engine**: Dynamic streak active checks, consecutive period detection, and duplicate check-in prevention.
- 📊 **Analytics & Heatmaps**: Interactive 7d/30d/90d/1y completion charts and Sunday–Saturday calendar week activity heatmaps (90 days for Free users, up to 365 days for Premium).
- 📥 **Data Export**: Premium users can export full completion logs to CSV.
- 👥 **Social & Leaderboards**: Search users, send/accept friend requests, view friend lists, and compete on a weekly XP leaderboard.
- 💎 **Premium Membership**: One-time payment (₹99 for 30 days) unlocking unlimited habits, 365-day heatmaps, and CSV export.
- 💳 **Razorpay Checkout**: Server-side order creation, HMAC SHA256 signature verification, idempotency checks, and PDF receipt downloads.
- ✉️ **Brevo Email Service**: Transactional email notifications via Brevo API / SMTP with attached PDF receipts.

---

## 3. Technology Stack

- **Frontend**: React 19, Vite, TailwindCSS, Lucide Icons, Framer Motion, Recharts, Axios, date-fns.
- **Backend**: Node.js, Express.js, Mongoose ODM, JSON Web Tokens (JWT), bcryptjs, Razorpay SDK, PDFKit, `@getbrevo/brevo` SDK, Nodemailer.
- **Database**: MongoDB Atlas (Persistent cloud database).
- **Deployment**: Vercel (Frontend), Render (Backend API), MongoDB Atlas (Database).

---

## 4. Architecture

```text
┌─────────────────────────┐               ┌───────────────────────────┐
│     React 19 Frontend    │  HTTP / REST  │     Express Node API      │
│   (Vite + TailwindCSS)  ├──────────────►│    (Controllers / Utils)  │
└────────────┬────────────┘               └─────────────┬─────────────┘
             │                                          │
             │ Razorpay Checkout SDK                    │ Mongoose ODM
             ▼                                          ▼
┌─────────────────────────┐               ┌───────────────────────────┐
│    Razorpay Gateway     │               │   MongoDB Atlas Database  │
└─────────────────────────┘               └───────────────────────────┘
```

The application uses a decoupled monorepo structure. All business logic, streak calculations, badge evaluations, and payment verifications are encapsulated cleanly in backend controllers and dedicated utility files (`backend/utils/gamification.js`, `backend/utils/dateUtils.js`, `backend/utils/subscriptionUtils.js`).

---

## 5. Project Structure

```text
HabitForge/
├── backend/
│   ├── config/             # Database & memory store initializers
│   ├── controllers/        # Request handlers (auth, habits, analytics, payments, social, users)
│   ├── emails/             # HTML email templates
│   ├── middleware/         # Auth (JWT) & Premium guards
│   ├── models/             # Mongoose schemas (User, Habit, HabitLog, Payment, etc.)
│   ├── routes/             # API endpoint definitions
│   ├── seed/               # Database seeding scripts (Alex Rivera demo dataset)
│   ├── services/           # Brevo email service, PDF kit generator, receipt builder
│   ├── tests/              # Node test runner unit tests (gamification & streaks)
│   ├── utils/              # Gamification engine, date utilities, subscription logic
│   └── server.js           # Express app & server entrypoint
├── src/
│   ├── components/         # AppLayout, Sidebar, Modals, Skeleton loaders, Toast notifications
│   ├── context/            # AuthContext (global state, user, habits, check-in, checkout)
│   ├── pages/              # Dashboard, Habits, Analytics, Social, Leaderboard, Premium, Settings
│   └── services/           # Axios HTTP client hooks (api.js)
├── .env.example            # Root frontend environment template
├── backend/.env.example    # Backend environment template
└── package.json            # Scripts & monorepo dependencies
```

---

## 6. Authentication

- **Local Authentication**: Users register with `name`, `email`, and `password`. Passwords are hashed with `bcryptjs` (salt rounds: 10). Authentication issues 30-day JWT tokens stored in `localStorage`.
- **Google OAuth 2.0**: Implemented via redirect flow (`GET /api/auth/google` -> Google Consent -> `GET /api/auth/google/callback`). Exposes state verification and exchanges authorization code for Google profile data. Existing accounts matching the Google email are automatically linked (`authProvider: 'google'`, `googleId`).

---

## 7. Habit Management

- **Habit Attributes**: `title`, `description`, `category` (Health, Fitness, Learning, Productivity, Mindfulness, Personal, Other), `frequency` (`DAILY` or `WEEKLY`), `icon` (emoji), `color` (hex value), `isActive`, `isPaused`, `isArchived`.
- **Free vs. Premium Limits**: Free users can maintain up to 5 active habits (`isArchived: false`). Premium users enjoy unlimited active habits.
- **Check-in Engine**: Checking in creates a `HabitLog` entry indexed uniquely by `{ habitId: 1, completionDate: 1 }` to guarantee database-level duplicate check-in prevention.

---

## 8. Streak Calculation Algorithm

The exact streak calculation algorithm is implemented in `backend/utils/gamification.js` (`calculateStreakUpdate`):

1. **Date Normalization**: Dates are normalized to `YYYY-MM-DD` strings using server system time (`getNormalizedToday()`).
2. **Duplicate Check-in Guard**:
   ```javascript
   if (lastDate && isSameCompletionPeriod(lastDate, todayStr, frequency)) {
     throw new Error('DUPLICATE_CHECKIN: Habit already completed for this period');
   }
   ```
   - For `DAILY` habits: `isSameCompletionPeriod` checks if `lastCompletedDate === todayStr`.
   - For `WEEKLY` habits: `isSameCompletionPeriod` checks if `lastCompletedDate` and `todayStr` fall within the same Monday–Sunday calendar week (`startOfWeek(date, { weekStartsOn: 1 })`).
3. **Streak Update Logic**:
   - **First Completion**: If `lastCompletedDate` is null, `currentStreak = 1`.
   - **DAILY Habits**:
     - Calculates calendar day difference (`getDayDifference(todayStr, lastDate)`).
     - If `diffDays === 1` (completed yesterday), `currentStreak += 1`.
     - If `diffDays > 1` (missed 1+ days), `currentStreak = 1`.
   - **WEEKLY Habits**:
     - Calculates calendar week difference (`getWeekDifference(todayStr, lastDate)`).
     - If `weekDiff === 1` (completed in the immediately preceding calendar week), `currentStreak += 1`.
     - If `weekDiff > 1` (missed 1+ calendar weeks), `currentStreak = 1`.
4. **Longest Streak**:
   `longestStreak = Math.max(currentStreak, previousLongestStreak)`

---

## 9. Timezone Handling

- **Current Implementation**: Date strings (`completionDate`, `lastCompletedDate`) are generated on the server using `date-fns` `format(new Date(), 'yyyy-MM-dd')` based on the server process local time.
- **User Timezone Field**: The `User` schema contains a `timezone` field (defaulting to `'UTC'`), editable in account Settings.
- **Limitation**: `getNormalizedToday()` uses server system time. If a user is in a different timezone than the server host (e.g. UTC+5:30 client vs. UTC server), check-ins near midnight (00:00) may register under the server's calendar date rather than the client's local date.

---

## 10. Missed-Day Behavior

- **Dynamic Active Streak Check**: Stored habit streaks in MongoDB represent historical streaks attained upon check-in. To prevent stale non-zero streaks from displaying when days are missed, `getActiveStreak(habit, todayStr)` evaluates active state dynamically on all read calls (`getHabits`, `getDashboardSummary`, `getUserProfile`):
  - For `DAILY` habits: If `getDayDifference(todayStr, lastCompletedDate) > 1`, active streak resolves to `0`.
  - For `WEEKLY` habits: If `getWeekDifference(todayStr, lastCompletedDate) > 1`, active streak resolves to `0`.
- **Upon Next Check-in**: When the user eventually completes the habit after missing days/weeks, `calculateStreakUpdate` resets `currentStreak` to `1` while preserving `longestStreak`.

---

## 11. XP and Leveling

- **XP Reward**: +10 XP awarded per completed habit check-in. Recorded in `XPTransaction` collection.
- **Level Formula**: Quadratic leveling curve:
  $$\text{Level} = \lfloor \sqrt{\frac{\text{XP}}{100}} \rfloor + 1$$
  - Level 1: 0 – 99 XP
  - Level 2: 100 – 399 XP
  - Level 3: 400 – 899 XP
  - Level 4: 900 – 1599 XP
  - Level 5: 1600 – 2499 XP
- **Level-Up Celebration**: When check-in increases `level`, server returns `leveledUp: true` and triggers `LevelUpModal.jsx` and in-app sound/toast notifications.

---

## 12. Badges

Six core badges are defined and evaluated automatically in `backend/utils/gamification.js` (`evaluateBadges`):

| Badge ID | Name | Category | Condition |
|---|---|---|---|
| `first_step` | First Step | Milestones | Complete 1 total habit |
| `consistency_starter` | Consistency Starter | Streaks | Achieve a 3-day streak |
| `consistency_king` | Consistency King | Streaks | Achieve a 7-day streak |
| `habit_master` | Habit Master | Milestones | Complete 30 total habit sessions |
| `xp_hunter` | XP Hunter | Milestones | Accumulate 500 total XP |
| `century_club` | Century Club | Milestones | Complete 100 total habit sessions |

Unlocked badges are saved in `User.badges` array.

---

## 13. Analytics

- **Completions Trend Chart**: 7d, 30d, 90d, or 1y aggregated completion counts rendered via Recharts `AreaChart`/`BarChart`.
- **Activity Heatmap**: Sunday–Saturday calendar week grid. Free users view up to 90 days; Premium users view up to 365 days.
- **CSV Data Export**: Premium endpoint (`GET /api/analytics/export`) exports completion logs as CSV file (`habitforge_user_export_YYYY-MM-DD.csv`).

---

## 14. Friends & Leaderboard

- **Friends System**: Search users by name/email, send friend requests, accept/reject requests, view active friends list, or remove friends (`FriendRequest` collection).
- **Weekly Leaderboard**: Ranks users based on XP earned during the current calendar week (`createdAt >= startOfWeek` in `XPTransaction`), with fallbacks for overall XP.

---

## 15. Premium Membership

- **Pricing Model**: One-time payment of **₹99** grants **30 Days** of PRO membership.
- **No Recurring Auto-Debit**: Access automatically expires after 30 days unless renewed.
- **Extension on Renewal**: Purchasing while active extends `premiumExpiresAt` by an additional 30 days (`calculateNewExpiryDate`).
- **Expiry Enforcement**: Expiration checks run hourly in the background (`runGlobalSubscriptionCheck`) and on login/profile requests. Reverts user to Free tier cleanly without data loss.
- **Cancellation**: Users can cancel membership in Settings (`POST /api/users/cancel-premium`), marking `isCancelled: true` and triggering confirmation email.

---

## 16. Razorpay Integration

- **Order Creation**: Client calls `POST /api/payments/create-order`. Server determines amount (`PREMIUM_PRICE_INR * 100`) and calls Razorpay API to generate order ID.
- **Payment Verification**: Client opens Razorpay Checkout. Upon completion, payload (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`) is sent to `POST /api/payments/verify`.
- **Signature Verification**: HMAC SHA256 signature generated on backend using `RAZORPAY_KEY_SECRET` and compared against received signature.
- **Idempotency**: Prevents double-processing if `razorpay_payment_id` has already been recorded as `paid`.
- **Receipt Generation**: Creates a PDF receipt via PDFKit (`pdfService.js` / `receiptService.js`) available for authenticated download or email dispatch.

---

## 17. Brevo Email & Receipts

- **Provider**: Official Brevo API SDK (`@getbrevo/brevo`) with fallback to Brevo SMTP (`smtp-relay.brevo.com`) or safe logging fallback if keys are omitted.
- **Purchase Email**: Dispatches HTML confirmation email (`sendPremiumConfirmationEmail`) with attached PDF payment receipt upon successful payment verification.
- **Expiration & Cancellation Emails**: Dispatches alerts when Premium expires or is cancelled.

---

## 18. MongoDB Persistence

- **Connection**: `connectDB()` connects to MongoDB Atlas using Mongoose ODM.
- **Collections**: `users`, `habits`, `habitlogs`, `friendrequests`, `notifications`, `payments`, `xptransactions`.
- **Data Isolation**: All habit and analytics queries strictly include `userId: req.user._id` to enforce user isolation.
- **Production Guard**: In production (`NODE_ENV === 'production'`), database connection failures cause process exit (`process.exit(1)`) to prevent accidental fallback to transient in-memory storage.

---

## 19. Demo Data

- **Demo User**: Alex Rivera (`alex@habitforge.com` / `password123`).
- **Seeding Safeguards**: `seedDemoData.js` populates demo habits and 90 days of history logs. Automatic seeding on server startup (`autoSeedIfEmpty()`) executes **ONLY** if `AUTO_SEED_DEMO=true` **AND** `User.countDocuments() === 0`, ensuring existing database records are never overwritten on production restarts.

---

## 20. Local Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB database (local instance or MongoDB Atlas cluster)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone <your-repository-url>
   cd HabitForge
   ```

2. **Install Monorepo Dependencies**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Configure Environment Variables**:
   Create `.env` in the root directory and `backend/.env` in the backend directory using placeholders as shown below.

4. **Run Development Servers**:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5001`

5. **Run Backend Unit Tests**:
   ```bash
   cd backend && node --test tests/gamification.test.js
   ```

---

## 21. Environment Variables Placeholder Guide

### Root Frontend Environment (`.env`)
```env
VITE_API_URL=http://localhost:5001/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id_placeholder
```

### Backend Environment (`backend/.env`)
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/habitforge
JWT_SECRET=your_jwt_secret_min_32_chars_placeholder

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_placeholder
GOOGLE_CLIENT_SECRET=your_google_client_secret_placeholder
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
FRONTEND_URL=http://localhost:5173

# Razorpay Integration
RAZORPAY_KEY_ID=your_razorpay_key_id_placeholder
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_placeholder
PREMIUM_PRICE_INR=99

# Brevo Email Service
EMAIL_PROVIDER=brevo
EMAIL_TRANSPORT=api
BREVO_API_KEY=your_brevo_api_key_placeholder
BREVO_SENDER_NAME=HabitForge
BREVO_SENDER_EMAIL=noreply@example.com

# Demo Auto-Seeding (Set false for production)
AUTO_SEED_DEMO=false
```

---

## 22. Production Deployment

### Frontend (Vercel)
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: `VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`

### Backend API (Render)
- **Environment**: Node
- **Build Command**: `cd backend && npm install`
- **Start Command**: `node backend/server.js`
- **Environment Variables**: Configure all backend `.env` variables in Render dashboard.

### Database (MongoDB Atlas)
- Ensure Network Access whitelist includes `0.0.0.0/0` (or Render outbound IPs) and database user credentials are set in `MONGODB_URI`.

---

## 23. Security Considerations

- **Secrets Protection**: All API keys, database connection strings, JWT secrets, and OAuth secrets are stored strictly in server environment variables and excluded via `.gitignore`.
- **Password Security**: Passwords stored using `bcryptjs` with salt rounds = 10. `select: false` on User schema prevents accidental password leakage in API responses.
- **Payment Security**: Razorpay HMAC SHA256 signatures are verified server-side before activating Premium. Product price is strictly enforced server-side (`PREMIUM_PRICE_INR`).
- **Data Isolation**: API controllers filter queries by `userId: req.user._id` to prevent cross-user data leakage.

