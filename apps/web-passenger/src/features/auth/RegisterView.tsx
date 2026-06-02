import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { APP_LOGO_PATH } from '@/constants';
import { motion } from 'framer-motion';

const RegisterView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { verifyOtp, error, setError } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    
    // BYPASS OTP for initial phase: directly register the user with a mock OTP
    await verifyOtp(formData.phone, '000000', true, formData.name);
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit relative overflow-hidden text-white w-full">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
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

      {/* Background SVG Cityscape fixed to the bottom of the screen */}
      <div className="absolute bottom-0 left-0 right-0 h-[45vh] pointer-events-none z-0 overflow-hidden flex items-end w-full">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
        <img src="/bg-city-realistic.png" alt="Cityscape" className="w-full h-full object-cover object-bottom opacity-80 mix-blend-screen" />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-start mt-8 w-full z-10">
        
        {/* Master Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-48 h-48 flex items-center justify-center relative z-20 mix-blend-screen mb-2"
        >
          {/* Radial Glow Effect */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none scale-125"
            style={{
              background: 'radial-gradient(circle, rgba(163,255,63,0.15) 0%, transparent 70%)'
            }}
          />
          <img 
            src="/logo-gozipp.png" 
            className="w-40 h-auto object-contain relative z-10 contrast-125" 
            alt="Gozipp" 
          />
        </motion.div>
        
        {/* Form Container (Constrained width + padding) */}
        <div className="w-full max-w-md mx-auto px-6 relative z-20 flex flex-col pb-8">
          {/* Text Headers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6 mt-2"
          >
            <h2 className="text-[28px] font-extrabold text-white mb-1 tracking-tight drop-shadow-lg">ลงทะเบียนใหม่</h2>
            <div className="text-gray-300 font-medium text-sm space-y-0.5 drop-shadow-md">
              <p>เข้าร่วม GOZIPP เดินทางฉลาด รวดเร็ว ทั่วเมือง</p>
            </div>
          </motion.div>

        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit} 
          className="space-y-4"
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

          <div className="space-y-4">
            <label className="block relative">
              <span className="absolute -top-3 left-4 bg-black px-2 text-xs font-bold text-[#A3FF3F] uppercase tracking-wider z-10">ชื่อ-นามสกุล</span>
              <input
                type="text"
                placeholder="เช่น สมชาย ใจดี"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-lg font-bold text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
                required
              />
            </label>

            <label className="block relative">
              <span className="absolute -top-3 left-4 bg-black px-2 text-xs font-bold text-[#A3FF3F] uppercase tracking-wider z-10">เบอร์โทรศัพท์</span>
              <input
                type="tel"
                placeholder="081-234-5678"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-lg font-bold text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-extrabold py-3.5 rounded-2xl text-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.25)] mt-4"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative z-10">{isLoading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนเลย'}</span>
          </button>
        </motion.form>

        {/* Divider */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center w-full my-6"
        >
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="px-4 text-xs font-medium text-gray-500">หรือสมัครด้วย</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </motion.div>

        {/* Social Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {/* Google Method */}
          <button 
            type="button"
            onClick={() => window.location.href = APP_LOGO_PATH.replace('/logo-gozipp.png', '') + '/api/v1/auth/google?type=PASSENGER'}
            className="w-full bg-[#11151C] border border-white/5 rounded-2xl p-3.5 flex items-center justify-center gap-3 hover:bg-white/5 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-white font-bold text-sm">Google</span>
          </button>

          {/* Line Method */}
          <button 
            type="button"
            onClick={() => useUIStore.getState().setToastMessage('ระบบสมัครด้วย Line ยังไม่เปิดให้บริการ')}
            className="w-full bg-[#11151C] border border-white/5 rounded-2xl p-3.5 flex items-center justify-center gap-3 hover:bg-white/5 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <circle cx="12" cy="12" r="11" fill="#00C300"/>
              <path fill="#FFF" d="M17.3 11.2c0-2.4-2.4-4.4-5.3-4.4s-5.3 2-5.3 4.4c0 2.2 2 4 4.6 4.3.2 0 .5.1.5.3s-.1.4-.2.8c0 0-.2.6-.2.7-.1.3.3.5.7.3.5-.2 2.8-1.7 3.8-2.8.9-1.2 1.4-2.1 1.4-3.6zm-6 1.4H9.6c-.2 0-.3-.1-.3-.3V9c0-.2.1-.3.3-.3h1.8c.2 0 .3.1.3.3s-.1.3-.3.3h-1.4v1h1.4c.2 0 .3.1.3.3s-.1.3-.3.3h-1.4v1.1h1.4c.2 0 .3.1.3.3s-.1.3-.3.3zm2.5 0h-.6c-.2 0-.3-.1-.3-.3v-3c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3zm2.2-.4l-1.3-1.8v1.8c0 .2-.1.3-.3.3s-.3-.1-.3-.3V9c0-.2.1-.3.3-.3s.2 0 .3.1l1.3 1.8V9c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3s-.3-.1-.3-.3zM10.8 12.6h-.6c-.2 0-.3-.1-.3-.3V9c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3z"/>
            </svg>
            <span className="text-white font-bold text-sm">Line</span>
          </button>
        </motion.div>

        </div>
      </div>
    </div>
  );
};

export default RegisterView;
