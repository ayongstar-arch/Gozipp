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
  role?: string;
}

type AuthStep =
  | 'ONBOARDING'
  | 'LOGIN'
  | 'LOGIN_PIN'
  | 'REGISTER'
  | 'OTP'
  | 'SETUP_PIN'
  | 'APP_SHELL';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  authStep: AuthStep;

  // Actions
  setToken: (token: string | null, refresh?: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  setAuthStep: (step: AuthStep) => void;
  updatePointsBalance: (balance: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      authStep: 'ONBOARDING',

      setToken: (token, refreshToken = null) => set({ token, refreshToken }),
      setUser: (user) => set({ user }),
      setAuthStep: (authStep) => set({ authStep }),
      updatePointsBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, pointsBalance: balance } : null,
        })),
      logout: async () => {
        try {
            await fetch('http://localhost:3000/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        } catch (e) {}
        set({
          token: null,
          refreshToken: null,
          user: null,
          authStep: 'LOGIN',
        });
      },
    }),
    {
      name: 'gozipp-auth-storage',
      partialize: (state) => ({
        user: state.user,
        authStep: state.authStep === 'APP_SHELL' ? 'APP_SHELL' : 'LOGIN',
      }),
    }
  )
);
