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
  const { isLoading } = useUIStore();
  const { verifyOtp, requestOtp, error, setError } = useAuth();
  
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);

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

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otpCode.join('');
    if (code.length < 6) return;
    await verifyOtp(phoneNumber, code, isRegistering, name);
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit relative overflow-hidden text-white w-full">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <button 
          onClick={() => { setAuthStep(isRegistering ? 'REGISTER' : 'LOGIN'); setError(null); }}
          className="w-10 h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Main Container - Creates ONE stacking context for Background + Logo */}
      <div className="flex-1 flex flex-col justify-start mt-12 relative z-10 w-full">
        {/* Background SVG Cityscape (Inside the same stacking context!) */}
        <div className="absolute top-0 left-0 right-0 h-[40vh] pointer-events-none z-0 overflow-hidden flex items-end">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
          <img src="/bg-city-realistic.png" alt="Cityscape" className="w-full h-full object-cover object-bottom opacity-80" />
        </div>

        {/* Compact Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-32 h-32 flex items-center justify-center relative z-20 mix-blend-screen mt-[2vh] mb-4"
        >
          {/* Radial Glow Effect */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(163,255,63,0.15) 0%, transparent 70%)'
            }}
          />
          <img 
            src="/logo-gozipp.png" 
            className="w-28 h-auto object-contain relative z-10 contrast-125" 
            alt="Gozipp" 
          />
        </motion.div>
        
        {/* Form Container (Constrained width + padding) */}
        <div className="w-full max-w-md mx-auto px-6 relative z-20 flex flex-col">
          {/* Compact Text Headers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-4"
          >
            <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">ยืนยันรหัส OTP</h2>
            <div className="text-gray-400 font-medium text-xs space-y-0.5 leading-relaxed">
              <p>รหัสถูกส่งไปที่ <span className="text-[#A3FF3F]">{phoneNumber}</span></p>
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

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3 justify-center mb-12 relative z-10"
      >
        {otpCode.map((digit, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleOtpChange(i, e.target.value)}
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
        <button
          onClick={handleVerify}
          disabled={isLoading || otpCode.join('').length < 6}
          className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(163,255,63,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden text-lg"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
          <span className="relative z-10 uppercase tracking-tighter">{isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส'}</span>
        </button>

        <div className="text-center mt-6">
          {countdown > 0 ? (
            <span className="text-gray-500 text-sm font-medium">ส่งรหัสใหม่ได้ใน <span className="text-white">{countdown}</span> วินาที</span>
          ) : (
            <button
              onClick={() => {
                requestOtp(phoneNumber, isRegistering);
                setCountdown(60);
              }}
              className="text-[#A3FF3F] text-sm font-black uppercase tracking-widest hover:underline decoration-[#A3FF3F]/30 underline-offset-4"
            >
              ส่งรหัสอีกครั้ง
            </button>
          )}
        </div>
      </motion.div>

        </div>
      </div>
    </div>
  );
};

export default OtpView;
