import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '@/constants';
import { motion } from 'framer-motion';

const LoginView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading, setToastMessage } = useUIStore();
  const { requestOtp, error, setError } = useAuth();
  const [phone, setPhone] = useState('');

  const setUser = useAuthStore((state) => state.setUser);

  const formatPhone = (raw: string) => {
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  };

  const handleNumpadPress = (num: string) => {
    let currentRaw = phone.replace(/\D/g, '');
    if (currentRaw.length < 10) {
      currentRaw += num;
      setPhone(formatPhone(currentRaw));
      setError(null);
    }
  };

  const handleNumpadDelete = () => {
    let currentRaw = phone.replace(/\D/g, '');
    if (currentRaw.length > 0) {
      currentRaw = currentRaw.slice(0, -1);
      setPhone(formatPhone(currentRaw));
      setError(null);
    }
  };

  const handleLogin = async () => {
    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 10) return setError('กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก');
    
    try {
      useUIStore.getState().setIsLoading(true);
      const statusRes = await fetch(`${API_BASE_URL}/api/v1/auth/check-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: rawPhone, role: 'PASSENGER' })
      });
      const statusData = await statusRes.json();
      
      if (!statusData.isRegistered && !statusData.exists) {
          // New user -> Go directly to register, bypassing OTP
          setAuthStep('REGISTER');
          useUIStore.getState().setIsLoading(false);
          return;
      }
      
      if ((statusData.isRegistered || statusData.exists) && statusData.hasPin) {
          setUser({ id: '', name: '', phone: rawPhone, email: '', avatarSeed: 'user', pointsBalance: 0, freeRidesRemaining: 0 });
          setAuthStep('LOGIN_PIN');
          useUIStore.getState().setIsLoading(false);
          return;
      }
    } catch (e) {
      console.error("Status check failed", e);
    }
    
    // Fallback: If user is registered but has no PIN, use OTP to verify them
    await requestOtp(rawPhone, false);
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit p-6 relative overflow-hidden text-white w-full">
      
      {/* Background SVG Cityscape and Perspective Road */}
      <div className="absolute top-[22dvh] left-0 right-0 h-[45vh] pointer-events-none z-0 overflow-hidden flex items-end">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
        <img src="/bg-city-realistic.png" alt="Cityscape" className="w-full h-full object-cover object-bottom opacity-80 mix-blend-screen" />
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <button 
          onClick={() => setAuthStep('ONBOARDING')}
          className="w-10 h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Top spacing */}
      <div className="h-12 z-10" />

      {/* Main Form Area */}
      <div className="flex-1 flex flex-col justify-start mt-8 relative z-10 max-w-md mx-auto w-full">
        {/* Compact Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-32 h-32 flex items-center justify-center relative mb-0"
        >
          <div className="absolute inset-0 bg-black/40 rounded-full blur-3xl pointer-events-none" />
          <img 
            src="/logo-gozipp.png" 
            className="w-24 h-auto object-contain mix-blend-screen relative z-10" 
            alt="Gozipp" 
          />
        </motion.div>
        
        {/* Compact Text Headers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-4"
        >
          <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">ยินดีต้อนรับกลับ</h2>
          <div className="text-gray-400 font-medium text-xs space-y-0.5 leading-relaxed">
            <p>กรอกเบอร์โทรศัพท์ของคุณเพื่อเข้าสู่ระบบ</p>
          </div>
        </motion.div>

        {/* Error message block */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-4 text-xs flex items-center gap-2 backdrop-blur-md"
          >
            <span className="text-base">⚠️</span> {error}
          </motion.div>
        )}

        {/* Phone number input form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <label className="block relative">
            <span className="absolute -top-3 left-4 bg-black px-2 text-xs font-bold text-[#A3FF3F] uppercase tracking-wider z-10">
              เบอร์โทรศัพท์
            </span>
            <input
              type="tel"
              inputMode="none"
              readOnly
              className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-2xl tracking-widest font-bold text-center text-[#A3FF3F] outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
              placeholder="08X-XXX-XXXX"
              value={phone}
              onClick={(e) => {
                e.preventDefault();
              }}
            />
          </label>
          <button
            onClick={handleLogin}
            disabled={isLoading || phone.replace(/\D/g, '').length < 10}
            className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-extrabold py-3.5 rounded-2xl text-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.25)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative z-10">{isLoading ? 'กำลังดำเนินการ...' : 'ดำเนินการต่อ'}</span>
          </button>
        </motion.div>

        {/* Custom Numpad */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mt-6 relative z-10"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumpadPress(num.toString())}
              className="bg-white/5 hover:bg-[#A3FF3F]/20 active:bg-[#A3FF3F]/40 border border-white/10 hover:border-[#A3FF3F]/30 text-white text-2xl font-semibold py-4 rounded-2xl transition-all backdrop-blur-md"
            >
              {num}
            </button>
          ))}
          <div className="col-start-2">
            <button
              onClick={() => handleNumpadPress('0')}
              className="w-full bg-white/5 hover:bg-[#A3FF3F]/20 active:bg-[#A3FF3F]/40 border border-white/10 hover:border-[#A3FF3F]/30 text-white text-2xl font-semibold py-4 rounded-2xl transition-all backdrop-blur-md"
            >
              0
            </button>
          </div>
          <div className="col-start-3 flex justify-center items-center">
            <button
              onClick={handleNumpadDelete}
              className="w-full bg-white/5 hover:bg-red-500/20 active:bg-red-500/40 border border-white/10 hover:border-red-500/30 text-white text-xl font-bold py-4 rounded-2xl transition-all backdrop-blur-md flex items-center justify-center"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginView;
