import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import AuthLayout from './components/AuthLayout';

const formatPhone = (phone: string) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

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

  const handleNumpadPress = (num: string) => {
    const currentOtpStr = otpCode.join('');
    if (currentOtpStr.length < 6) {
      const newOtpStr = currentOtpStr + num;
      const newOtpArray = [...otpCode];
      for (let i = 0; i < 6; i++) {
        newOtpArray[i] = newOtpStr[i] || '';
      }
      setOtpCode(newOtpArray);
    }
  };

  const handleNumpadDelete = () => {
    const currentOtpStr = otpCode.join('');
    if (currentOtpStr.length > 0) {
      const newOtpStr = currentOtpStr.slice(0, -1);
      const newOtpArray = [...otpCode];
      for (let i = 0; i < 6; i++) {
        newOtpArray[i] = newOtpStr[i] || '';
      }
      setOtpCode(newOtpArray);
    }
  };

  const handleResendOtp = () => {
    requestOtp(phoneNumber, isRegistering);
    setCountdown(60);
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length < 6) return;
    await verifyOtp(phoneNumber, code, isRegistering, name);
  };

  return (
    <AuthLayout
      title="ยืนยันรหัส OTP"
      subtitle={`รหัสถูกส่งไปยัง ${formatPhone(phoneNumber)}`}
      showBackButton={true}
      onBack={() => { setAuthStep(isRegistering ? 'REGISTER' : 'LOGIN'); setError(null); }}
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

      {/* OTP Display Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center gap-3 mb-6 relative z-10"
      >
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className={`w-12 h-14 rounded-2xl flex items-center justify-center text-3xl font-extrabold border-b-4 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md ${
              otpCode[index]
                ? 'bg-[#A3FF3F] text-[#04070B] border-[#A3FF3F] scale-105'
                : 'bg-white/5 border-white/20 text-white'
            } ${otpCode.join('').length === index ? 'ring-2 ring-[#A3FF3F]/50 ring-offset-2 ring-offset-[#04070B] scale-110 shadow-[0_0_20px_rgba(163,255,63,0.3)]' : ''}`}
          >
            {otpCode[index] || ''}
          </div>
        ))}
      </motion.div>

      {/* Numpad Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-3 relative z-10"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumpadPress(num.toString())}
            className="bg-white/5 hover:bg-[#A3FF3F]/20 active:bg-[#A3FF3F]/40 border border-white/10 hover:border-[#A3FF3F]/30 text-white text-3xl font-semibold py-4 rounded-2xl transition-all backdrop-blur-md"
          >
            {num}
          </button>
        ))}
        <div className="col-start-2">
          <button
            onClick={() => handleNumpadPress('0')}
            className="w-full bg-white/5 hover:bg-[#A3FF3F]/20 active:bg-[#A3FF3F]/40 border border-white/10 hover:border-[#A3FF3F]/30 text-white text-3xl font-semibold py-4 rounded-2xl transition-all backdrop-blur-md"
          >
            0
          </button>
        </div>
        <div className="col-start-3 flex justify-center items-center">
          <button
            onClick={handleNumpadDelete}
            className="w-full bg-white/5 hover:bg-red-500/20 active:bg-red-500/40 border border-white/10 hover:border-red-500/30 text-white text-2xl font-bold py-4 rounded-2xl transition-all backdrop-blur-md flex items-center justify-center h-full"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Primary Action Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 space-y-4 relative z-10"
      >
        <button
          onClick={handleVerifyOtp}
          disabled={otpCode.join('').length !== 6 || isLoading}
          className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-extrabold py-3.5 rounded-2xl text-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.25)]"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
          <span className="relative z-10">{isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส OTP'}</span>
        </button>

        <div className="text-center">
          <button
            onClick={handleResendOtp}
            disabled={countdown > 0}
            className="text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50 transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
          >
            {countdown > 0 ? `ขอรหัสใหม่ได้ใน ${countdown} วินาที` : 'ขอรหัส OTP ใหม่'}
          </button>
        </div>
      </motion.div>
    </AuthLayout>
  );
};

export default OtpView;
