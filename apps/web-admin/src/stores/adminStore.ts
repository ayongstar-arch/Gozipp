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

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SECURITY' | 'FINANCE' | 'OPERATIONS';

interface AdminState {
  sidebarCollapsed: boolean;
  activeSection: AdminSection;
  currentRole: AdminRole;
  permissions: string[];

  toggleSidebar: () => void;
  setActiveSection: (section: AdminSection) => void;
  setRole: (role: AdminRole) => void;
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
};

export const useAdminStore = create<AdminState>((set, get) => ({
  sidebarCollapsed: false,
  activeSection: 'dashboard',
  currentRole: 'SUPER_ADMIN',
  permissions: ROLE_PERMISSIONS['SUPER_ADMIN'],

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setActiveSection: (section) => set({ activeSection: section }),

  setRole: (role) =>
    set({
      currentRole: role,
      permissions: ROLE_PERMISSIONS[role],
    }),

  hasPermission: (action) => {
    const { permissions } = get();
    return permissions.includes(action);
  },
}));
