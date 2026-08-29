import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { paymentsAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, Sparkles, AlertTriangle, X, ShieldCheck, HelpCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function Premium() {
  const { user, checkoutRazorpay, cancelPremium, refreshData, showNotification } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportReason, setSupportReason] = useState('');
  const [requestingSupport, setRequestingSupport] = useState(false);

  async function handleGetPremium() {
    if (processing) return;
    try {
      setProcessing(true);
      await checkoutRazorpay();
    } catch (err) {
      console.log('[Checkout Status]', err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirmCancel() {
    try {
      setCancelling(true);
      await cancelPremium();
      await refreshData();
      setShowCancelModal(false);
      showNotification({
        type: 'deleted',
        title: 'Premium membership cancelled. User data and billing history remain safely preserved.',
      });
    } catch (err) {
      showNotification({
        type: 'deleted',
        title: err.response?.data?.message || 'Failed to cancel membership.',
      });
    } finally {
      setCancelling(false);
    }
  }

  async function handleSubmitSupportRequest(e) {
    e.preventDefault();
    try {
      setRequestingSupport(true);
      const res = await paymentsAPI.submitSupportRequest(user.lastPaymentId, supportReason);
      showNotification({
        type: 'habit_added',
        title: res.data?.message || 'Support ticket submitted! Check your email for confirmation.',
      });
      setShowSupportModal(false);
      setSupportReason('');
    } catch (err) {
      showNotification({
        type: 'deleted',
        title: err.response?.data?.message || 'Failed to submit support request.',
      });
    } finally {
      setRequestingSupport(false);
    }
  }

  const isPremiumActive =
    user?.isPremium &&
    (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());

  const formattedExpiryDate = user?.premiumExpiresAt
    ? format(new Date(user.premiumExpiresAt), 'dd MMMM yyyy')
    : null;

  const formattedStartDate = user?.premiumSince
    ? format(new Date(user.premiumSince), 'dd MMMM yyyy')
    : 'Active';

  const daysRemaining = user?.premiumExpiresAt
    ? Math.max(0, differenceInDays(new Date(user.premiumExpiresAt), new Date()))
    : 0;

  const features = [
    { title: 'Habit Limit', free: '5 Active Habits', premium: 'Unlimited Habits' },
    { title: 'Activity Heatmap', free: '90 Days History', premium: '365 Days Full Heatmap' },
    { title: 'Data Export', free: 'Not Available', premium: 'CSV Data Export' },
    { title: 'Analytics Range', free: '7d / 30d Only', premium: '7d, 30d, 90d & 1 Year' },
    { title: 'Social Leaderboard', free: 'Included', premium: 'PRO Crown Badge' },
    { title: 'XP Multiplier', free: 'Standard 1x', premium: '1.5x Premium XP Boost' },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a078ff]/15 border border-[#d0bcff]/30 text-[#d0bcff] text-xs font-extrabold font-geist tracking-wider uppercase">
            <Sparkles className="w-4 h-4" /> HABITFORGE PREMIUM TIER
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-geist text-white tracking-tight">
            Unlock Full Potential
          </h1>
          <p className="text-base text-[#cbc3d7] font-inter">
            Supercharge your personal consistency with unlimited habits, 365-day heatmaps, and CSV data exports.
          </p>
        </div>

        {/* ACTIVE PREMIUM STATUS BANNER */}
        {isPremiumActive && (
          <div className="bg-gradient-to-r from-[#a078ff]/20 to-[#d0bcff]/20 border border-[#d0bcff]/40 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white font-geist">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#ffb95f]/20 border border-[#ffb95f]/40 flex items-center justify-center">
                <Crown className="w-6 h-6 text-[#ffb95f]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-white">ACTIVE PREMIUM</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] text-[10px] font-extrabold uppercase">
                    ACTIVE
                  </span>
                </div>
                <div className="text-xs text-[#cbc3d7] space-x-3 font-inter">
                  <span>Plan: <strong className="text-white">HabitForge Premium — 30 Days</strong></span>
                  <span>•</span>
                  <span>Started: <strong className="text-white">{formattedStartDate}</strong></span>
                  <span>•</span>
                  <span>Expires: <strong className="text-white">{formattedExpiryDate || 'In 30 Days'}</strong> {daysRemaining > 0 && `(${daysRemaining}d left)`}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-xs hover:bg-red-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Cancel Membership
              </button>
              <button
                onClick={() => setShowSupportModal(true)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 font-bold text-xs hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#d0bcff]" /> Support & Refund
              </button>
            </div>
          </div>
        )}

        {/* CANCEL MEMBERSHIP CONFIRMATION MODAL */}
        <AnimatePresence>
          {showCancelModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#19191c] border border-red-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl relative"
              >
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="absolute top-4 right-4 text-[#cbc3d7] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold font-geist text-white">Cancel Premium Membership?</h3>
                  <p className="text-xs text-[#cbc3d7] font-inter">
                    Cancelling your membership will turn off PRO access. Your habits, completions, XP, and billing receipts will remain 100% saved.
                  </p>
                </div>

                <div className="space-y-2 text-xs font-inter text-red-300 bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                  <p className="font-semibold text-white">Reverting to Free Plan changes:</p>
                  <p>• Maximum habit limit reverts to 5 active habits</p>
                  <p>• Activity heatmap history reverts to 90 days</p>
                  <p>• CSV Data Export will be disabled</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 py-3 rounded-xl bg-[#353438] text-white font-bold text-xs uppercase hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Keep Premium
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUPPORT & REFUND MODAL */}
        <AnimatePresence>
          {showSupportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#19191c] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl relative"
              >
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="absolute top-4 right-4 text-[#cbc3d7] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-12 h-12 rounded-2xl bg-[#a078ff]/10 border border-[#a078ff]/30 text-[#d0bcff] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold font-geist text-white">Membership Support & Inquiry</h3>
                  <p className="text-xs text-[#cbc3d7] font-inter">
                    HabitForge Premium is a <strong>one-time 30-day purchase</strong> (no auto-renewing subscriptions). Submit your inquiry below and our team will respond within 24 hours.
                  </p>
                </div>

                <form onSubmit={handleSubmitSupportRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold font-geist text-[#cbc3d7] uppercase tracking-wider mb-2">
                      Reason for Inquiry
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={supportReason}
                      onChange={(e) => setSupportReason(e.target.value)}
                      placeholder="Describe your request or issue..."
                      className="w-full px-4 py-3 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-xs outline-none focus:border-[#d0bcff]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSupportModal(false)}
                      className="flex-1 py-3 rounded-xl bg-[#353438] text-white font-bold text-xs uppercase hover:bg-white/10 transition-all cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={requestingSupport}
                      className="flex-1 py-3 rounded-xl bg-[#a078ff] text-[#340080] font-bold text-xs uppercase hover:bg-[#d0bcff] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {requestingSupport ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Free Tier Card */}
          <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold font-geist text-white">Free Plan</h3>
                <span className="text-xs font-bold font-geist text-[#cbc3d7] uppercase">Basic Tier</span>
              </div>
              <div className="text-4xl font-extrabold font-geist text-white">
                ₹0 <span className="text-sm font-inter font-normal text-[#cbc3d7]">/ forever</span>
              </div>
              <p className="text-xs text-[#cbc3d7] font-inter">Great for starting out and building core daily routines.</p>
              <hr className="border-white/5" />
              <ul className="space-y-3 text-xs font-inter text-[#cbc3d7]">
                <li className="flex items-center gap-2 text-white">
                  <Check className="w-4 h-4 text-[#10b981]" /> Up to 5 active habits
                </li>
                <li className="flex items-center gap-2 text-white">
                  <Check className="w-4 h-4 text-[#10b981]" /> 90-day activity history
                </li>
                <li className="flex items-center gap-2 text-white">
                  <Check className="w-4 h-4 text-[#10b981]" /> XP, leveling, and badges
                </li>
                <li className="flex items-center gap-2 text-white">
                  <Check className="w-4 h-4 text-[#10b981]" /> Social leaderboard participation
                </li>
              </ul>
            </div>
            <button
              disabled
              className="w-full py-3.5 rounded-2xl bg-[#353438] text-white/50 font-bold font-geist text-xs uppercase tracking-wider cursor-not-allowed"
            >
              {!isPremiumActive ? 'CURRENT FREE TIER' : 'FREE TIER'}
            </button>
          </div>

          {/* Premium Tier Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative bg-[#1f1f22] border-2 border-[#d0bcff]/50 rounded-3xl p-8 space-y-6 flex flex-col justify-between shadow-[0_0_50px_rgba(208,188,255,0.2)] overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-l from-[#a078ff] to-[#d0bcff] text-[#340080] font-extrabold font-geist text-[10px] uppercase rounded-bl-xl tracking-wider">
              RECOMMENDED
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold font-geist text-white flex items-center gap-2">
                  <Crown className="w-6 h-6 text-[#ffb95f]" /> HabitForge Premium
                </h3>
              </div>
              <div>
                <div className="text-4xl font-extrabold font-geist text-white">
                  ₹99 <span className="text-sm font-inter font-normal text-[#cbc3d7]">/ 30 Days</span>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-[#a078ff]/10 border border-[#a078ff]/20 text-[#d0bcff] text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" /> One-time payment • No automatic renewal
                </div>
              </div>

              <p className="text-xs text-[#cbc3d7] font-inter">For power users committed to long-term self improvement.</p>
              <hr className="border-white/5" />
              <ul className="space-y-3 text-xs font-inter text-white">
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-[#10b981]" /> Unlimited Active Habits
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-[#10b981]" /> Full 365-Day Activity Heatmap
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-[#10b981]" /> CSV Data Export Capability
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-[#10b981]" /> 90-Day & 1-Year Analytics Filters
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-[#10b981]" /> Premium Crown Badge on Leaderboard
                </li>
              </ul>
            </div>

            {isPremiumActive ? (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 font-extrabold font-geist text-xs tracking-wider uppercase shadow-xl hover:bg-red-500/30 transition-all cursor-pointer"
              >
                CANCEL MEMBERSHIP
              </button>
            ) : (
              <button
                onClick={handleGetPremium}
                disabled={processing}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#a078ff] to-[#d0bcff] text-[#340080] font-extrabold font-geist text-xs tracking-wider uppercase shadow-xl hover:opacity-90 transition-all cursor-pointer disabled:opacity-60"
              >
                {processing ? 'Processing...' : 'GET PREMIUM — ₹99'}
              </button>
            )}
          </motion.div>
        </div>

        {/* Feature Comparison Matrix */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 md:p-8 space-y-4">
          <h3 className="text-xl font-bold font-geist text-white">Detailed Feature Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-inter">
              <thead>
                <tr className="border-b border-white/10 text-[#cbc3d7] font-geist uppercase text-[10px]">
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Free Plan</th>
                  <th className="py-3 px-4 text-[#d0bcff]">Premium Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white">
                {features.map((f) => (
                  <tr key={f.title} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-semibold font-geist">{f.title}</td>
                    <td className="py-3.5 px-4 text-[#cbc3d7]">{f.free}</td>
                    <td className="py-3.5 px-4 font-bold text-[#d0bcff]">{f.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
