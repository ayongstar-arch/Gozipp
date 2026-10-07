'use client';

import React from 'react';
import AdminRateDashboard from '@/components/AdminRateDashboard';
import LoginView from '@/features/auth/LoginView';
import { useAdminStore } from '@/stores/adminStore';

export default function Home() {
  const adminUser = useAdminStore((s) => s.adminUser);

  // No self-assumed roles: the dashboard renders only after a real
  // password + TOTP login sets the server-issued session.
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-950">
        <LoginView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminRateDashboard />
    </div>
  );
}
