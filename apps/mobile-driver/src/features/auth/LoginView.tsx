import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { useFirebasePhoneAuth } from '../../hooks/useFirebasePhoneAuth';
import { APP_LOGO_PATH, API_BASE_URL } from '@/constants';
import { motion } from 'framer-motion';

const LoginView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const setUser = useAuthStore((state) => state.setUser);
  const { isLoading: backendLoading } = useUIStore();
  
  const { error: backendError, setError: setBackendError } = useAuth();
  const { sendOtp, verifyOtp, error: firebaseError, setError: setFirebaseError, isLoading: firebaseLoading, initRecaptcha } = useFirebasePhoneAuth();

  const isLoading = backendLoading || firebaseLoading;
  const error = firebaseError || backendError;
  const setError = (msg: string | null) => {
    setFirebaseError(msg);
    setBackendError(msg);
  };

  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    initRecaptcha('recaptcha-container-login');
  }, [initRecaptcha]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneNumber = phone.replace(/\D/g, '');
    if (!/^0[689]\d{8}$/.test(phoneNumber)) {
      return setError('กรุณากรอกเบอร์โทรศัพท์มือถือไทย 10 หลัก');
    }

    const success = await sendOtp(phoneNumber);
    if (success) {
      setOtpStep(true);
      setError(null);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return setError('กรุณากรอกรหัส OTP 6 หลัก');

    const idToken = await verifyOtp(otpCode);
    if (!idToken) return;

    try {
      useUIStore.getState().setIsLoading(true);
      const phoneNumber = phone.replace(/\D/g, '');
      const res = await fetch('/api/v1/auth/firebase-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          phoneNumber,
          name: '', // Login doesn't need name
          role: 'DRIVER',
          purpose: 'LOGIN',
        })
      });
      const data = await res.json();
      
      if (data.success || data.user || data.driverId) {
        setUser({
          id: data.driverId || data.user?.id || '',
          name: data.name || data.user?.name || 'Driver',
          phone: phoneNumber,
          email: data.user?.email || '',
          avatarSeed: data.avatarSeed || 'driver',
          pointsBalance: data.pointsBalance || 0,
          freeRidesRemaining: data.freeRidesRemaining || 0,
          role: 'DRIVER'
        });
        if (!data.hasPin) {
          setAuthStep('SETUP_PIN');
        } else {
          setAuthStep('APP_SHELL');
        }
      } else {
        setError(data.message || 'ไม่สามารถยืนยัน OTP ได้');
      }
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      useUIStore.getState().setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between h-[100dvh] bg-black font-kanit selection:bg-[#39B54A]/30 relative overflow-hidden text-white">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setAuthStep('ONBOARDING'); setError(null); }}
          className="w-12 h-12 bg-white/5 border border-white/5 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-2xl shadow-sm hover:bg-white/10"
          aria-label="กลับ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-start mt-8 relative z-10 w-full overflow-y-auto">
        {/* Background Cityscape */}
        <div className="absolute top-0 left-0 right-0 h-[40vh] pointer-events-none z-0 overflow-hidden flex items-end">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
          <img src="/bg-city-realistic.png" alt="Cityscape" className="w-full h-full object-cover object-bottom opacity-80" />
        </div>

        {/* Compact Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-32 h-32 flex items-center justify-center relative z-20 mix-blend-screen mt-[2vh] mb-2"
        >
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(163,255,63,0.15) 0%, transparent 70%)'
            }}
          />
          <img 
            src="/logo-gozipp.png" 
            className="w-28 h-auto object-contain relative z-10 contrast-125" 
            alt="GOZIPP" 
          />
        </motion.div>
        
        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto px-6 relative z-20 flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">เข้าสู่ระบบ</h2>
            <p className="text-[#A3FF3F] text-xs font-bold tracking-[0.2em] uppercase">Driver Partner Portal</p>
          </motion.div>

        {/* Invisible reCAPTCHA container for Login */}
        <div id="recaptcha-container-login"></div>

        <form onSubmit={otpStep ? handleVerifyOtp : handleSendOtp} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-4 rounded-2xl text-sm flex items-center gap-3 backdrop-blur-md"
            >
              <span className="text-xl">⚠️</span> {error}
            </motion.div>
          )}

          {!otpStep ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <label className="block relative">
                <input
                  type="tel"
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xl font-bold text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-500 text-center tracking-widest"
                  placeholder="เบอร์โทรศัพท์ (08x-xxx-xxxx)"
                  value={phone}
                  inputMode="numeric"
                  maxLength={12}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    const formatted = digits.length > 6
                      ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
                      : digits.length > 3
                        ? `${digits.slice(0, 3)}-${digits.slice(3)}`
                        : digits;
                    setPhone(formatted);
                    setError(null);
                  }}
                />
              </label>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="text-center mb-2">
                <p className="text-gray-400 text-sm">ส่งรหัส OTP ไปที่เบอร์</p>
                <p className="text-[#A3FF3F] font-bold text-lg">{phone}</p>
              </div>
              <label className="block relative">
                <input
                  type="text"
                  placeholder="• • • • • •"
                  value={otpCode}
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  onChange={e => {
                    setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-3xl font-bold text-white outline-none focus:border-[#A3FF3F] focus:ring-1 focus:ring-[#A3FF3F] transition-all backdrop-blur-md placeholder:text-gray-600 text-center tracking-[0.5em]"
                  required
                />
              </label>
              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtpCode(''); setError(null); }}
                className="text-gray-500 hover:text-[#A3FF3F] text-xs transition-colors mx-auto block"
              >
                ← เปลี่ยนเบอร์โทรศัพท์
              </button>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full bg-[#A3FF3F] text-[#04070B] font-black py-4 rounded-2xl text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden shadow-[0_0_20px_rgba(163,255,63,0.2)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <span className="relative z-10">{isLoading ? 'กำลังดำเนินการ...' : otpStep ? 'ยืนยัน OTP' : 'เข้าสู่ระบบ'}</span>
            </button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8"
        >
          <button 
            onClick={() => setAuthStep('REGISTER')} 
            className="text-gray-400 font-bold text-sm hover:text-[#A3FF3F] transition-colors inline-flex items-center gap-1"
          >
            ลงทะเบียนพาร์ทเนอร์ใหม่
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-4 mt-8 relative z-10"
      >
        <button 
          onClick={() => window.location.href = `${API_BASE_URL}/auth/line?type=DRIVER`} 
          className="w-full bg-[#06C755] hover:bg-[#00B900] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="LINE" className="w-6 h-6 brightness-0 invert" />
          LINE Login
        </button>
      </motion.div>
      </div>
    </div>
  );
};

export default LoginView;
