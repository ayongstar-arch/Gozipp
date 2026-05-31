import React from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTab, setActiveTab, toastMessage } = useUIStore();
  const { user } = useAuthStore();

  const tabs = [
    { id: 'HOME', label: 'หน้าแรก', icon: '🏠' },
    { id: 'ACTIVITY', label: 'กิจกรรม', icon: '📋' },
    { id: 'WALLET', label: 'กระเป๋าเงิน', icon: '👛' },
    { id: 'HISTORY', label: 'ประวัติ', icon: '🕒' },
    { id: 'PROFILE', label: 'โปรไฟล์', icon: '👤' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-8 left-4 right-4 z-[2000] animate-in slide-in-from-top-10 duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
            <span className="text-xl">✨</span>
            <span className="font-bold">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center p-3 pb-6 z-[1000]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === tab.id ? 'text-green-600 scale-110' : 'text-slate-400'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
