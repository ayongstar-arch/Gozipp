import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { motion } from 'framer-motion';

const LoginView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading, setToastMessage } = useUIStore();
  const { error, setError } = useAuth();
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
      const statusData = await apiFetch('/api/v1/auth/check-status', {
          method: 'POST',
          body: JSON.stringify({ phoneNumber: rawPhone, role: 'PASSENGER' })
      });
      
      if (!statusData.isRegistered && !statusData.exists) {
          setToastMessage('หมายเลขนี้ยังไม่เคยสมัครใช้งาน กรุณายืนยันเบอร์และตั้ง PIN ครั้งแรก');
          setUser({ id: '', name: '', phone: rawPhone, email: '', avatarSeed: 'user', pointsBalance: 0, freeRidesRemaining: 0 });
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

      setToastMessage('บัญชีนี้ยังต้องยืนยันเบอร์และตั้ง PIN ก่อนใช้งาน');
      setUser({ id: '', name: '', phone: rawPhone, email: '', avatarSeed: 'user', pointsBalance: 0, freeRidesRemaining: 0 });
      setAuthStep('REGISTER');
      useUIStore.getState().setIsLoading(false);
      return;
    } catch (e) {
      console.error("Status check failed", e);
      setToastMessage('ไม่สามารถตรวจสอบสถานะได้ กรุณายืนยันเบอร์และตั้ง PIN ครั้งแรก');
      setUser({ id: '', name: '', phone: rawPhone, email: '', avatarSeed: 'user', pointsBalance: 0, freeRidesRemaining: 0 });
      setAuthStep('REGISTER');
      useUIStore.getState().setIsLoading(false);
      return;
    }
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit relative overflow-hidden text-white w-full">
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAuthStep('ONBOARDING')}
          className="w-12 h-12 bg-white/5 border border-white/5 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-2xl shadow-sm"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
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
            className="text-center mb-6"
          >
            <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">ยินดีต้อนรับกลับ</h2>
            <div className="text-gray-400 font-medium text-sm space-y-0.5 leading-relaxed text-balance">
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
          className="space-y-5"
        >
          <label className="block relative">
            <span className="absolute -top-3 left-6 bg-black px-2 text-xs font-bold text-[#A3FF3F] uppercase tracking-wider z-10">
              เบอร์โทรศัพท์
            </span>
            <input
              type="tel"
              inputMode="none"
              readOnly
              className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl text-3xl tracking-[0.2em] font-bold text-center text-[#A3FF3F] outline-none focus:border-[#A3FF3F] transition-all backdrop-blur-2xl placeholder:text-gray-700 shadow-inner"
              placeholder="08X-XXX-XXXX"
              value={phone}
              onClick={(e) => {
                e.preventDefault();
              }}
            />
          </label>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={isLoading || phone.replace(/\D/g, '').length < 10}
            className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-extrabold py-4 rounded-3xl text-lg transition-all disabled:opacity-50 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.15)] hover:shadow-[0_0_30px_rgba(163,255,63,0.3)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative z-10">{isLoading ? 'กำลังดำเนินการ...' : 'ดำเนินการต่อ'}</span>
          </motion.button>
        </motion.div>

        {/* Custom Numpad */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mt-8 relative z-10"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.95 }}
              key={num}
              onClick={() => handleNumpadPress(num.toString())}
              className="bg-white/5 border border-white/5 text-white text-3xl font-semibold py-5 rounded-3xl transition-colors backdrop-blur-2xl shadow-sm"
            >
              {num}
            </motion.button>
          ))}
          <div className="col-start-2">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumpadPress('0')}
              className="w-full bg-white/5 border border-white/5 text-white text-3xl font-semibold py-5 rounded-3xl transition-colors backdrop-blur-2xl shadow-sm"
            >
              0
            </motion.button>
          </div>
          <div className="col-start-3 flex justify-center items-center">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(239,68,68,0.15)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNumpadDelete}
              className="w-full bg-white/5 border border-white/5 text-white py-5 rounded-3xl transition-colors backdrop-blur-2xl flex items-center justify-center shadow-sm"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
