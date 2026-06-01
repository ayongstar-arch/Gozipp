import React from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { API_BASE_URL } from '@/constants';

const RegisterMethodView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const setToastMessage = useUIStore((state) => state.setToastMessage);

  const handleGoogleLogin = () => {
    window.location.href = API_BASE_URL + '/auth/google?type=PASSENGER';
  };

  const handleLineLogin = () => {
    // Optional: Add Line Login OAuth endpoint later
    setToastMessage('ระบบสมัครสมาชิกด้วย Line ยังไม่เปิดให้บริการในขณะนี้');
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-[#0A0D14] font-kanit relative overflow-hidden text-white w-full">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <button 
          onClick={() => setAuthStep('ONBOARDING')}
          className="w-10 h-10 bg-transparent text-white flex items-center justify-center transition-colors"
          aria-label="กลับ"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-start mt-20 relative z-10 w-full px-6">
        
        {/* Header Texts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-2">สมัครสมาชิกใหม่</h2>
          <p className="text-gray-400 font-medium text-sm">เลือกวิธีที่คุณสะดวก</p>
        </motion.div>

        {/* Auth Methods Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Phone Method (Primary) */}
          <button 
            onClick={() => setAuthStep('REGISTER')}
            className="w-full bg-[#11151C] border border-[#39B54A] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#39B54A]/5 transition-colors relative"
          >
            <div className="w-8 h-10 flex items-center justify-center text-[#39B54A]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8" strokeWidth="1.5">
                <rect x="5" y="2" width="14" height="20" rx="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18H12.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white font-bold text-base">เบอร์โทรศัพท์</h3>
              <p className="text-gray-400 text-xs mt-0.5">สมัครสมาชิกด้วยเบอร์มือถือ</p>
            </div>
            <div className="text-[#39B54A]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Google Method */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-[#11151C] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
          >
            <div className="w-8 flex justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white font-bold text-base">Google</h3>
              <p className="text-gray-400 text-xs mt-0.5">สมัครสมาชิกด้วยบัญชี Google</p>
            </div>
            <div className="text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Line Method */}
          <button 
            onClick={handleLineLogin}
            className="w-full bg-[#11151C] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
          >
            <div className="w-8 flex justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7">
                <circle cx="12" cy="12" r="11" fill="#00C300"/>
                <path fill="#FFF" d="M17.3 11.2c0-2.4-2.4-4.4-5.3-4.4s-5.3 2-5.3 4.4c0 2.2 2 4 4.6 4.3.2 0 .5.1.5.3s-.1.4-.2.8c0 0-.2.6-.2.7-.1.3.3.5.7.3.5-.2 2.8-1.7 3.8-2.8.9-1.2 1.4-2.1 1.4-3.6zm-6 1.4H9.6c-.2 0-.3-.1-.3-.3V9c0-.2.1-.3.3-.3h1.8c.2 0 .3.1.3.3s-.1.3-.3.3h-1.4v1h1.4c.2 0 .3.1.3.3s-.1.3-.3.3h-1.4v1.1h1.4c.2 0 .3.1.3.3s-.1.3-.3.3zm2.5 0h-.6c-.2 0-.3-.1-.3-.3v-3c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3zm2.2-.4l-1.3-1.8v1.8c0 .2-.1.3-.3.3s-.3-.1-.3-.3V9c0-.2.1-.3.3-.3s.2 0 .3.1l1.3 1.8V9c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3s-.3-.1-.3-.3zM10.8 12.6h-.6c-.2 0-.3-.1-.3-.3V9c0-.2.1-.3.3-.3s.3.1.3.3v3c0 .2-.1.3-.3.3z"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white font-bold text-base">Line</h3>
              <p className="text-gray-400 text-xs mt-0.5">สมัครสมาชิกด้วยบัญชี Line</p>
            </div>
            <div className="text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </motion.div>

      </div>

      {/* Footer Security Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="pb-10 pt-4 flex items-center justify-center gap-3 relative z-10"
      >
        <div className="text-[#39B54A]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-white font-medium text-sm">ข้อมูลของคุณปลอดภัย</p>
          <p className="text-gray-500 text-xs">เราปกป้องข้อมูลตามมาตรฐานสากล</p>
        </div>
      </motion.div>

    </div>
  );
};

export default RegisterMethodView;
