'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  UserPlus,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import type { ActivityEvent, ActivityEventType } from '@/hooks/useAdminDashboard';

interface LiveActivityFeedProps {
  events: ActivityEvent[];
  loading?: boolean;
}

const EVENT_CONFIG: Record<
  ActivityEventType,
  { color: string; bg: string; border: string; icon: React.ElementType }
> = {
  TRIP_COMPLETED: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/20',
    icon: MapPin,
  },
  DRIVER_JOINED: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/20',
    icon: UserCheck,
  },
  NEW_REGISTRATION: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/20',
    icon: UserPlus,
  },
  QUEUE_OVERRIDE: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/20',
    icon: AlertTriangle,
  },
  ALERT: {
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/20',
    icon: ShieldAlert,
  },
};

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  return `${diffHrs}h ago`;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0 },
};

export default function LiveActivityFeed({ events, loading = false }: LiveActivityFeedProps) {
  if (loading) {
    return (
      <div className="admin-glass rounded-2xl p-6 space-y-4">
        <div className="h-4 w-48 rounded-full bg-white/5 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-full rounded-full bg-white/5 animate-pulse" />
              <div className="h-2 w-16 rounded-full bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="admin-glass rounded-2xl p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-black text-white tracking-tight">
            กิจกรรมล่าสุด
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Live Activity
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 kpi-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      {/* Event List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto space-y-2 max-h-[360px] pr-1 admin-scrollbar"
      >
        {events.map((event) => {
          const config = EVENT_CONFIG[event.type];
          const IconComp = config.icon;

          return (
            <motion.div
              key={event.id}
              variants={item}
              className={`flex items-start gap-3 p-3 rounded-xl border ${config.border}
                bg-white/[0.02] hover:bg-white/[0.05] transition-colors group cursor-default`}
            >
              {/* Icon */}
              <div
                className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center
                  flex-shrink-0 group-hover:scale-110 transition-transform`}
              >
                <IconComp className={`w-4 h-4 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-relaxed truncate">
                  {event.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {event.actor && (
                    <span className="text-[10px] font-bold text-slate-500">
                      {event.actor}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-600">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
