import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

interface PinViewProps {
  mode: 'SETUP' | 'LOGIN';
  userId?: string;
  phoneNumber?: string | null;
}

const PinView: React.FC<PinViewProps> = ({ mode, userId, phoneNumber }) => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { setupPin, loginWithPin, error, setError } = useAuth();
  
  const [pin, setPin] = useState(['', '', '', '', '', '']);

  const handlePinChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newPin = [...pin];
    newPin[index] = value.substring(value.length - 1);
    setPin(newPin);

    if (value && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handleSubmit = async () => {
    const pinCode = pin.join('');
    if (pinCode.length < 6) return;
    
    if (mode === 'SETUP' && userId) {
      await setupPin(pinCode);
    } else if (mode === 'LOGIN' && phoneNumber) {
      await loginWithPin(phoneNumber, pinCode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#04070B] font-kanit p-6 justify-center relative overflow-hidden text-white">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#A3FF3F]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <button 
          onClick={() => setAuthStep('LOGIN')}
          className="w-10 h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-12 relative z-10"
      >
        <div className="w-20 h-20 bg-[#A3FF3F]/10 border border-[#A3FF3F]/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_30px_rgba(163,255,63,0.15)] backdrop-blur-md">🔑</div>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
          {mode === 'SETUP' ? 'ตั้งรหัส PIN' : 'กรอกรหัส PIN'}
        </h2>
        <p className="text-gray-400 font-medium">
          {mode === 'SETUP' ? 'เพื่อความปลอดภัยของบัญชีคุณ' : 'ใช้ PIN 6 หลัก'}
        </p>
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
        {pin.map((digit, i) => (
          <input
            key={i}
            id={`pin-${i}`}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handlePinChange(i, e.target.value)}
            className="w-12 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-2xl font-black text-white text-center outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] focus:bg-white/10 transition-all shadow-xl backdrop-blur-md"
          />
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={handleSubmit}
        disabled={isLoading || pin.join('').length < 6}
        className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(163,255,63,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden text-lg z-10"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
        <span className="relative z-10 uppercase tracking-tighter">{isLoading ? 'กำลังประมวลผล...' : mode === 'SETUP' ? 'ยืนยัน PIN' : 'เข้าสู่ระบบ'}</span>
      </motion.button>

      {mode === 'LOGIN' && (
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => { setAuthStep('LOGIN'); setError(null); }} 
          className="w-full text-gray-500 text-sm font-bold mt-12 hover:text-[#A3FF3F] transition-colors relative z-10"
        >
          ลืมรหัส PIN?
        </motion.button>
      )}
    </div>
  );
};

export default PinView;
