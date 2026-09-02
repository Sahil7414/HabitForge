import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { socialAPI } from '../services/api';
import { Trophy, Crown, Users, Globe, UserPlus, Loader2, Info, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('global');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showXpGuide, setShowXpGuide] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    const fetcher =
      activeTab === 'friends' ? socialAPI.getFriendsLeaderboard : socialAPI.getLeaderboard;

    fetcher()
      .then((res) => {
        if (isSubscribed) {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setLeaderboard(res.data);
          } else {
            setLeaderboard([
              {
                rank: 1,
                userId: user.id || user._id || 'me',
                name: user.name || 'User',
                level: user.level || 1,
                totalXP: user.xp || 0,
                weeklyXP: 0,
                isPremium: user.isPremium,
                isCurrentUser: true,
              },
            ]);
          }
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setLeaderboard([
            {
              rank: 1,
              userId: user.id || user._id || 'me',
              name: user.name || 'User',
              level: user.level || 1,
              totalXP: user.xp || 0,
              weeklyXP: 0,
              isPremium: user.isPremium,
              isCurrentUser: true,
            },
          ]);
        }
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeTab, user]);

  const currentUserEntry = leaderboard.find((item) => item.isCurrentUser) || {
    rank: 1,
    weeklyXP: 0,
  };

  const hasPodium = leaderboard.length >= 3;
  // If top 3 are on the podium, standings list starts from Rank 4 onwards
  const standingsList = hasPodium ? leaderboard.slice(3) : leaderboard;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header & User Rank Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-geist text-white tracking-tight flex items-center gap-3">
              Weekly Leaderboard <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-[#ffb95f]" />
            </h1>
            <p className="text-xs sm:text-base text-[#cbc3d7] font-inter mt-1.5">
              Rankings reset every Monday at 00:00 UTC. Compete with the community and your friends!
            </p>
          </div>

          <div className="bg-[#1f1f22] border border-[#d0bcff]/30 rounded-2xl px-5 py-3 flex items-center gap-4 self-start md:self-auto shadow-lg">
            <div>
              <span className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase tracking-wider">
                Your Rank
              </span>
              <div className="leaderboard-user-rank-val text-xl font-extrabold font-geist text-[#d0bcff]">
                #{currentUserEntry.rank} of {leaderboard.length}
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase tracking-wider">
                  Weekly XP
                </span>
                <span className="text-[9px] text-[#ffb95f] font-extrabold font-geist">⚡</span>
              </div>
              <div className="leaderboard-user-xp-val text-xl font-extrabold font-geist text-[#ffb95f]">
                +{currentUserEntry.weeklyXP || 0} XP
              </div>
            </div>
          </div>
        </div>

        {/* Global | Friends Navigation Segmented Tabs & Guide Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-1.5 p-1 bg-[#131316] border border-white/10 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('global')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold font-geist text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'global'
                  ? 'bg-[#a078ff] text-[#131316] shadow-lg shadow-[#a078ff]/25 font-extrabold'
                  : 'text-[#cbc3d7] hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global</span>
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold font-geist text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'friends'
                  ? 'bg-[#a078ff] text-[#131316] shadow-lg shadow-[#a078ff]/25 font-extrabold'
                  : 'text-[#cbc3d7] hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowXpGuide((prev) => !prev)}
              className={`xp-guide-trigger inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-geist transition-all cursor-pointer shadow-sm ${
                showXpGuide
                  ? 'xp-guide-trigger-active bg-[#d0bcff]/20 border-[#d0bcff]/60 text-white font-semibold'
                  : 'bg-[#1f1f22] border-white/10 hover:border-[#d0bcff]/40 text-[#cbc3d7] hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#ffb95f]" />
              <span>How XP & Ranking Work</span>
            </button>
          </div>
        </div>

        {/* Expandable XP & Ranking Explanation Banner */}
        <AnimatePresence>
          {showXpGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="xp-guide-banner bg-gradient-to-r from-[#1f1f22] via-[#26252a] to-[#1f1f22] border border-[#d0bcff]/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="xp-guide-info-icon w-5 h-5 text-[#d0bcff]" />
                    <h3 className="xp-guide-title font-bold font-geist text-white text-base">
                      Understanding Leaderboard XP
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowXpGuide(false)}
                    className="xp-guide-dismiss text-xs text-[#cbc3d7] hover:text-white cursor-pointer px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Dismiss ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-inter text-[#cbc3d7]">
                  <div className="xp-guide-card xp-guide-card-weekly p-4 bg-[#131316]/80 rounded-2xl border border-[#ffb95f]/20 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="xp-guide-dot-weekly w-2.5 h-2.5 rounded-full bg-[#ffb95f]" />
                      <span className="xp-guide-card-title font-bold font-geist text-white text-sm">
                        Orange (+XP) = Weekly XP
                      </span>
                    </div>
                    <p className="xp-guide-card-desc leading-relaxed">
                      Points earned <strong className="text-white">during the current week only</strong> (Monday 00:00 UTC to Sunday). Used as the <strong className="xp-accent-weekly text-[#ffb95f]">primary score</strong> to rank all users. Resets to 0 every Monday.
                    </p>
                  </div>

                  <div className="xp-guide-card xp-guide-card-total p-4 bg-[#131316]/80 rounded-2xl border border-white/10 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="xp-guide-dot-total w-2.5 h-2.5 rounded-full bg-[#cbc3d7]" />
                      <span className="xp-guide-card-title font-bold font-geist text-white text-sm">
                        Gray Text = Lifetime Total XP
                      </span>
                    </div>
                    <p className="xp-guide-card-desc leading-relaxed">
                      Total XP accumulated <strong className="text-white">all-time</strong> across your entire HabitForge journey. Used as a <strong className="xp-accent-total text-[#d0bcff]">tie-breaker</strong> when two users have equal weekly XP.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Visual XP Key Legend */}
        <div className="xp-legend flex flex-wrap items-center gap-4 text-[11px] font-geist text-[#cbc3d7] px-2 py-1">
          <div className="flex items-center gap-1.5">
            <span className="xp-legend-dot-weekly w-2 h-2 rounded-full bg-[#ffb95f]" />
            <span><strong className="xp-legend-text-weekly text-[#ffb95f]">Orange (+XP):</strong> Weekly XP (Sort Criteria)</span>
          </div>
          <span className="xp-legend-bullet text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <span className="xp-legend-dot-total w-2 h-2 rounded-full bg-[#cbc3d7]" />
            <span><strong className="xp-legend-text-total text-white">Gray Text:</strong> All-Time Total XP (Tie-Breaker)</span>
          </div>
          <span className="xp-legend-bullet text-white/20">•</span>
          <span className="xp-legend-reset text-[#cbc3d7]/80">Resets Mondays at 00:00 UTC</span>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-[#cbc3d7]">
            <Loader2 className="w-8 h-8 animate-spin text-[#d0bcff]" />
            <p className="text-xs font-geist">Loading {activeTab === 'friends' ? 'friends' : 'global'} rankings...</p>
          </div>
        ) : (
          <>
            {/* Podium Top 3 (if >= 3 entries) */}
            {hasPodium ? (
              <div className="flex flex-col sm:grid sm:grid-cols-3 gap-4 pt-4 items-end max-w-3xl mx-auto">
                {/* Rank 2 - Silver */}
                <div className="order-2 sm:order-1 bg-[#1f1f22] border border-white/10 rounded-3xl p-6 text-center space-y-3 shadow-lg w-full">
                  <span className="text-3xl block">🥈</span>
                  <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-tr from-slate-400 to-slate-200 flex items-center justify-center font-bold text-[#131316] text-xl shadow-md">
                    {leaderboard[1]?.name ? leaderboard[1].name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold font-geist text-white text-sm truncate">{leaderboard[1]?.name}</h3>
                    <span className="text-xs text-[#ffb95f] font-extrabold font-geist block">
                      +{leaderboard[1]?.weeklyXP || 0} Weekly XP
                    </span>
                    <span className="text-[10px] text-[#cbc3d7] font-geist block mt-0.5">
                      {(leaderboard[1]?.totalXP || 0).toLocaleString()} Total XP
                    </span>
                  </div>
                </div>

                {/* Rank 1 - Gold (ONLY Crown, Centered Horizontally Above Avatar) */}
                <div className="podium-card-gold order-1 sm:order-2 bg-gradient-to-b from-[#2a2a2d] to-[#1f1f22] border-2 border-[#ffb95f]/60 rounded-3xl p-7 text-center space-y-3 shadow-2xl sm:scale-105 relative w-full flex flex-col items-center">
                  <Crown className="w-8 h-8 text-[#ffb95f] filter drop-shadow-[0_2px_8px_rgba(255,185,95,0.45)]" />
                  <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-tr from-[#a078ff] to-[#d0bcff] flex items-center justify-center font-bold text-[#340080] text-2xl shadow-lg">
                    {leaderboard[0]?.name ? leaderboard[0].name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-extrabold font-geist text-white text-base truncate">
                      {leaderboard[0]?.name}
                    </h3>
                    <span className="text-sm text-[#ffb95f] font-extrabold font-geist block mt-0.5">
                      +{leaderboard[0]?.weeklyXP || 0} Weekly XP
                    </span>
                    <span className="text-[11px] text-[#cbc3d7] font-geist block mt-0.5">
                      {(leaderboard[0]?.totalXP || 0).toLocaleString()} Total XP
                    </span>
                  </div>
                </div>

                {/* Rank 3 - Bronze */}
                <div className="order-3 sm:order-3 bg-[#1f1f22] border border-white/10 rounded-3xl p-6 text-center space-y-3 shadow-lg w-full">
                  <span className="text-3xl block">🥉</span>
                  <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center font-bold text-[#131316] text-xl shadow-md">
                    {leaderboard[2]?.name ? leaderboard[2].name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold font-geist text-white text-sm truncate">{leaderboard[2]?.name}</h3>
                    <span className="text-xs text-[#ffb95f] font-extrabold font-geist block">
                      +{leaderboard[2]?.weeklyXP || 0} Weekly XP
                    </span>
                    <span className="text-[10px] text-[#cbc3d7] font-geist block mt-0.5">
                      {(leaderboard[2]?.totalXP || 0).toLocaleString()} Total XP
                    </span>
                  </div>
                </div>
              </div>
            ) : activeTab === 'friends' ? (
              /* Friends Empty State Card when user has < 3 friends in leaderboard */
              <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-8 text-center space-y-3 max-w-xl mx-auto shadow-xl">
                <Users className="w-10 h-10 text-[#a078ff] mx-auto opacity-80" />
                <h3 className="text-lg font-bold font-geist text-white">Add Friends to Build Your Friends Leaderboard</h3>
                <p className="text-xs text-[#cbc3d7] font-inter">
                  Connect with friends to compare weekly XP earnings and climb the ranks together!
                </p>
                <Link
                  to="/social"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#a078ff] text-[#340080] font-bold font-geist text-xs uppercase tracking-wider shadow-lg hover:bg-[#d0bcff] transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>FIND & ADD FRIENDS</span>
                </Link>
              </div>
            ) : null}

            {/* Standings List (Starts from Rank 4 if Top-3 Podium is present) */}
            <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-3 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-lg font-bold font-geist text-white">
                    {activeTab === 'friends' ? 'Friends Standings' : 'Global Standings'}
                  </h3>
                  <span className="text-xs font-geist text-[#cbc3d7]">
                    {leaderboard.length} {leaderboard.length === 1 ? 'member' : 'members'} ranked this week
                  </span>
                </div>

                <div className="text-right text-[10px] font-geist uppercase text-[#cbc3d7] tracking-wider hidden sm:block">
                  <span className="text-[#ffb95f] font-bold">Weekly Score</span> / Total All-Time
                </div>
              </div>

              {standingsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#cbc3d7] font-geist">
                  {hasPodium
                    ? 'All ranked members are displayed on the podium above.'
                    : 'No members to display.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {standingsList.map((item) => (
                    <motion.div
                      key={item.userId}
                      whileHover={{ scale: 1.005 }}
                      className={`standings-row flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        item.isCurrentUser
                          ? 'standings-row-me bg-gradient-to-r from-[#a078ff]/20 to-[#1f1f22] border-[#d0bcff]/50 shadow-lg'
                          : 'bg-[#131316] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="w-8 text-center font-extrabold font-geist text-sm text-[#cbc3d7] shrink-0">
                          #{item.rank}
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-[#353438] flex items-center justify-center font-bold font-geist text-white text-sm shrink-0 shadow">
                          {item.name ? item.name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold font-geist text-white text-sm truncate">{item.name}</h4>
                            {item.isCurrentUser && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-geist bg-[#a078ff]/30 text-[#d0bcff] border border-[#a078ff]/40">
                                YOU
                              </span>
                            )}
                            {item.isPremium && <Crown className="w-3.5 h-3.5 text-[#ffb95f] shrink-0" />}
                          </div>
                          <span className="text-xs text-[#cbc3d7] font-inter">Level {item.level || 1}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-4">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-base font-extrabold font-geist text-[#ffb95f]">
                            +{(item.weeklyXP || 0).toLocaleString()} XP
                          </span>
                          <span className="text-[10px] font-bold font-geist text-[#ffb95f]/70 uppercase tracking-wider hidden sm:inline">
                            wk
                          </span>
                        </div>
                        <span className="text-[11px] text-[#cbc3d7] font-geist block">
                          {(item.totalXP || 0).toLocaleString()} Total XP
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
