import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { APP_LOGO_PATH } from '@/constants';
import { motion } from 'framer-motion';

const RegisterView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { requestOtp, error, setError } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    await requestOtp(formData.phone, true, formData.name);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#04070B] font-kanit p-8 justify-center relative overflow-hidden text-white">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#A3FF3F]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 relative z-10 text-center lg:text-left"
      >
        <div className="w-48 h-48 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)] bg-white flex items-center justify-center p-2 mb-6 mx-auto lg:mx-0">
          <img src={APP_LOGO_PATH} className="w-full h-full object-contain" alt="Gozipp" />
        </div>
        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">ลงทะเบียนใหม่</h2>
        <p className="text-gray-400 font-medium text-center lg:text-left">เข้าร่วม GOZIPP เดินทางฉลาด รวดเร็ว ทั่วเมือง</p>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit} 
        className="space-y-6 relative z-10"
      >
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 backdrop-blur-md"
          >
            <span className="text-xl">⚠️</span> {error}
          </motion.div>
        )}

        <div className="space-y-6">
          <label className="block relative">
            <span className="absolute -top-3 left-4 bg-[#04070B] px-2 text-[10px] font-black text-[#A3FF3F] uppercase tracking-widest z-10">ชื่อ-นามสกุล</span>
            <input
              type="text"
              placeholder="เช่น สมชาย ใจดี"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
              required
            />
          </label>

          <label className="block relative">
            <span className="absolute -top-3 left-4 bg-[#04070B] px-2 text-[10px] font-black text-[#A3FF3F] uppercase tracking-widest z-10">เบอร์โทรศัพท์</span>
            <input
              type="tel"
              placeholder="081-234-5678"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(163,255,63,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden mt-4"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
          <span className="relative z-10 text-lg">{isLoading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนเลย'}</span>
        </button>
      </motion.form>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mt-12 relative z-10"
      >
        <p className="text-gray-500 text-sm font-medium">
          มีบัญชีอยู่แล้ว?{' '}
          <button 
            onClick={() => { setAuthStep('LOGIN'); setError(null); }} 
            className="text-[#A3FF3F] font-black uppercase tracking-widest hover:underline ml-1 decoration-[#A3FF3F]/30 underline-offset-4"
          >
            เข้าสู่ระบบ
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterView;
