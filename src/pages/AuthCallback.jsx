import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const err = searchParams.get('error');

    if (err) {
      setError(decodeURIComponent(err));
      setTimeout(() => navigate('/login?error=' + encodeURIComponent(err)), 2500);
      return;
    }

    if (token) {
      loginWithToken(token).then((res) => {
        if (res?.user?.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      });
    } else {
      setError('No authentication token received from Google callback.');
      setTimeout(() => navigate('/login'), 2500);
    }
  }, [searchParams, loginWithToken, navigate]);

  return (
    <div className="min-h-screen bg-[#131316] text-[#e4e1e6] flex items-center justify-center px-4 font-inter">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1f1f22] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-[#a078ff]/15 border border-[#d0bcff]/30 mx-auto flex items-center justify-center text-[#d0bcff]">
          {error ? <AlertCircle className="w-8 h-8 text-red-400" /> : <ShieldCheck className="w-8 h-8 text-[#d0bcff] animate-pulse" />}
        </div>

        {error ? (
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-geist text-white">Google Authentication Error</h2>
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <p className="text-xs text-[#cbc3d7] pt-2">Redirecting back to login screen...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-geist text-white">Authenticating with Google...</h2>
            <p className="text-sm text-[#cbc3d7]">Setting up your secure HabitForge session...</p>
            <div className="w-8 h-8 border-3 border-[#d0bcff] border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
