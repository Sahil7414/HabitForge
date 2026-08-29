import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { socialAPI } from '../services/api';
import { Trophy, Crown, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    socialAPI
      .getLeaderboard()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setLeaderboard(res.data);
        } else {
          setLeaderboard([
            {
              rank: 1,
              userId: user.id || 'me',
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
      .catch(() => {
        setLeaderboard([
          {
            rank: 1,
            userId: user.id || 'me',
            name: user.name || 'User',
            level: user.level || 1,
            totalXP: user.xp || 0,
            weeklyXP: 0,
            isPremium: user.isPremium,
            isCurrentUser: true,
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const currentUserEntry = leaderboard.find((item) => item.isCurrentUser) || {
    rank: 1,
    weeklyXP: 0,
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-geist text-white tracking-tight flex items-center gap-3">
              Weekly Leaderboard <Trophy className="w-8 h-8 text-[#ffb95f]" />
            </h1>
            <p className="text-base text-[#cbc3d7] font-inter mt-1.5">
              Rankings reset every Monday at 00:00 UTC. Compete with your friends!
            </p>
          </div>

          <div className="bg-[#1f1f22] border border-[#d0bcff]/30 rounded-2xl px-5 py-3 flex items-center gap-4 self-start md:self-auto">
            <div>
              <span className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase">Your Rank</span>
              <div className="text-xl font-extrabold font-geist text-[#d0bcff]">
                #{currentUserEntry.rank} of {leaderboard.length}
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="text-[10px] font-bold font-geist text-[#cbc3d7] uppercase">Weekly XP</span>
              <div className="text-xl font-extrabold font-geist text-[#ffb95f]">
                +{currentUserEntry.weeklyXP || 0} XP
              </div>
            </div>
          </div>
        </div>

        {/* Podium Top 3 */}
        {leaderboard.length >= 3 ? (
          <div className="grid grid-cols-3 gap-4 pt-4 items-end max-w-3xl mx-auto">
            {/* Rank 2 - Silver */}
            <div className="bg-[#1f1f22] border border-white/10 rounded-3xl p-6 text-center space-y-3 shadow-lg">
              <span className="text-3xl">🥈</span>
              <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-tr from-slate-400 to-slate-200 flex items-center justify-center font-bold text-[#131316] text-xl shadow-md">
                {leaderboard[1].name ? leaderboard[1].name[0] : 'U'}
              </div>
              <div>
                <h3 className="font-bold font-geist text-white text-sm truncate">{leaderboard[1].name}</h3>
                <span className="text-xs text-[#ffb95f] font-extrabold font-geist">+{leaderboard[1].weeklyXP} XP</span>
              </div>
            </div>

            {/* Rank 1 - Gold */}
            <div className="bg-gradient-to-b from-[#2a2a2d] to-[#1f1f22] border-2 border-[#ffb95f]/50 rounded-3xl p-8 text-center space-y-3 shadow-2xl scale-105 relative">
              <Crown className="w-8 h-8 text-[#ffb95f] mx-auto absolute -top-4 left-1/2 -translate-x-1/2" />
              <span className="text-4xl">🥇</span>
              <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-tr from-[#a078ff] to-[#d0bcff] flex items-center justify-center font-bold text-[#340080] text-2xl shadow-lg">
                {leaderboard[0].name ? leaderboard[0].name[0] : 'U'}
              </div>
              <div>
                <h3 className="font-extrabold font-geist text-white text-base truncate">{leaderboard[0].name}</h3>
                <span className="text-sm text-[#ffb95f] font-extrabold font-geist">+{leaderboard[0].weeklyXP} XP</span>
              </div>
            </div>

            {/* Rank 3 - Bronze */}
            <div className="bg-[#1f1f22] border border-white/10 rounded-3xl p-6 text-center space-y-3 shadow-lg">
              <span className="text-3xl">🥉</span>
              <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center font-bold text-[#131316] text-xl shadow-md">
                {leaderboard[2].name ? leaderboard[2].name[0] : 'U'}
              </div>
              <div>
                <h3 className="font-bold font-geist text-white text-sm truncate">{leaderboard[2].name}</h3>
                <span className="text-xs text-[#ffb95f] font-extrabold font-geist">+{leaderboard[2].weeklyXP} XP</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-8 text-center space-y-3 max-w-xl mx-auto">
            <Users className="w-10 h-10 text-[#a078ff] mx-auto opacity-80" />
            <h3 className="text-lg font-bold font-geist text-white">Add Friends to Build Your Leaderboard</h3>
            <p className="text-xs text-[#cbc3d7] font-inter">
              Connect with friends to compare weekly XP earnings and climb the ranks together!
            </p>
            <Link
              to="/social"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#a078ff] text-[#340080] font-bold font-geist text-xs uppercase tracking-wider shadow-lg hover:bg-[#d0bcff] transition-all"
            >
              <span>FIND & ADD FRIENDS</span>
            </Link>
          </div>
        )}

        {/* Full Rankings List */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-3">
          <h3 className="text-lg font-bold font-geist text-white mb-4">Standings</h3>
          {loading ? (
            <p className="text-xs text-[#cbc3d7] py-4 text-center">Loading leaderboard...</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((item) => (
                <motion.div
                  key={item.userId}
                  whileHover={{ scale: 1.01 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    item.isCurrentUser
                      ? 'bg-gradient-to-r from-[#a078ff]/20 to-[#1f1f22] border-[#d0bcff]/50 shadow-lg'
                      : 'bg-[#131316] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 text-center font-extrabold font-geist text-sm text-[#cbc3d7]">
                      {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#353438] flex items-center justify-center font-bold font-geist text-white text-sm">
                      {item.name ? item.name[0] : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold font-geist text-white text-sm">{item.name}</h4>
                        {item.isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-geist bg-[#a078ff]/30 text-[#d0bcff]">
                            YOU
                          </span>
                        )}
                        {item.isPremium && <Crown className="w-3.5 h-3.5 text-[#ffb95f]" />}
                      </div>
                      <span className="text-xs text-[#cbc3d7] font-inter">Level {item.level || 1}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold font-geist text-[#ffb95f] block">
                      +{(item.weeklyXP || 0).toLocaleString()} XP
                    </span>
                    <span className="text-[10px] text-[#cbc3d7] font-geist">
                      {(item.totalXP || 0).toLocaleString()} Total XP
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
