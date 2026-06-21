import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import ReferralView from '../passenger/ReferralView';
import { useAuth } from '../../hooks/useAuth';

const ProfileView: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [showReferral, setShowReferral] = useState(false);
  const { getPinResetRequests, approvePinReset, error } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);

  const refreshRequests = async () => {
    try {
      const list = await getPinResetRequests('DRIVER');
      setRequests(list);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    refreshRequests();
  }, []);

  if (showReferral) {
    return <ReferralView onClose={() => setShowReferral(false)} />;
  }

  const handleApprove = async (requestId: string) => {
    await approvePinReset(requestId);
    await refreshRequests();
  };

  const menuItems = [
    { label: 'ชวนเพื่อนรับแต้มสะสม', icon: '🎁', color: 'text-pink-400', onClick: () => setShowReferral(true) },
    { label: 'Saved Places', icon: '📍', color: 'text-blue-400' },
    { label: 'Payment Methods', icon: '💳', color: 'text-gozipp-green' },
    { label: 'Support Center', icon: '💬', color: 'text-amber-400' },
    { label: 'Privacy & Security', icon: '🛡️', color: 'text-slate-400' },
  ];

  return (
    <div className="flex-1 bg-slate-950 font-sans p-6 overflow-y-auto">
      {/* Profile Header */}
      <div className="flex flex-col items-center py-12 mb-8 animate-in fade-in zoom-in duration-500">
        <div className="w-32 h-32 bg-slate-900 rounded-4xl flex items-center justify-center text-5xl mb-6 relative group shadow-premium border border-white/5">
          <div className="absolute inset-0 bg-gozipp-green/10 rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {user?.avatarSeed || '👤'}
        </div>
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">{user?.name || 'GOZIPP User'}</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{user?.phone || 'No phone verified'}</p>
      </div>

      <div className="mt-8 mb-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-black uppercase tracking-tighter text-sm">คำขอรีเซ็ต PIN ที่รออนุมัติ</h3>
            <button onClick={refreshRequests} className="text-amber-300 text-xs font-bold">รีเฟรช</button>
          </div>
          {requests.length === 0 ? (
            <p className="text-slate-400 text-sm">ยังไม่มีคำขอรออนุมัติ</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.requestId} className="bg-slate-950/60 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-white font-bold text-sm">#{String(req.requestId).slice(0, 8)}</div>
                      <div className="text-slate-400 text-xs">หมดอายุใน {Math.max(0, Math.ceil((req.expiresAt - Date.now()) / 1000))} วินาที</div>
                    </div>
                    <button
                      onClick={() => handleApprove(req.requestId)}
                      className="bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase"
                    >
                      อนุมัติ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        </div>
      </div>

      {/* Menu Options */}
      <div className="space-y-4">
        {menuItems.map((item, i) => (
          <button 
            key={i} 
            onClick={item.onClick}
            className="w-full bg-slate-900/50 hover:bg-slate-900 border border-white/5 p-5 rounded-3xl flex items-center justify-between transition-all group active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <span className={`text-2xl ${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</span>
              <span className="text-white font-black uppercase tracking-tighter text-sm">{item.label}</span>
            </div>
            <span className="text-slate-600 text-xs tracking-widest font-black group-hover:translate-x-1 transition-transform">→</span>
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-12 space-y-6">
        <button 
          onClick={logout}
          className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-black py-5 rounded-2xl hover:bg-red-500/20 transition-all uppercase tracking-tighter text-sm"
        >
          Sign Out
        </button>
        <div className="text-center">
            <div className="text-[10px] text-slate-700 font-black uppercase tracking-widest">GOZIPP App Version 2.0.0 (Production)</div>
            <div className="text-[10px] text-slate-800 font-bold mt-1">© 2024 GOZIPP Technologies</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
