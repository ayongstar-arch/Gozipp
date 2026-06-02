import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

// Auth Views
import OnboardingView from '../features/auth/OnboardingView';
import LoginView from '../features/auth/LoginView';
import RegisterView from '../features/auth/RegisterView';
import OtpView from '../features/auth/OtpView';
import PinView from '../features/auth/PinView';

// App Views
import AppLayout from '../components/AppLayout';
import HomeView from '../features/booking/HomeView';
import WalletView from '../features/wallet/WalletView';
import HistoryView from '../features/history/HistoryView';
import ProfileView from '../features/auth/ProfileView';

const PassengerMain: React.FC = () => {
  const { authStep, user } = useAuthStore();
  const { activeTab } = useUIStore();

  // 1. Render Auth Flow
  if (authStep === 'ONBOARDING') return <OnboardingView />;
  if (authStep === 'LOGIN') return <LoginView />;
  if (authStep === 'REGISTER') return <RegisterView />;
  if (authStep === 'OTP') return <OtpView phoneNumber={user?.phone || ''} isRegistering={!user?.id} name={user?.name} />;
  if (authStep === 'LOGIN_PIN') return <PinView isSetup={false} />;
  if (authStep === 'SETUP_PIN') return <PinView isSetup={true} />;

  // 2. Render App Shell
  return (
    <AppLayout>
      {activeTab === 'HOME' && <HomeView />}
      {activeTab === 'WALLET' && <WalletView />}
      {activeTab === 'HISTORY' && <HistoryView />}
      {activeTab === 'ACTIVITY' && <div className="p-6">หน้ากิจกรรม (ยังไม่เปิดบริการ)</div>}
      {activeTab === 'PROFILE' && <ProfileView />}
    </AppLayout>
  );
};

export default PassengerMain;
