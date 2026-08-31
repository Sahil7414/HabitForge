# HABITFORGE — PROJECT DIRECTORY STRUCTURE & COMPONENT GUIDE

This document provides a comprehensive overview of the **HabitForge** codebase architecture, directory tree, and module responsibilities across both the frontend React application and backend Express REST API.

---

## 1. Complete Repository Directory Tree

```text
HabitForge/
├── 📄 .env                                 # Root environment configuration (Vite frontend)
├── 📄 .env.example                         # Example root environment variable template
├── 📄 .gitignore                            # Root Git ignore rules (logs, node_modules, .env, secrets)
├── 📄 .oxlintrc.json                       # Oxlint linter configuration
├── 📄 EMAIL_SETUP.md                       # Brevo email configuration guide
├── 📄 GOOGLE_OAUTH_SETUP.md                # Google OAuth setup guide
├── 📄 PAYMENT_RECEIPT.md                   # Payment receipt generation & PDF documentation
├── 📄 RAZORPAY_SETUP.md                    # Razorpay payment gateway integration guide
├── 📄 README.md                            # Main project overview, features & setup guide
├── 📄 habitforge-playground.mongodb.js     # MongoDB shell playground testing script
├── 📄 index.html                           # Main HTML entrypoint for React application
├── 📄 package.json                         # Monorepo dependencies & script runners
├── 📄 vite.config.js                       # Vite dev server proxy & build configuration
│
├── 📁 src/                                 # FRONTEND (React 19 + Vite + TailwindCSS)
│   ├── 📄 App.css                          # Global component animations & keyframes
│   ├── 📄 App.jsx                          # Main Router & App component layout
│   ├── 📄 index.css                        # High-contrast light & dark theme design system
│   ├── 📄 main.jsx                         # React DOM root entrypoint
│   │
│   ├── 📁 assets/                          # Static image & logo assets
│   │
│   ├── 📁 components/                      # Reusable UI Components
│   │   ├── 📄 AppLayout.jsx                # Main application wrapper (Sidebar + Header + Content)
│   │   ├── 📄 EmojiSelector.jsx            # Custom emoji picker for habit icons
│   │   ├── 📄 HabitStatsModal.jsx          # Modal for inspecting detailed habit metrics & streaks
│   │   ├── 📄 LevelUpModal.jsx             # Gamification modal shown when user levels up
│   │   ├── 📄 Notification.jsx             # Floating toast notification component
│   │   ├── 📄 Sidebar.jsx                  # Primary navigation sidebar component (scroll-suppressed)
│   │   ├── 📄 SkeletonLoaders.jsx          # Loading state shimmer placeholders
│   │   └── 📄 UpgradeModal.jsx             # Modal prompting free users to upgrade to Premium
│   │
│   ├── 📁 constants/                       # Centralized Constants
│   │   └── 📄 badges.js                    # Achievement badges definitions & criteria
│   │
│   ├── 📁 context/                         # State Management
│   │   └── 📄 AuthContext.jsx              # Global auth, user status, habits, streaks & XP state
│   │
│   ├── 📁 pages/                           # Application Pages / Views
│   │   ├── 📄 Achievements.jsx             # Badges & gamification achievements grid page
│   │   ├── 📄 Admin.jsx                    # Admin user directory, role controls & moderation panel
│   │   ├── 📄 Analytics.jsx                # Completion history, streaks & 365-day heatmaps page
│   │   ├── 📄 AuthCallback.jsx             # Google OAuth callback handler page
│   │   ├── 📄 Dashboard.jsx                # Core user overview dashboard with Today's XP
│   │   ├── 📄 Habits.jsx                   # Habit creation, management & tracking page
│   │   ├── 📄 Landing.jsx                  # Public marketing & feature landing page
│   │   ├── 📄 Leaderboard.jsx              # XP leaderboard & social rankings page
│   │   ├── 📄 Login.jsx                    # User login form page
│   │   ├── 📄 Premium.jsx                  # Subscription tiers, checkout & membership management
│   │   ├── 📄 Profile.jsx                  # User profile, level stats & badge showcase page
│   │   ├── 📄 Register.jsx                 # User registration form page
│   │   ├── 📄 Settings.jsx                 # Account preferences & theme selection
│   │   └── 📄 Social.jsx                   # Friends management & friend request tracking
│   │
│   └── 📁 services/                        # Frontend API Integration
│       └── 📄 api.js                       # Axios HTTP client & endpoint service definitions
│
└── 📁 backend/                             # BACKEND (Node.js + Express + Mongoose)
    ├── 📄 .env                             # Backend environment secrets (DB URI, keys, SMTP)
    ├── 📄 .env.example                     # Backend environment variable template
    ├── 📄 package.json                     # Backend Node.js dependencies & npm scripts
    ├── 📄 server.js                        # Express app initialization & server entrypoint
    │
    ├── 📁 config/                          # Server Configuration
    │   ├── 📄 db.js                        # Mongoose MongoDB connection initializer
    │   └── 📄 inMemoryStore.js             # Standalone fallback memory store
    │
    ├── 📁 controllers/                     # Route Request Handlers
    │   ├── 📄 adminController.js           # Admin overview metrics, user status & moderation
    │   ├── 📄 analyticsController.js       # Heatmaps, 30d/1m completions & export CSV logic
    │   ├── 📄 authController.js            # Register, login & Google OAuth authentication
    │   ├── 📄 habitController.js           # CRUD habits & daily check-in verification
    │   ├── 📄 notificationController.js    # Notification fetching & read-state updates
    │   ├── 📄 paymentController.js         # Razorpay order creation, signature verification & receipts
    │   ├── 📄 socialController.js          # Friend requests, user search & leaderboards
    │   └── 📄 userController.js            # Dashboard summary payload & profile updates
    │
    ├── 📁 middleware/                      # Express Custom Middleware
    │   ├── 📄 authMiddleware.js            # JWT verification & `requireAdmin` role authorization
    │   ├── 📄 errorMiddleware.js           # Global Express error handling middleware
    │   └── 📄 premiumMiddleware.js         # Premium feature access restriction guard
    │
    ├── 📁 models/                          # Mongoose Database Schemas
    │   ├── 📄 FriendRequest.js             # Schema for social friend requests & status
    │   ├── 📄 Habit.js                     # Schema for user habit definitions & streaks
    │   ├── 📄 HabitLog.js                  # Schema for daily habit completion logs
    │   ├── 📄 Notification.js              # Schema for system & friend notifications
    │   ├── 📄 Payment.js                   # Schema for Razorpay payment transactions & receipts
    │   ├── 📄 User.js                      # Schema for user account, role (`user`/`admin`), status (`active`/`blocked`)
    │   └── 📄 XPTransaction.js             # Schema for gamification XP transaction audit log
    │
    ├── 📁 routes/                          # API Route Definitions
    │   ├── 📄 adminRoutes.js               # Admin endpoints (`/api/admin`)
    │   ├── 📄 analyticsRoutes.js           # Analytics endpoints (`/api/analytics`)
    │   ├── 📄 authRoutes.js                # Auth & OAuth endpoints (`/api/auth`)
    │   ├── 📄 emailRoutes.js               # Email test endpoints (`/api/email`)
    │   ├── 📄 habitRoutes.js               # Habit endpoints (`/api/habits`)
    │   ├── 📄 notificationRoutes.js        # Notification endpoints (`/api/notifications`)
    │   ├── 📄 paymentRoutes.js             # Payment endpoints (`/api/payments`)
    │   ├── 📄 socialRoutes.js              # Social endpoints (`/api/social`)
    │   └── 📄 userRoutes.js                # User endpoints (`/api/users`)
    │
    ├── 📁 scripts/                         # Diagnostic Scripts
    │   ├── 📄 diagnose_heatmap.js          # Heatmap diagnostic tool
    │   ├── 📄 reset_user_subscription.js   # Subscription reset script
    │   └── 📄 test_live_api.js             # Live API verification script
    │
    ├── 📁 seed/                            # Database Seeding
    │   ├── 📄 fix_habits.js                # Utility to patch missing habit fields
    │   └── 📄 seedDemoData.js              # Standalone demo data generator script
    │
    ├── 📁 services/                        # External Service Integrations
    │   ├── 📄 emailService.js              # Brevo API / SMTP email dispatch service
    │   ├── 📄 pdfService.js                # PDFKit document generator utility
    │   └── 📄 receiptService.js            # Payment receipt PDF creation service
    │
    ├── 📁 tests/                           # Node.js Test Suites
    │   ├── 📄 admin_auth.test.js           # Admin authentication & security tests
    │   ├── 📄 gamification.test.js         # Streak & level-up tests
    │   └── 📄 user_blocking.test.js        # User blocking / unblocking integration audit (38 tests)
    │
    └── 📁 utils/                           # Business Logic & Gamification Utilities
        ├── 📄 dateUtils.js                 # YYYY-MM-DD date normalization utilities
        ├── 📄 gamification.js              # XP calculations, levels & badge evaluation rules
        └── 📄 subscriptionUtils.js         # Subscription status verification & expiration checks
```

---

## 2. Key Component Responsibilities

### Frontend (`/src`)
* **State Management ([AuthContext.jsx](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/src/context/AuthContext.jsx)):** Manages JWT session state, user details, habit tracking, completions, today's XP, and server synchronization via `usersAPI.getDashboardSummary()`.
* **API Integration ([api.js](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/src/services/api.js)):** Centralized Axios client that attaches Bearer tokens automatically and provides modular API hooks for auth, admin, habits, analytics, social, notifications, and payments.
* **Admin Management ([Admin.jsx](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/src/pages/Admin.jsx)):** Admin overview KPI cards, searchable and filterable user directory, non-destructive user block/unblock controls, and deep-dive user inspection modal.
* **Layout & UI Components:** `AppLayout` provides the side navigation and top bar wrapper, `EmojiSelector` provides habit icon selection, `HabitStatsModal` shows granular habit statistics, `LevelUpModal` renders leveling celebrations, and `UpgradeModal` handles conversion prompts.

### Backend (`/backend`)
* **Server Entry ([server.js](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/backend/server.js)):** Initializes Express app, connects to MongoDB Atlas via `connectDB()`, registers CORS and API routes, and configures background tasks.
* **Admin Controller & Security ([adminController.js](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/backend/controllers/adminController.js), [authMiddleware.js](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/backend/middleware/authMiddleware.js)):** Enforces role-based permissions (`requireAdmin`), safeguards Master Administrator `sahiljadhav7414@gmail.com`, and provides non-destructive user moderation.
* **Database Models (`/models`):** Mongoose schemas managing Users (`role`, `status`), Habits, HabitLogs, FriendRequests, Notifications, Payments, and XP Audit Transactions.
* **Payment & Subscriptions ([paymentController.js](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/backend/controllers/paymentController.js)):** Manages Razorpay HMAC SHA256 signature verification, idempotency checks, 30-day Premium activation, PDF receipt generation, and Brevo email dispatches.
* **Gamification & Utilities (`/utils`):** Enforces XP rewards, today's XP tracking, level calculations (`calculateLevel`), badge eligibility checks (`evaluateBadges`), and subscription status expiration runs (`runGlobalSubscriptionCheck`).
