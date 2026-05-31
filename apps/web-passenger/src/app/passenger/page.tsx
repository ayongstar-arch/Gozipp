'use client';

import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

// Auth Views
import OnboardingView from '@/features/auth/OnboardingView';
import LoginView from '@/features/auth/LoginView';
import RegisterView from '@/features/auth/RegisterView';
import OtpView from '@/features/auth/OtpView';
import PinView from '@/features/auth/PinView';

// App Views
import AppLayout from '@/components/AppLayout';
import HomeView from '@/features/booking/HomeView';
import WalletView from '@/features/wallet/WalletView';
import HistoryView from '@/features/history/HistoryView';
import ProfileView from '@/features/auth/ProfileView';

export default function PassengerPage() {
  const { authStep, user } = useAuthStore();
  const { activeTab } = useUIStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {authStep !== 'APP_SHELL' ? (
        <div className="flex-1 flex flex-col max-w-md w-full mx-auto h-[100dvh] shadow-2xl bg-[#030605] relative overflow-hidden border-x border-white/5">
          {authStep === 'ONBOARDING' && <OnboardingView />}
          {authStep === 'LOGIN' && <LoginView />}
          {authStep === 'REGISTER' && <RegisterView />}
          {authStep === 'OTP' && <OtpView phoneNumber={user?.phone || ''} isRegistering={!user?.id} name={user?.name} />}
          {authStep === 'LOGIN_PIN' && <PinView mode="LOGIN" phoneNumber={user?.phone} />}
          {authStep === 'SETUP_PIN' && <PinView mode="SETUP" userId={user?.id} />}
        </div>
      ) : (
        <AppLayout>
          {activeTab === 'HOME' && <HomeView />}
          {activeTab === 'WALLET' && <WalletView />}
          {activeTab === 'HISTORY' && <HistoryView />}
          {activeTab === 'ACTIVITY' && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
               <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-30">📋</div>
               <h3 className="text-xl font-bold text-slate-400">ยังไม่มีกิจกรรมที่รอดำเนินการ</h3>
               <p className="text-slate-600 text-sm mt-2">ประวัติการเดินทางจะปรากฏที่นี่หลังคุณใช้บริการ</p>
            </div>
          )}
          {activeTab === 'PROFILE' && <ProfileView />}
        </AppLayout>
      )}
    </div>
  );
}
