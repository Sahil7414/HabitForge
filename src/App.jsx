import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Habits from './pages/Habits';
import Analytics from './pages/Analytics';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';
import Premium from './pages/Premium';
import Leaderboard from './pages/Leaderboard';
import Social from './pages/Social';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Notification from './components/Notification';
import LevelUpModal from './components/LevelUpModal';

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-[#131316] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#d0bcff] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isLoggedIn, user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isLoggedIn, user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (isLoggedIn) {
    return user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />;
  }
  return children;
}

function IndexRoute() {
  const { isLoggedIn, user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (isLoggedIn) {
    return user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { notification, levelUpModalLevel, closeLevelUpModal } = useAuth();
  return (
    <>
      <AnimatePresence mode="wait">
        {notification && <Notification data={notification} />}
      </AnimatePresence>

      <AnimatePresence>
        {levelUpModalLevel && (
          <LevelUpModal
            level={levelUpModalLevel}
            onClose={closeLevelUpModal}
          />
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<IndexRoute />} />
        <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
        <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
