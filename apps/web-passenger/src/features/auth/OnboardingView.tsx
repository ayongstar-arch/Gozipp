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
    <div className="flex flex-col justify-between h-[100dvh] bg-[#030605] font-kanit selection:bg-[#A3FF3F]/30 relative overflow-hidden text-white p-6">
      
      {/* Background SVG Cityscape and Perspective Road */}
      <div className="absolute bottom-0 left-0 right-0 h-[40vh] pointer-events-none z-0 overflow-hidden">
        <svg className="absolute bottom-0 left-0 right-0 w-full h-full" viewBox="0 0 1000 500" preserveAspectRatio="none">
          <defs>
            <linearGradient id="skyGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A3FF3F" stopOpacity="0" />
              <stop offset="50%" stopColor="#A3FF3F" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#A3FF3F" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="roadGlow" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#A3FF3F" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#A3FF3F" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="buildingGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#08140e" />
              <stop offset="100%" stopColor="#030605" />
            </linearGradient>
            <linearGradient id="buildingGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c2014" />
              <stop offset="100%" stopColor="#030605" />
            </linearGradient>
          </defs>

          {/* Background glow */}
          <rect x="0" y="0" width="1000" height="500" fill="url(#skyGlow)" />

          {/* Cityscape Buildings Silhouette */}
          {/* Building 1 (Left) */}
          <rect x="20" y="180" width="70" height="320" fill="url(#buildingGrad1)" />
          {/* Glowing windows on Building 1 */}
          <g opacity="0.6" fill="#A3FF3F">
            <rect x="35" y="200" width="6" height="6" rx="1" />
            <rect x="55" y="200" width="6" height="6" rx="1" />
            <rect x="35" y="220" width="6" height="6" rx="1" />
            <rect x="55" y="220" width="6" height="6" rx="1" />
            <rect x="35" y="240" width="6" height="6" rx="1" />
            <rect x="55" y="240" width="6" height="6" rx="1" />
            <rect x="35" y="260" width="6" height="6" rx="1" />
            <rect x="55" y="260" width="6" height="6" rx="1" />
            <rect x="35" y="280" width="6" height="6" rx="1" />
            <rect x="55" y="280" width="6" height="6" rx="1" />
          </g>

          {/* Building 2 */}
          <rect x="110" y="120" width="80" height="380" fill="url(#buildingGrad2)" />
          {/* Antennas */}
          <line x1="150" y1="120" x2="150" y2="80" stroke="#A3FF3F" strokeWidth="2" opacity="0.8" />
          <circle cx="150" cy="80" r="3" fill="#A3FF3F" />
          {/* Glowing windows Building 2 */}
          <g opacity="0.45" fill="#A3FF3F">
            <rect x="125" y="140" width="5" height="10" />
            <rect x="140" y="140" width="5" height="10" />
            <rect x="155" y="140" width="5" height="10" />
            <rect x="170" y="140" width="5" height="10" />
            <rect x="125" y="165" width="5" height="10" />
            <rect x="140" y="165" width="5" height="10" />
            <rect x="155" y="165" width="5" height="10" />
            <rect x="170" y="165" width="5" height="10" />
            <rect x="125" y="190" width="5" height="10" />
            <rect x="140" y="190" width="5" height="10" />
            <rect x="155" y="190" width="5" height="10" />
            <rect x="170" y="190" width="5" height="10" />
            <rect x="125" y="215" width="5" height="10" opacity="0.1" />
            <rect x="140" y="215" width="5" height="10" />
            <rect x="155" y="215" width="5" height="10" />
            <rect x="170" y="215" width="5" height="10" />
          </g>

          {/* Building 3 */}
          <rect x="210" y="220" width="60" height="280" fill="url(#buildingGrad1)" />
          <g opacity="0.5" fill="#A3FF3F">
            <rect x="225" y="240" width="8" height="4" />
            <rect x="245" y="240" width="8" height="4" />
            <rect x="225" y="255" width="8" height="4" />
            <rect x="245" y="255" width="8" height="4" />
            <rect x="225" y="270" width="8" height="4" />
            <rect x="245" y="270" width="8" height="4" />
          </g>

          {/* Building 4 (Center-left) */}
          <rect x="290" y="150" width="90" height="350" fill="url(#buildingGrad2)" />
          <g opacity="0.7" fill="#A3FF3F">
            <rect x="310" y="170" width="6" height="6" />
            <rect x="325" y="170" width="6" height="6" />
            <rect x="340" y="170" width="6" height="6" />
            <rect x="355" y="170" width="6" height="6" />
            <rect x="310" y="190" width="6" height="6" />
            <rect x="325" y="190" width="6" height="6" />
            <rect x="340" y="190" width="6" height="6" />
            <rect x="355" y="190" width="6" height="6" />
            <rect x="310" y="210" width="6" height="6" />
            <rect x="325" y="210" width="6" height="6" />
            <rect x="340" y="210" width="6" height="6" />
            <rect x="355" y="210" width="6" height="6" />
            <rect x="310" y="230" width="6" height="6" />
            <rect x="325" y="230" width="6" height="6" />
            <rect x="340" y="230" width="6" height="6" />
            <rect x="355" y="230" width="6" height="6" />
          </g>

          {/* Center background tower */}
          <rect x="440" y="90" width="120" height="410" fill="url(#buildingGrad1)" />
          <line x1="500" y1="90" x2="500" y2="30" stroke="#A3FF3F" strokeWidth="3" opacity="0.9" />
          <circle cx="500" cy="30" r="4" fill="#A3FF3F" />
          <line x1="500" y1="100" x2="500" y2="450" stroke="#A3FF3F" strokeWidth="1" opacity="0.3" />
          <g opacity="0.5" fill="#A3FF3F">
            <rect x="460" y="120" width="8" height="8" rx="1" />
            <rect x="532" y="120" width="8" height="8" rx="1" />
            <rect x="460" y="140" width="8" height="8" rx="1" />
            <rect x="532" y="140" width="8" height="8" rx="1" />
            <rect x="460" y="160" width="8" height="8" rx="1" />
            <rect x="532" y="160" width="8" height="8" rx="1" />
            <rect x="460" y="180" width="8" height="8" rx="1" />
            <rect x="532" y="180" width="8" height="8" rx="1" />
          </g>

          {/* Building 5 (Center-right) */}
          <rect x="600" y="170" width="80" height="330" fill="url(#buildingGrad2)" />
          <g opacity="0.65" fill="#A3FF3F">
            <rect x="620" y="190" width="10" height="4" />
            <rect x="650" y="190" width="10" height="4" />
            <rect x="620" y="210" width="10" height="4" />
            <rect x="650" y="210" width="10" height="4" />
            <rect x="620" y="230" width="10" height="4" />
            <rect x="650" y="230" width="10" height="4" />
            <rect x="620" y="250" width="10" height="4" />
            <rect x="650" y="250" width="10" height="4" />
          </g>

          {/* Building 6 */}
          <rect x="700" y="130" width="90" height="370" fill="url(#buildingGrad1)" />
          <line x1="745" y1="130" x2="745" y2="70" stroke="#A3FF3F" strokeWidth="2" opacity="0.8" />
          <circle cx="745" cy="70" r="3" fill="#A3FF3F" />
          <g opacity="0.6" fill="#A3FF3F">
            <rect x="720" y="150" width="6" height="12" />
            <rect x="735" y="150" width="6" height="12" />
            <rect x="750" y="150" width="6" height="12" />
            <rect x="765" y="150" width="6" height="12" />
            <rect x="720" y="180" width="6" height="12" />
            <rect x="735" y="180" width="6" height="12" />
            <rect x="750" y="180" width="6" height="12" />
            <rect x="765" y="180" width="6" height="12" />
            <rect x="720" y="210" width="6" height="12" />
            <rect x="735" y="210" width="6" height="12" />
            <rect x="750" y="210" width="6" height="12" />
            <rect x="765" y="210" width="6" height="12" />
          </g>

          {/* Building 7 */}
          <rect x="810" y="200" width="70" height="300" fill="url(#buildingGrad2)" />
          <g opacity="0.5" fill="#A3FF3F">
            <rect x="830" y="220" width="8" height="8" rx="2" />
            <rect x="850" y="220" width="8" height="8" rx="2" />
            <rect x="830" y="240" width="8" height="8" rx="2" />
            <rect x="850" y="240" width="8" height="8" rx="2" />
            <rect x="830" y="260" width="8" height="8" rx="2" />
            <rect x="850" y="260" width="8" height="8" rx="2" />
          </g>

          {/* Building 8 (Far Right) */}
          <rect x="900" y="160" width="80" height="340" fill="url(#buildingGrad1)" />
          <g opacity="0.4" fill="#A3FF3F">
            <rect x="920" y="180" width="5" height="15" />
            <rect x="935" y="180" width="5" height="15" />
            <rect x="950" y="180" width="5" height="15" />
            <rect x="920" y="210" width="5" height="15" />
            <rect x="935" y="210" width="5" height="15" />
            <rect x="950" y="210" width="5" height="15" />
          </g>

          {/* Perspective Road Lanes & Glows */}
          <polygon points="0,500 500,350 1000,500" fill="#020403" opacity="0.95" />

          {/* Road Perspective lines */}
          <line x1="0" y1="500" x2="500" y2="350" stroke="#A3FF3F" strokeWidth="4" opacity="0.9" />
          <line x1="1000" y1="500" x2="500" y2="350" stroke="#A3FF3F" strokeWidth="4" opacity="0.9" />

          {/* Glowing center dashed lane line */}
          <line x1="500" y1="500" x2="500" y2="350" stroke="#A3FF3F" strokeWidth="3" strokeDasharray="20, 20" opacity="0.8" />

          {/* Subtle overlay gradients for roads */}
          <rect x="0" y="350" width="1000" height="150" fill="url(#roadGlow)" opacity="0.4" pointerEvents="none" />
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
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-3.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <img src="/brand/google.svg" alt="Google" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Google</span>
          </button>
          <button
            onClick={handleAppleLogin}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-3.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <img src="/brand/apple.svg" alt="Apple" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Apple ID</span>
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
