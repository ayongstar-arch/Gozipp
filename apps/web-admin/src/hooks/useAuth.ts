/**
 * useAuth.ts — Production Auth Hook
 * Handles: OTP request/verify, PIN setup, PIN login, logout
 * Connects to real backend endpoints: /api/v1/passenger/* and /api/v1/auth/*
 */
import { useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { API_BASE_URL } from '@/constants';

// Internal helper: authenticated fetch with JWT
const apiFetch = async (path: string, options: RequestInit = {}, token?: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
};

export const useAuth = () => {
  const { setAuthStep, setUser, setToken, token, user, logout: storeLogout } = useAuthStore();
  const { setIsLoading, setToastMessage } = useUIStore();
  const [error, setError] = useState<string | null>(null);

  // --- STEP 1: Request OTP ---
  const requestOtp = useCallback(async (
    phoneNumber: string,
    isRegistering?: boolean,
    name?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiFetch('/api/v1/passenger/otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });
      setUser({
        id: '',
        name: name || '',
        phone: phoneNumber,
        email: '',
        avatarSeed: 'user',
        pointsBalance: 0,
        freeRidesRemaining: 3,
      });
      setAuthStep('OTP');
      setToastMessage('OTP ถูกส่งไปยังเบอร์ของคุณแล้ว');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthStep, setUser, setIsLoading, setToastMessage]);

  // --- STEP 2: Verify OTP (Login or Register) ---
  const verifyOtp = useCallback(async (
    phoneNumber: string,
    otp: string,
    isRegistering: boolean,
    name?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      let data: any;

      if (isRegistering) {
        // Registration flow: verify OTP + create account
        data = await apiFetch('/api/v1/passenger/register', {
          method: 'POST',
          body: JSON.stringify({ phoneNumber, otp, name: name || 'ผู้ใช้ใหม่' }),
        });
      } else {
        // Login flow: verify OTP → check if user exists
        data = await apiFetch('/api/v1/passenger/login', {
          method: 'POST',
          body: JSON.stringify({ phoneNumber, otp }),
        });

        if (!data.isRegistered) {
          // User not registered yet, switch to register flow
          setAuthStep('REGISTER');
          return false;
        }
      }

      // Save tokens & user
      if (data.token || data.accessToken) {
        const accessToken = data.token || data.accessToken;
        const refreshToken = data.refreshToken || null;
        setToken(accessToken, refreshToken);
        setUser({
          id: data.passengerId || data.user?.id,
          name: data.name || data.user?.name || name || '',
          phone: phoneNumber,
          email: data.user?.email || '',
          avatarSeed: (data.passengerId || data.user?.id || 'user').slice(0, 8),
          pointsBalance: data.pointsBalance ?? 0,
          freeRidesRemaining: data.freeRidesRemaining ?? 3,
        });

        // Check if PIN has been set up
        try {
          const statusData = await apiFetch('/api/v1/auth/check-status', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber, role: 'PASSENGER' }),
          });
          if (statusData.hasPin) {
            setAuthStep('APP_SHELL');
          } else {
            setAuthStep('SETUP_PIN');
          }
        } catch {
          // If status check fails, go to app anyway
          setAuthStep('APP_SHELL');
        }
        return true;
      }

      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthStep, setIsLoading, setToken, setUser]);

  // --- STEP 3: Setup PIN (first time) ---
  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!/^\d{6}$/.test(pin)) {
        throw new Error('PIN ต้องเป็นตัวเลข 6 หลัก');
      }
      await apiFetch('/api/v1/auth/set-pin', {
        method: 'POST',
        body: JSON.stringify({ pin, role: 'PASSENGER' }),
      }, token);

      setToastMessage('ตั้ง PIN สำเร็จ!');
      setAuthStep('APP_SHELL');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [token, setAuthStep, setIsLoading, setToastMessage]);

  // --- STEP 3 ALT: Login with PIN (returning user) ---
  const loginWithPin = useCallback(async (phoneNumber: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!/^\d{6}$/.test(pin)) {
        throw new Error('PIN ต้องเป็นตัวเลข 6 หลัก');
      }
      const data = await apiFetch('/api/v1/auth/login-pin', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, pin, role: 'PASSENGER' }),
      });

      const accessToken = data.accessToken || data.token;
      setToken(accessToken, data.refreshToken || null);
      setUser({
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: data.user.email || '',
        avatarSeed: data.user.id.slice(0, 8),
        pointsBalance: data.user.pointsBalance ?? 0,
        freeRidesRemaining: data.user.freeRidesRemaining ?? 0,
      });
      setAuthStep('APP_SHELL');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthStep, setIsLoading, setToken, setUser]);

  // --- Refresh Access Token ---
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) return null;
    try {
      const data = await apiFetch('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      setToken(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      storeLogout();
      return null;
    }
  }, [setToken, storeLogout]);

  // --- Logout ---
  const logout = useCallback(() => {
    storeLogout();
    setToastMessage('ออกจากระบบแล้ว');
  }, [storeLogout, setToastMessage]);

  return {
    requestOtp,
    verifyOtp,
    setupPin,
    loginWithPin,
    refreshAccessToken,
    logout,
    error,
    setError,
    user,
    token,
  };
};
