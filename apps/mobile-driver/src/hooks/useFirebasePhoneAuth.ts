'use client';

/**
 * useFirebasePhoneAuth.ts — Firebase Phone Authentication hook
 * Handles: Send OTP via Firebase → Verify OTP → Get Firebase ID Token → Sync with Supabase backend
 */
import { useState, useCallback, useRef } from 'react';
import { auth } from '../lib/firebaseClient';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
} from 'firebase/auth';

export const useFirebasePhoneAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  /**
   * Initialize invisible reCAPTCHA
   * @param containerId - ID of element or default to 'recaptcha-container'
   */
  const initRecaptcha = useCallback((containerId: string = 'recaptcha-container') => {
    if (typeof window === 'undefined') return;
    if (recaptchaVerifierRef.current) return;

    try {
      let el = document.getElementById(containerId);
      if (!el) {
        el = document.createElement('div');
        el.id = containerId;
        document.body.appendChild(el);
      }

      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError('reCAPTCHA หมดอายุ กรุณาลองใหม่อีกครั้ง');
          if (recaptchaVerifierRef.current) {
            try { recaptchaVerifierRef.current.clear(); } catch {}
            recaptchaVerifierRef.current = null;
          }
        },
      });
    } catch (err: any) {
      console.error('reCAPTCHA init error:', err);
    }
  }, []);

  /**
   * Send OTP to a Thai phone number
   * @param phoneNumber - Thai format e.g. "0812345678"
   * @returns true if OTP was sent successfully
   */
  const sendOtp = useCallback(async (phoneNumber: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert Thai phone number to international format (+66)
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const internationalNumber = cleanNumber.startsWith('0')
        ? '+66' + cleanNumber.substring(1)
        : cleanNumber.startsWith('66')
        ? '+' + cleanNumber
        : '+66' + cleanNumber;

      // Ensure reCAPTCHA is initialized
      if (!recaptchaVerifierRef.current) {
        initRecaptcha('recaptcha-container');
      }

      if (!recaptchaVerifierRef.current) {
        throw new Error('ไม่สามารถเตรียมระบบ reCAPTCHA ได้ กรุณารีเฟรชหน้าเว็บแล้วลองใหม่');
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        internationalNumber,
        recaptchaVerifierRef.current
      );

      confirmationResultRef.current = confirmationResult;
      return true;
    } catch (err: any) {
      console.error('Send OTP detailed error:', err);

      // Clean up reCAPTCHA verifier so user can retry immediately
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch {}
        recaptchaVerifierRef.current = null;
      }

      // Map Firebase errors to Thai messages
      const errorMap: Record<string, string> = {
        'auth/too-many-requests': 'ส่ง OTP บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
        'auth/invalid-phone-number': 'เบอร์โทรศัพท์ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
        'auth/quota-exceeded': 'โควต้าส่ง SMS ของ Firebase ประจำวันเต็มแล้ว (10 ครั้ง/วัน)',
        'auth/captcha-check-failed': 'การตรวจสอบ reCAPTCHA ล้มเหลว กรุณาลองใหม่',
        'auth/invalid-app-credential': 'การตั้งค่า Firebase ในเบราว์เซอร์ไม่ถูกต้อง',
        'auth/app-not-authorized': 'โดเมนนี้ (localhost) ยังไม่ได้รับอนุญาตใน Firebase Console',
        'auth/operation-not-allowed': 'ยังไม่ได้เปิดใช้งาน Phone Authentication ใน Firebase Console',
        'auth/network-request-failed': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Firebase ได้ กรุณาตรวจสอบอินเทอร์เน็ต',
        'auth/internal-error': 'เกิดข้อผิดพลาดภายในระบบ Firebase กรุณาลองใหม่อีกครั้ง',
      };

      const code = err.code || '';
      const mapped = errorMap[code];
      const message = mapped || (err.message ? `${err.message}` : 'ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่อีกครั้ง');
      setError(`${message}${code ? ` [${code}]` : ''}`);

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [initRecaptcha]);

  /**
   * Verify the OTP code entered by the user
   * @param otpCode - 6-digit OTP code
   * @returns Firebase ID Token if successful, null otherwise
   */
  const verifyOtp = useCallback(async (otpCode: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!confirmationResultRef.current) {
        throw new Error('ไม่พบข้อมูล OTP กรุณาขอรหัสใหม่');
      }

      const result = await confirmationResultRef.current.confirm(otpCode);
      const idToken = await result.user.getIdToken();

      return idToken;
    } catch (err: any) {
      console.error('Verify OTP error:', err);

      const errorMap: Record<string, string> = {
        'auth/invalid-verification-code': 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
        'auth/code-expired': 'รหัส OTP หมดอายุ กรุณาขอรหัสใหม่',
        'auth/session-expired': 'เซสชันหมดอายุ กรุณาขอรหัส OTP ใหม่',
      };

      const message = errorMap[err.code] || 'ยืนยัน OTP ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset state (e.g. when user navigates away)
   */
  const resetAuth = useCallback(() => {
    confirmationResultRef.current = null;
    recaptchaVerifierRef.current = null;
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    error,
    setError,
    initRecaptcha,
    sendOtp,
    verifyOtp,
    resetAuth,
  };
};
