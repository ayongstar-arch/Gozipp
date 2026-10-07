import React, { useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { useUIStore } from '../../stores/uiStore';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { APP_LOGO_PATH } from '@/constants';

/**
 * Admin login — username/password + TOTP MFA against the real backend.
 * First login forces Authenticator enrollment (server returns otpauth URL).
 */
const LoginView: React.FC = () => {
  const { isLoading } = useUIStore();
  const { login, verifyMfa, activateMfa, error, setError } = useAdminAuth();
  const setActiveSection = useAdminStore((s) => s.setActiveSection);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ setupToken: string; otpauthUrl: string } | null>(null);

  const handlePasswordLogin = async () => {
    if (!username.trim() || !password) return setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    const res = await login(username.trim(), password);
    if (!res.ok) return;
    if (res.loggedIn) {
      setActiveSection('dashboard');
    } else if ('mfa' in res) {
      setChallengeToken(res.challengeToken);
    } else if ('setup' in res) {
      setSetup({ setupToken: res.setupToken, otpauthUrl: res.otpauthUrl });
    }
  };

  const handleMfa = async () => {
    if (mfaCode.length < 6 || !challengeToken) return;
    if (await verifyMfa(challengeToken, mfaCode)) setActiveSection('dashboard');
  };

  const handleActivate = async () => {
    if (mfaCode.length < 6 || !setup) return;
    if (await activateMfa(setup.setupToken, mfaCode)) setActiveSection('dashboard');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans p-6 text-white">
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl shadow-lg flex items-center justify-center mb-6">
          <img src={APP_LOGO_PATH} className="w-12 h-12 object-contain" alt="GOZIPP" />
        </div>
        <h2 className="text-3xl font-black mb-2">Admin Console</h2>
        <p className="text-slate-400 mb-8 font-medium text-sm">
          สำหรับเจ้าหน้าที่เท่านั้น — ต้องยืนยันตัวตน 2 ชั้นทุกครั้ง
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {!challengeToken && !setup && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ชื่อผู้ใช้</span>
              <input
                type="text"
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-lg font-bold outline-none focus:border-emerald-500 mt-2"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">รหัสผ่าน</span>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-lg font-bold outline-none focus:border-emerald-500 mt-2"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordLogin(); }}
              />
            </label>
            <button
              onClick={handlePasswordLogin}
              disabled={isLoading}
              className="w-full bg-emerald-500 text-slate-950 font-black py-4 rounded-2xl disabled:opacity-50"
            >
              {isLoading ? 'กำลังตรวจสอบ...' : 'ถัดไป'}
            </button>
          </div>
        )}

        {challengeToken && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">กรอกรหัส 6 หลักจากแอป Authenticator</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-3xl font-black text-center tracking-[0.5em] outline-none focus:border-emerald-500"
              value={mfaCode}
              onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleMfa(); }}
            />
            <button
              onClick={handleMfa}
              disabled={isLoading || mfaCode.length < 6}
              className="w-full bg-emerald-500 text-slate-950 font-black py-4 rounded-2xl disabled:opacity-50"
            >
              ยืนยันและเข้าสู่ระบบ
            </button>
            <button onClick={() => { setChallengeToken(null); setMfaCode(''); }} className="text-slate-500 text-sm mx-auto block">
              ← กลับ
            </button>
          </div>
        )}

        {setup && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm leading-relaxed">
              ครั้งแรกต้องผูกแอป Authenticator (Google Authenticator / 1Password):
              เพิ่มบัญชีด้วยลิงก์นี้ แล้วกรอกรหัส 6 หลัก
            </p>
            <p className="bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] break-all text-emerald-300 select-all">
              {setup.otpauthUrl}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-3xl font-black text-center tracking-[0.5em] outline-none focus:border-emerald-500"
              value={mfaCode}
              onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleActivate(); }}
            />
            <button
              onClick={handleActivate}
              disabled={isLoading || mfaCode.length < 6}
              className="w-full bg-emerald-500 text-slate-950 font-black py-4 rounded-2xl disabled:opacity-50"
            >
              เปิดใช้งานและเข้าสู่ระบบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginView;
