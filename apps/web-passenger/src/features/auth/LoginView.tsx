import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { APP_LOGO_PATH, API_BASE_URL } from '@/constants';
import { motion } from 'framer-motion';

const LoginView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { requestOtp, error, setError } = useAuth();
  const [phone, setPhone] = useState('');

  const handleLogin = async () => {
    if (!phone) return setError('กรุณากรอกเบอร์โทรศัพท์');
    await requestOtp(phone, false);
  };

  return (
    <div className="flex flex-col h-full bg-[#04070B] font-kanit p-6 relative overflow-hidden text-white">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#A3FF3F]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 flex flex-col justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 mx-auto w-48 h-48 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)] bg-white flex items-center justify-center p-2"
        >
          <img src={APP_LOGO_PATH} className="w-full h-full object-contain" alt="Gozipp" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 tracking-tight">ยินดีต้อนรับสู่ GOZIPP</h2>
          <div className="text-gray-400 mb-8 font-medium leading-relaxed">
            <p>เรียกวินง่าย</p>
            <p>เข้าถึงคนขับจริงในพื้นที่</p>
            <p>ปลอดภัย รวดเร็ว และเป็นธรรม</p>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-4 rounded-2xl mb-8 text-sm flex items-center gap-3 backdrop-blur-md"
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
              เบอร์โทรศัพท์
            </span>
            <input
              type="tel"
              className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xl font-bold text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600"
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
            className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-4 rounded-2xl text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.2)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative z-10">{isLoading ? 'กำลังดำเนินการ...' : 'ดำเนินการต่อ'}</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <button 
            onClick={() => setAuthStep('REGISTER')} 
            className="text-gray-400 font-medium text-sm hover:text-[#A3FF3F] transition-colors inline-flex items-center gap-1"
          >
            ยังไม่มีบัญชี? <span className="text-[#A3FF3F] font-bold underline decoration-[#A3FF3F]/30 underline-offset-4">ลงทะเบียนที่นี่</span>
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-4 mt-12 relative z-10"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="h-px flex-1 bg-white/10"></div>
          <div className="text-center text-gray-500 text-xs font-medium">หรือเข้าสู่ระบบด้วย</div>
          <div className="h-px flex-1 bg-white/10"></div>
        </div>
        <button 
          onClick={() => window.location.href = `${API_BASE_URL}/auth/line?type=PASSENGER`} 
          className="w-full bg-[#06C755] hover:bg-[#00B900] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="LINE" className="w-6 h-6 brightness-0 invert" />
          เข้าสู่ระบบด้วย LINE
        </button>
        <button 
          onClick={() => window.location.href = `${API_BASE_URL}/auth/google?type=PASSENGER`} 
          className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors backdrop-blur-sm"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          เข้าสู่ระบบด้วย Google
        </button>
      </motion.div>
    </div>
  );
};

export default LoginView;
