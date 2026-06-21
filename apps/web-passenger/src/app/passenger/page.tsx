'use client';

import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuth } from '@/hooks/useAuth';

// Auth Views
import OnboardingView from '@/features/auth/OnboardingView';
import LoginView from '@/features/auth/LoginView';
import RegisterMethodView from '@/features/auth/RegisterMethodView';
import RegisterView from '@/features/auth/RegisterView';
import OtpView from '@/features/auth/OtpView';
import PinView from '@/features/auth/PinView';

// App Views
import AppLayout from '@/components/AppLayout';
import HomeView from '@/features/booking/HomeView';
import WalletView from '@/features/wallet/WalletView';
import HistoryView from '@/features/history/HistoryView';
import ProfileView from '@/features/auth/ProfileView';
import TrackingView from '@/features/tracking/TrackingView';
import { useRideStore } from '@/stores/rideStore';

export default function PassengerPage() {
  const { authStep, user, otpPurpose } = useAuthStore();
  const { activeTab } = useUIStore();
  const { restoreSession, requestOtp } = useAuth();
  const { currentTripId, rideStatus } = useRideStore();
  const [isBooting, setIsBooting] = React.useState(true);
  const isTracking = Boolean(currentTripId && ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(rideStatus || ''));
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const setOtpPurpose = useAuthStore((state) => state.setOtpPurpose);

  React.useEffect(() => {
    restoreSession();
    const timer = setTimeout(() => setIsBooting(false), 1200);
    return () => clearTimeout(timer);
  }, [restoreSession]);

  if (isBooting) {
    return (
      <div className="min-h-screen bg-[#04070B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="w-28 h-28 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
            <img src="/logo-gozipp.png" alt="GOZIPP" className="w-20 h-20 object-contain" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-black tracking-tight text-white">GOZIPP</div>
            <div className="text-slate-400 text-sm">Ride Fast. Move Smart.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {authStep !== 'APP_SHELL' ? (
        <div className="flex-1 flex flex-col max-w-md w-full mx-auto h-[100dvh] shadow-2xl bg-black relative overflow-hidden border-x border-white/5">
          {authStep === 'ONBOARDING' && <OnboardingView />}
          {authStep === 'LOGIN' && <LoginView />}
          {authStep === 'REGISTER_METHOD' && <RegisterMethodView />}
          {authStep === 'REGISTER' && <RegisterView />}
          {authStep === 'OTP' && <OtpView phoneNumber={user?.phone || ''} isRegistering={otpPurpose === 'REGISTER'} name={user?.name} />}
          {authStep === 'LOGIN_PIN' && <PinView mode="LOGIN" phoneNumber={user?.phone} onForgotPin={async () => {
            if (!user?.phone) return;
            await requestOtp(user.phone, true, undefined, 'RESET_PIN');
            setAuthStep('OTP');
          }} />}
          {authStep === 'SETUP_PIN' && <PinView mode="SETUP" userId={user?.id} />}
        </div>
      ) : (
        <AppLayout hideNavigation={isTracking}>
          {isTracking ? <TrackingView /> : activeTab === 'HOME' && <HomeView />}
          {!isTracking && activeTab === 'WALLET' && <WalletView />}
          {!isTracking && activeTab === 'HISTORY' && <HistoryView />}
          {!isTracking && activeTab === 'ACTIVITY' && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
               <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-30">📋</div>
               <h3 className="text-xl font-bold text-slate-400">ยังไม่มีกิจกรรมที่รอดำเนินการ</h3>
               <p className="text-slate-600 text-sm mt-2">ประวัติการเดินทางจะปรากฏที่นี่หลังคุณใช้บริการ</p>
            </div>
          )}
          {!isTracking && activeTab === 'PROFILE' && <ProfileView />}
        </AppLayout>
      )}
    </div>
  );
}
