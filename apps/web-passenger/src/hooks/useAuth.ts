/**
 * useAuth.ts — Passenger auth hook for production
 * Flow: first-time registration uses OTP once, then all future access uses PIN.
 */
import { useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { apiFetch } from '../services/api';

export const useAuth = () => {
  const { setAuthStep, setUser, setOtpPurpose, user, logout: storeLogout } = useAuthStore();
  const { setIsLoading, setToastMessage } = useUIStore();
  const [error, setError] = useState<string | null>(null);

  // --- STEP 1: Request OTP for first-time registration only ---
  const requestOtp = useCallback(async (
    phoneNumber: string,
    isRegistering?: boolean,
    name?: string,
    purpose: 'REGISTER' | 'RESET_PIN' = 'REGISTER'
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isRegistering && purpose !== 'RESET_PIN') {
        throw new Error('OTP ใช้เฉพาะการสมัครครั้งแรกเท่านั้น');
      }

      await apiFetch('/api/v1/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, purpose }),
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
      setOtpPurpose(purpose);
      setAuthStep('OTP');
      setToastMessage('OTP ถูกส่งไปยังเบอร์ของคุณแล้ว');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthStep, setUser, setOtpPurpose, setIsLoading, setToastMessage]);

  // --- STEP 2: Verify OTP (first-time registration only) ---
  const verifyOtp = useCallback(async (
    phoneNumber: string,
    otp: string,
    isRegistering: boolean,
    name?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isRegistering) {
        throw new Error('OTP ใช้เฉพาะการสมัครครั้งแรกเท่านั้น');
      }

      const data = await apiFetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber,
          otp,
          purpose: 'REGISTER',
          name: name || 'ผู้ใช้งานใหม่',
        }),
      });

      if (data.success || data.user || data.passengerId) {
        setUser({
          id: data.passengerId || data.user?.id,
          name: data.name || data.user?.name || name || '',
          phone: phoneNumber,
          email: data.user?.email || '',
          avatarSeed: (data.passengerId || data.user?.id || 'user').slice(0, 8),
          pointsBalance: data.pointsBalance ?? 0,
          freeRidesRemaining: data.freeRidesRemaining ?? 3,
        });

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
  }, [setAuthStep, setIsLoading, setUser]);

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
      });

      setToastMessage('ตั้ง PIN สำเร็จ!');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setToastMessage]);

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
      if (err.message === 'REQUIRE_OTP' || err.message.includes('REQUIRE_OTP')) {
        setToastMessage('ระบบต้องการให้เริ่มยืนยันบัญชีใหม่อีกครั้ง');
        setAuthStep('LOGIN');
        return false;
      }
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthStep, setIsLoading, setUser, setToastMessage]);

  const resetPinWithOtp = useCallback(async (
    phoneNumber: string,
    otp: string,
    newPin: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!/^\d{6}$/.test(newPin)) {
        throw new Error('PIN ต้องเป็นตัวเลข 6 หลัก');
      }
      const data = await apiFetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber,
          otp,
          purpose: 'RESET_PIN',
          newPin,
        }),
      });

      if (data.success || data.passengerId || data.user) {
        setUser({
          id: data.passengerId || data.user?.id,
          name: data.name || data.user?.name || '',
          phone: phoneNumber,
          email: data.user?.email || '',
          avatarSeed: (data.passengerId || data.user?.id || 'user').slice(0, 8),
          pointsBalance: data.pointsBalance ?? 0,
          freeRidesRemaining: data.freeRidesRemaining ?? 0,
        });
        setAuthStep('APP_SHELL');
        return true;
      }

      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthStep, setIsLoading, setUser]);

  // --- Refresh Access Token ---
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      await apiFetch('/api/v1/auth/refresh', {
        method: 'POST',
      });
      return true;
    } catch {
      storeLogout();
      return false;
    }
  }, [storeLogout]);

  // --- Restore Session ---
  const restoreSession = useCallback(async (): Promise<boolean> => {
    try {
      const data = await apiFetch('/api/v1/passenger/me', {
        method: 'GET',
      });
      if (data.success && data.user) {
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
      }
      return false;
    } catch {
      if (useAuthStore.getState().authStep === 'APP_SHELL') storeLogout();
      return false;
    }
  }, [setUser, setAuthStep, storeLogout]);

  // --- Logout ---
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {
      // Local logout must still complete if the network is unavailable.
    } finally {
      storeLogout();
      setToastMessage('ออกจากระบบแล้ว');
      setIsLoading(false);
    }
  }, [storeLogout, setToastMessage, setIsLoading]);

  return {
    requestOtp,
    verifyOtp,
    setupPin,
    loginWithPin,
    resetPinWithOtp,
    refreshAccessToken,
    restoreSession,
    logout,
    error,
    setError,
    user,
  };
};
