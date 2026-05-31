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
    <div className="flex flex-col h-full bg-[#04070B] font-kanit p-6 justify-center relative overflow-hidden text-white">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#A3FF3F]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-12 relative z-10"
      >
        <div className="w-20 h-20 bg-[#A3FF3F]/10 border border-[#A3FF3F]/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_30px_rgba(163,255,63,0.15)] backdrop-blur-md">🛡️</div>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">ยืนยันรหัส OTP</h2>
        <p className="text-gray-400 font-medium">รหัสถูกส่งไปที่ <span className="text-[#A3FF3F]">{phoneNumber}</span></p>
      </motion.div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-4 rounded-2xl mb-8 text-sm text-center font-bold backdrop-blur-md relative z-10"
        >
          ⚠️ {error}
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

      <motion.button 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => { setAuthStep(isRegistering ? 'REGISTER' : 'LOGIN'); setError(null); }} 
        className="w-full text-gray-500 text-sm font-bold mt-12 hover:text-[#A3FF3F] transition-colors relative z-10"
      >
        ← แก้ไขเบอร์โทรศัพท์
      </motion.button>
    </div>
  );
};

export default OtpView;
