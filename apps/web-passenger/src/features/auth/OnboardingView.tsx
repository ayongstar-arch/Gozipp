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

  const handleLineLogin = () => {
    window.location.href = API_BASE_URL + '/auth/line?type=PASSENGER';
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-[#030605] font-kanit selection:bg-[#A3FF3F]/30 relative overflow-hidden text-white p-6">
      
      {/* Background City Image and Perspective Road */}
      <div className="absolute bottom-0 left-0 right-0 h-[40vh] pointer-events-none z-0 overflow-hidden">
        {/* Soft radial glow behind the city to pop it */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[300px] bg-[#A3FF3F]/5 rounded-full blur-[80px]" />
        
        {/* Cityscape Background Image */}
        <img 
          src="/brand/bg-city.png" 
          alt="Cityscape Background"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full min-w-[768px] h-full object-cover object-bottom opacity-40 mix-blend-screen"
          style={{ filter: 'hue-rotate(90deg) brightness(0.6) contrast(1.2)' }}
        />

        {/* Gradient overlays to blend the image perfectly */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030605] via-[#030605]/40 to-[#030605] z-10" />

        {/* Perspective Road Lanes & Glows */}
        <svg className="absolute inset-0 w-full h-full z-20" viewBox="0 0 1000 400" preserveAspectRatio="none">
          {/* Perspective road lines meeting in the center */}
          <line x1="0" y1="400" x2="500" y2="280" stroke="#A3FF3F" strokeWidth="3" opacity="0.8" />
          <line x1="1000" y1="400" x2="500" y2="280" stroke="#A3FF3F" strokeWidth="3" opacity="0.8" />
          
          <line x1="500" y1="400" x2="500" y2="280" stroke="#A3FF3F" strokeWidth="2" strokeDasharray="15, 15" opacity="0.6" />
          
          <rect x="0" y="280" width="1000" height="120" fill="url(#roadGlow)" opacity="0.3" pointerEvents="none" />
          
          <defs>
            <linearGradient id="roadGlow" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#A3FF3F" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#A3FF3F" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <InstallPwaPrompt />
      
      {/* Top spacer or branding */}
      <div className="h-4 z-10" />

      {/* Main Content Area (Logo + Slogans) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col items-center justify-center space-y-6 relative z-10 -mt-8"
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
            className="w-48 h-auto relative z-10 object-contain mix-blend-screen"
          />
        </motion.div>
        
        {/* Texts */}
        <motion.div variants={itemVariants} className="space-y-2.5 text-center">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">เรียกวินใกล้คุณ</h1>
          <p className="text-[#A3FF3F] font-bold text-lg">เข้าถึงคนขับจริงในพื้นที่</p>
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
          onClick={() => setAuthStep('LOGIN')} 
          className="bg-[#A3FF3F] text-[#04070B] font-extrabold w-full py-4 rounded-2xl shadow-[0_0_20px_rgba(163,255,63,0.25)] text-lg transition-transform active:scale-[0.98]"
        >
          เริ่มต้นใช้งาน
        </button>

        {/* Divider */}
        <div className="flex items-center w-full px-2">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="px-4 text-xs font-medium text-gray-500">หรือ</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleLogin}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-3.5 px-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <img src="/brand/google.svg" alt="Google" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">ดำเนินการต่อด้วย Google</span>
          </button>
          <button
            onClick={handleLineLogin}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-3.5 px-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <img src="/brand/line.svg" alt="Line" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">ดำเนินการต่อด้วย Line</span>
          </button>
        </div>

        {/* Footer Link */}
        <div className="text-center pt-2">
          <button 
            onClick={() => setAuthStep('LOGIN')} 
            className="text-gray-400 font-medium text-xs hover:text-white transition-colors"
          >
            มีบัญชีอยู่แล้ว? <span className="text-[#A3FF3F] font-bold">เข้าสู่ระบบ</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingView;
