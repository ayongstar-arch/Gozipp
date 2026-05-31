import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { APP_LOGO_PATH, API_BASE_URL } from '@/constants';

const LoginView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { requestOtp, error, setError } = useAuth();
  const [phone, setPhone] = useState('');

  const handleLogin = async () => {
    if (!phone) return setError('กรุณากรอกเบอร์โทรศัพท์');
    await requestOtp(phone, false);
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans p-6">
      <div className="flex-1 flex flex-col justify-center">
        <div className="w-16 h-16 bg-green-600 rounded-2xl shadow-lg flex items-center justify-center mb-6">
          <img src={APP_LOGO_PATH} className="w-12 h-12 object-contain brightness-0 invert" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">เข้าสู่ระบบ</h2>
        <p className="text-slate-500 mb-8 font-medium">Please enter your phone number to continue with GOZIPP.</p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-4 rounded-2xl mb-6 text-sm flex items-center gap-3">
            <span className="text-xl">⚠️</span> {error}
          </div>
        )}

        <div className="space-y-6">
          <label className="block">
            <span className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">เบอร์โทรศัพท์</span>
            <input
              type="tel"
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xl font-bold text-slate-800 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-50 mt-2 transition-all"
              placeholder="08x-xxx-xxxx"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
            />
          </label>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-100 text-lg hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isLoading ? 'กำลังส่ง OTP...' : 'เข้าสู่ระบบ'}
          </button>
        </div>

        <button 
          onClick={() => setAuthStep('REGISTER')} 
          className="text-green-600 font-bold text-sm hover:underline mt-6 text-left inline-flex items-center gap-1"
        >
          ยังไม่มีบัญชี? ลงทะเบียนที่นี่ ➔
        </button>
      </div>

      <div className="flex flex-col gap-3 mt-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200"></div>
          <div className="text-center text-slate-400 text-xs">หรือเข้าสู่ระบบด้วย</div>
          <div className="h-px flex-1 bg-slate-200"></div>
        </div>
        <button 
          onClick={() => window.location.href = `${API_BASE_URL}/auth/line?type=PASSENGER`} 
          className="w-full bg-[#06C755] hover:bg-[#00B900] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <span className="text-xl">💬</span> เข้าสู่ระบบด้วย LINE
        </button>
        <button 
          onClick={() => window.location.href = `${API_BASE_URL}/auth/google?type=PASSENGER`} 
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <span className="text-xl">G</span> เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </div>
  );
};

export default LoginView;
