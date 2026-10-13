import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

const OtpView: React.FC<{ phoneNumber: string, isRegistering: boolean, name?: string }> = ({ 
  phoneNumber, 
  isRegistering,
  name 
}) => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const otpPurpose = useAuthStore((state) => state.otpPurpose);
  const { isLoading, setToastMessage } = useUIStore();
  const { verifyOtp, requestOtp, resetPinWithOtp, error, setError } = useAuth();
  
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [newPin, setNewPin] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);
    setError(null);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpCode[index] && index > 0) {
        const newOtp = [...otpCode];
        newOtp[index - 1] = '';
        setOtpCode(newOtp);
        document.getElementById(`otp-${index - 1}`)?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newOtp = [...otpCode];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtpCode(newOtp);
    setError(null);
    const nextIndex = Math.min(pastedData.length, 5);
    document.getElementById(`otp-${nextIndex}`)?.focus();
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      const ok = await requestOtp(phoneNumber, otpPurpose !== 'RESET_PIN', name, otpPurpose);
      if (ok) {
        setCountdown(60);
        setOtpCode(['', '', '', '', '', '']);
        setToastMessage(`✅ ส่งรหัส OTP ใหม่ไปยัง ${phoneNumber} เรียบร้อยแล้ว`);
        setTimeout(() => {
          document.getElementById('otp-0')?.focus();
        }, 100);
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    const code = otpCode.join('');
    if (code.length < 6) return;
    if (otpPurpose === 'RESET_PIN') {
      await resetPinWithOtp(phoneNumber, code, newPin);
      return;
    }
    await verifyOtp(phoneNumber, code, isRegistering, name);
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit relative overflow-hidden text-white w-full">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <button 
          onClick={() => { setAuthStep(otpPurpose === 'RESET_PIN' ? 'LOGIN_PIN' : 'REGISTER'); setError(null); }}
          className="w-10 h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-start mt-12 relative z-10 w-full overflow-y-auto pb-8">
        {/* Background SVG Cityscape */}
        <div className="absolute top-0 left-0 right-0 h-[40vh] pointer-events-none z-0 overflow-hidden flex items-end">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
          <img src="/bg-city-realistic.png" alt="Cityscape" className="w-full h-full object-cover object-bottom opacity-80" />
        </div>

        {/* Compact Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-28 h-28 flex items-center justify-center relative z-20 mix-blend-screen mt-[2vh] mb-3"
        >
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(163,255,63,0.15) 0%, transparent 70%)'
            }}
          />
          <img 
            src="/logo-gozipp.png" 
            className="w-24 h-auto object-contain relative z-10 contrast-125" 
            alt="Gozipp" 
          />
        </motion.div>
        
        {/* Form Container */}
        <div className="w-full max-w-md mx-auto px-6 relative z-20 flex flex-col">
          {/* Text Headers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-4"
          >
            <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
              {otpPurpose === 'RESET_PIN' ? 'ยืนยัน OTP เพื่อรีเซ็ต PIN' : 'ยืนยันรหัส OTP'}
            </h2>
            <div className="text-gray-400 font-medium text-xs space-y-0.5 leading-relaxed">
              <p>ระบบได้ส่งรหัสยืนยัน 6 หลักไปที่ <span className="text-[#A3FF3F] font-mono font-bold">{phoneNumber}</span></p>
              <p className="text-gray-500">
                {otpPurpose === 'RESET_PIN'
                  ? 'ใช้สำหรับรีเซ็ต PIN ของบัญชีเดิม'
                  : 'ใช้สำหรับการสมัครครั้งแรกและยืนยันเบอร์เท่านั้น'}
              </p>
            </div>
          </motion.div>

          {/* Error message block */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-4 text-xs flex items-center gap-2 backdrop-blur-md relative z-10"
            >
              <span className="text-base">⚠️</span> {error}
            </motion.div>
          )}

          {/* 6 Digits Boxes with Paste and Backspace Support */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2.5 justify-center mb-6 relative z-10"
          >
            {otpCode.map((digit, i) => (
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
                className="w-12 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-2xl font-black text-white text-center outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] focus:bg-white/10 transition-all shadow-xl backdrop-blur-md"
              />
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 relative z-10"
          >
            {otpPurpose === 'RESET_PIN' && (
              <label className="block mb-2">
                <span className="text-xs font-bold text-slate-400 ml-1">กำหนด PIN ใหม่ 6 หลัก</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full mt-1 bg-white/5 rounded-2xl border border-white/10 p-4 text-white text-center tracking-[0.4em] font-black outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F]"
                  placeholder="••••••"
                />
              </label>
            )}

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={isLoading || otpCode.join('').length < 6 || (otpPurpose === 'RESET_PIN' && newPin.length < 6)}
              className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(163,255,63,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden text-lg"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <span className="relative z-10 uppercase tracking-tighter">{isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส OTP'}</span>
            </button>

            {/* World-Class Resend OTP Control */}
            <div className="flex flex-col items-center gap-2.5 pt-2">
              {countdown > 0 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 shadow-sm">
                  <span>⏱️ ขอรหัส OTP ใหม่ได้ในอีก</span>
                  <strong className="text-white font-mono bg-white/10 px-2 py-0.5 rounded-md text-xs">{countdown}</strong>
                  <span>วินาที</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#A3FF3F]/15 border border-[#A3FF3F]/50 hover:bg-[#A3FF3F]/25 text-[#A3FF3F] font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-[#A3FF3F]/10"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
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
                onClick={() => { setAuthStep(otpPurpose === 'RESET_PIN' ? 'LOGIN_PIN' : 'REGISTER'); setError(null); }}
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
                      <span className="text-[#A3FF3F] font-mono">{phoneNumber}</span> หากเบอร์ผิดสามารถกด "แก้ไขเบอร์โทรศัพท์" ด้านบนได้ทันที
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
        </div>
      </div>
    </div>
  );
};

export default OtpView;
