import { useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { apiFetch } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

export const useWebAuthn = () => {
  const { setIsLoading, setToastMessage } = useUIStore();
  const { setUser, setAuthStep } = useAuthStore();

  const registerPasskey = useCallback(async (role: 'PASSENGER' | 'DRIVER' = 'PASSENGER') => {
    setIsLoading(true);
    try {
      // 1. Get options from server
      const options = await apiFetch(`/api/v1/auth/webauthn/generate-registration-options?role=${role}`);
      
      // 2. Pass options to browser authenticator
      let attestation;
      try {
        attestation = await startRegistration(options);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          setToastMessage('การตั้งค่าถูกยกเลิก');
          return false;
        }
        throw err;
      }

      // 3. Send response to server to verify and save
      const verifyRes = await apiFetch(`/api/v1/auth/webauthn/verify-registration?role=${role}`, {
        method: 'POST',
        body: JSON.stringify(attestation),
      });

      if (verifyRes.verified) {
        setToastMessage('เปิดใช้งานการสแกนสำเร็จ!');
        return true;
      }
      
      throw new Error('Verification failed');
    } catch (err: any) {
      console.error(err);
      setToastMessage('ไม่สามารถเปิดใช้งานได้');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setToastMessage]);

  const authenticatePasskey = useCallback(async (phoneNumber: string, role: 'PASSENGER' | 'DRIVER' = 'PASSENGER') => {
    setIsLoading(true);
    try {
      // 1. Get options
      const options = await apiFetch('/api/v1/auth/webauthn/generate-authentication-options', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, role }),
      });

      // 2. Authenticate locally
      let assertion;
      try {
        assertion = await startAuthentication(options);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          return false;
        }
        throw err;
      }

      // 3. Verify on server and login
      const result = await apiFetch('/api/v1/auth/webauthn/verify-authentication', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, role, response: assertion }),
      });

      if (result.success && result.user) {
        setUser({
          id: result.user.id,
          name: result.user.name,
          phone: result.user.phone,
          email: result.user.email || '',
          avatarSeed: result.user.id.slice(0, 8),
          pointsBalance: result.user.pointsBalance ?? 0,
          freeRidesRemaining: result.user.freeRidesRemaining ?? 0,
        });
        setAuthStep('APP_SHELL');
        setToastMessage('เข้าสู่ระบบสำเร็จ');
        return true;
      }

      return false;
    } catch (err: any) {
      if (err.message === 'REQUIRE_OTP' || err.message.includes('REQUIRE_OTP')) {
        setToastMessage('ระบบตรวจพบความเสี่ยง กรุณายืนยันตัวตนใหม่ด้วย OTP');
        setAuthStep('LOGIN');
        return false;
      }
      console.error(err);
      setToastMessage('เข้าสู่ระบบด้วยสแกนใบหน้า/ลายนิ้วมือไม่สำเร็จ');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setToastMessage, setUser, setAuthStep]);

  return { registerPasskey, authenticatePasskey };
};
