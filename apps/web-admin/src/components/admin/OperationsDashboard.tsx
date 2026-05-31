'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Navigation,
  Clock,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import KpiCard from './KpiCard';
import LiveActivityFeed from './LiveActivityFeed';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

// ---------- Zone Performance Data ----------
const ZONE_PERFORMANCE = [
  { name: 'วิน Central Plaza', trips: 42, pct: 100 },
  { name: 'วิน MRT สุทธิสาร', trips: 38, pct: 90 },
  { name: 'วิน BTS อารีย์', trips: 31, pct: 74 },
  { name: 'วิน หน้า MBK', trips: 27, pct: 64 },
  { name: 'วิน BTS สีลม', trips: 22, pct: 52 },
];

// ---------- Custom Tooltip ----------
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-sm font-black text-white">
        {typeof payload[0].value === 'number'
          ? payload[0].value.toLocaleString()
          : payload[0].value}
      </p>
    </div>
  );
}

export default function OperationsDashboard() {
  const { kpis, hourlyTrips, dailyRevenue, recentActivity, isLoading } = useAdminDashboard();

  const healthColor =
    kpis.systemHealth === 'HEALTHY'
      ? 'emerald'
      : kpis.systemHealth === 'WARNING'
      ? 'amber'
      : 'red';

  return (
    <div className="space-y-6 p-6">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="คนขับออนไลน์"
          value={kpis.activeDrivers}
          trend={{ value: 12, direction: 'up' }}
          icon={Users}
          color="green"
          loading={isLoading}
          index={0}
        />
        <KpiCard
          title="เที่ยววันนี้"
          value={kpis.tripsToday}
          trend={{ value: 8, direction: 'up' }}
          icon={Navigation}
          color="blue"
          loading={isLoading}
          index={1}
        />
        <KpiCard
          title="เวลารอเฉลี่ย"
          value={kpis.avgWaitTime}
          trend={{ value: 5, direction: 'down' }}
          icon={Clock}
          color="amber"
          loading={isLoading}
          index={2}
        />
        <KpiCard
          title="สถานะระบบ"
          value={kpis.systemHealth}
          icon={Activity}
          color={healthColor}
          loading={isLoading}
          index={3}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Trips Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="admin-glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">จำนวนเที่ยวรายชั่วโมง</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Hourly Trips
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase bg-white/5 px-2.5 py-1 rounded-lg">
              วันนี้
            </span>
          </div>
          <div className="h-56">
            {isLoading ? (
              <div className="w-full h-full bg-white/[0.02] rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyTrips} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#22C55E"
                    strokeWidth={2}
                    fill="url(#tripGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Daily Revenue Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="admin-glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">รายได้รายวัน</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Daily Revenue
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase bg-white/5 px-2.5 py-1 rounded-lg">
              สัปดาห์นี้
            </span>
          </div>
          <div className="h-56">
            {isLoading ? (
              <div className="w-full h-full bg-white/[0.02] rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="amount"
                    fill="#22C55E"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <LiveActivityFeed events={recentActivity} loading={isLoading} />
        </motion.div>

        {/* Win Zone Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="admin-glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">
                ผลงานประจำวิน
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Win Zone Performance
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              Top 5
            </span>
          </div>

          <div className="space-y-4">
            {ZONE_PERFORMANCE.map((zone, i) => (
              <div key={zone.name} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black text-slate-600 w-4 text-right">
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                      {zone.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-gozipp-green tabular-nums">
                    {zone.trips} เที่ยว
                  </span>
                </div>
                <div className="ml-6 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${zone.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.8 + i * 0.1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-gozipp-green to-emerald-400 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
