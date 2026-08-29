# HABITFORGE — PROJECT DIRECTORY STRUCTURE & COMPONENT GUIDE

This document provides a comprehensive overview of the **HabitForge** codebase architecture, directory tree, and module responsibilities across both the frontend React app and backend Express REST API.

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
├── 📄 README.md                            # Main project overview & setup instructions
├── 📄 habitforge-playground.mongodb.js     # MongoDB shell playground testing script
├── 📄 index.html                           # Main HTML entrypoint for React application
├── 📄 package.json                         # Monorepo dependencies & concurrently script runners
├── 📄 vite.config.js                       # Vite dev server proxy & build configuration
│
├── 📁 src/                                 # FRONTEND (React 19 + Vite + TailwindCSS)
│   ├── 📄 App.css                          # Global component animations & keyframes
│   ├── 📄 App.jsx                          # Main Router & App component layout
│   ├── 📄 index.css                        # Design system tokens & Tailwind imports
│   ├── 📄 main.jsx                         # React DOM root entrypoint
│   │
│   ├── 📁 assets/                          # Static image & logo assets
│   │
│   ├── 📁 components/                      # Reusable UI Components
│   │   ├── 📄 AppLayout.jsx                # Main application wrapper (Sidebar + Header + Content)
│   │   ├── 📄 HabitStatsModal.jsx          # Modal for inspecting detailed habit metrics & streaks
│   │   ├── 📄 LevelUpModal.jsx             # Gamification modal shown when user levels up
│   │   ├── 📄 Notification.jsx             # Floating toast notification component
│   │   ├── 📄 Sidebar.jsx                  # Primary navigation sidebar component
│   │   ├── 📄 SkeletonLoaders.jsx          # Loading state shimmer placeholders
│   │   └── 📄 UpgradeModal.jsx             # Modal prompting free users to upgrade to Premium
│   │
│   ├── 📁 context/                         # State Management
│   │   └── 📄 AuthContext.jsx              # Global authentication, habit, streak & sync state
│   │
│   ├── 📁 pages/                           # Application Pages / Views
│   │   ├── 📄 Achievements.jsx             # Badges & gamification achievements grid page
│   │   ├── 📄 Analytics.jsx                # Completion history, streaks & 365-day heatmaps page
│   │   ├── 📄 AuthCallback.jsx             # Google OAuth callback handler page
│   │   ├── 📄 Dashboard.jsx                # Core user overview dashboard
│   │   ├── 📄 Habits.jsx                   # Habit creation, management & tracking page
│   │   ├── 📄 Landing.jsx                  # Public marketing & feature landing page
│   │   ├── 📄 Leaderboard.jsx              # XP leaderboard & social rankings page
│   │   ├── 📄 Login.jsx                    # User login form page
│   │   ├── 📄 Premium.jsx                  # Subscription tiers, checkout & membership management
│   │   ├── 📄 Profile.jsx                  # User profile, level stats & badge showcase page
│   │   ├── 📄 Register.jsx                 # User registration form page
│   │   ├── 📄 Settings.jsx                 # Account preferences & notification toggles
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
    │   ├── 📄 analyticsController.js       # Heatmaps, 30d completions & export CSV logic
    │   ├── 📄 authController.js            # Register, login & Google OAuth authentication
    │   ├── 📄 habitController.js           # CRUD habits & daily check-in verification
    │   ├── 📄 notificationController.js    # Notification fetching & read-state updates
    │   ├── 📄 paymentController.js         # Razorpay order creation, signature verification & receipts
    │   ├── 📄 socialController.js          # Friend requests, user search & leaderboard
    │   └── 📄 userController.js            # Dashboard summary payload & profile updates
    │
    ├── 📁 middleware/                      # Express Custom Middleware
    │   ├── 📄 authMiddleware.js            # JWT verification & `req.user` authorization
    │   ├── 📄 errorMiddleware.js           # Global Express error handling middleware
    │   └── 📄 premiumMiddleware.js         # Premium feature access restriction guard
    │
    ├── 📁 models/                          # Mongoose Database Schemas
    │   ├── 📄 FriendRequest.js             # Schema for social friend requests & status
    │   ├── 📄 Habit.js                     # Schema for user habit definitions & streaks
    │   ├── 📄 HabitLog.js                  # Schema for daily habit completion logs
    │   ├── 📄 Notification.js              # Schema for system & friend notifications
    │   ├── 📄 Payment.js                   # Schema for Razorpay payment transactions & receipts
    │   ├── 📄 User.js                      # Schema for user account, auth, XP & subscription
    │   └── 📄 XPTransaction.js             # Schema for gamification XP transaction audit log
    │
    ├── 📁 routes/                          # API Route Definitions
    │   ├── 📄 analyticsRoutes.js           # Analytics endpoints (`/api/analytics`)
    │   ├── 📄 authRoutes.js                # Auth & OAuth endpoints (`/api/auth`)
    │   ├── 📄 emailRoutes.js               # Email test endpoints (`/api/email`)
    │   ├── 📄 habitRoutes.js               # Habit endpoints (`/api/habits`)
    │   ├── 📄 notificationRoutes.js        # Notification endpoints (`/api/notifications`)
    │   ├── 📄 paymentRoutes.js             # Payment endpoints (`/api/payments`)
    │   ├── 📄 socialRoutes.js              # Social endpoints (`/api/social`)
    │   └── 📄 userRoutes.js                # User endpoints (`/api/users`)
    │
    ├── 📁 seed/                            # Database Seeding
    │   ├── 📄 fix_habits.js                # Utility to patch missing habit fields
    │   └── 📄 seedDemoData.js              # Standalone demo data generator script (`npm run seed`)
    │
    ├── 📁 services/                        # External Service Integrations
    │   ├── 📄 emailService.js              # Brevo API / SMTP email dispatch service
    │   ├── 📄 pdfService.js                # PDFKit document generator utility
    │   └── 📄 receiptService.js            # Payment receipt PDF creation service
    │
    └── 📁 utils/                           # Business Logic & Gamification Utilities
        ├── 📄 dateUtils.js                 # YYYY-MM-DD date normalization utilities
        ├── 📄 gamification.js              # XP calculations, levels & badge evaluation rules
        └── 📄 subscriptionUtils.js         # Subscription status verification & expiration checks
```

---

## 2. Key Component Responsibilities

### Frontend (`/src`)
* **State Management ([AuthContext.jsx](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/src/context/AuthContext.jsx)):** Manages JWT session state, user details, habit tracking, completions, and server synchronization via `usersAPI.getDashboardSummary()`.
* **API Integration ([api.js](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/src/services/api.js)):** Centralized Axios client that attaches Bearer tokens automatically and provides modular API hooks for auth, habits, analytics, social, notifications, and payments.
* **Layout & UI Components:** `AppLayout` provides the side navigation and top bar wrapper, `HabitStatsModal` shows granular habit statistics, `LevelUpModal` renders leveling celebrations, and `UpgradeModal` handles conversion prompts.

### Backend (`/backend`)
* **Server Entry ([server.js](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/backend/server.js)):** Initializes Express app, connects to MongoDB Atlas via `connectDB()`, registers CORS and API routes, and configures background tasks.
* **Database Models (`/models`):** Mongoose schemas managing Users, Habits, HabitLogs (with compound unique indexes preventing duplicate check-ins), FriendRequests, Notifications, Payments, and XP Audit Transactions.
* **Payment & Subscriptions ([paymentController.js](file:///c:/Users/Sahil/OneDrive/Desktop/HabitForge/backend/controllers/paymentController.js)):** Manages Razorpay HMAC SHA256 signature verification, idempotency checks, 30-day Premium activation, PDF receipt generation, and Brevo email dispatches.
* **Gamification & Utilities (`/utils`):** Enforces XP rewards, level calculations (`calculateLevel`), badge eligibility checks (`evaluateBadges`), and subscription status expiration runs (`runGlobalSubscriptionCheck`).
