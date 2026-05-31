import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { APP_LOGO_PATH } from '@/constants';

const RegisterView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { requestOtp, error, setError } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    await requestOtp(formData.phone, true, formData.name);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans p-8 justify-center">
      <div className="mb-12 animate-in fade-in slide-in-from-top duration-700">
        <div className="w-16 h-16 bg-gozipp-green rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-gozipp-green/20">
          <img src={APP_LOGO_PATH} className="w-10 h-10 object-contain brightness-0 invert" />
        </div>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">ลงทะเบียนใหม่</h2>
        <p className="text-slate-500 font-medium">เข้าร่วม GOZIPP เดินทางฉลาด รวดเร็ว ทั่วเมือง</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-4 rounded-2xl text-sm font-bold animate-in shake duration-300">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">ชื่อ-นามสกุล</label>
          <input
            type="text"
            placeholder="เช่น สมชาย ใจดี"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-white outline-none focus:border-gozipp-green transition-all shadow-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            placeholder="081-234-5678"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-white outline-none focus:border-gozipp-green transition-all shadow-xl"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gozipp-green text-slate-950 font-black py-5 rounded-2xl shadow-2xl shadow-gozipp-green/20 hover:bg-green-400 transition-all disabled:opacity-30 uppercase tracking-tighter text-xl mt-4"
        >
          {isLoading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนเลย'}
        </button>
      </form>

      <div className="text-center mt-12">
        <p className="text-slate-500 text-sm font-medium">
          มีบัญชีอยู่แล้ว?{' '}
          <button 
            onClick={() => { setAuthStep('LOGIN'); setError(null); }} 
            className="text-gozipp-green font-black uppercase tracking-widest hover:underline ml-1"
          >
            เข้าสู่ระบบ
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterView;
