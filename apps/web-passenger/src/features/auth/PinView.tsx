import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { useWebAuthn } from '../../hooks/useWebAuthn';
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
  const { registerPasskey, authenticatePasskey } = useWebAuthn();
  
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

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
      const success = await setupPin(pinCode);
      if (success) {
        // Show biometric setup prompt
        setShowBiometricPrompt(true);
      }
    } else if (mode === 'LOGIN' && phoneNumber) {
      await loginWithPin(phoneNumber, pinCode);
    }
  };

  const handleSetupBiometrics = async () => {
    await registerPasskey('PASSENGER');
    setAuthStep('APP_SHELL'); // Continue to app
  };

  const handleSkipBiometrics = () => {
    setAuthStep('APP_SHELL'); // Continue to app
  };

  const handleLoginBiometrics = async () => {
    if (!phoneNumber) return;
    await authenticatePasskey(phoneNumber, 'PASSENGER');
  };

  if (showBiometricPrompt) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-black text-white p-6 font-kanit">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full max-w-sm">
          <div className="w-24 h-24 mx-auto bg-[#39B54A]/20 text-[#39B54A] rounded-full flex items-center justify-center text-5xl mb-6 shadow-[0_0_30px_rgba(57,181,74,0.3)]">
            🛡️
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-tighter">เปิดใช้งานสแกนใบหน้า</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            เพิ่มความสะดวกและปลอดภัยในการเข้าสู่ระบบครั้งถัดไป โดยไม่ต้องจำรหัส PIN (Face ID / Touch ID / Fingerprint)
          </p>

          <div className="space-y-4">
            <button 
              onClick={handleSetupBiometrics}
              disabled={isLoading}
              className="w-full bg-[#39B54A] text-black font-black py-4 rounded-2xl hover:bg-[#2d953a] transition-colors"
            >
              เปิดใช้งานทันที
            </button>
            <button 
              onClick={handleSkipBiometrics}
              disabled={isLoading}
              className="w-full bg-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-colors"
            >
              ไว้คราวหลัง
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit relative overflow-hidden text-white w-full">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <button 
          onClick={() => setAuthStep('LOGIN')}
          className="w-10 h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-start mt-12 relative z-10 w-full">
        {/* Background SVG Cityscape */}
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
        
        {/* Form Container */}
        <div className="w-full max-w-md mx-auto px-6 relative z-20 flex flex-col">
          {/* Compact Text Headers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-4"
          >
            <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
              {mode === 'SETUP' ? 'ตั้งรหัส PIN' : 'กรอกรหัส PIN'}
            </h2>
            <div className="text-gray-400 font-medium text-xs space-y-0.5 leading-relaxed">
              <p>{mode === 'SETUP' ? 'เพื่อความปลอดภัยของบัญชีคุณ' : 'ใช้ PIN 6 หลัก'}</p>
            </div>
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
        className="flex gap-3 justify-center mb-8 relative z-10"
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
        className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(163,255,63,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden text-lg z-10 mb-4"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
        <span className="relative z-10 uppercase tracking-tighter">{isLoading ? 'กำลังประมวลผล...' : mode === 'SETUP' ? 'ยืนยัน PIN' : 'เข้าสู่ระบบ'}</span>
      </motion.button>

      {mode === 'LOGIN' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-4 relative z-10"
        >
          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">หรือ</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>
          
          <button
            onClick={handleLoginBiometrics}
            className="w-full bg-[#39B54A]/10 text-[#39B54A] border border-[#39B54A]/30 font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#39B54A]/20 transition-all"
          >
            <span className="text-2xl">🛡️</span> สแกน Face ID / ลายนิ้วมือ
          </button>

          <button 
            onClick={() => { setAuthStep('LOGIN'); setError(null); }} 
            className="text-gray-500 text-sm font-bold mt-4 hover:text-[#A3FF3F] transition-colors"
          >
            ลืมรหัส PIN?
          </button>
        </motion.div>
      )}
        </div>
      </div>
    </div>
  );
};

export default PinView;
