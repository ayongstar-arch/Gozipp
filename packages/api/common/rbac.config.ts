/**
 * RBAC Configuration — Role-to-Permission Mapping
 * 
 * Permission format: "resource.action"
 * Wildcard '*' grants access to everything (SUPER, SUPERADMIN).
 * 
 * Role hierarchy:
 *   SUPER / SUPERADMIN  →  full access (wildcard)
 *   OPERATIONS          →  day-to-day ops (drivers, queue, reports, campaigns)
 *   ADMIN (legacy)      →  same as OPERATIONS (backwards compatibility)
 *   SECURITY            →  audit logs, driver suspension, security config
 *   SUPPORT             →  read-only access to drivers, passengers, trips, queue
 *   FINANCE             →  financial reports, daily close, wallet reads
 *   DRIVER / PASSENGER  →  no admin permissions
 */

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER: ['*'],
  SUPERADMIN: ['*'],
  OPERATIONS: [
    'dashboard.read',
    'drivers.manage',
    'drivers.read',
    'queue.manage',
    'queue.read',
    'reports.read',
    'campaigns.manage',
  ],
  ADMIN: [
    'dashboard.read',
    'drivers.manage',
    'drivers.read',
    'queue.manage',
    'queue.read',
    'reports.read',
    'campaigns.manage',
  ],
  SECURITY: [
    'audit.read',
    'audit.export',
    'drivers.suspend',
    'drivers.read',
    'security.manage',
  ],
  SUPPORT: [
    'drivers.read',
    'passengers.read',
    'trips.read',
    'queue.read',
  ],
  FINANCE: [
    'finance.read',
    'finance.close',
    'wallets.read',
    'reports.read',
  ],
  DRIVER: [],
  PASSENGER: [],
};

/**
 * Check if a role has a specific permission.
 * Returns true if the role has wildcard ('*') or the exact permission string.
 */
export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

/**
 * Get all permissions for a given role.
 */
export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || [];
}
