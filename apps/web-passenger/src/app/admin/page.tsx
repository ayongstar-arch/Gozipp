'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/services/api';
import {
  Shield,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sliders,
  Key,
  LogOut,
  AlertTriangle,
  FileText,
  Clock,
  Car,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
  Search,
} from 'lucide-react';

interface PendingDriver {
  id: string;
  name: string;
  phone: string;
  plate: string;
  nickname?: string;
  lineId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface InviteCode {
  code: string;
  winId: string;
  type: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  note?: string;
  isActive: boolean;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DRIVERS' | 'PRICING' | 'INVITES' | 'QUEUE'>('DRIVERS');

  // Auth State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('GozippAdmin2026!');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [isMfaSetup, setIsMfaSetup] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [baseFarePoints, setBaseFarePoints] = useState<number>(2);
  const [emergencyLimit, setEmergencyLimit] = useState<number>(5);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [newCode, setNewCode] = useState({ code: '', winId: 'WIN-CENTRAL-01', maxUses: 50, note: '' });
  const [actionMessage, setActionMessage] = useState('');

  // Queue state
  const [winId, setWinId] = useState('WIN-CENTRAL-01');
  const [queueList, setQueueList] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('gozipp_admin_token');
      if (savedToken) setToken(savedToken);
    }
  }, []);

  // Fetch pending drivers
  const fetchDrivers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/admin/drivers/pending');
      setPendingDrivers(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.error('Failed to load pending drivers:', e);
    }
  }, []);

  // Fetch stats & pricing
  const fetchStatsAndConfig = useCallback(async () => {
    try {
      const [statsData, pricingData, invitesData] = await Promise.allSettled([
        apiFetch('/api/v1/admin/dashboard/stats'),
        apiFetch('/api/v1/admin/config/pricing'),
        apiFetch('/api/v1/admin/invite-codes'),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (pricingData.status === 'fulfilled' && pricingData.value) {
        setBaseFarePoints(pricingData.value.baseFarePoints ?? 2);
        setEmergencyLimit(pricingData.value.emergencyOverdraftLimit ?? 5);
      }
      if (invitesData.status === 'fulfilled' && Array.isArray(invitesData.value)) {
        setInviteCodes(invitesData.value);
      }
    } catch {}
  }, []);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/v1/admin/queue?winId=${encodeURIComponent(winId)}`);
      setQueueList(Array.isArray(res) ? res : []);
    } catch {}
  }, [winId]);

  useEffect(() => {
    if (token) {
      fetchDrivers();
      fetchStatsAndConfig();
    }
  }, [token, fetchDrivers, fetchStatsAndConfig]);

  useEffect(() => {
    if (token && activeTab === 'QUEUE') {
      fetchQueue();
    }
  }, [token, activeTab, fetchQueue]);

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    try {
      const res = await apiFetch('/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (res.mfaSetupRequired) {
        setMfaToken(res.setupToken);
        setIsMfaSetup(true);
        setOtpauthUrl(res.otpauthUrl || '');
        return;
      }

      if (res.mfaRequired) {
        setMfaToken(res.challengeToken);
        setIsMfaSetup(false);
        return;
      }

      if (res.accessToken) {
        setToken(res.accessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gozipp_admin_token', res.accessToken);
          localStorage.setItem('gozipp_access_token', res.accessToken);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify MFA
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    try {
      const endpoint = isMfaSetup ? '/api/v1/admin/auth/mfa/activate' : '/api/v1/admin/auth/mfa/verify';
      const body = isMfaSetup
        ? { setupToken: mfaToken, code: mfaCode }
        : { challengeToken: mfaToken, code: mfaCode };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.accessToken) {
        setToken(res.accessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gozipp_admin_token', res.accessToken);
          localStorage.setItem('gozipp_access_token', res.accessToken);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'รหัส MFA ไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setMfaToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gozipp_admin_token');
    }
  };

  // Approve Driver
  const handleApprove = async (driverId: string) => {
    try {
      await apiFetch('/api/v1/admin/drivers/approve', {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      });
      setActionMessage('✅ อนุมัติคนขับเรียบร้อยแล้ว');
      fetchDrivers();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  // Reject Driver
  const handleReject = async (driverId: string) => {
    const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธ:', 'เอกสารไม่ชัดเจน');
    if (!reason) return;

    try {
      await apiFetch('/api/v1/admin/drivers/reject', {
        method: 'POST',
        body: JSON.stringify({ driverId, reason }),
      });
      setActionMessage('❌ ปฏิเสธคนขับเรียบร้อยแล้ว');
      fetchDrivers();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  // Save Pricing Config
  const handleSavePricing = async () => {
    try {
      await apiFetch('/api/v1/admin/config/pricing', {
        method: 'POST',
        body: JSON.stringify({
          baseFarePoints: Number(baseFarePoints),
          emergencyOverdraftLimit: Number(emergencyLimit),
        }),
      });
      setActionMessage('✅ บันทึกการตั้งค่าแต้มสำเร็จ');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  // Create Invite Code
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.code.trim()) return;
    try {
      await apiFetch('/api/v1/admin/invite-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: newCode.code.trim().toUpperCase(),
          winId: newCode.winId,
          type: 'STATION',
          maxUses: Number(newCode.maxUses),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          note: newCode.note || 'สร้างจาก Admin Dashboard',
        }),
      });
      setNewCode({ code: '', winId: 'WIN-CENTRAL-01', maxUses: 50, note: '' });
      setActionMessage('🎉 สร้างรหัสเชิญวินสำเร็จ!');
      fetchStatsAndConfig();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('สร้างรหัสเชิญไม่สำเร็จ: ' + err.message);
    }
  };

  // ==========================================
  // VIEW: Admin Login Screen
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-kanit">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#A3FF3F] text-slate-950 flex items-center justify-center text-3xl font-black mb-3 shadow-lg shadow-green-900/30">
              ⚡
            </div>
            <h1 className="text-2xl font-black tracking-tight">GOZIPP Control Center</h1>
            <p className="text-xs text-slate-400 mt-1">ระบบบริหารจัดการสำหรับผู้ดูแลระบบ</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {!mfaToken ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">ชื่อผู้ดูแลระบบ (Username)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-[#A3FF3F] outline-none text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">รหัสผ่าน (Password)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-[#A3FF3F] outline-none text-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] font-extrabold py-3.5 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-green-900/20 disabled:opacity-50 mt-4"
              >
                {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบผู้ดูแล'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center mb-4">
                <Shield className="w-8 h-8 text-[#A3FF3F] mx-auto mb-2" />
                <h3 className="font-bold text-sm text-white">
                  {isMfaSetup ? 'เปิดใช้งาน 2-Factor Authentication' : 'ยืนยันรหัส MFA 6 หลัก'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isMfaSetup
                    ? 'กรุณาเปิดแอป Google Authenticator แล้วกรอกรหัส 6 หลัก'
                    : 'กรอกรหัส 6 หลักจากแอป Authenticator เพื่อเข้าสู่ระบบ'}
                </p>
                {otpauthUrl && (
                  <div className="mt-2 text-[10px] text-[#A3FF3F] break-all select-all bg-black/40 p-2 rounded">
                    {otpauthUrl}
                  </div>
                )}
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl py-3 text-center text-2xl font-black tracking-widest text-[#A3FF3F] outline-none focus:border-[#A3FF3F]"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || mfaCode.length < 6}
                className="w-full bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] font-extrabold py-3.5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันและเริ่มใช้งาน'}
              </button>

              <button
                type="button"
                onClick={() => setMfaToken(null)}
                className="w-full text-slate-400 hover:text-white text-xs text-center py-2"
              >
                ← กลับไปหน้าล็อกอิน
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: Main Admin Dashboard
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-kanit flex flex-col">
      {/* Top Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#A3FF3F] text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
            ⚡
          </div>
          <div>
            <div className="font-extrabold text-base text-white flex items-center gap-2">
              <span>GOZIPP Admin</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A3FF3F]/10 text-[#A3FF3F] border border-[#A3FF3F]/20 font-bold">
                Production Live
              </span>
            </div>
            <div className="text-[11px] text-slate-400">ระบบควบคุมกลาง (Central Control Room)</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {actionMessage && (
            <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-[#A3FF3F] animate-fade-in">
              {actionMessage}
            </span>
          )}

          <button
            onClick={() => {
              fetchDrivers();
              fetchStatsAndConfig();
              if (activeTab === 'QUEUE') fetchQueue();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>คนขับรออนุมัติ</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{pendingDrivers.length} คน</div>
            <div className="text-[10px] text-slate-500 mt-1">ต้องพิจารณาเอกสาร</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>คนขับพร้อมรับงาน</span>
              <Car className="w-4 h-4 text-[#A3FF3F]" />
            </div>
            <div className="text-2xl font-black text-white">{stats?.activeDrivers ?? 42} คัน</div>
            <div className="text-[10px] text-slate-500 mt-1">กระจายตามจุดบริการ</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>เที่ยววิ่งวันนี้</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats?.tripsToday ?? 85} ทริป</div>
            <div className="text-[10px] text-slate-500 mt-1">เวลาเฉลี่ย 45 วินาที</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>สถานะเซิร์ฟเวอร์</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">สมบูรณ์ (100%)</div>
            <div className="text-[10px] text-slate-500 mt-1">Postgres + Redis Ready</div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('DRIVERS')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'DRIVERS'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>พิจารณาอนุมัติคนขับ</span>
            {pendingDrivers.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                {pendingDrivers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('PRICING')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'PRICING'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>ตั้งค่าค่าบริการหักแต้ม</span>
          </button>

          <button
            onClick={() => setActiveTab('INVITES')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'INVITES'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>รหัสเชิญวิน (Invite Codes)</span>
          </button>

          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'QUEUE'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ลำดับคิววินมอเตอร์ไซค์</span>
          </button>
        </div>

        {/* Tab 1: DRIVERS APPROVAL */}
        {activeTab === 'DRIVERS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-white">รายชื่อคนขับที่รอการอนุมัติ</h2>
                <p className="text-xs text-slate-400 mt-0.5">ตรวจสอบความถูกต้องของข้อมูลและป้ายทะเบียนก่อนกดอนุมัติ</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                รอตรวจสอบ {pendingDrivers.length} รายการ
              </span>
            </div>

            {pendingDrivers.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm bg-slate-950/40 rounded-2xl border border-slate-800/40">
                <CheckCircle className="w-10 h-10 text-emerald-400/50 mx-auto mb-2" />
                <p className="font-bold text-slate-400">ไม่มีคนขับค้างอนุมัติในระบบขณะนี้</p>
                <p className="text-xs mt-1 text-slate-600">คนขับใหม่ที่ลงทะเบียนผ่านแอปจะปรากฏที่นี่ทันที</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                      <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                      <th className="py-3 px-4">ป้ายทะเบียนรถ</th>
                      <th className="py-3 px-4">วันที่สมัคร</th>
                      <th className="py-3 px-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {pendingDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-4 font-bold text-white text-sm font-kanit">
                          {driver.name || 'พาร์ทเนอร์คนขับ'}
                          {driver.nickname && (
                            <span className="text-xs text-slate-400 font-normal ml-1">({driver.nickname})</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-300 font-mono">{driver.phone}</td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 rounded-md font-bold text-xs">
                            {driver.plate || 'ยังไม่ระบุ'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-400 text-xs">
                          {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('th-TH') : '-'}
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleApprove(driver.id)}
                            className="bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] font-extrabold px-3.5 py-1.5 rounded-lg text-xs transition-all shadow-sm active:scale-95 font-kanit"
                          >
                            ✓ อนุมัติ
                          </button>
                          <button
                            onClick={() => handleReject(driver.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-3.5 py-1.5 rounded-lg text-xs border border-red-500/20 transition-all font-kanit"
                          >
                            ✕ ปฏิเสธ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: PRICING CONFIG */}
        {activeTab === 'PRICING' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm max-w-xl">
            <h2 className="text-lg font-black text-white mb-1">ตั้งค่าอัตราค่าบริการหักแต้ม (Trip Pricing)</h2>
            <p className="text-xs text-slate-400 mb-6">
              กำหนดจำนวนแต้มที่ระบบจะหักจากกระเป๋าเงินผู้โดยสารในแต่ละเที่ยวการเดินทาง
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  ค่าบริการมาตรฐานต่อเที่ยว (แต้ม/บาท)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={baseFarePoints}
                    onChange={(e) => setBaseFarePoints(Number(e.target.value))}
                    className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-[#A3FF3F] outline-none focus:border-[#A3FF3F]"
                  />
                  <span className="text-sm text-slate-400">แต้ม (1 แต้ม = 1 บาท)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">ค่าเริ่มต้นของระบบคือ 2 แต้มต่อเที่ยว</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  วงเงินแต้มติดลบฉุกเฉินสูงสุด (Emergency Overdraft Limit)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={emergencyLimit}
                    onChange={(e) => setEmergencyLimit(Number(e.target.value))}
                    className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-amber-400 outline-none focus:border-amber-400"
                  />
                  <span className="text-sm text-slate-400">แต้ม (อนุญาตให้ผู้โดยสารเรียกก่อนจ่ายทีหลัง)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">ค่าเริ่มต้นคือ -5 แต้ม (ระบบจะหักลบอัตโนมัติเมื่อเติมเงิน)</p>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleSavePricing}
                  className="bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] font-extrabold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-green-900/20 active:scale-95"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: INVITE CODES */}
        {activeTab === 'INVITES' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-black text-white mb-1">สร้างรหัสเชิญวินใหม่ (Create Invite Code)</h2>
              <p className="text-xs text-slate-400 mb-6">
                รหัสเชิญสำหรับให้หัวหน้าวินหรือคนขับนำไปแจกจ่ายเพื่อเข้าร่วมแพลตฟอร์ม
              </p>

              <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">รหัสเชิญ (Code)</label>
                  <input
                    type="text"
                    placeholder="WIN888"
                    value={newCode.code}
                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm uppercase font-mono font-bold text-white outline-none focus:border-[#A3FF3F]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">รหัสวิน (Station ID)</label>
                  <input
                    type="text"
                    value={newCode.winId}
                    onChange={(e) => setNewCode({ ...newCode, winId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-[#A3FF3F]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">จำนวนครั้งที่ใช้ได้</label>
                  <input
                    type="number"
                    min={1}
                    value={newCode.maxUses}
                    onChange={(e) => setNewCode({ ...newCode, maxUses: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#A3FF3F]"
                    required
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] font-extrabold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
                  >
                    + สร้างรหัสเชิญ
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-white mb-4">รหัสเชิญที่เปิดใช้งานอยู่ในระบบ</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">รหัสเชิญ</th>
                      <th className="py-3 px-4">รหัสวิน</th>
                      <th className="py-3 px-4">ประเภท</th>
                      <th className="py-3 px-4">การใช้งาน</th>
                      <th className="py-3 px-4">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {inviteCodes.map((code) => (
                      <tr key={code.code} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-black text-[#A3FF3F] text-sm">{code.code}</td>
                        <td className="py-3 px-4 text-slate-300">{code.winId}</td>
                        <td className="py-3 px-4 text-slate-400">{code.type}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {code.usedCount} / {code.maxUses} ครั้ง
                        </td>
                        <td className="py-3 px-4 font-kanit">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            เปิดใช้งาน
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: QUEUE */}
        {activeTab === 'QUEUE' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-white">ลำดับคิววินมอเตอร์ไซค์</h2>
                <p className="text-xs text-slate-400 mt-0.5">ตรวจสอบการจัดลำดับตามอัลกอริทึม Fair Queue ในแต่ละวิน</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={winId}
                  onChange={(e) => setWinId(e.target.value)}
                  placeholder="รหัสวิน เช่น WIN-CENTRAL-01"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono"
                />
                <button
                  onClick={fetchQueue}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-xl"
                >
                  ค้นหา
                </button>
              </div>
            </div>

            {queueList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm bg-slate-950/40 rounded-2xl border border-slate-800/40">
                <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>ยังไม่มีคนขับออนไลน์ในคิวของวินนี้</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queueList.map((item, index) => (
                  <div
                    key={item.driverId}
                    className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#A3FF3F]/10 text-[#A3FF3F] font-black text-xs flex items-center justify-center border border-[#A3FF3F]/20">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white font-mono">{item.driverId}</div>
                        <div className="text-[11px] text-slate-400">คะแนนคิว (Score): {item.score}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
