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

interface AuthState {
  user: UserProfile | null;
  authStep: AuthStep;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAuthStep: (step: AuthStep) => void;
  updatePointsBalance: (balance: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      authStep: 'ONBOARDING',

      setUser: (user) => set({ user }),
      setAuthStep: (authStep) => set({ authStep }),
      updatePointsBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, pointsBalance: balance } : null,
        })),
      logout: () =>
        set({
          user: null,
          authStep: 'LOGIN',
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
