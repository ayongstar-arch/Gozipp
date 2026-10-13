import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';

const OtpView: React.FC<{ phoneNumber: string, isRegistering: boolean, name?: string }> = ({ 
  phoneNumber, 
  isRegistering,
  name 
}) => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading, setToastMessage } = useUIStore();
  const { verifyOtp, requestOtp, error, setError } = useAuth();
  
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

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
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otpCode];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtpCode(newOtp);
    setError(null);
    const nextIdx = Math.min(pasted.length, 5);
    document.getElementById(`otp-${nextIdx}`)?.focus();
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      await requestOtp(phoneNumber, isRegistering);
      setCountdown(60);
      setOtpCode(['', '', '', '', '', '']);
      setToastMessage?.(`✅ ส่งรหัส OTP ใหม่ไปยัง ${phoneNumber} เรียบร้อยแล้ว`);
      setTimeout(() => {
        document.getElementById('otp-0')?.focus();
      }, 100);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    const code = otpCode.join('');
    if (code.length < 6) return;
    await verifyOtp(phoneNumber, code, isRegistering, name);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans p-6 justify-center">
      <div className="text-center mb-10 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-gozipp-green/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl shadow-gozipp-green/20">🛡️</div>
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">ยืนยันรหัส OTP</h2>
        <p className="text-slate-400 font-medium text-sm">รหัสถูกส่งไปที่ <span className="text-gozipp-green font-mono font-bold">{phoneNumber}</span></p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-4 rounded-2xl mb-8 text-sm text-center font-bold">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-2.5 justify-center mb-10">
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
            className="w-12 h-16 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center text-2xl font-black text-white text-center outline-none focus:border-gozipp-green focus:bg-slate-800 transition-all shadow-xl"
          />
        ))}
      </div>

      <div className="space-y-4">
        <button
          onClick={handleVerify}
          disabled={isLoading || otpCode.join('').length < 6}
          className="w-full bg-gozipp-green text-slate-950 font-black py-4 rounded-2xl shadow-2xl shadow-gozipp-green/20 hover:bg-green-400 transition-all disabled:opacity-30 uppercase tracking-tighter text-lg"
        >
          {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส OTP'}
        </button>

        <div className="text-center pt-2">
          {countdown > 0 ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/5 text-xs text-slate-400 shadow-sm">
              <span>⏱️ ขอรหัสใหม่ได้ในอีก</span>
              <strong className="text-white font-mono bg-white/10 px-2 py-0.5 rounded-md text-xs">{countdown}</strong>
              <span>วินาที</span>
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gozipp-green/15 border border-gozipp-green/50 text-gozipp-green text-xs font-black uppercase tracking-wider hover:bg-gozipp-green/25 transition-all active:scale-95 shadow-xl shadow-gozipp-green/10"
            >
              <svg className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isResending ? 'กำลังส่งรหัส OTP ใหม่...' : 'ขอรับรหัส OTP อีกครั้ง (Resend OTP)'}</span>
            </button>
          )}
        </div>
      </div>

      <button 
        onClick={() => { setAuthStep(isRegistering ? 'REGISTER' : 'LOGIN'); setError(null); }} 
        className="w-full text-slate-500 text-xs font-bold mt-10 hover:text-white transition-colors text-center"
      >
        <span>เบอร์โทรไม่ถูกต้อง? </span>
        <span className="text-gozipp-green underline underline-offset-2">แก้ไขเบอร์โทรศัพท์</span>
      </button>
    </div>
  );
};

export default OtpView;
