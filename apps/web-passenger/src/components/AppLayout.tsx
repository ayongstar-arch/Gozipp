import React from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { Home, Clock, Wallet, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AppLayout: React.FC<{ children: React.ReactNode; hideNavigation?: boolean }> = ({ children, hideNavigation = false }) => {
  const { activeTab, setActiveTab, toastMessage } = useUIStore();
  const { user } = useAuthStore();

  const tabs = [
    { id: 'HOME', label: 'หน้าแรก', icon: Home },
    { id: 'HISTORY', label: 'ประวัติ', icon: Clock },
    { id: 'WALLET', label: 'กระเป๋าเงิน', icon: Wallet },
    { id: 'PROFILE', label: 'โปรไฟล์', icon: User },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#07131d] font-kanit max-w-md mx-auto shadow-2xl relative overflow-hidden text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-8 left-4 right-4 z-[2000]"
          >
            <div className="bg-[#0e2433]/95 backdrop-blur-xl text-white px-5 py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 border border-[#00e58b]/30">
              <div className="w-8 h-8 rounded-full bg-[#00e58b]/20 flex items-center justify-center shrink-0">
                <span className="text-[#00e58b] text-sm">✨</span>
              </div>
              <span className="font-medium text-xs text-slate-100">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={`flex-1 relative z-10 ${activeTab === 'HOME' ? 'h-full overflow-hidden' : 'overflow-y-auto pb-24 custom-scrollbar'}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNavigation && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#07131d]/95 backdrop-blur-2xl border-t border-slate-800/80 flex justify-around items-center px-4 py-2 pb-5 z-[1000]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex flex-col items-center gap-1 transition-all duration-200 w-16 py-1 ${
                  isActive ? 'text-[#00e58b]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                </div>
                <span className={`text-[11px] tracking-tight transition-all ${isActive ? 'font-bold text-[#00e58b]' : 'font-medium text-slate-400'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="w-6 h-0.5 bg-[#00e58b] rounded-full mt-0.5 shadow-[0_0_8px_#00e58b]" />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default AppLayout;
