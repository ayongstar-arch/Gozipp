import React from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { Home, Clock, Wallet, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AppLayout: React.FC<{ children: React.ReactNode; hideNavigation?: boolean }> = ({
  children,
  hideNavigation = false,
}) => {
  const { activeTab, setActiveTab, toastMessage } = useUIStore();
  const { user } = useAuthStore();

  const tabs = [
    { id: 'HOME', label: 'หน้าแรก', icon: Home },
    { id: 'HISTORY', label: 'ประวัติ', icon: Clock },
    { id: 'WALLET', label: 'กระเป๋าเงิน', icon: Wallet },
    { id: 'PROFILE', label: 'โปรไฟล์', icon: User },
  ];

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-md mx-auto bg-[#07131d] font-kanit shadow-2xl relative overflow-hidden text-white box-border">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-4 left-4 right-4 z-[2000]"
          >
            <div className="bg-[#0e2433]/95 backdrop-blur-xl text-white px-4 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center gap-2.5 border border-[#00e58b]/30">
              <div className="w-7 h-7 rounded-full bg-[#00e58b]/20 flex items-center justify-center shrink-0">
                <span className="text-[#00e58b] text-xs">✨</span>
              </div>
              <span className="font-medium text-xs text-slate-100 truncate">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main
        className={`flex-1 min-h-0 relative z-10 w-full max-w-full overflow-hidden ${
          activeTab === 'HOME' ? 'h-full' : 'overflow-y-auto pb-20 custom-scrollbar'
        }`}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNavigation && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#07131d]/95 backdrop-blur-2xl border-t border-slate-800/80 flex justify-around items-center px-2 py-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-[1000] box-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex flex-col items-center gap-0.5 transition-all duration-200 w-16 py-0.5 ${
                  isActive ? 'text-[#00e58b]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative flex items-center justify-center w-6 h-6">
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] tracking-tight transition-all leading-none ${
                    isActive ? 'font-bold text-[#00e58b]' : 'font-medium text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="w-5 h-0.5 bg-[#00e58b] rounded-full mt-0.5 shadow-[0_0_8px_#00e58b]" />
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
