import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import UpgradeModal from '../components/UpgradeModal';
import { analyticsAPI } from '../services/api';
import { PieChart, CheckCircle2, Flame, Trophy, Download, Calendar, Crown, Info, X, Filter, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3.5 py-2.5 rounded-xl shadow-2xl text-xs bg-[#2a2a2d] border border-white/10 text-white font-geist">
      <p className="font-bold text-[#cbc3d7] mb-1">{label}</p>
      <p className="font-extrabold text-[#d0bcff]">
        {payload[0].value} completion{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

function getHeatmapLevelStyle(cell) {
  if (cell.isPlaceholder) {
    return {
      background: 'var(--heatmap-placeholder)',
      border: 'none',
    };
  }
  if (cell.isFuture) {
    return {
      background: 'var(--heatmap-future)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    };
  }
  const count = cell.count || 0;
  if (count === 0) return { background: 'var(--heatmap-level-0)' };
  if (count === 1) return { background: 'var(--heatmap-level-1)' };
  if (count === 2) return { background: 'var(--heatmap-level-2)' };
  if (count <= 4) return { background: 'var(--heatmap-level-3)' };
  return {
    background: 'var(--heatmap-level-4)',
    boxShadow: 'var(--heatmap-cell-shadow)',
  };
}

function HeatmapCell({ cell, rowIndex, onClickDate }) {
  const [hovered, setHovered] = useState(false);

  if (cell.isPlaceholder) {
    return <div className="w-3.5 h-3.5 pointer-events-none opacity-0" />;
  }

  const style = getHeatmapLevelStyle(cell);
  const isTopRow = rowIndex < 2;

  return (
    <div className="relative group">
      <div
        onClick={() => !cell.isFuture && onClickDate && onClickDate(cell)}
        className={`w-3.5 h-3.5 rounded-sm transition-all ${
          cell.isFuture ? 'cursor-default' : 'cursor-pointer'
        }`}
        style={{
          ...style,
          transform: hovered && !cell.isFuture ? 'scale(1.35)' : 'scale(1)',
          zIndex: hovered ? 20 : 1,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {hovered && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[#131316] border border-white/20 text-white text-[11px] font-geist font-medium whitespace-nowrap shadow-2xl z-50 pointer-events-none ${
            isTopRow ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          <span className="font-bold text-[#d0bcff]">{cell.date || cell.fullDate}</span>
          <br />
          <span className="text-[#cbc3d7]">
            {cell.isFuture
              ? 'Upcoming'
              : cell.count === 0
              ? 'No habits completed'
              : `${cell.count} habit${cell.count !== 1 ? 's' : ''} completed`}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const { user, habits, showNotification } = useAuth();
  const [period, setPeriod] = useState('7d');
  const [chartType, setChartType] = useState('line');
  const [chartData, setChartData] = useState([]);
  const [heatmapCellsData, setHeatmapCellsData] = useState([]);
  const [heatmapMeta, setHeatmapMeta] = useState({ totalCompletions: 0, activeDaysCount: 0 });
  const [selectedHabitId, setSelectedHabitId] = useState('all');
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);
  const [heatmapError, setHeatmapError] = useState(false);
  const [overview, setOverview] = useState(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('CSV Data Export');
  const [selectedDateModal, setSelectedDateModal] = useState(null);
  const [dateLogs, setDateLogs] = useState([]);
  const [loadingDateDetails, setLoadingDateDetails] = useState(false);

  const [heatmapDays, setHeatmapDays] = useState(30);

  // Load completion chart data according to selected period
  useEffect(() => {
    analyticsAPI
      .getCompletions(period)
      .then((res) => setChartData(res.data))
      .catch(() => setChartData([]));
  }, [period]);

  // Load heatmap data (30, 90, or 365 days)
  useEffect(() => {
    setLoadingHeatmap(true);
    setHeatmapError(false);
    const habitFilter = selectedHabitId === 'all' ? null : selectedHabitId;

    analyticsAPI
      .getHeatmap(heatmapDays, habitFilter)
      .then((res) => {
        if (res.data) {
          setHeatmapCellsData(res.data.cells || res.data || []);
          setHeatmapMeta({
            totalCompletions: res.data.totalCompletions || 0,
            activeDaysCount: res.data.activeDaysCount || 0,
          });
        }
      })
      .catch(() => setHeatmapError(true))
      .finally(() => setLoadingHeatmap(false));
  }, [user.isPremium, selectedHabitId, heatmapDays]);

  // Load overview metrics
  useEffect(() => {
    analyticsAPI
      .getOverview()
      .then((res) => setOverview(res.data))
      .catch(() => setOverview(null));
  }, []);

  async function handleExportCSV() {
    if (!user.isPremium) {
      setUpgradeFeature('CSV Data Export');
      setUpgradeModalOpen(true);
      return;
    }

    try {
      const res = await analyticsAPI.exportCSV();
      const userNameStr = (user.name || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `habitforge_${userNameStr}_export_${dateStr}.csv`;

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification({ type: 'habit_added', title: `Habit data exported as ${filename}!` });
    } catch (err) {
      showNotification({ type: 'habit_added', title: 'Export failed.' });
    }
  }

  // Fetch completions for a clicked date
  async function handleCellClick(cell) {
    if (!cell.fullDate || cell.count === 0) return;
    setSelectedDateModal(cell);
    setLoadingDateDetails(true);
    try {
      const res = await analyticsAPI.getDayDetails(cell.fullDate);
      setDateLogs(res.data.logs || []);
    } catch (err) {
      setDateLogs([]);
    } finally {
      setLoadingDateDetails(false);
    }
  }

  // Dynamic habit breakdown from actual user habits
  const habitBreakdown = useMemo(() => {
    if (!habits || habits.length === 0) return [];
    return habits.map((h) => {
      const target = h.weeklyTarget || (h.frequency === 'DAILY' ? 7 : 1);
      const prog = h.weeklyProgress || 0;
      const rate = Math.min(100, Math.max(0, Math.round((prog / target) * 100)));
      return {
        id: h.id || h._id,
        name: h.title,
        icon: h.icon || '🏃',
        color: h.color || '#d0bcff',
        rate,
        totalCompletions: h.totalCompletions || 0,
      };
    });
  }, [habits]);

  // Group heatmap cells into 7-day columns (Sun-Sat)
  const { heatmapCols, monthHeaders } = useMemo(() => {
    if (!heatmapCellsData || heatmapCellsData.length === 0) {
      return { heatmapCols: [], monthHeaders: [] };
    }
    const cols = [];
    for (let i = 0; i < heatmapCellsData.length; i += 7) {
      cols.push(heatmapCellsData.slice(i, i + 7));
    }

    const headers = [];
    let lastMonth = '';
    let lastColIndex = -999;
    cols.forEach((col, idx) => {
      const firstRealCell = col.find((c) => !c.isPlaceholder) || col[0];
      const month = firstRealCell?.monthStr || '';
      if (month && month !== lastMonth && idx - lastColIndex >= 3) {
        headers.push({ colIndex: idx, label: month });
        lastMonth = month;
        lastColIndex = idx;
      }
    });

    return { heatmapCols: cols, monthHeaders: headers };
  }, [heatmapCellsData]);

  return (
    <AppLayout>
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={upgradeFeature}
      />

      {/* Date Details Modal */}
      <AnimatePresence>
        {selectedDateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedDateModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#1f1f22] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-bold font-geist text-lg text-white">
                    {selectedDateModal.date || selectedDateModal.fullDate}
                  </h3>
                  <p className="text-xs text-[#cbc3d7] font-inter">
                    {selectedDateModal.count} habit completion{selectedDateModal.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDateModal(null)}
                  className="p-1.5 rounded-xl text-[#cbc3d7] hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingDateDetails ? (
                <div className="py-8 flex justify-center text-[#d0bcff]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : dateLogs.length > 0 ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {dateLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#131316] border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{log.icon}</span>
                        <div>
                          <h4 className="text-sm font-bold font-geist text-white">{log.habitTitle}</h4>
                          <span className="text-[11px] text-[#cbc3d7] font-inter">{log.category}</span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold font-geist text-[#10b981] bg-[#10b981]/10 px-2.5 py-1 rounded-lg border border-[#10b981]/20">
                        ✓ Completed
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#cbc3d7] text-center py-6">No detailed logs found for this date.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-geist text-white tracking-tight">
              Advanced Progress Analytics
            </h1>
            <p className="text-sm sm:text-base text-[#cbc3d7] font-inter mt-1.5">
              Visualize your habits, consistency rate, and activity trends over time.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1f1f22] border border-white/10 text-white font-geist text-xs font-bold hover:border-[#d0bcff] transition-all shadow-md cursor-pointer self-start md:self-auto"
          >
            <Download className="w-4 h-4 text-[#d0bcff]" />
            <span>Export CSV Data</span>
            {!user.isPremium && <Crown className="w-3.5 h-3.5 text-[#ffb95f]" />}
          </button>
        </div>

        {/* 6 Metric Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 space-y-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7] uppercase">
              <span>Weekly Rate</span>
              <PieChart className="w-4 h-4 text-[#d0bcff]" />
            </div>
            <span className="text-2xl font-extrabold font-geist text-white">
              {overview ? `${overview.weeklyCompletionRate}%` : '0%'}
            </span>
          </div>

          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 space-y-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7] uppercase">
              <span>Monthly Rate</span>
              <PieChart className="w-4 h-4 text-[#a078ff]" />
            </div>
            <span className="text-2xl font-extrabold font-geist text-white">
              {overview ? `${overview.monthlyCompletionRate}%` : '0%'}
            </span>
          </div>

          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 space-y-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7] uppercase">
              <span>Today's Done</span>
              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            </div>
            <span className="text-2xl font-extrabold font-geist text-white">
              {overview ? overview.habitsCompletedToday : 0}
            </span>
          </div>

          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 space-y-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7] uppercase">
              <span>Current Streak</span>
              <Flame className="w-4 h-4 text-[#ffb95f]" />
            </div>
            <span className="text-2xl font-extrabold font-geist text-[#ffb95f]">
              {overview ? `${overview.currentStreak}d` : `${user.currentStreak || 0}d`}
            </span>
          </div>

          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 space-y-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7] uppercase">
              <span>Avg Daily</span>
              <Calendar className="w-4 h-4 text-[#adc6ff]" />
            </div>
            <span className="text-2xl font-extrabold font-geist text-white">
              {overview ? overview.averageDailyCompletions : '0.0'}
            </span>
          </div>

          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 space-y-1 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between text-[11px] font-bold font-geist text-[#cbc3d7] uppercase">
              <span>Top Habit</span>
              <Trophy className="w-4 h-4 text-[#ffb95f]" />
            </div>
            <span className="text-xs font-bold font-geist text-white truncate block mt-1">
              {overview?.mostConsistent?.title || 'None yet'}
            </span>
          </div>
        </div>

        {/* Consistency Chart & Time Range Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1f1f22] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold font-geist text-white">Consistency Overview</h2>
              <div className="flex items-center gap-3">
                {/* Time Range Filter Pills */}
                <div className="flex gap-1 bg-[#131316] p-1 rounded-xl border border-white/5 text-xs font-geist font-bold">
                  {['7d', '30d', '90d', '1y'].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        if ((p === '90d' || p === '1y') && !user.isPremium) {
                          setUpgradeFeature('Extended Analytics Ranges (90d & 1y)');
                          setUpgradeModalOpen(true);
                          return;
                        }
                        setPeriod(p);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        period === p ? 'bg-[#a078ff] text-[#340080]' : 'text-[#cbc3d7] hover:text-white'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Line / Bar Switch */}
                <div className="flex gap-1 bg-[#131316] p-1 rounded-xl border border-white/5 text-xs font-geist font-bold">
                  {['line', 'bar'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setChartType(t)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                        chartType === t ? 'bg-[#353438] text-white' : 'text-[#cbc3d7] hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full h-64 pt-4">
              <ResponsiveContainer width="100%" height={230}>
                {chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 15, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#353438" />
                    <XAxis dataKey="date" tick={{ fill: '#cbc3d7', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#cbc3d7', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="completions" stroke="#d0bcff" strokeWidth={3} dot={{ r: 3, fill: '#a078ff' }} activeDot={{ r: 6, fill: '#d0bcff' }} />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 15, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#353438" />
                    <XAxis dataKey="date" tick={{ fill: '#cbc3d7', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#cbc3d7', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="completions" fill="#a078ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Habit Breakdown */}
          <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-6 space-y-5">
            <h2 className="text-xl font-bold font-geist text-white">Habit Breakdown</h2>
            {habitBreakdown.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Info className="w-8 h-8 text-[#cbc3d7] mx-auto opacity-50" />
                <p className="text-xs text-[#cbc3d7] font-geist">No habits created yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {habitBreakdown.map((h) => (
                  <div key={h.id || h.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm font-inter">
                      <span className="flex items-center gap-2 text-white">
                        <span className="text-base">{h.icon}</span>
                        <span className="font-semibold font-geist truncate max-w-[140px]">{h.name}</span>
                      </span>
                      <span className="font-semibold font-geist text-[#cbc3d7]">{h.rate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#353438] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${h.rate}%`, background: h.color, boxShadow: `0 0 8px ${h.color}60` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GitHub-Style Calendar Activity Heatmap */}
        <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-6 space-y-4 overflow-visible">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-bold font-geist text-white flex items-center gap-2">
                Activity Heatmap {user.isPremium && <Crown className="w-4 h-4 text-[#ffb95f]" />}
              </h2>
              <p className="text-xs text-[#cbc3d7] font-inter mt-0.5">
                {user.isPremium
                  ? 'Showing 365 calendar days of activity history.'
                  : 'Showing 90 calendar days history (Upgrade for full 365 days).'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Range Selector Pills */}
              <div className="flex items-center gap-1 bg-[#131316] p-1 rounded-xl border border-white/10 text-xs font-geist font-bold">
                {[30, 90, 365].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      if (d === 365 && !user.isPremium) {
                        setUpgradeFeature('365-Day Activity Heatmap');
                        setUpgradeModalOpen(true);
                        return;
                      }
                      setHeatmapDays(d);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      heatmapDays === d
                        ? 'bg-[#a078ff] text-[#340080] shadow-sm'
                        : 'text-[#cbc3d7] hover:text-white'
                    }`}
                  >
                    {d === 365 ? '1 Year 👑' : `${d} Days`}
                  </button>
                ))}
              </div>

              {/* Habit Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#d0bcff]" />
                <select
                  value={selectedHabitId}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#131316] border border-white/10 text-white font-geist text-xs outline-none focus:border-[#d0bcff] cursor-pointer"
                >
                  <option value="all">All Habits</option>
                  {habits.map((h) => (
                    <option key={h.id || h._id} value={h.id || h._id}>
                      {h.icon || '🏃'} {h.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Centralized 5-Level Legend */}
              <div className="flex items-center gap-2 text-xs font-geist text-[#cbc3d7]">
                <span>Less</span>
                <div className="flex gap-1 items-center">
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: 'var(--heatmap-level-0)' }} title="0 completions" />
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: 'var(--heatmap-level-1)' }} title="1 completion" />
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: 'var(--heatmap-level-2)' }} title="2 completions" />
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: 'var(--heatmap-level-3)' }} title="3-4 completions" />
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: 'var(--heatmap-level-4)', boxShadow: 'var(--heatmap-cell-shadow)' }} title="5+ completions" />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Real Backend Summary Metrics */}
          <div className="flex flex-wrap gap-6 text-xs font-geist border-b border-white/5 pb-3 text-[#cbc3d7]">
            <div>
              <span className="font-extrabold text-white text-base mr-1.5">{heatmapMeta.totalCompletions}</span>
              <span>Total Completions</span>
            </div>
            <div>
              <span className="font-extrabold text-[#d0bcff] text-base mr-1.5">{heatmapMeta.activeDaysCount}</span>
              <span>Active Days</span>
            </div>
            <div>
              <span className="font-extrabold text-[#ffb95f] text-base mr-1.5">{overview?.currentStreak || user.currentStreak || 0}d</span>
              <span>Current Streak</span>
            </div>
          </div>

          {/* Heatmap States */}
          {loadingHeatmap ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-[#cbc3d7]">
              <Loader2 className="w-6 h-6 animate-spin text-[#d0bcff]" />
              <p className="text-xs font-geist">Loading activity calendar...</p>
            </div>
          ) : heatmapError ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-red-400 font-geist">Couldn't load activity. Please try again.</p>
              <button
                onClick={() => setSelectedHabitId((s) => s)}
                className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold font-geist hover:bg-white/10 transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4 pt-2">
              <div className="inline-block min-w-full">
                {/* Dynamic Month Headers */}
                <div className="flex pl-8 mb-2 h-5 text-[11px] font-bold font-geist text-[#cbc3d7] relative">
                  {monthHeaders.map((mh) => (
                    <span key={mh.colIndex} className="absolute" style={{ left: `${mh.colIndex * 18}px` }}>
                      {mh.label}
                    </span>
                  ))}
                </div>

                {/* 7 Weekday Rows + Calendar Columns */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1 text-[10px] font-bold font-geist text-[#cbc3d7] pr-1 select-none">
                    <span className="h-3.5 leading-[14px]">Sun</span>
                    <span className="h-3.5 leading-[14px]">Mon</span>
                    <span className="h-3.5 leading-[14px]">Tue</span>
                    <span className="h-3.5 leading-[14px]">Wed</span>
                    <span className="h-3.5 leading-[14px]">Thu</span>
                    <span className="h-3.5 leading-[14px]">Fri</span>
                    <span className="h-3.5 leading-[14px]">Sat</span>
                  </div>

                  <div className="flex gap-1">
                    {heatmapCols.map((col, ci) => (
                      <div key={ci} className="flex flex-col gap-1">
                        {col.map((cell, ri) => (
                          <HeatmapCell
                            key={`${ci}-${ri}`}
                            cell={cell}
                            rowIndex={ri}
                            onClickDate={handleCellClick}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Zero Activity Empty State */}
              {heatmapMeta.totalCompletions === 0 && (
                <div className="py-6 text-center border-t border-white/5 mt-4 space-y-1">
                  <p className="text-xs font-bold font-geist text-white">No activity recorded for this period.</p>
                  <p className="text-[11px] text-[#cbc3d7] font-inter">
                    Complete your first habit to start building your activity history.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
