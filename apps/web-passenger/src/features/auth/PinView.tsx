import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import AuthLayout from './components/AuthLayout';

const PinView: React.FC<{ isSetup?: boolean }> = ({ isSetup = true }) => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { setupPin, error, setError } = useAuth();
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'ENTER' | 'CONFIRM'>(isSetup ? 'ENTER' : 'CONFIRM'); // Simplify for now

  const handleNumpadPress = (num: string) => {
    if (step === 'ENTER') {
      if (pin.length < 6) {
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 6 && isSetup) {
          setTimeout(() => setStep('CONFIRM'), 300);
        } else if (newPin.length === 6 && !isSetup) {
          // Login logic would go here
        }
      }
    } else {
      if (confirmPin.length < 6) {
        const newConfirm = confirmPin + num;
        setConfirmPin(newConfirm);
      }
    }
  };

  const handleNumpadDelete = () => {
    if (step === 'ENTER') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleVerify = async () => {
    if (pin !== confirmPin) {
      setError('รหัส PIN ไม่ตรงกัน กรุณาลองใหม่');
      setPin('');
      setConfirmPin('');
      setStep('ENTER');
      return;
    }
    
    await setupPin(pin);
  };

  const currentDisplay = step === 'ENTER' ? pin : confirmPin;

  return (
    <AuthLayout
      title={step === 'ENTER' ? "ตั้งรหัส PIN" : "ยืนยันรหัส PIN"}
      subtitle={step === 'ENTER' ? "ตั้งรหัสผ่าน 6 หลักสำหรับการเข้าใช้งานครั้งต่อไป" : "กรุณากรอกรหัส PIN อีกครั้งเพื่อยืนยัน"}
      showBackButton={true}
      onBack={() => {
        if (step === 'CONFIRM') {
          setConfirmPin('');
          setStep('ENTER');
          setError(null);
        } else {
          // You shouldn't be able to go back from PIN setup usually, 
          // but if we allow it, it would go back to Login or OTP
          setAuthStep('LOGIN');
        }
      }}
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

      {/* PIN Display Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center gap-4 mb-8 relative z-10"
      >
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className={`w-5 h-5 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
              currentDisplay.length > index
                ? 'bg-[#A3FF3F] scale-125 shadow-[0_0_15px_rgba(163,255,63,0.5)]'
                : 'bg-white/10 border border-white/20'
            }`}
          />
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

      {/* Primary Action Button (Only show in CONFIRM step when complete) */}
      {step === 'CONFIRM' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 space-y-4 relative z-10"
        >
          <button
            onClick={handleVerify}
            disabled={confirmPin.length !== 6 || isLoading}
            className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-extrabold py-3.5 rounded-2xl text-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.25)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative z-10">{isLoading ? 'กำลังบันทึก...' : 'บันทึกรหัส PIN'}</span>
          </button>
        </motion.div>
      )}
    </AuthLayout>
  );
};

export default PinView;
