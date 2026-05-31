import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';

const OtpView: React.FC<{ phoneNumber: string, isRegistering: boolean, name?: string }> = ({ 
  phoneNumber, 
  isRegistering,
  name 
}) => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { verifyOtp, requestOtp, error, setError } = useAuth();
  
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otpCode.join('');
    if (code.length < 6) return;
    await verifyOtp(phoneNumber, code, isRegistering, name);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans p-6 justify-center">
      <div className="text-center mb-12 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-gozipp-green/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl shadow-gozipp-green/20">🛡️</div>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">ยืนยันรหัส OTP</h2>
        <p className="text-slate-500 font-medium">รหัสถูกส่งไปที่ <span className="text-white">{phoneNumber}</span></p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-4 rounded-2xl mb-8 text-sm text-center font-bold">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-center mb-12">
        {otpCode.map((digit, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleOtpChange(i, e.target.value)}
            className="w-12 h-16 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center text-2xl font-black text-white text-center outline-none focus:border-gozipp-green focus:bg-slate-800 transition-all shadow-xl"
          />
        ))}
      </div>

      <div className="space-y-4">
        <button
          onClick={handleVerify}
          disabled={isLoading || otpCode.join('').length < 6}
          className="w-full bg-gozipp-green text-slate-950 font-black py-5 rounded-2xl shadow-2xl shadow-gozipp-green/20 hover:bg-green-400 transition-all disabled:opacity-30 uppercase tracking-tighter text-xl"
        >
          {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส'}
        </button>

        <div className="text-center">
          {countdown > 0 ? (
            <span className="text-slate-500 text-sm font-medium">ส่งรหัสใหม่ได้ใน {countdown} วินาที</span>
          ) : (
            <button
              onClick={() => {
                requestOtp(phoneNumber, isRegistering);
                setCountdown(60);
              }}
              className="text-gozipp-green text-sm font-black uppercase tracking-widest hover:underline"
            >
              ส่งรหัสอีกครั้ง
            </button>
          )}
        </div>
      </div>

      <button 
        onClick={() => { setAuthStep(isRegistering ? 'REGISTER' : 'LOGIN'); setError(null); }} 
        className="w-full text-slate-600 text-sm font-bold mt-12 hover:text-white transition-colors"
      >
        ← แก้ไขเบอร์โทรศัพท์
      </button>
    </div>
  );
};

export default OtpView;
