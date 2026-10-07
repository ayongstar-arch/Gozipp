import { create } from 'zustand';

export type AdminSection =
  | 'dashboard'
  | 'drivers'
  | 'queue'
  | 'campaigns'
  | 'referrals'
  | 'finance'
  | 'ai'
  | 'audit'
  | 'settings';

export type AdminRole =
  | 'SUPER_ADMIN' | 'ADMIN' | 'SECURITY' | 'FINANCE' | 'OPERATIONS'
  | 'REGIONAL_ADMIN' | 'WIN_LEADER' | 'MARKETING' | 'SAFETY' | 'SUPPORT' | 'AUDITOR';

export interface AdminUser {
  id: string;
  username: string;
  role: string;
}

interface AdminState {
  sidebarCollapsed: boolean;
  activeSection: AdminSection;
  currentRole: AdminRole;
  permissions: string[];
  adminUser: AdminUser | null;

  toggleSidebar: () => void;
  setActiveSection: (section: AdminSection) => void;
  setRole: (role: AdminRole) => void;
  setAdminUser: (user: AdminUser | null) => void;
  hasPermission: (action: string) => boolean;
}

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: [
    'view_dashboard', 'manage_drivers', 'view_queue', 'override_queue',
    'manage_campaigns', 'manage_referrals', 'view_finance', 'manage_finance',
    'view_ai', 'view_audit', 'manage_settings', 'manage_roles',
  ],
  ADMIN: [
    'view_dashboard', 'manage_drivers', 'view_queue', 'override_queue',
    'manage_campaigns', 'manage_referrals', 'view_finance',
    'view_ai', 'manage_settings',
  ],
  SECURITY: [
    'view_dashboard', 'view_queue', 'view_audit', 'view_ai',
  ],
  FINANCE: [
    'view_dashboard', 'view_finance', 'manage_finance', 'view_ai',
  ],
  OPERATIONS: [
    'view_dashboard', 'manage_drivers', 'view_queue', 'override_queue',
    'manage_campaigns', 'manage_referrals',
  ],
  REGIONAL_ADMIN: [
    'view_dashboard', 'manage_drivers', 'view_queue', 'override_queue',
    'manage_campaigns', 'manage_referrals', 'view_ai',
  ],
  WIN_LEADER: [
    'view_dashboard', 'view_queue', 'manage_drivers',
  ],
  MARKETING: [
    'view_dashboard', 'manage_campaigns', 'manage_referrals', 'view_ai',
  ],
  SAFETY: [
    'view_dashboard', 'view_queue', 'view_audit', 'view_ai',
  ],
  SUPPORT: [
    'view_dashboard', 'view_queue',
  ],
  AUDITOR: [
    'view_dashboard', 'view_audit',
  ],
};

const KNOWN_ROLES = new Set(Object.keys(ROLE_PERMISSIONS));

export const useAdminStore = create<AdminState>((set, get) => ({
  sidebarCollapsed: false,
  activeSection: 'dashboard',
  // Least privilege until a real login sets the server-issued role.
  currentRole: 'AUDITOR',
  permissions: ROLE_PERMISSIONS['AUDITOR'],
  adminUser: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setActiveSection: (section) => set({ activeSection: section }),

  // Unknown server roles fall back to read-only AUDITOR (deny by default).
  // Legacy SUPER / SUPERADMIN map to full access.
  setRole: (role) => {
    const r = role as string;
    const mapped = (r === 'SUPER' || r === 'SUPERADMIN' ? 'SUPER_ADMIN' : r) as AdminRole;
    const safe = (KNOWN_ROLES.has(mapped) ? mapped : 'AUDITOR') as AdminRole;
    set({ currentRole: safe, permissions: ROLE_PERMISSIONS[safe] });
  },

  setAdminUser: (adminUser) => set({ adminUser }),

  hasPermission: (action) => {
    const { permissions } = get();
    return permissions.includes(action);
  },
}));
