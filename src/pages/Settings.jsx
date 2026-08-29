import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { paymentsAPI } from '../services/api';
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Moon,
  Sun,
  Bell,
  Save,
  CreditCard,
  ShieldCheck,
  Download,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Settings() {
  const { user, updateSettings, showNotification } = useAuth();

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [timezone, setTimezone] = useState(user.timezone || 'UTC');
  const [theme, setTheme] = useState(user.theme || 'dark');
  const [emailNotifications, setEmailNotifications] = useState(
    user.notificationPreferences?.emailNotifications ?? true
  );
  const [streakAlerts, setStreakAlerts] = useState(
    user.notificationPreferences?.streakAlerts ?? true
  );
  const [saving, setSaving] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  useEffect(() => {
    setName(user.name || '');
    setEmail(user.email || '');
    setTimezone(user.timezone || 'UTC');
    setTheme(user.theme || 'dark');
    if (user.notificationPreferences) {
      setEmailNotifications(user.notificationPreferences.emailNotifications ?? true);
      setStreakAlerts(user.notificationPreferences.streakAlerts ?? true);
    }
  }, [user]);

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const res = await paymentsAPI.getHistory();
      if (Array.isArray(res.data)) {
        setPaymentHistory(res.data);
      }
    } catch (err) {
      console.warn('[Settings] Failed to fetch payment history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        name,
        timezone,
        theme,
        notificationPreferences: {
          emailNotifications,
          streakAlerts,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  function handleThemeChange(selectedTheme) {
    setTheme(selectedTheme);
    updateSettings({
      name,
      timezone,
      theme: selectedTheme,
      notificationPreferences: {
        emailNotifications,
        streakAlerts,
      },
    });
  }

  async function handleDownloadReceipt(payment) {
    const paymentId = payment._id || payment.id;
    try {
      setDownloadingId(paymentId);
      const res = await paymentsAPI.downloadReceipt(paymentId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `HabitForge-Payment-Receipt-${payment.receiptNumber || 'HF-2026'}.pdf`;
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showNotification({ type: 'habit_added', title: 'Receipt PDF downloaded successfully! 📄' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to download receipt PDF.';
      showNotification({ type: 'deleted', title: msg });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleResendReceipt(payment) {
    const paymentId = payment._id || payment.id;
    try {
      setResendingId(paymentId);
      const res = await paymentsAPI.resendReceipt(paymentId);
      showNotification({ type: 'habit_added', title: res.data?.message || 'Receipt email sent successfully! 📧' });
      await loadHistory();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to email receipt.';
      showNotification({ type: 'deleted', title: msg });
    } finally {
      setResendingId(null);
    }
  }

  const isPremiumActive =
    user?.isPremium &&
    (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());

  const formattedExpiry = user?.premiumExpiresAt
    ? format(new Date(user.premiumExpiresAt), 'dd MMMM yyyy')
    : null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-geist text-white tracking-tight flex items-center gap-3">
            Settings <SettingsIcon className="w-8 h-8 text-[#d0bcff]" />
          </h1>
          <p className="text-base text-[#cbc3d7] font-inter mt-1.5">
            Manage your account preferences, timezone, theme, and billing receipts.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Profile & Account */}
          <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold font-geist text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#d0bcff]" /> Profile & Preferences
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-4 py-3 rounded-xl bg-[#131316]/50 border border-white/5 text-white/60 font-inter text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Timezone & Regional */}
          <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold font-geist text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#adc6ff]" /> Timezone & Regional Reset
            </h2>
            <div>
              <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                User Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff]"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
              <p className="text-[11px] text-[#cbc3d7] font-inter mt-1.5">
                Daily habits reset at 00:00 local time in your selected timezone.
              </p>
            </div>
          </div>

          {/* Theme System */}
          <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold font-geist text-white flex items-center gap-2">
              <Moon className="w-5 h-5 text-[#ffb95f]" /> Visual Theme
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => handleThemeChange('dark')}
                className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                  theme === 'dark' ? 'bg-[#131316] border-[#d0bcff] ring-2 ring-[#d0bcff]/30' : 'bg-[#131316]/50 border-white/5'
                }`}
              >
                <Moon className="w-5 h-5 text-[#d0bcff]" />
                <div>
                  <h4 className="font-bold font-geist text-white text-sm">Dark Mode</h4>
                  <span className="text-[11px] text-[#cbc3d7]">HabitForge signature theme</span>
                </div>
              </div>

              <div
                onClick={() => handleThemeChange('light')}
                className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                  theme === 'light' ? 'bg-[#131316] border-[#d0bcff] ring-2 ring-[#d0bcff]/30' : 'bg-[#131316]/50 border-white/5'
                }`}
              >
                <Sun className="w-5 h-5 text-[#ffb95f]" />
                <div>
                  <h4 className="font-bold font-geist text-white text-sm">Light Mode</h4>
                  <span className="text-[11px] text-[#cbc3d7]">Clean high-contrast theme</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold font-geist text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#10b981]" /> Notification Preferences
            </h2>
            <div className="space-y-3 text-sm font-inter">
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#131316] border border-white/5 cursor-pointer">
                <span className="text-white font-semibold font-geist">Daily Habit Check-in Reminders</span>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-4 h-4 accent-[#a078ff]"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#131316] border border-white/5 cursor-pointer">
                <span className="text-white font-semibold font-geist">Streak & Milestone Celebrations</span>
                <input
                  type="checkbox"
                  checked={streakAlerts}
                  onChange={(e) => setStreakAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#a078ff]"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#a078ff] text-[#340080] font-extrabold font-geist text-xs uppercase tracking-wider hover:bg-[#d0bcff] transition-all shadow-lg cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save All Preferences'}</span>
            </button>
          </div>
        </form>

        {/* Billing & Payment History Section */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-6 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold font-geist text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#a078ff]" /> Billing & Payment History
              </h2>
              <p className="text-xs text-[#cbc3d7] font-inter mt-1">
                Current Plan: <strong className="text-white">{isPremiumActive ? 'HabitForge Premium' : 'Free Plan'}</strong>
                {isPremiumActive && formattedExpiry && ` (Expires ${formattedExpiry})`}
              </p>
            </div>
            <a
              href="/premium"
              className="px-4 py-2.5 rounded-xl bg-[#a078ff]/15 border border-[#d0bcff]/30 text-[#d0bcff] font-extrabold text-xs uppercase hover:bg-[#a078ff]/25 transition-all text-center self-start sm:self-auto"
            >
              {isPremiumActive ? 'Extend Membership' : 'Upgrade to Premium'}
            </a>
          </div>

          {loadingHistory ? (
            <div className="text-center py-6 text-xs text-[#cbc3d7]">Loading payment history...</div>
          ) : paymentHistory.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#131316] border border-white/5 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#cbc3d7]/40 mx-auto" />
              <p className="text-xs text-[#cbc3d7] font-inter">No payment history found for your account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-inter">
                <thead>
                  <tr className="border-b border-white/10 text-[#cbc3d7] font-geist uppercase text-[10px]">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Receipt Ref</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Payment ID</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {paymentHistory.map((p) => {
                    const pId = p._id || p.id;
                    const isPaid = p.status === 'paid';
                    return (
                      <tr key={pId} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-3">
                          {p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy') : 'N/A'}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-[#d0bcff]">
                          {p.receiptNumber || 'HF-2026'}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-white">30-Day Premium</td>
                        <td className="py-3.5 px-3 font-bold">₹{p.amount || 99} INR</td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              isPaid
                                ? 'bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981]'
                                : 'bg-red-500/20 border border-red-500/40 text-red-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-[#cbc3d7]">
                          {p.razorpayPaymentId || p.razorpayOrderId || 'N/A'}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {isPaid && (
                            <div className="inline-flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleDownloadReceipt(p)}
                                disabled={downloadingId === pId}
                                className="px-2.5 py-1.5 rounded-lg bg-[#a078ff]/15 border border-[#d0bcff]/30 text-[#d0bcff] hover:bg-[#a078ff]/25 font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {downloadingId === pId ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                <span>PDF</span>
                              </button>

                              <button
                                onClick={() => handleResendReceipt(p)}
                                disabled={resendingId === pId}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {resendingId === pId ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Mail className="w-3 h-3 text-[#10b981]" />
                                )}
                                <span>Email Receipt</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
