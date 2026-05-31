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

  const handleAppleLogin = () => {
    setToastMessage('ระบบล็อกอินด้วย Apple ID ยังไม่เปิดให้บริการในขณะนี้');
  };

  const handleLogin = async () => {
    if (!phone) return setError('กรุณากรอกเบอร์โทรศัพท์');
    await requestOtp(phone, false);
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit p-6 relative overflow-hidden text-white w-full">
      
      {/* Background SVG Cityscape and Perspective Road */}
      <div className="absolute bottom-0 left-0 right-0 h-[50vh] pointer-events-none z-0 overflow-hidden flex items-end">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
        <img src="/bg-city-realistic.png" alt="Cityscape" className="w-full h-full object-cover object-bottom opacity-80" />
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <button 
          onClick={() => setAuthStep('ONBOARDING')}
          className="w-10 h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Top spacing */}
      <div className="h-10 z-10" />

      {/* Main Form Area */}
      <div className="flex-1 flex flex-col justify-center relative z-10 max-w-md mx-auto w-full -mt-4">
        {/* Compact Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-36 h-36 flex items-center justify-center relative mb-2"
        >
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(163,255,63,0.12) 0%, transparent 65%)'
            }}
          />
          <img 
            src="/logo-gozipp.png" 
            className="w-28 h-auto object-contain mix-blend-screen relative z-10" 
            alt="Gozipp" 
          />
        </motion.div>
        
        {/* Compact Text Headers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">ยินดีต้อนรับสู่ GOZIPP</h2>
          <div className="text-gray-400 font-medium text-xs space-y-0.5 leading-relaxed">
            <p>เรียกวินง่าย เข้าถึงคนขับจริงในพื้นที่</p>
            <p>ปลอดภัย รวดเร็ว และโปร่งใส</p>
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
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-lg font-bold text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
              placeholder="08x-xxx-xxxx"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
            />
          </label>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-extrabold py-3.5 rounded-2xl text-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.25)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative z-10">{isLoading ? 'กำลังดำเนินการ...' : 'ดำเนินการต่อ'}</span>
          </button>
        </motion.div>

        {/* Sign up prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-4"
        >
          <button 
            onClick={() => setAuthStep('REGISTER')} 
            className="text-gray-400 font-medium text-xs hover:text-[#A3FF3F] transition-colors inline-flex items-center gap-1"
          >
            ยังไม่มีบัญชี? <span className="text-[#A3FF3F] font-bold underline decoration-[#A3FF3F]/30 underline-offset-4">ลงทะเบียนที่นี่</span>
          </button>
        </motion.div>
      </div>

      {/* Alternative Social Login Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 mt-4 relative z-10 max-w-md mx-auto w-full pb-4"
      >
        <div className="flex items-center gap-4 mb-1">
          <div className="h-px flex-1 bg-white/10"></div>
          <div className="text-center text-gray-500 text-xs font-medium">หรือเข้าสู่ระบบด้วย</div>
          <div className="h-px flex-1 bg-white/10"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => window.location.href = `${API_BASE_URL}/auth/google?type=PASSENGER`} 
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-3.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <img src="/brand/google.svg" alt="Google" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Google</span>
          </button>
          <button 
            onClick={handleAppleLogin} 
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-3.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <img src="/brand/apple.svg" alt="Apple" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Apple ID</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginView;
