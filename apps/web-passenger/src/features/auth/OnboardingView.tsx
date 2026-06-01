import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import InstallPwaPrompt from '../../components/InstallPwaPrompt';
import { API_BASE_URL } from '@/constants';
import { motion } from 'framer-motion';

const OnboardingView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const setToastMessage = useUIStore((state) => state.setToastMessage);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const handleGoogleLogin = () => {
    window.location.href = API_BASE_URL + '/auth/google?type=PASSENGER';
  };

  const handleAppleLogin = () => {
    setToastMessage('ระบบล็อกอินด้วย Apple ID ยังไม่เปิดให้บริการในขณะนี้');
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit selection:bg-[#39B54A]/30 relative overflow-hidden text-white p-6">
      
      {/* Background SVG Cityscape and Perspective Road */}
      <div className="absolute bottom-[20vh] left-0 right-0 h-[45vh] pointer-events-none z-0 overflow-hidden flex items-end">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
        <img src="/bg-city-realistic.png" alt="Cityscape" className="w-full h-full object-cover object-bottom opacity-80" />
      </div>

      <InstallPwaPrompt />
      
      {/* Top spacer or branding */}
      <div className="h-4 z-10" />

      {/* Main Content Area (Logo + Slogans) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col items-center justify-start mt-0 space-y-2 relative z-10"
      >
        {/* Radial glow background wrapper */}
        <motion.div 
          variants={itemVariants} 
          className="relative flex items-center justify-center w-56 h-56 mx-auto"
        >
          {/* Radial Glow Effect */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(163,255,63,0.12) 0%, transparent 65%)'
            }}
          />
          <img 
            src="/logo-gozipp.png" 
            alt="GOZIPP Logo" 
            className="w-40 h-auto relative z-10 object-contain mix-blend-screen"
          />
        </motion.div>
        
        {/* Texts */}
        <motion.div variants={itemVariants} className="space-y-2.5 text-center">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">เรียกวินใกล้คุณ</h1>
          <p className="text-gray-300 font-medium text-lg">เข้าถึงคนขับจริงในพื้นที่</p>
          <p className="text-gray-400 font-medium text-sm">ปลอดภัย รวดเร็ว และโปร่งใส</p>
        </motion.div>
      </motion.div>

      {/* Actions Area */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative z-10 w-full flex flex-col space-y-4 pb-4"
      >
        {/* Primary Action */}
        <button 
          onClick={() => setAuthStep('REGISTER')} 
          className="bg-[#39B54A] text-black font-extrabold w-full py-4 rounded-2xl text-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
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
            className="w-full bg-transparent border border-[#39B54A] text-[#39B54A] font-bold py-3.5 rounded-2xl text-lg hover:bg-[#39B54A]/10 transition-colors"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingView;
