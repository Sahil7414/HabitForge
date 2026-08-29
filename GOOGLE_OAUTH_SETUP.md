# HabitForge — Real Google OAuth 2.0 Integration Setup Guide

This guide provides step-by-step instructions to configure Google OAuth 2.0 authentication for local development and production deployment in HabitForge.

---

## 1. Google Cloud Console Setup

### Step 1: Create or Select a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top bar and select **New Project**.
3. Name your project (e.g., `HabitForge Auth`) and click **Create**.

### Step 2: Configure the OAuth Consent Screen
1. In the left navigation menu, go to **APIs & Services > OAuth consent screen**.
2. Select **External** (available to any user with a Google account) and click **Create**.
3. Fill in the App Information:
   - **App name**: `HabitForge`
   - **User support email**: Select your email address
   - **Developer contact information**: Enter your email address
4. Click **Save and Continue**.
5. **Scopes**: Click **Add or Remove Scopes** and select:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Click **Save and Continue**.
7. **Test Users** (while in Testing status):
   - Add your Google email address under **Test Users** so you can log in during development.
8. Click **Save and Continue**.

### Step 3: Create OAuth 2.0 Web Client Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Select Application type: **Web application**.
4. Name: `HabitForge Web Client`.
5. **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:5001/api/auth/google/callback
   ```
7. Click **Create**.
8. A modal will pop up with your **Client ID** and **Client Secret** (or click **Download JSON**).

---

## 2. Backend Environment Configuration

Open `backend/.env` (or create it if missing) and paste your Google credentials:

```env
PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/habitforge?retryWrites=true&w=majority
JWT_SECRET=habitforge_super_secret_jwt_key_2026
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Real Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
```

> [!CAUTION]
> Never commit `backend/.env` or your actual `client_secret` to Git repository!

---

## 3. How Google OAuth Works in HabitForge

```
Frontend (http://localhost:5173)
  ↓ [Click "Continue with Google"]
GET http://localhost:5001/api/auth/google
  ↓ [Redirects to Google Authorization]
Google Consent Screen (accounts.google.com)
  ↓ [User Approves]
Redirect to http://localhost:5001/api/auth/google/callback?code=...
  ↓ [Backend Exchanges Code with Google API Token Endpoint]
Verified Google Identity (sub, email, name, avatar)
  ↓ [Find by googleId/email or Create New HabitForge User]
Generate HabitForge Application JWT
  ↓ [Redirect]
Frontend http://localhost:5173/auth/callback?token=<JWT>
  ↓ [AuthContext logs user in]
Authenticated Dashboard (http://localhost:5173/dashboard)
```

---

## 4. Key Architectural Guarantees

1. **Server-Side Verification**: The authorization code is exchanged securely server-side with Google. The client frontend is never trusted with email/identity claims.
2. **MongoDB Identity**: The primary key for all habits, logs, XP, friendships, and notifications remains `User._id` (MongoDB ObjectId). `googleId` is stored only as an authentication mapping.
3. **Account Linking**: If an existing local user signs in with Google using the same verified email, their accounts are automatically linked without duplicating data.
4. **Genuine Empty Accounts**: New Google users start with a clean account (`XP = 0`, `Level = 1`, `Habits = []`). No fake or hardcoded demo data is injected into authenticated accounts.

---

## 5. Troubleshooting & Common Errors

### `redirect_uri_mismatch`
- **Cause**: The redirect URL requested by the backend (`GOOGLE_CALLBACK_URL`) does not match the exact URI listed under **Authorized redirect URIs** in Google Cloud Console.
- **Fix**: Ensure `http://localhost:5001/api/auth/google/callback` is added word-for-word in Google Cloud Console Credentials. Note that `http://localhost:5001` and `http://127.0.0.1:5001` are treated as different URIs by Google.

### `Google OAuth is not configured`
- **Cause**: `GOOGLE_CLIENT_ID` is missing in `backend/.env`.
- **Fix**: Open `backend/.env` and ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are properly set.

---

## 6. Production Deployment Setup

When deploying to production (e.g. Vercel, Render, Railway):

1. **Google Cloud Console**:
   - Add your production domain under **Authorized JavaScript origins** (e.g. `https://habitforge.app`).
   - Add your production callback under **Authorized redirect URIs** (e.g. `https://api.habitforge.app/api/auth/google/callback`).
2. **Production Environment Variables**:
   ```env
   FRONTEND_URL=https://habitforge.app
   GOOGLE_CALLBACK_URL=https://api.habitforge.app/api/auth/google/callback
   ```
