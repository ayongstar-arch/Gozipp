import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { useFirebasePhoneAuth } from '../../hooks/useFirebasePhoneAuth';
import { motion } from 'framer-motion';

const RegisterView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { setUser, setOtpPurpose } = useAuthStore();
  const { isLoading: authLoading, setIsLoading, setToastMessage } = useUIStore();
  const { verifyOtp: verifyBackendOtp, error: backendError, setError: setBackendError } = useAuth();
  const {
    isLoading: firebaseLoading,
    error: firebaseError,
    setError: setFirebaseError,
    initRecaptcha,
    sendOtp,
    verifyOtp: verifyFirebaseOtp,
  } = useFirebasePhoneAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [referralCode, setReferralCode] = useState('');
  
  // World-Class OTP Flow States
  const [otpStep, setOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [usedBackendFallback, setUsedBackendFallback] = useState(false);

  const isLoading = authLoading || firebaseLoading;
  const error = firebaseError || backendError;
  const setError = (msg: string | null) => {
    setFirebaseError(msg);
    setBackendError(msg);
  };

  // Initialize reCAPTCHA on mount and read stored referral code
  useEffect(() => {
    initRecaptcha('recaptcha-container');
    if (typeof window !== 'undefined') {
      const storedRef = localStorage.getItem('gozipp_referrer_code');
      if (storedRef) {
        setReferralCode(storedRef);
      }
    }
  }, [initRecaptcha]);

  // Live Countdown Timer for Resend OTP
  useEffect(() => {
    if (otpStep && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpStep, countdown]);

  // STEP 1: Send OTP via Firebase (with backend fallback)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneNumber = formData.phone.replace(/\D/g, '');
    const name = formData.name.trim();
    if (name.length < 2) return setError('กรุณากรอกชื่อ-นามสกุล');
    if (!/^0[689]\d{8}$/.test(phoneNumber)) {
      return setError('กรุณากรอกเบอร์โทรศัพท์มือถือไทย 10 หลัก');
    }

    setError(null);
    let success = false;
    try {
      success = await sendOtp(phoneNumber);
    } catch (fbErr) {
      console.warn('Firebase sendOtp error, attempting backend fallback:', fbErr);
    }

    // Smart Fallback: if Firebase daily quota is exceeded or fails, use backend SMS API
    if (!success) {
      try {
        const res = await fetch('/api/v1/auth/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber, purpose: 'REGISTER' }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          success = true;
          setUsedBackendFallback(true);
        } else {
          setError(data.message || data.error || 'ไม่สามารถส่ง OTP ได้ กรุณารอสักครู่แล้วลองใหม่');
        }
      } catch {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      }
    }

    if (success) {
      setOtpStep(true);
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setToastMessage('OTP ถูกส่งไปยังเบอร์ของคุณแล้ว');
      setTimeout(() => {
        document.getElementById('otp-0')?.focus();
      }, 100);
    }
  };

  // RESEND OTP: World-class resend action
  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    const phoneNumber = formData.phone.replace(/\D/g, '');

    try {
      let sent = false;
      // 1. Try Firebase first
      try {
        sent = await sendOtp(phoneNumber);
      } catch (fbErr) {
        console.warn('Firebase resend error, attempting backend fallback:', fbErr);
      }

      // 2. If Firebase quota exceeded or failed, fall back to backend SMS API
      if (!sent) {
        try {
          const res = await fetch('/api/v1/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, purpose: 'REGISTER' }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            sent = true;
            setUsedBackendFallback(true);
          } else {
            setError(data.message || data.error || 'ไม่สามารถส่ง OTP ได้ กรุณารอสักครู่แล้วลองใหม่');
          }
        } catch {
          setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
      }

      if (sent) {
        setCountdown(60);
        setOtpDigits(['', '', '', '', '', '']);
        setToastMessage(`✅ ส่งรหัส OTP ใหม่ไปยัง ${formData.phone} เรียบร้อยแล้ว`);
        setTimeout(() => {
          document.getElementById('otp-0')?.focus();
        }, 100);
      }
    } finally {
      setIsResending(false);
    }
  };

  // Input Handlers for 6-digit OTP Box UX
  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value.substring(value.length - 1);
    setOtpDigits(newOtp);
    setError(null);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newOtp = [...otpDigits];
        newOtp[index - 1] = '';
        setOtpDigits(newOtp);
        document.getElementById(`otp-${index - 1}`)?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtpDigits(newOtp);
    setError(null);
    const nextIdx = Math.min(pasted.length, 5);
    document.getElementById(`otp-${nextIdx}`)?.focus();
  };

  const completeAuthSuccess = (data: any, phoneNumber: string) => {
    setUser({
      id: data.passengerId || data.user?.id || '',
      name: data.name || data.user?.name || formData.name,
      phone: phoneNumber,
      email: data.user?.email || '',
      avatarSeed: (data.passengerId || data.user?.id || 'user').slice(0, 8),
      pointsBalance: data.pointsBalance ?? 0,
      freeRidesRemaining: data.freeRidesRemaining ?? 3,
    });

    if (data.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('gozipp_access_token', data.accessToken);
    }
    if ((data.passengerId || data.user?.id) && typeof window !== 'undefined') {
      localStorage.setItem('gozipp_passenger_id', data.passengerId || data.user?.id);
    }

    if (data.hasPin) {
      setAuthStep('APP_SHELL');
    } else {
      setAuthStep('SETUP_PIN');
    }
    setToastMessage('ลงทะเบียนสำเร็จ! 🎉');
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) return setError('กรุณากรอกรหัส OTP 6 หลัก');

    const phoneNumber = formData.phone.replace(/\D/g, '');

    if (usedBackendFallback) {
      try {
        setIsLoading(true);
        const res = await fetch('/api/v1/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber,
            otp: code,
            purpose: 'REGISTER',
            name: formData.name.trim(),
            referralCode: referralCode.trim().toUpperCase() || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && (data.success || data.user || data.passengerId)) {
          completeAuthSuccess(data, phoneNumber);
        } else {
          setError(data.message || data.error || 'รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่');
        }
      } catch {
        setError('เกิดข้อผิดพลาดในการตรวจสอบ OTP');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const idToken = await verifyFirebaseOtp(code);
    if (idToken) {
      try {
        setIsLoading(true);
        const res = await fetch('/api/v1/auth/firebase-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            phoneNumber,
            name: formData.name.trim(),
            role: 'PASSENGER',
            purpose: 'REGISTER',
            referralCode: referralCode.trim().toUpperCase() || undefined,
          }),
        });
        const data = await res.json();

        if (data.success || data.user || data.passengerId) {
          completeAuthSuccess(data, phoneNumber);
        } else {
          setError(data.message || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่');
        }
      } catch (err: any) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Fallback verify check via backend
      try {
        const res = await fetch('/api/v1/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber,
            otp: code,
            purpose: 'REGISTER',
            name: formData.name.trim(),
            referralCode: referralCode.trim().toUpperCase() || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && (data.success || data.user || data.passengerId)) {
          completeAuthSuccess(data, phoneNumber);
          return;
        }
      } catch {}
    }
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit relative overflow-hidden text-white w-full">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (otpStep) {
              setOtpStep(false);
              setOtpDigits(['', '', '', '', '', '']);
              setError(null);
            } else {
              setAuthStep('ONBOARDING');
            }
          }}
          className="w-12 h-12 bg-white/5 border border-white/5 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-2xl shadow-sm"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      </div>

      {/* Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 flex flex-col justify-between">
        <div className="flex-1 relative w-full">
          <div className="absolute bottom-0 left-0 right-0 h-[45vh] overflow-hidden flex items-end w-full">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
            <img src="/bg-city-realistic.png" alt="Cityscape" className="w-full h-full object-cover object-bottom opacity-80 mix-blend-screen" />
          </div>
        </div>
        <div className="h-[320px] w-full shrink-0"></div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-start mt-8 w-full z-10 overflow-y-auto pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-40 h-40 flex items-center justify-center relative z-20 mix-blend-screen mb-1"
        >
          <div 
            className="absolute inset-0 rounded-full pointer-events-none scale-125"
            style={{
              background: 'radial-gradient(circle, rgba(163,255,63,0.15) 0%, transparent 70%)'
            }}
          />
          <img 
            src="/logo-gozipp.png" 
            className="w-32 h-auto object-contain relative z-10 contrast-125" 
            alt="Gozipp" 
          />
        </motion.div>
        
        {/* Form Container */}
        <div className="w-full max-w-md mx-auto px-6 relative z-20 flex flex-col pb-8">
          {/* Text Headers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-5 mt-1"
          >
            <h2 className="text-3xl font-extrabold text-white mb-1.5 tracking-tight drop-shadow-lg">
              {otpStep ? 'ยืนยันรหัส OTP' : 'ลงทะเบียนใหม่'}
            </h2>
            <div className="text-gray-300 font-medium text-xs space-y-0.5 drop-shadow-md text-balance">
              {otpStep ? (
                <p>กรอกรหัส 6 หลักเพื่อเปิดใช้งานบัญชีของคุณ</p>
              ) : (
                <p>เข้าร่วม GOZIPP เดินทางฉลาด รวดเร็ว ทั่วเมือง</p>
              )}
            </div>
          </motion.div>

          {/* Invisible reCAPTCHA container */}
          <div id="recaptcha-container"></div>

          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={otpStep ? handleVerifyOtp : handleSendOtp} 
            className="space-y-4"
          >
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-4 text-xs flex items-center gap-2 backdrop-blur-md"
              >
                <span className="text-base">⚠️</span> {error}
              </motion.div>
            )}

            {!otpStep ? (
              /* STEP 1: Name + Phone */
              <div className="space-y-5">
                <label className="block relative">
                  <span className="absolute -top-3 left-6 bg-black px-2 text-xs font-bold text-[#A3FF3F] uppercase tracking-wider z-10">ชื่อ-นามสกุล</span>
                  <input
                    type="text"
                    placeholder="เช่น สมชาย ใจดี"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl text-xl font-bold text-white outline-none focus:border-[#A3FF3F] transition-all backdrop-blur-2xl placeholder:text-gray-600 shadow-inner"
                    required
                  />
                </label>

                <label className="block relative">
                  <span className="absolute -top-3 left-6 bg-black px-2 text-xs font-bold text-[#A3FF3F] uppercase tracking-wider z-10">เบอร์โทรศัพท์</span>
                  <input
                    type="tel"
                    placeholder="081-234-5678"
                    value={formData.phone}
                    inputMode="numeric"
                    maxLength={12}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      const formatted = digits.length > 6
                        ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
                        : digits.length > 3
                          ? `${digits.slice(0, 3)}-${digits.slice(3)}`
                          : digits;
                      setFormData({ ...formData, phone: formatted });
                      setError(null);
                    }}
                    className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl text-xl font-bold text-white outline-none focus:border-[#A3FF3F] transition-all backdrop-blur-2xl placeholder:text-gray-600 shadow-inner"
                    required
                  />
                </label>

                {/* Referral Code Badge or Optional Input */}
                {referralCode ? (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎁</span>
                      <span>รหัสแนะนำ: <strong className="text-white tracking-wider">{referralCode}</strong></span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-gozipp-green">
                      รับสิทธิ์นั่งฟรี 3 เที่ยว
                    </span>
                  </div>
                ) : (
                  <label className="block relative">
                    <span className="absolute -top-3 left-6 bg-black px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10">
                      รหัสแนะนำเพื่อน (ถ้ามี)
                    </span>
                    <input
                      type="text"
                      placeholder="เช่น P-XXXXXX หรือเว้นว่างไว้"
                      value={referralCode}
                      onChange={e => setReferralCode(e.target.value.toUpperCase().trim())}
                      className="w-full bg-white/5 border border-white/5 p-3.5 rounded-3xl text-sm font-bold text-white outline-none focus:border-[#A3FF3F] transition-all backdrop-blur-2xl placeholder:text-gray-600 shadow-inner tracking-wider"
                    />
                  </label>
                )}
              </div>
            ) : (
              /* STEP 2: World-Class OTP Input & Resend Screen */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Header Info */}
                <div className="text-center space-y-1">
                  <p className="text-gray-400 text-xs">ระบบได้ส่งรหัสยืนยัน 6 หลัก (OTP) ไปที่เบอร์</p>
                  <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#A3FF3F] animate-pulse" />
                    <span className="text-[#A3FF3F] font-black text-base tracking-wider font-mono">{formData.phone}</span>
                  </div>
                </div>

                {/* 6-Digit Individual Input Boxes */}
                <div className="flex gap-2.5 justify-center py-2">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      className="w-12 h-16 bg-white/5 rounded-2xl border border-white/10 text-2xl font-black text-white text-center outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] focus:bg-white/10 transition-all shadow-xl backdrop-blur-md"
                    />
                  ))}
                </div>

                {/* Countdown and Resend OTP Controller */}
                <div className="flex flex-col items-center gap-3 pt-1">
                  {countdown > 0 ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 shadow-sm">
                      <span>⏱️ ขอรหัสใหม่ได้ในอีก</span>
                      <strong className="text-white font-mono bg-white/10 px-2 py-0.5 rounded-md text-xs">{countdown}</strong>
                      <span>วินาที</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResending}
                      className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#A3FF3F]/15 border border-[#A3FF3F]/50 hover:bg-[#A3FF3F]/25 text-[#A3FF3F] font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-[#A3FF3F]/10 hover:shadow-[#A3FF3F]/20"
                    >
                      <svg
                        className={`w-4 h-4 ${isResending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{isResending ? 'กำลังส่งรหัส OTP ใหม่...' : 'ขอรับรหัส OTP อีกครั้ง (Resend OTP)'}</span>
                    </button>
                  )}

                  {/* Edit Phone Number Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setOtpDigits(['', '', '', '', '', '']);
                      setError(null);
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 pt-1"
                  >
                    <span>เบอร์โทรศัพท์ไม่ถูกต้อง?</span>
                    <span className="text-[#A3FF3F] font-bold underline underline-offset-2">แก้ไขเบอร์โทรศัพท์</span>
                  </button>
                </div>

                {/* Troubleshooting / Help Accordion */}
                <div className="border-t border-white/10 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-[11px] text-gray-400 hover:text-gray-200 flex items-center justify-between w-full font-medium py-1 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>❓</span>
                      <span>ไม่ได้รับรหัส OTP? แตะเพื่อดูวิธีแก้ไข</span>
                    </span>
                    <span className="text-xs font-bold">{showHelp ? '▲' : '▼'}</span>
                  </button>

                  {showHelp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-white/5 rounded-2xl p-3.5 mt-2 border border-white/10 text-[11px] text-gray-300 space-y-2.5 leading-relaxed backdrop-blur-md"
                    >
                      <div className="flex items-start gap-2">
                        <span>📱</span>
                        <div>
                          <strong className="text-white">ตรวจสอบเบอร์โทร:</strong> ระบบส่งไปที่{' '}
                          <span className="text-[#A3FF3F] font-mono">{formData.phone}</span> หากเบอร์ผิดสามารถกด "แก้ไขเบอร์โทรศัพท์" ด้านบนได้ทันที
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>📶</span>
                        <div>
                          <strong className="text-white">สัญญาณมือถือ:</strong> ตรวจสอบว่าสัญญาณโทรศัพท์ปกติ และไม่ได้เปิดโหมดเครื่องบิน (Airplane Mode)
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>📩</span>
                        <div>
                          <strong className="text-white">กล่องข้อความขยะ:</strong> ตรวจสอบในโฟลเดอร์ SMS สแปม หรือรายการเบอร์ที่ถูกบล็อก
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>⏱️</span>
                        <div>
                          <strong className="text-white">ความล่าช้าของเครือข่าย:</strong> ผู้ให้บริการเครือข่ายอาจใช้เวลาจัดส่ง 1-2 นาที เมื่อเวลานับถอยหลังหมดสามารถกด "ขอรับรหัส OTP อีกครั้ง" ได้ทันที
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            <motion.button
              id="send-otp-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || (otpStep && otpDigits.join('').length < 6)}
              className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-extrabold py-4 rounded-3xl text-lg transition-all disabled:opacity-50 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.15)] hover:shadow-[0_0_30px_rgba(163,255,63,0.3)] mt-6"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <span className="relative z-10">
                {isLoading
                  ? 'กำลังดำเนินการ...'
                  : otpStep
                    ? 'ยืนยันรหัส OTP'
                    : 'ขอรับรหัส OTP'}
              </span>
            </motion.button>
          </motion.form>

          {/* Social Buttons only on Step 1 */}
          {!otpStep && (
            <>
              {/* Divider */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center w-full my-6"
              >
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="px-4 text-xs font-medium text-gray-500">หรือสมัครด้วย</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </motion.div>

              {/* Social Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                {/* Google Method */}
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => useUIStore.getState().setToastMessage('Google Sign-in จะเปิดหลังรองรับการยืนยันเบอร์โทรศัพท์')}
                  className="w-full bg-[#11151C] border border-white/5 rounded-3xl p-4 flex items-center justify-center gap-3 transition-colors shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-white font-bold text-sm tracking-wide">Google</span>
                </motion.button>

                {/* Line Method */}
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => useUIStore.getState().setToastMessage('ระบบสมัครด้วย Line ยังไม่เปิดให้บริการ')}
                  className="w-full bg-[#11151C] border border-white/5 rounded-3xl p-4 flex items-center justify-center gap-3 transition-colors shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6">
                    <circle cx="12" cy="12" r="11" fill="#00C300"/>
                    <path fill="#FFF" d="M17.3 11.2c0-2.4-2.4-4.4-5.3-4.4s-5.3 2-5.3 4.4c0 2.2 2 4 4.6 4.3.2 0 .5.1.5.3s-.1.4-.2.8c0 0-.2.6-.2.7-.1.3.3.5.7.3.5-.2 2.8-1.7 3.8-2.8.9-1.2 1.4-2.1 1.4-3.6zm-6 1.4H9.6c-.2 0-.3-.1-.3-.3V9c0-.2.1-.3.3-.3h1.8c.2 0 .3.1.3.3s-.1.3-.3.3h-1.4v1h1.4c.2 0 .3.1.3.3s-.1.3-.3.3h-1.4v1.1h1.4c.2 0 .3.1.3.3s-.1.3-.3.3zm2.5 0h-.6c-.2 0-.3-.1-.3-.3v-3c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3zm2.2-.4l-1.3-1.8v1.8c0 .2-.1.3-.3.3s-.3-.1-.3-.3V9c0-.2.1-.3.3-.3s.2 0 .3.1l1.3 1.8V9c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3s-.3-.1-.3-.3zM10.8 12.6h-.6c-.2 0-.3-.1-.3-.3V9c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3z"/>
                  </svg>
                  <span className="text-white font-bold text-sm tracking-wide">Line</span>
                </motion.button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterView;
