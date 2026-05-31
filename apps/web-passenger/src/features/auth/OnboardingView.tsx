import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import InstallPwaPrompt from '../../components/InstallPwaPrompt';
import { APP_LOGO_PATH } from '@/constants';
import { motion } from 'framer-motion';

const OnboardingView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  return (
    <div className="flex flex-col h-full bg-[#04070B] font-kanit selection:bg-[#A3FF3F]/30 relative overflow-hidden text-white">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#A3FF3F]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />
      
      <InstallPwaPrompt />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-12 relative z-10"
      >
        <motion.div variants={itemVariants} className="w-64 h-64 bg-white rounded-[40px] flex items-center justify-center mb-4 relative group shadow-[0_0_50px_rgba(255,255,255,0.15)] overflow-hidden p-4">
          <img 
            src={APP_LOGO_PATH} 
            alt="GOZIPP Logo" 
            className="w-full h-full relative z-10 object-contain drop-shadow-xl transition-transform group-hover:scale-105 duration-700" 
          />
        </motion.div>
        
        <motion.div variants={itemVariants} className="space-y-4">
          <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase font-kanit">GOZIPP</h1>
          <div className="w-16 h-2 bg-[#A3FF3F] mx-auto rounded-full shadow-[0_0_15px_rgba(163,255,63,0.6)]"></div>
          <p className="text-gray-400 text-lg leading-relaxed font-medium">
            เรียกวินง่าย รอไม่นาน<br />
            <span className="text-white">แพลตฟอร์มมอเตอร์ไซค์ยุคใหม่</span>
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6 w-full max-w-sm mt-8">
          {[
            { icon: '⚡', label: 'รวดเร็ว' },
            { icon: '🛡️', label: 'ปลอดภัย' },
            { icon: '💎', label: 'พรีเมียม' }
          ].map((feat, idx) => (
            <div key={idx} className="flex flex-col items-center space-y-2">
              <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/10 group hover:border-[#A3FF3F]/50 transition-colors">
                {feat.icon}
              </div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{feat.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="p-10 relative z-10"
      >
        <button 
          onClick={() => setAuthStep('LOGIN')} 
          className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(163,255,63,0.3)] text-xl hover:scale-[1.02] active:scale-[0.98] transition-all tracking-tighter overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
          <span className="relative z-10 uppercase">เริ่มต้นใช้งาน</span>
        </button>
      </motion.div>
    </div>
  );
};

export default OnboardingView;
