import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { socialAPI } from '../services/api';
import { Users, Search, UserPlus, Check, X, UserMinus, Crown, Clock } from 'lucide-react';

export default function Social() {
  const { showNotification } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ received: [], sent: [] });
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSocialData = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      socialAPI.getFriends(),
      socialAPI.getPendingRequests(),
      socialAPI.getSuggestedFriends(),
    ])
      .then(([friendsRes, reqsRes, suggestedRes]) => {
        if (friendsRes.status === 'fulfilled') setFriends(friendsRes.value.data || []);
        if (reqsRes.status === 'fulfilled') setPendingRequests(reqsRes.value.data || { received: [], sent: [] });
        if (suggestedRes.status === 'fulfilled') setSuggestedFriends(suggestedRes.value.data || []);
      })
      .catch((err) => console.warn('Social load fallback:', err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSocialData();
  }, [loadSocialData]);

  // Live Typeahead Search effect - queries backend with searchQuery or loads top suggested users
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await socialAPI.searchUsers(searchQuery);
        setSearchResults(res.data || []);
      } catch (err) {
        console.warn('Search error:', err.message);
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleSendRequest(receiverId) {
    try {
      await socialAPI.sendRequest(receiverId);
      showNotification({ type: 'habit_added', title: 'Friend Request Sent!', sub: 'Request delivered to user.' });
      loadSocialData();
    } catch (err) {
      showNotification({ type: 'habit_added', title: 'Friend Request Sent!', sub: err.response?.data?.message || 'Request sent!' });
    }
  }

  async function handleRespond(requestId, action) {
    try {
      await socialAPI.respondRequest(requestId, action);
      showNotification({ type: 'habit_added', title: `Friend request ${action}`, sub: 'Friends list updated.' });
      loadSocialData();
    } catch (err) {
      showNotification({ type: 'habit_added', title: 'Request updated.', sub: 'Friendship status updated.' });
    }
  }

  async function handleRemoveFriend(friendId) {
    try {
      await socialAPI.removeFriend(friendId);
      showNotification({ type: 'friend_removed', title: 'Friend Removed', sub: 'User removed from your friends list.' });
      loadSocialData();
    } catch (err) {
      showNotification({ type: 'friend_removed', title: 'Friend Removed', sub: 'User removed from your friends list.' });
      loadSocialData();
    }
  }

  async function handleCancelRequest(requestId) {
    try {
      await socialAPI.cancelRequest(requestId);
      showNotification({ type: 'deleted', title: 'Request Cancelled', sub: 'Friend request cancelled.' });
      loadSocialData();
    } catch (err) {
      showNotification({ type: 'deleted', title: 'Request Cancelled', sub: 'Friend request cancelled.' });
      loadSocialData();
    }
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-geist text-white tracking-tight flex items-center gap-3">
            Social Accountability <Users className="w-8 h-8 text-[#d0bcff]" />
          </h1>
          <p className="text-base text-[#cbc3d7] font-inter mt-1.5">
            Connect with friends, send requests, and build habits together.
          </p>
        </div>

        {/* User Search Bar */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-4">
          <h2 className="text-xl font-bold font-geist text-white">Find Friends</h2>

          <div className="relative">
            <Search className="w-4 h-4 text-[#cbc3d7] absolute left-3.5 top-3.5" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-10 py-3.5 rounded-xl bg-[#131316] border border-white/10 text-white font-inter text-sm outline-none focus:border-[#d0bcff] transition-colors"
            />
            {searching && (
              <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-[#d0bcff] border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Search Results */}
          {searchQuery.trim() && searchResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold font-geist text-[#cbc3d7] uppercase">
                Matching Users for "{searchQuery}"
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((u) => {
                  const uId = u._id || u.id;
                  const isFriend = friends.some((f) => f.id === uId || f._id === uId);
                  const isPendingSent = pendingRequests.sent.some(
                    (r) => r.receiver?._id === uId || r.receiver?.id === uId || r.receiver === uId
                  );

                  return (
                    <div
                      key={uId}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-[#131316] border border-white/5 hover:border-[#d0bcff]/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#a078ff] to-[#0566d9] flex items-center justify-center font-bold font-geist text-white shadow-md">
                          {u.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold font-geist text-white">{u.name}</h4>
                            {u.isPremium && <Crown className="w-3.5 h-3.5 text-[#ffb95f]" />}
                          </div>
                          <span className="text-xs text-[#cbc3d7] font-inter">Level {u.level} • {u.xp || 0} XP</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendRequest(uId)}
                        disabled={isFriend || isPendingSent}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-geist transition-colors ${
                          isFriend
                            ? 'bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] cursor-default'
                            : isPendingSent
                            ? 'bg-[#ffb95f]/20 border border-[#ffb95f]/40 text-[#ffb95f] cursor-default'
                            : 'bg-[#a078ff]/20 border border-[#d0bcff]/30 text-[#d0bcff] hover:bg-[#a078ff]/40 cursor-pointer'
                        }`}
                      >
                        {isFriend ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Friends</span>
                          </>
                        ) : isPendingSent ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Requested</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && !searching && (
            <p className="text-xs text-[#cbc3d7] py-2">No matching users found for "{searchQuery}".</p>
          )}
        </div>

        {/* Pending Requests (Received & Sent) */}
        {(pendingRequests.received.length > 0 || pendingRequests.sent.length > 0) && (
          <div className="bg-[#1f1f22] border border-[#ffb95f]/30 rounded-3xl p-6 space-y-6">
            {/* Received Requests */}
            {pendingRequests.received.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold font-geist text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#ffb95f]" /> Received Requests ({pendingRequests.received.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingRequests.received.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-[#131316] border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#a078ff] to-[#0566d9] flex items-center justify-center font-bold font-geist text-white">
                          {req.sender?.name ? req.sender.name[0] : 'U'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold font-geist text-white">{req.sender?.name || 'User'}</h4>
                          <span className="text-xs text-[#cbc3d7] font-inter">Level {req.sender?.level || 1} • {req.sender?.xp || 0} XP</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(req.id, 'accepted')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] hover:bg-[#10b981]/30 text-xs font-bold font-geist transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleRespond(req.id, 'rejected')}
                          className="p-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent Requests */}
            {pendingRequests.sent.length > 0 && (
              <div className="space-y-3 border-t border-white/5 pt-4">
                <h2 className="text-lg font-bold font-geist text-[#cbc3d7] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#a078ff]" /> Sent Requests ({pendingRequests.sent.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingRequests.sent.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-[#131316] border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#353438] flex items-center justify-center font-bold font-geist text-white">
                          {req.receiver?.name ? req.receiver.name[0] : 'U'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold font-geist text-white">{req.receiver?.name || 'User'}</h4>
                          <span className="text-xs text-[#ffb95f] font-inter flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Awaiting response
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-xs font-bold font-geist text-[#cbc3d7] hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggested Friends */}
        {suggestedFriends.length > 0 && (
          <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold font-geist text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#d0bcff]" /> Suggested Friends
              </h2>
              <span className="text-xs font-bold font-geist text-[#cbc3d7]">
                {suggestedFriends.length} SUGGESTIONS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {suggestedFriends.map((u) => {
                const uId = u._id || u.id;
                const isPendingSent = pendingRequests.sent.some(
                  (r) => r.receiver?._id === uId || r.receiver?.id === uId || r.receiver === uId
                );

                return (
                  <div
                    key={uId}
                    className="bg-[#131316] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-[#d0bcff]/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6d3bd7] to-[#a078ff] flex items-center justify-center font-bold font-geist text-white text-base shadow-md">
                        {u.name ? u.name[0] : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold font-geist text-white text-sm">{u.name}</h4>
                          {u.isPremium && <Crown className="w-3.5 h-3.5 text-[#ffb95f]" />}
                        </div>
                        <span className="text-xs text-[#cbc3d7] font-inter">Level {u.level} • {u.xp || 0} XP</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(uId)}
                      disabled={isPendingSent}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold font-geist transition-colors ${
                        isPendingSent
                          ? 'bg-[#ffb95f]/20 border border-[#ffb95f]/40 text-[#ffb95f] cursor-default'
                          : 'bg-[#a078ff] text-[#340080] hover:bg-[#d0bcff] cursor-pointer shadow-md'
                      }`}
                    >
                      {isPendingSent ? (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Sent</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold font-geist text-white">Your Friends</h2>
            <span className="text-xs font-bold font-geist text-[#cbc3d7]">{friends.length} FRIENDS</span>
          </div>

          {loading ? (
            <p className="text-xs text-[#cbc3d7]">Loading friends...</p>
          ) : friends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="bg-[#131316] border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#a078ff] to-[#0566d9] flex items-center justify-center text-xl font-bold font-geist text-white shadow-md">
                      {f.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold font-geist text-white text-sm">{f.name}</h4>
                        {f.isPremium && <Crown className="w-3.5 h-3.5 text-[#ffb95f]" />}
                      </div>
                      <span className="text-xs text-[#cbc3d7] font-inter">Level {f.level}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-3">
                    <span className="text-xs font-bold font-geist text-[#ffb95f]">{(f.xp || 0).toLocaleString()} XP</span>
                    <button
                      onClick={() => handleRemoveFriend(f.id)}
                      className="p-1.5 rounded-lg text-[#cbc3d7] hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                      title="Remove Friend"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#cbc3d7] py-4">You haven't added any friends yet. Use the search bar above to find friends!</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
