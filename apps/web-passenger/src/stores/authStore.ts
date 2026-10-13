/**
 * authStore.ts — Zustand Auth State (Production)
 * Persisted to localStorage for session continuity with PIN lock enforcement
 * Automatically defaults to LOGIN_PIN for registered users with a PIN
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
  switchAccount: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      authStep: 'LOGIN',
      otpPurpose: 'REGISTER',

      setUser: (user) => {
        if (typeof window !== 'undefined' && user?.phone) {
          localStorage.setItem('gozipp_saved_phone', user.phone);
          if (user.name) localStorage.setItem('gozipp_saved_name', user.name);
          localStorage.setItem('gozipp_has_pin', 'true');
        }
        set({ user });
      },
      setAuthStep: (authStep) => set({ authStep }),
      setOtpPurpose: (otpPurpose) => set({ otpPurpose }),
      updatePointsBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, pointsBalance: balance } : null,
        })),
      logout: () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('gozipp_pin_passed');
          localStorage.removeItem('gozipp_pin_passed');
        }
        // Retain saved phone on device so returning user enters PIN directly
        set((state) => {
          const hasSavedPhone =
            Boolean(state.user?.phone) ||
            (typeof window !== 'undefined' && Boolean(localStorage.getItem('gozipp_saved_phone')));
          return {
            authStep: hasSavedPhone ? 'LOGIN_PIN' : 'LOGIN',
            otpPurpose: 'REGISTER',
          };
        });
      },
      switchAccount: () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('gozipp_pin_passed');
          localStorage.removeItem('gozipp_pin_passed');
          localStorage.removeItem('gozipp_saved_phone');
          localStorage.removeItem('gozipp_saved_name');
          localStorage.removeItem('gozipp_has_pin');
          sessionStorage.setItem('gozipp_explicit_switch', 'true');
        }
        set({
          user: null,
          authStep: 'LOGIN',
          otpPurpose: 'REGISTER',
        });
      },
    }),
    {
      name: 'gozipp-auth-storage',
      partialize: (state) => {
        const hasSavedPhone =
          Boolean(state.user?.phone) ||
          (typeof window !== 'undefined' && Boolean(localStorage.getItem('gozipp_saved_phone')));
        return {
          user: state.user,
          // Always require PIN verification on returning sessions if a user exists
          authStep: hasSavedPhone ? 'LOGIN_PIN' : 'LOGIN',
        };
      },
    }
  )
);
