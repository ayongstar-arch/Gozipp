import React from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { Home, Activity, Wallet, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTab, setActiveTab, toastMessage } = useUIStore();
  const { user } = useAuthStore();

  const tabs = [
    { id: 'HOME', label: 'หน้าแรก', icon: Home },
    { id: 'ACTIVITY', label: 'กิจกรรม', icon: Activity },
    { id: 'WALLET', label: 'กระเป๋าเงิน', icon: Wallet },
    { id: 'HISTORY', label: 'ประวัติ', icon: Clock },
    { id: 'PROFILE', label: 'โปรไฟล์', icon: User },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#04070B] font-kanit max-w-md mx-auto shadow-2xl relative overflow-hidden text-white">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#A3FF3F]/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-8 left-4 right-4 z-[2000]"
          >
            <div className="bg-[#1A2333]/90 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-3 border border-[#A3FF3F]/20">
              <div className="w-8 h-8 rounded-full bg-[#A3FF3F]/20 flex items-center justify-center">
                <span className="text-[#A3FF3F] text-sm">✨</span>
              </div>
              <span className="font-medium text-sm">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 relative z-10 custom-scrollbar">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0B1120]/80 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center p-3 pb-6 z-[1000]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-16 ${
                isActive ? 'text-[#A3FF3F]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#A3FF3F]/10' : ''}`}>
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl bg-[#A3FF3F]/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
              <span className={`text-[10px] font-medium tracking-wide transition-all ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
