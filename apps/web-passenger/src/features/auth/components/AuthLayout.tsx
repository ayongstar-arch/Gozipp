import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { APP_LOGO_PATH } from '@/constants';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  dockMode?: boolean; // If true, pushes children to the bottom (like Onboarding)
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle, 
  showBackButton, 
  onBack,
  dockMode = false 
}) => {
  return (
    <div className="flex flex-col justify-between min-h-[100dvh] bg-[#04070B] font-kanit relative overflow-hidden text-white w-full">
      
      {/* 1. MASTER BACKGROUND LAYER */}
      {/* Positioned at the absolute background. Anchored to bottom. */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-end overflow-hidden">
        {/* Top fade: Smooth transition from black top to the city skyline */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#04070B] via-transparent to-[#04070B]/80 z-10"></div>
        {/* The Master Background Image: Object-cover, bottom aligned to ensure the glowing road is always visible */}
        <img 
          src="/bg-city-realistic.png" 
          alt="Gozipp Master Background" 
          className="w-full h-full object-cover object-bottom opacity-90 mix-blend-screen" 
        />
      </div>

      {/* 2. BACK BUTTON (Optional) */}
      {showBackButton && (
        <div className="absolute top-6 left-6 z-40">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
            aria-label="กลับ"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* 3. MAIN CONTENT WRAPPER */}
      {/* We use pt-12 to push the logo down slightly from the very top. */}
      <div className={`flex-1 flex flex-col justify-start relative z-20 w-full pt-[10vh]`}>
        
        {/* MASTER LOGO */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto w-40 h-40 flex items-center justify-center relative mix-blend-screen mb-2"
        >
          {/* Radial Glow Effect behind the logo (The Green Aura) */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(163,255,63,0.18) 0%, transparent 65%)'
            }}
          />
          <img 
            src={APP_LOGO_PATH} 
            className="w-32 h-auto object-contain relative z-10 contrast-125 drop-shadow-[0_0_15px_rgba(57,181,74,0.4)]" 
            alt="Gozipp" 
          />
        </motion.div>

        {/* MASTER TEXT HEADERS */}
        {(title || subtitle) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
            className="text-center mb-6 px-6"
          >
            {title && (
              <h2 className="text-[28px] lg:text-[32px] font-extrabold text-white mb-1.5 tracking-tight drop-shadow-lg">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-gray-300 font-medium text-sm lg:text-base leading-relaxed drop-shadow-md">
                {subtitle}
              </p>
            )}
          </motion.div>
        )}

        {/* DYNAMIC FORM / BUTTON CONTENT */}
        <div className={`w-full max-w-md mx-auto relative z-30 flex flex-col ${dockMode ? 'mt-auto' : 'px-6 pb-10'}`}>
          {children}
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;
