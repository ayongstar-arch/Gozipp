import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../hooks/useAuth';
import { useUIStore } from '../../stores/uiStore';
import { motion } from 'framer-motion';

interface DeviceSession {
  id: string;
  deviceId: string;
  deviceName: string;
  os: string;
  browser: string;
  location: string;
  lastActiveAt: string;
  ipAddress: string;
}

interface DevicesViewProps {
  onClose: () => void;
}

const DevicesView: React.FC<DevicesViewProps> = ({ onClose }) => {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const { setIsLoading, setToastMessage } = useUIStore();
  const currentDeviceId = typeof window !== 'undefined' ? localStorage.getItem('gozipp_device_id') : '';

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/v1/auth/sessions');
      setSessions(data.sessions || []);
    } catch (err: any) {
      setToastMessage('ไม่สามารถดึงข้อมูลอุปกรณ์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setIsLoading(true);
    try {
      await apiFetch(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
      setToastMessage('ออกจากระบบอุปกรณ์นี้แล้ว');
      fetchSessions(); // Refresh list
    } catch (err: any) {
      setToastMessage('เกิดข้อผิดพลาดในการออกจากระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-kanit text-white relative">
      {/* Header */}
      <div className="flex items-center p-6 border-b border-white/5">
        <button 
          onClick={onClose}
          className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold ml-4">อุปกรณ์ที่เข้าสู่ระบบ</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <p className="text-gray-400 text-sm mb-2">
          คุณสามารถตรวจสอบและจัดการอุปกรณ์ทั้งหมดที่กำลังเข้าสู่ระบบบัญชีของคุณได้ หากพบอุปกรณ์ที่ไม่รู้จัก กรุณากดออกจากระบบทันที
        </p>

        {sessions.map((session) => {
          const isCurrent = session.deviceId === currentDeviceId;
          const date = new Date(session.lastActiveAt).toLocaleString('th-TH');

          return (
            <motion.div 
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#11151C] border border-white/10 rounded-2xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl ${isCurrent ? 'text-[#39B54A]' : 'text-slate-400'}`}>
                    {session.os.includes('iOS') || session.os.includes('Android') ? '📱' : '💻'}
                  </div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      {session.deviceName}
                      {isCurrent && (
                        <span className="bg-[#39B54A]/20 text-[#39B54A] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          อุปกรณ์นี้
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">{session.os} • {session.browser}</p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1">
                  <span>📍</span> {session.location} ({session.ipAddress})
                </div>
                <div className="flex items-center gap-1">
                  <span>🕒</span> ใช้งานล่าสุด: {date}
                </div>
              </div>

              {!isCurrent && (
                <button 
                  onClick={() => handleRevoke(session.id)}
                  className="mt-2 w-full py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors"
                >
                  ออกจากระบบอุปกรณ์นี้
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DevicesView;
