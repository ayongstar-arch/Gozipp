'use client';

import React from 'react';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { useAdminStore, type AdminSection } from '@/stores/adminStore';

const SECTION_META: Record<AdminSection, { title: string; breadcrumb: string[] }> = {
  dashboard: { title: 'Operations Dashboard', breadcrumb: ['Admin', 'Operations'] },
  drivers: { title: 'จัดการคนขับ', breadcrumb: ['Admin', 'Operations', 'Drivers'] },
  queue: { title: 'Queue Monitor', breadcrumb: ['Admin', 'Operations', 'Queue'] },
  campaigns: { title: 'แคมเปญ', breadcrumb: ['Admin', 'Growth', 'Campaigns'] },
  referrals: { title: 'ระบบแนะนำเพื่อน', breadcrumb: ['Admin', 'Growth', 'Referrals'] },
  finance: { title: 'การเงิน', breadcrumb: ['Admin', 'System', 'Finance'] },
  ai: { title: 'AI Analyst', breadcrumb: ['Admin', 'System', 'AI'] },
  audit: { title: 'Audit Log', breadcrumb: ['Admin', 'System', 'Audit'] },
  settings: { title: 'ตั้งค่า', breadcrumb: ['Admin', 'System', 'Settings'] },
};

export default function AdminHeader() {
  const { activeSection } = useAdminStore();
  const meta = SECTION_META[activeSection];

  return (
    <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between px-6 py-3 gap-4">
        {/* Left: Title + Breadcrumb */}
        <div className="min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 mb-0.5">
            {meta.breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-700 flex-shrink-0" />}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                    i === meta.breadcrumb.length - 1 ? 'text-gozipp-green' : 'text-slate-600'
                  }`}
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-lg font-black text-white tracking-tight truncate">
            {meta.title}
          </h1>
        </div>

        {/* Right: Search + Notifications + Profile */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Search (cosmetic) */}
          <div className="hidden md:flex items-center gap-2 bg-white/[0.03] border border-white/5
            rounded-xl px-3 py-2 w-52 group focus-within:border-white/10 transition-colors">
            <Search className="w-4 h-4 text-slate-600 group-focus-within:text-slate-400 transition-colors" />
            <input
              type="text"
              placeholder="ค้นหา..."
              className="bg-transparent text-xs text-slate-400 placeholder:text-slate-600
                focus:outline-none w-full"
            />
          </div>

          {/* Notification Bell */}
          <button className="relative w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5
            flex items-center justify-center hover:bg-white/[0.06] transition-colors group">
            <Bell className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full
              flex items-center justify-center text-[9px] font-black text-white
              ring-2 ring-slate-950">
              3
            </span>
          </button>

          {/* Admin Profile */}
          <button className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-xl
            hover:bg-white/[0.03] transition-colors group">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white leading-tight">Admin</div>
              <div className="text-[10px] text-slate-500 font-bold leading-tight">Super Admin</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gozipp-green to-emerald-600
              flex items-center justify-center text-[10px] font-black text-slate-950
              ring-2 ring-gozipp-green/20 group-hover:ring-gozipp-green/40 transition-all">
              SA
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
