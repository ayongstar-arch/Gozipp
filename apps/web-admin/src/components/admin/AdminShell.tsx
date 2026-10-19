'use client';

import React from 'react';
import Sidebar from './Sidebar';
import AdminHeader from './AdminHeader';
import OperationsDashboard from './OperationsDashboard';
import AuditLogViewer from './AuditLogViewer';
import AdminRateDashboard from '@/components/AdminRateDashboard';
import ReferralManagement from './ReferralManagement';
import { useAdminStore } from '@/stores/adminStore';

function PlaceholderView({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10">
      <div className="w-16 h-16 bg-gozipp-green/10 rounded-2xl flex items-center justify-center text-3xl mb-6">
        🚧
      </div>
      <h2 className="text-xl font-black text-white mb-2">{title}</h2>
      <p className="text-sm text-slate-500 text-center max-w-md">{subtitle}</p>
    </div>
  );
}

export default function AdminShell() {
  const { activeSection } = useAdminStore();

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <OperationsDashboard />;

      case 'drivers':
        return <AdminRateDashboard />;

      case 'finance':
        return <AdminRateDashboard />;

      case 'ai':
        return <AdminRateDashboard />;

      case 'audit':
        return <AuditLogViewer />;

      case 'queue':
        return (
          <PlaceholderView
            title="ตรวจสอบคิววินมอเตอร์ไซค์ (Queue Monitor)"
            subtitle="ระบบตรวจสอบคิววินและลำดับการเรียกจะเชื่อมต่ออัตโนมัติเมื่อมีคนขับออนไลน์ในพื้นที่"
          />
        );

      case 'campaigns':
        return (
          <PlaceholderView
            title="แคมเปญและโปรโมชัน (Campaigns)"
            subtitle="ระบบจัดการแคมเปญส่งเสริมการตลาดและโค้ดส่วนลด"
          />
        );

      case 'referrals':
        return <ReferralManagement />;

      case 'settings':
        return (
          <PlaceholderView
            title="ตั้งค่าระบบส่วนกลาง (System Settings)"
            subtitle="ศูนย์ควบคุมการตั้งค่าระบบ ความปลอดภัย และนโยบายแพลตฟอร์ม"
          />
        );

      default:
        return <OperationsDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto admin-scrollbar">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
