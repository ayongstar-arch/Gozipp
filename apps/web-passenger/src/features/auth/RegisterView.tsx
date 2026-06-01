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
          onClick={() => setAuthStep('LOGIN')}
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
          {/* Text Headers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-4"
          >
            <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">ลงทะเบียนใหม่</h2>
            <div className="text-gray-400 font-medium text-xs space-y-0.5 leading-relaxed">
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
        </div>
      </div>
    </div>
  );
};

export default RegisterView;
