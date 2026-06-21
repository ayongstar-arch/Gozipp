/**
 * authStore.ts — Zustand Auth State (Production)
 * Persisted to localStorage for session continuity
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarSeed: string;
  pointsBalance: number;
  freeRidesRemaining: number;
  avatarUrl?: string;
  referralCode?: string;
}

type AuthStep =
  | 'ONBOARDING'
  | 'LOGIN'
  | 'LOGIN_PIN'
  | 'REGISTER_METHOD'
  | 'REGISTER'
  | 'OTP'
  | 'SETUP_PIN'
  | 'APP_SHELL';

type OtpPurpose = 'REGISTER' | 'RESET_PIN';

interface AuthState {
  user: UserProfile | null;
  authStep: AuthStep;
  otpPurpose: OtpPurpose;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAuthStep: (step: AuthStep) => void;
  setOtpPurpose: (purpose: OtpPurpose) => void;
  updatePointsBalance: (balance: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      authStep: 'ONBOARDING',
  otpPurpose: 'REGISTER',

      setUser: (user) => set({ user }),
      setAuthStep: (authStep) => set({ authStep }),
      setOtpPurpose: (otpPurpose) => set({ otpPurpose }),
      updatePointsBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, pointsBalance: balance } : null,
        })),
      logout: () =>
        set({
          user: null,
          authStep: 'LOGIN',
          otpPurpose: 'REGISTER',
        }),
    }),
    {
      name: 'gozipp-auth-storage',
      partialize: (state) => ({
        user: state.user,
        authStep: state.authStep === 'APP_SHELL' ? 'APP_SHELL' : 'ONBOARDING',
      }),
    }
  )
);
