'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  Megaphone,
  UserPlus,
  Wallet,
  Brain,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Zap,
} from 'lucide-react';
import { useAdminStore, type AdminSection } from '@/stores/adminStore';

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'OPERATIONS',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'drivers', label: 'Drivers', icon: Users },
      { id: 'queue', label: 'Queue Monitor', icon: ListOrdered },
    ],
  },
  {
    title: 'GROWTH',
    items: [
      { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
      { id: 'referrals', label: 'Referrals', icon: UserPlus },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'finance', label: 'Finance', icon: Wallet },
      { id: 'ai', label: 'AI Analyst', icon: Brain },
      { id: 'audit', label: 'Audit Log', icon: Shield },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const {
    sidebarCollapsed,
    activeSection,
    currentRole,
    toggleSidebar,
    setActiveSection,
  } = useAdminStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="h-screen bg-slate-950 border-r border-white/5 flex flex-col flex-shrink-0 overflow-hidden relative z-30"
    >
      {/* Logo Area */}
      <div className="p-4 flex items-center gap-3 border-b border-white/5 min-h-[65px]">
        <div className="w-9 h-9 rounded-xl bg-gozipp-green flex items-center justify-center flex-shrink-0
          shadow-lg shadow-gozipp-green/20">
          <Zap className="w-5 h-5 text-slate-950" />
        </div>
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <span className="text-lg font-black text-white tracking-tighter whitespace-nowrap">
                GOZIPP
              </span>
              <span className="text-[9px] font-black bg-gozipp-green/15 text-gozipp-green px-2 py-0.5
                rounded-md uppercase tracking-wider whitespace-nowrap">
                Admin
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 admin-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            {/* Group Title */}
            <AnimatePresence mode="wait">
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-5 mb-2"
                >
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    {group.title}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nav Items */}
            <div className="space-y-0.5 px-2">
              {group.items.map((navItem) => {
                const isActive = activeSection === navItem.id;
                const IconComp = navItem.icon;

                return (
                  <button
                    key={navItem.id}
                    onClick={() => setActiveSection(navItem.id)}
                    className={`
                      w-full flex items-center gap-3 rounded-xl transition-all duration-200 relative
                      ${sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
                      ${
                        isActive
                          ? 'bg-gozipp-green/10 text-gozipp-green'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                      }
                    `}
                    title={sidebarCollapsed ? navItem.label : undefined}
                  >
                    {/* Active accent bar */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-accent"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gozipp-green rounded-r-full"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}

                    <IconComp
                      className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                        isActive ? 'text-gozipp-green' : ''
                      }`}
                    />

                    <AnimatePresence mode="wait">
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.15 }}
                          className={`text-sm font-semibold whitespace-nowrap ${
                            isActive ? 'text-gozipp-green' : ''
                          }`}
                        >
                          {navItem.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Collapse Toggle + Admin Badge */}
      <div className="border-t border-white/5 p-3 space-y-3">
        {/* Admin Avatar */}
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gozipp-green to-emerald-600
            flex items-center justify-center text-xs font-black text-slate-950 flex-shrink-0
            ring-2 ring-gozipp-green/20">
            SA
          </div>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <div className="text-xs font-bold text-white truncate">Super Admin</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {currentRole.replace('_', ' ')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Button */}
        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl
            text-slate-500 hover:text-white hover:bg-white/5 transition-all text-xs font-bold`}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              <span>ย่อเมนู</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
