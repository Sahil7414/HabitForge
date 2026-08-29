import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, Info } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const errorParam = new URLSearchParams(window.location.search).get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, []);

  function handleGoogleLogin() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  async function handleDemoLogin() {
    setEmail('alex@habitforge.com');
    setPassword('password123');
    setError('');
    setLoading(true);
    const res = await login('alex@habitforge.com', 'password123');
    setLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Demo login failed.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Login failed. Check credentials.');
    }
  }

  return (
    <div className="min-h-screen bg-[#131316] text-[#e4e1e6] flex items-center justify-center px-4 font-inter">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6d3bd7] to-[#a078ff] flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-[#a078ff]/20">
            ⚒
          </div>
          <h1 className="text-3xl font-extrabold font-geist text-white">
            Welcome back
          </h1>
          <p className="text-sm text-[#cbc3d7]">
            Sign in to continue your habit streaks
          </p>
        </div>

        <div className="bg-[#1b1b1e] border border-[#a078ff]/20 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-[#d0bcff]">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Demo Account:</strong> <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">alex@habitforge.com</code>
            </span>
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#a078ff]/20 text-[#d0bcff] hover:bg-[#a078ff]/30 border border-[#a078ff]/40 font-bold transition-all text-xs cursor-pointer"
          >
            Log In as Demo
          </button>
        </div>

        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-8 space-y-6 shadow-xl">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 font-bold font-geist text-sm flex items-center justify-center gap-3 transition-all shadow-md cursor-pointer border border-gray-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#1f1f22] px-3 text-xs font-bold text-[#cbc3d7] uppercase tracking-wider font-geist">
              or
            </span>
            <div className="border-t border-white/10 w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#cbc3d7] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@habitforge.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#cbc3d7] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#a078ff] text-[#340080] font-bold font-geist text-sm uppercase tracking-wider hover:bg-[#d0bcff] transition-all shadow-lg shadow-[#a078ff]/20 cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center text-xs text-[#cbc3d7]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-[#d0bcff] hover:underline"
            >
              Create one free
            </Link>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#cbc3d7] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
