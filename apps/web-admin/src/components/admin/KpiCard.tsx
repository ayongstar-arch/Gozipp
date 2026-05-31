'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon: LucideIcon;
  color?: string;
  loading?: boolean;
  index?: number;
}

const COLOR_MAP: Record<string, { bg: string; text: string; glow: string }> = {
  green: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
  blue: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/10',
  },
  amber: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/10',
  },
  emerald: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
  purple: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/10',
  },
  red: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    glow: 'shadow-red-500/10',
  },
};

export default function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
  color = 'green',
  loading = false,
  index = 0,
}: KpiCardProps) {
  const palette = COLOR_MAP[color] || COLOR_MAP.green;

  if (loading) {
    return (
      <div className="admin-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
        </div>
        <div className="h-8 w-32 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-3 w-20 rounded-full bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`
        bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6
        hover:border-white/10 transition-all duration-300 group
        shadow-xl ${palette.glow}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${palette.bg} flex items-center justify-center
          group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className={`w-5 h-5 ${palette.text}`} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              trend.direction === 'up'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-3xl font-black text-white tracking-tight mb-1 tabular-nums">
        {value}
      </div>

      {/* Title */}
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        {title}
      </div>
    </motion.div>
  );
}
