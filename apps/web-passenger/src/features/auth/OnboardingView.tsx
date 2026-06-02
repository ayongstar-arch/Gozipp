import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import InstallPwaPrompt from '../../components/InstallPwaPrompt';
import { motion } from 'framer-motion';
import AuthLayout from './components/AuthLayout';

const OnboardingView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);

  return (
    <AuthLayout
      title="เรียกวินใกล้คุณ"
      subtitle="เข้าถึงคนขับจริงในพื้นที่ ปลอดภัย รวดเร็ว และโปร่งใส"
      dockMode={true}
    >
      <InstallPwaPrompt />

      {/* Actions Area - Glassmorphism Dock */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative z-20 w-full flex flex-col space-y-4 bg-black/50 backdrop-blur-xl border-t border-white/10 px-6 pt-6 pb-8 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]"
      >
        {/* Primary Action */}
        <button 
          onClick={() => setAuthStep('REGISTER')} 
          className="bg-gradient-to-b from-[#4ADE80] to-[#22C55E] text-black font-extrabold w-full py-4 rounded-2xl text-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(57,181,74,0.3)] hover:shadow-[0_0_25px_rgba(57,181,74,0.5)] border border-white/20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          เริ่มต้นใช้งาน
        </button>

        {/* Divider */}
        <div className="flex items-center w-full px-2 mt-2">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="px-4 text-sm font-medium text-gray-500">หรือ</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Footer Link */}
        <div className="text-center pt-2">
          <p className="text-gray-400 font-medium text-sm mb-4">มีบัญชีอยู่แล้ว?</p>
          <button 
            onClick={() => setAuthStep('LOGIN')} 
            className="w-full bg-white/5 border border-white/10 text-white font-bold py-3.5 rounded-2xl text-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </motion.div>
    </AuthLayout>
  );
};

export default OnboardingView;
