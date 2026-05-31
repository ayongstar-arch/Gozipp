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
    setToastMessage('เข้าสู่ระบบด้วย Apple กำลังอยู่ในระหว่างพัฒนา');
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-[#030605] font-kanit selection:bg-[#A3FF3F]/30 relative overflow-hidden text-white p-6">
      
      {/* Cityscape SVG and perspective road at the bottom background */}
      <div className="absolute bottom-0 left-0 w-full h-[40vh] pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
          {/* City silhouette background */}
          <path d="M 0,300 L 0,220 L 30,220 L 30,180 L 70,180 L 70,250 L 100,250 L 100,120 L 140,120 L 140,240 L 190,240 L 190,80 L 250,80 L 250,220 L 290,220 L 290,150 L 340,150 L 340,260 L 390,260 L 390,100 L 450,100 L 450,230 L 490,230 L 490,50 L 560,50 L 560,250 L 610,250 L 610,130 L 670,130 L 670,240 L 710,240 L 710,90 L 770,90 L 770,210 L 810,210 L 810,160 L 860,160 L 860,250 L 900,250 L 900,110 L 960,110 L 960,220 L 1000,220 L 1000,400 L 0,400 Z" fill="#05140b" opacity="0.6"/>
          {/* More foreground city silhouette */}
          <path d="M 0,350 L 0,250 L 50,250 L 50,200 L 90,200 L 90,270 L 120,270 L 120,160 L 170,160 L 170,280 L 220,280 L 220,120 L 270,120 L 270,240 L 310,240 L 310,180 L 360,180 L 360,290 L 410,290 L 410,140 L 470,140 L 470,260 L 520,260 L 520,90 L 580,90 L 580,280 L 630,280 L 630,170 L 690,170 L 690,270 L 740,270 L 740,130 L 790,130 L 790,230 L 840,230 L 840,190 L 890,190 L 890,280 L 930,280 L 930,150 L 980,150 L 980,260 L 1000,260 L 1000,400 L 0,400 Z" fill="#020805" />
          
          {/* Glowing window grids on some buildings */}
          <rect x="130" y="180" width="4" height="4" fill="#A3FF3F" opacity="0.6" />
          <rect x="140" y="180" width="4" height="4" fill="#A3FF3F" opacity="0.6" />
          <rect x="150" y="180" width="4" height="4" fill="#A3FF3F" opacity="0.6" />
          <rect x="130" y="195" width="4" height="4" fill="#A3FF3F" opacity="0.8" />
          <rect x="140" y="195" width="4" height="4" fill="#A3FF3F" opacity="0.4" />
          <rect x="150" y="195" width="4" height="4" fill="#A3FF3F" opacity="0.8" />
          <rect x="130" y="210" width="4" height="4" fill="#A3FF3F" opacity="0.5" />
          <rect x="145" y="210" width="4" height="4" fill="#A3FF3F" opacity="0.7" />
          
          <rect x="420" y="160" width="5" height="5" fill="#A3FF3F" opacity="0.7" />
          <rect x="435" y="160" width="5" height="5" fill="#A3FF3F" opacity="0.5" />
          <rect x="450" y="160" width="5" height="5" fill="#A3FF3F" opacity="0.8" />
          <rect x="420" y="180" width="5" height="5" fill="#A3FF3F" opacity="0.6" />
          <rect x="435" y="180" width="5" height="5" fill="#A3FF3F" opacity="0.9" />
          <rect x="450" y="180" width="5" height="5" fill="#A3FF3F" opacity="0.7" />
          
          <rect x="750" y="150" width="4" height="4" fill="#A3FF3F" opacity="0.9" />
          <rect x="760" y="150" width="4" height="4" fill="#A3FF3F" opacity="0.7" />
          <rect x="770" y="150" width="4" height="4" fill="#A3FF3F" opacity="0.5" />
          <rect x="750" y="170" width="4" height="4" fill="#A3FF3F" opacity="0.6" />
          <rect x="760" y="170" width="4" height="4" fill="#A3FF3F" opacity="0.8" />
          <rect x="770" y="170" width="4" height="4" fill="#A3FF3F" opacity="0.9" />

          {/* Perspective road lines meeting in the center */}
          <line x1="0" y1="400" x2="500" y2="280" stroke="#A3FF3F" strokeWidth="3" opacity="0.8" />
          <line x1="1000" y1="400" x2="500" y2="280" stroke="#A3FF3F" strokeWidth="3" opacity="0.8" />
          
          <line x1="500" y1="400" x2="500" y2="280" stroke="#A3FF3F" strokeWidth="2" strokeDasharray="15, 15" opacity="0.6" />
          
          <rect x="0" y="280" width="1000" height="120" fill="url(#roadGlow)" opacity="0.3" pointer-events="none" />
          
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
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleGoogleLogin}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-3.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <img src="/brand/google.svg" alt="Google" className="w-4 h-4" />
            Google
          </button>
          <button
            onClick={handleAppleLogin}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-3.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <img src="/brand/apple.svg" alt="Apple" className="w-4 h-4 brightness-0 invert" />
            Apple
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
