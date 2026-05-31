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
    <div className="flex flex-col h-full bg-[#04070B] font-sans p-6 relative overflow-hidden text-white justify-center">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#A3FF3F]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 mx-auto w-32 h-32 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)] bg-white flex items-center justify-center p-2"
        >
          <img src={APP_LOGO_PATH} className="w-full h-full object-contain" alt="Gozipp" />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-center"
        >
          <h2 className="text-4xl font-black text-white tracking-tight mb-2">ลงทะเบียนใหม่</h2>
          <p className="text-gray-400 font-medium">ร่วมเป็นพาร์ทเนอร์คนขับ GOZIPP</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-4 rounded-2xl text-sm flex items-center gap-3 backdrop-blur-md"
            >
              <span className="text-xl">⚠️</span> {error}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <label className="block relative">
              <span className="absolute -top-3 left-4 bg-[#04070B] px-2 text-xs font-bold text-[#A3FF3F] uppercase tracking-wider z-10">
                ชื่อ-นามสกุล
              </span>
              <input
                type="text"
                placeholder="สมชาย ใจดี"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xl font-bold text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
                required
              />
            </label>

            <label className="block relative">
              <span className="absolute -top-3 left-4 bg-[#04070B] px-2 text-xs font-bold text-[#A3FF3F] uppercase tracking-wider z-10">
                เบอร์โทรศัพท์
              </span>
              <input
                type="tel"
                placeholder="08x-xxx-xxxx"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xl font-bold text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
                required
              />
            </label>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-4 rounded-2xl text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.2)] mt-4"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <span className="relative z-10">{isLoading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนเลย'}</span>
            </button>
          </motion.div>
        </form>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8"
        >
          <p className="text-gray-400 text-sm font-medium">
            มีบัญชีอยู่แล้ว?{' '}
            <button 
              onClick={() => { setAuthStep('LOGIN'); setError(null); }} 
              className="text-[#A3FF3F] font-bold hover:underline ml-1"
            >
              เข้าสู่ระบบ
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterView;
