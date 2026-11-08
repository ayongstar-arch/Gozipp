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
  UserCheck,
  UserX,
  Plus,
  Coins,
  ArrowUpDown,
  Filter,
  Eye,
  AlertCircle,
  MapPin,
  Navigation,
  Compass,
  Radio,
  Map as MapIcon,
  CircleDot,
  Trash2,
  Edit2
} from 'lucide-react';

interface PendingDriver {
  id: string;
  name: string;
  phone: string;
  plate: string;
  nickname?: string;
  lineId?: string;
  documents?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface AllDriver {
  id: string;
  name: string;
  phone: string;
  plate: string;
  nickname?: string;
  stationId?: string;
  approvalStatus: string;
  currentStatus: string;
  rating: number;
  totalTrips: number;
  totalEarnings: number;
  createdAt?: string;
}

interface PassengerItem {
  id: string;
  name: string;
  phone: string;
  pointsBalance: number;
  totalRides: number;
  communityPoints: number;
  createdAt?: string;
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

interface ActiveQueueItem {
  id: string;
  name: string;
  area: string;
  queueCount: number;
  drivers: {
    driverId: string;
    score: number;
    driverName: string;
    driverPlate: string;
  }[];
}

interface StationItem {
  id: string;
  name: string;
  area?: string;
  lat: number;
  lng: number;
  radius_m: number;
  isActive?: boolean;
}

interface LiveFleetDriver {
  id: string;
  name: string;
  phone: string;
  plate: string;
  nickname?: string;
  stationId: string;
  currentStatus: string;
  approvalStatus: string;
  rating: number;
  totalTrips: number;
  lat: number;
  lng: number;
  hasLiveGps: boolean;
}

interface LiveFleetTrip {
  id: string;
  passengerId: string;
  driverId?: string;
  stationId?: string;
  pickupAddress: string;
  destAddress: string;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  fare: number;
  status: string;
  requestedAt: string;
  acceptedAt?: string;
}

interface LiveFleetData {
  timestamp: string;
  drivers: LiveFleetDriver[];
  activeTrips: LiveFleetTrip[];
  stations: StationItem[];
}

interface AuditLogItem {
  id: string;
  action: string;
  actorId: string;
  actorRole: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  createdAt: string;
  metadata?: any;
}

type AdminTab = 'STATS' | 'MAP' | 'STATIONS' | 'DRIVERS' | 'ALL_DRIVERS' | 'PASSENGERS' | 'PRICING' | 'INVITES' | 'QUEUE' | 'AUDIT';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('STATS');

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
  const [allDrivers, setAllDrivers] = useState<AllDriver[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('ALL');
  const [passengers, setPassengers] = useState<PassengerItem[]>([]);
  const [passengerSearch, setPassengerSearch] = useState('');

  const [stats, setStats] = useState<any>(null);
  const [baseFarePoints, setBaseFarePoints] = useState<number>(2);
  const [emergencyLimit, setEmergencyLimit] = useState<number>(5);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [newCode, setNewCode] = useState({ code: '', winId: 'WIN-CENTRAL-01', maxUses: 50, note: '' });
  const [actionMessage, setActionMessage] = useState('');

  // Queue state
  const [activeQueues, setActiveQueues] = useState<ActiveQueueItem[]>([]);
  const [selectedWinId, setSelectedWinId] = useState('WIN-CENTRAL-01');

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Fleet & Station state
  const [fleetData, setFleetData] = useState<LiveFleetData | null>(null);
  const [stationList, setStationList] = useState<StationItem[]>([]);
  const [stationForm, setStationForm] = useState<StationItem>({
    id: '',
    name: '',
    area: 'กรุงเทพมหานคร',
    lat: 13.7463,
    lng: 100.5348,
    radius_m: 100,
    isActive: true,
  });
  const [isEditingStation, setIsEditingStation] = useState(false);

  // Modal: Adjust Points
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; passenger: PassengerItem | null; delta: number; reason: string }>({
    open: false,
    passenger: null,
    delta: 10,
    reason: 'ชดเชยระบบ / ส่งเสริมการใช้งาน'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('gozipp_admin_token');
      if (savedToken) setToken(savedToken);
    }
  }, []);

  // Fetch pending drivers
  const fetchPendingDrivers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/admin/drivers/pending');
      setPendingDrivers(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.error('Failed to load pending drivers:', e);
    }
  }, []);

  // Fetch all drivers
  const fetchAllDrivers = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (driverSearch.trim()) query.append('search', driverSearch.trim());
      if (driverStatusFilter !== 'ALL') query.append('status', driverStatusFilter);
      const res = await apiFetch(`/api/v1/admin/drivers?${query.toString()}`);
      if (res && Array.isArray(res.drivers)) {
        setAllDrivers(res.drivers);
      }
    } catch (e: any) {
      console.error('Failed to load all drivers:', e);
    }
  }, [driverSearch, driverStatusFilter]);

  // Fetch passengers
  const fetchPassengers = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (passengerSearch.trim()) query.append('search', passengerSearch.trim());
      const res = await apiFetch(`/api/v1/admin/passengers?${query.toString()}`);
      if (res && Array.isArray(res.passengers)) {
        setPassengers(res.passengers);
      }
    } catch (e: any) {
      console.error('Failed to load passengers:', e);
    }
  }, [passengerSearch]);

  // Fetch stations
  const fetchStations = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/admin/stations');
      if (Array.isArray(res)) {
        setStationList(res);
      }
    } catch (e: any) {
      console.error('Failed to load stations:', e);
    }
  }, []);

  // Fetch live fleet data
  const fetchFleetData = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/admin/fleet/live');
      if (res && res.drivers) {
        setFleetData(res);
      }
    } catch (e: any) {
      console.error('Failed to load live fleet:', e);
    }
  }, []);

  // Fetch stats & pricing & queues
  const fetchStatsAndConfig = useCallback(async () => {
    try {
      const [statsData, pricingData, invitesData, queuesData] = await Promise.allSettled([
        apiFetch('/api/v1/admin/dashboard/stats'),
        apiFetch('/api/v1/admin/config/pricing'),
        apiFetch('/api/v1/admin/invite-codes'),
        apiFetch('/api/v1/admin/queues/active'),
      ]);

      if (statsData.status === 'fulfilled' && statsData.value) setStats(statsData.value);
      if (pricingData.status === 'fulfilled' && pricingData.value) {
        setBaseFarePoints(pricingData.value.baseFarePoints ?? 2);
        setEmergencyLimit(pricingData.value.emergencyOverdraftLimit ?? 5);
      }
      if (invitesData.status === 'fulfilled' && Array.isArray(invitesData.value)) {
        setInviteCodes(invitesData.value);
      }
      if (queuesData.status === 'fulfilled' && Array.isArray(queuesData.value)) {
        setActiveQueues(queuesData.value);
      }
    } catch {}
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/admin/audit-logs?limit=30');
      if (res && Array.isArray(res.logs)) {
        setAuditLogs(res.logs);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (token) {
      fetchPendingDrivers();
      fetchStatsAndConfig();
    }
  }, [token, fetchPendingDrivers, fetchStatsAndConfig]);

  useEffect(() => {
    if (token) {
      if (activeTab === 'ALL_DRIVERS') fetchAllDrivers();
      if (activeTab === 'PASSENGERS') fetchPassengers();
      if (activeTab === 'AUDIT') fetchAuditLogs();
      if (activeTab === 'MAP') fetchFleetData();
      if (activeTab === 'STATIONS') fetchStations();
      if (activeTab === 'QUEUE' || activeTab === 'STATS') fetchStatsAndConfig();
    }
  }, [token, activeTab, fetchAllDrivers, fetchPassengers, fetchAuditLogs, fetchFleetData, fetchStations, fetchStatsAndConfig]);

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
      fetchPendingDrivers();
      fetchStatsAndConfig();
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
      fetchPendingDrivers();
      fetchStatsAndConfig();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  // Toggle Driver Status (Active / Suspended)
  const handleToggleDriverStatus = async (driver: AllDriver) => {
    const newStatus = driver.currentStatus === 'SUSPENDED' ? 'IDLE' : 'SUSPENDED';
    const confirmMsg = newStatus === 'SUSPENDED'
      ? `คุณต้องการระงับบัญชีคนขับ ${driver.name} (${driver.phone}) ชั่วคราวหรือไม่?`
      : `คุณต้องการเปิดใช้งานคนขับ ${driver.name} อีกครั้งหรือไม่?`;
    if (!confirm(confirmMsg)) return;

    try {
      await apiFetch('/api/v1/admin/drivers/status', {
        method: 'POST',
        body: JSON.stringify({ driverId: driver.id, status: newStatus }),
      });
      setActionMessage(`✅ ปรับสถานะคนขับเป็น ${newStatus} สำเร็จ`);
      fetchAllDrivers();
      fetchStatsAndConfig();
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

  // Execute Adjust Points
  const handleExecuteAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal.passenger) return;
    try {
      await apiFetch('/api/v1/admin/passengers/adjust-points', {
        method: 'POST',
        body: JSON.stringify({
          passengerId: adjustModal.passenger.id,
          pointsDelta: Number(adjustModal.delta),
          reason: adjustModal.reason || 'ปรับปรุงแต้มโดยผู้ดูแลระบบ'
        }),
      });
      setActionMessage('✅ ปรับปรุงแต้มสำเร็จ');
      setAdjustModal({ open: false, passenger: null, delta: 10, reason: '' });
      fetchPassengers();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('ปรับแต้มไม่สำเร็จ: ' + err.message);
    }
  };

  // Save Station (Geofence CRUD)
  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.id.trim() || !stationForm.name.trim()) return;
    try {
      await apiFetch('/api/v1/admin/stations', {
        method: 'POST',
        body: JSON.stringify({
          ...stationForm,
          lat: Number(stationForm.lat),
          lng: Number(stationForm.lng),
          radius_m: Number(stationForm.radius_m)
        }),
      });
      setActionMessage('📍 บันทึกข้อมูลวินและรัศมี Geofence สำเร็จ');
      setStationForm({ id: '', name: '', area: 'กรุงเทพมหานคร', lat: 13.7463, lng: 100.5348, radius_m: 100, isActive: true });
      setIsEditingStation(false);
      fetchStations();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('บันทึกวินไม่สำเร็จ: ' + err.message);
    }
  };

  // Delete Station
  const handleDeleteStation = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบวิน ${name} (${id}) ใช่หรือไม่?`)) return;
    try {
      await apiFetch(`/api/v1/admin/stations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setActionMessage(`🗑️ ลบวิน ${id} สำเร็จ`);
      fetchStations();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  // Cancel Trip by Admin
  const handleCancelTrip = async (tripId: string) => {
    const reason = prompt('ระบุเหตุผลการยกเลิกการเดินทางฉุกเฉิน:', 'ยกเลิกโดยศูนย์ควบคุมระบบ');
    if (!reason) return;
    try {
      await apiFetch(`/api/v1/admin/trips/${tripId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setActionMessage('🛑 ยกเลิกการเดินทางเรียบร้อยแล้ว');
      fetchFleetData();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('ยกเลิกไม่สำเร็จ: ' + err.message);
    }
  };

  // Complete Trip by Admin
  const handleCompleteTrip = async (tripId: string) => {
    if (!confirm('ยืนยันบันทึกจบงานและปล่อยคนขับกลับสู่สถานะว่างหรือไม่?')) return;
    try {
      await apiFetch(`/api/v1/admin/trips/${tripId}/complete`, {
        method: 'POST',
      });
      setActionMessage('🏁 บันทึกจบงานสำเร็จ');
      fetchFleetData();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('จบงานไม่สำเร็จ: ' + err.message);
    }
  };

  // Override Queue Driver
  const handleOverrideQueue = async (winId: string, driverId: string) => {
    const reason = prompt('กรุณาระบุเหตุผลการลัดคิวฉุกเฉิน:', 'งานด่วนจากศูนย์ควบคุม');
    if (!reason) return;
    try {
      await apiFetch('/api/v1/admin/override', {
        method: 'POST',
        body: JSON.stringify({ winId, driverId, reason }),
      });
      setActionMessage('⚡ จัดลำดับคิวสำเร็จ');
      fetchStatsAndConfig();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
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
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">ชื่อผู้ใช้งาน</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-[#A3FF3F] outline-none text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">รหัสผ่าน</label>
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
              <span>GOZIPP Operations Center</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A3FF3F]/10 text-[#A3FF3F] border border-[#A3FF3F]/20 font-bold">
                Phase 2 Live
              </span>
            </div>
            <div className="text-[11px] text-slate-400">ศูนย์ควบคุมการเดินรถสด & จัดการ Geofence วินมอเตอร์ไซค์</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {actionMessage && (
            <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-[#A3FF3F] animate-fade-in font-bold">
              {actionMessage}
            </span>
          )}

          <button
            onClick={() => {
              fetchPendingDrivers();
              fetchStatsAndConfig();
              if (activeTab === 'ALL_DRIVERS') fetchAllDrivers();
              if (activeTab === 'PASSENGERS') fetchPassengers();
              if (activeTab === 'MAP') fetchFleetData();
              if (activeTab === 'STATIONS') fetchStations();
              if (activeTab === 'AUDIT') fetchAuditLogs();
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
        {/* Real-time KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>คนขับออนไลน์พร้อมรับงาน</span>
              <Car className="w-4 h-4 text-[#A3FF3F]" />
            </div>
            <div className="text-2xl font-black text-[#A3FF3F]">{stats?.activeDrivers ?? 0} คัน</div>
            <div className="text-[10px] text-slate-500 mt-1">ทั้งหมด {stats?.totalDrivers ?? 0} คนในระบบ</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>คนขับรอการอนุมัติ</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{pendingDrivers.length} คน</div>
            <div className="text-[10px] text-slate-500 mt-1">ต้องตรวจสอบเอกสาร</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>เที่ยววิ่งวันนี้</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats?.tripsToday ?? 0} ทริป</div>
            <div className="text-[10px] text-slate-500 mt-1">สำเร็จ {stats?.completedTripsToday ?? 0} ทริป (รอเฉลี่ย {stats?.avgWaitTimeSeconds ?? 45} วิ)</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>ผู้โดยสารทั้งหมด</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400">{stats?.totalPassengers ?? 0} คน</div>
            <div className="text-[10px] text-slate-500 mt-1">ค่าบริการระบบวันนี้ {stats?.financials?.revenueToday ?? 0} บาท</div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('STATS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'STATS'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>ภาพรวมสด (Live Overview)</span>
          </button>

          <button
            onClick={() => setActiveTab('MAP')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'MAP'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>แผนที่เดินรถสด (Fleet Map)</span>
          </button>

          <button
            onClick={() => setActiveTab('STATIONS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'STATIONS'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>จัดการวิน & Geofence</span>
          </button>

          <button
            onClick={() => setActiveTab('DRIVERS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'DRIVERS'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>รออนุมัติ ({pendingDrivers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ALL_DRIVERS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'ALL_DRIVERS'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>คนขับทั้งหมด</span>
          </button>

          <button
            onClick={() => setActiveTab('PASSENGERS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'PASSENGERS'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>ผู้โดยสาร & แต้ม</span>
          </button>

          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'QUEUE'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>คิววินสด</span>
          </button>

          <button
            onClick={() => setActiveTab('PRICING')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'PRICING'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>ค่าบริการแต้ม</span>
          </button>

          <button
            onClick={() => setActiveTab('INVITES')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'INVITES'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>รหัสเชิญวิน</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'AUDIT'
                ? 'border-[#A3FF3F] text-[#A3FF3F]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>ประวัติระบบ (Audit)</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Tab: MAP & LIVE FLEET OPERATIONS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'MAP' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Radar Live Map Board */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Radio className="w-5 h-5 text-[#A3FF3F] animate-pulse" />
                      <span>ศูนย์ติดตามพิกัดรถสด (Live GPS Fleet View)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      แสดงตำแหน่งคนขับที่กำลังออนไลน์ พิกัดจุดตั้งวิน และรัศมี Geofence
                    </p>
                  </div>
                  <button
                    onClick={fetchFleetData}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-[#A3FF3F] font-bold border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>อัปเดตตำแหน่งสด</span>
                  </button>
                </div>

                {/* SVG Fleet Radar Map */}
                <div className="relative w-full h-[400px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>

                  {/* Concentric Radar Rings */}
                  <div className="absolute w-[360px] h-[360px] rounded-full border border-slate-800/60 pointer-events-none"></div>
                  <div className="absolute w-[240px] h-[240px] rounded-full border border-[#A3FF3F]/10 pointer-events-none"></div>
                  <div className="absolute w-[120px] h-[120px] rounded-full border border-[#A3FF3F]/20 pointer-events-none"></div>

                  {/* Stations plotted on map */}
                  {fleetData?.stations.map((st, idx) => {
                    // Normalize lat/lng to container offset
                    const offsetX = 50 + ((st.lng - 100.5348) * 1200);
                    const offsetY = 50 - ((st.lat - 13.7463) * 1200);
                    return (
                      <div
                        key={st.id}
                        style={{ left: `${Math.max(10, Math.min(90, offsetX))}%`, top: `${Math.max(10, Math.min(90, offsetY))}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center text-xs shadow-lg shadow-blue-900/40 animate-pulse">
                          📍
                        </div>
                        <span className="text-[10px] font-bold bg-slate-900/90 text-blue-300 px-2 py-0.5 rounded border border-slate-700 mt-1 whitespace-nowrap shadow-md">
                          {st.name} ({st.radius_m}m)
                        </span>
                      </div>
                    );
                  })}

                  {/* Drivers plotted on map */}
                  {fleetData?.drivers.map((d) => {
                    const offsetX = 50 + ((d.lng - 100.5348) * 1200);
                    const offsetY = 50 - ((d.lat - 13.7463) * 1200);
                    const isBusy = d.currentStatus === 'BUSY';
                    const isIdle = d.currentStatus === 'IDLE';
                    return (
                      <div
                        key={d.id}
                        style={{ left: `${Math.max(10, Math.min(90, offsetX))}%`, top: `${Math.max(10, Math.min(90, offsetY))}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-20"
                        title={`${d.name} (${d.plate}) - ${d.currentStatus}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-lg transition-transform hover:scale-125 ${
                          isBusy
                            ? 'bg-blue-500 text-white shadow-blue-500/50'
                            : isIdle
                            ? 'bg-[#A3FF3F] text-slate-950 shadow-green-900/50'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          🛵
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-black/90 text-white px-2 py-0.5 rounded border border-slate-700 mt-1 whitespace-nowrap shadow-md">
                          {d.name} ({d.plate})
                        </span>
                      </div>
                    );
                  })}

                  <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
                    🟢 ว่างพร้อมรับงาน • 🔵 กำลังวิ่งงาน • 📍 จุดวินมอเตอร์ไซค์
                  </div>
                </div>

                {/* Fleet Overview Footer */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    คนขับในพื้นที่ทั้งหมด: <strong className="text-white">{fleetData?.drivers.length ?? 0} คัน</strong>
                  </div>
                  <div>
                    จุดบริการวิน: <strong className="text-white">{fleetData?.stations.length ?? 0} แห่ง</strong>
                  </div>
                </div>
              </div>

              {/* Active Trips Monitor */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-400" />
                    <span>เที่ยววิ่งที่กำลังดำเนินการ ({fleetData?.activeTrips.length ?? 0})</span>
                  </h3>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-bold">
                    Live Monitor
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
                  {(!fleetData?.activeTrips || fleetData.activeTrips.length === 0) ? (
                    <div className="text-center py-16 text-slate-500 text-xs">
                      <CheckCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p>ไม่มีเที่ยววิ่งที่ค้างอยู่ขณะนี้</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">การเรียกงานใหม่จะปรากฏขึ้นที่นี่ทันที</p>
                    </div>
                  ) : (
                    fleetData.activeTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl hover:border-slate-700 transition-all space-y-2.5 text-xs"
                      >
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trip.status === 'IN_PROGRESS'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : trip.status === 'ACCEPTED'
                              ? 'bg-[#A3FF3F]/10 text-[#A3FF3F] border border-[#A3FF3F]/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {trip.status}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">
                            {trip.fare} บ.
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="text-slate-200 truncate flex items-center gap-1.5">
                            <span className="text-amber-400 text-[10px]">●</span> รับ: {trip.pickupAddress || 'จุดรับผู้โดยสาร'}
                          </div>
                          <div className="text-slate-400 truncate flex items-center gap-1.5">
                            <span className="text-purple-400 text-[10px]">●</span> ส่ง: {trip.destAddress || 'จุดหมายปลายทาง'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                          <span className="text-slate-500">
                            คนขับ: {trip.driverId ? trip.driverId.slice(0, 8) : 'กำลังจับคู่'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCancelTrip(trip.id)}
                              className="text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20"
                              title="ยกเลิกการเดินทาง"
                            >
                              ยกเลิก
                            </button>
                            <button
                              onClick={() => handleCompleteTrip(trip.id)}
                              className="text-[#A3FF3F] hover:text-green-300 font-bold px-2 py-1 rounded bg-[#A3FF3F]/10 hover:bg-[#A3FF3F]/20"
                              title="บังคับจบงาน"
                            >
                              จบงาน
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Tab: STATIONS & GEOFENCE MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'STATIONS' && (
          <div className="space-y-6">
            {/* Create/Edit Station Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#A3FF3F]" />
                    <span>{isEditingStation ? 'แก้ไขข้อมูลจุดตั้งวิน & รัศมี' : 'เพิ่มจุดตั้งวินมอเตอร์ไซค์ใหม่ (Add Win Station)'}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    กำหนดพิกัด GPS จุดจอดวิน และรัศมี Geofence (เมตร) เพื่อควบคุมการเข้าคิวอัตโนมัติ
                  </p>
                </div>

                {isEditingStation && (
                  <button
                    onClick={() => {
                      setIsEditingStation(false);
                      setStationForm({ id: '', name: '', area: 'กรุงเทพมหานคร', lat: 13.7463, lng: 100.5348, radius_m: 100, isActive: true });
                    }}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveStation} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">รหัสวิน (ID)</label>
                  <input
                    type="text"
                    placeholder="WIN-CENTRAL-01"
                    value={stationForm.id}
                    onChange={(e) => setStationForm({ ...stationForm, id: e.target.value })}
                    disabled={isEditingStation}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white outline-none focus:border-[#A3FF3F] uppercase disabled:opacity-50"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ชื่อจุดตั้งวิน (Name)</label>
                  <input
                    type="text"
                    placeholder="วินหน้าเซ็นทรัลพลาซา ปทุมวัน"
                    value={stationForm.name}
                    onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#A3FF3F]"
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">เขต/พื้นที่</label>
                  <input
                    type="text"
                    placeholder="ปทุมวัน"
                    value={stationForm.area}
                    onChange={(e) => setStationForm({ ...stationForm, area: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#A3FF3F]"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">รัศมี Geofence (เมตร)</label>
                  <input
                    type="number"
                    min={30}
                    max={1000}
                    value={stationForm.radius_m}
                    onChange={(e) => setStationForm({ ...stationForm, radius_m: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-amber-400 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <button
                    type="submit"
                    className="w-full bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
                  >
                    {isEditingStation ? '✓ อัปเดตวิน' : '+ บันทึกวิน'}
                  </button>
                </div>
              </form>
            </div>

            {/* Stations Directory Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white">จุดตั้งวินมอเตอร์ไซค์ที่เปิดให้บริการในระบบ</h3>
                <span className="text-xs text-slate-400">ทั้งหมด {stationList.length} วิน</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">รหัสวิน</th>
                      <th className="py-3 px-4">ชื่อจุดตั้งวิน</th>
                      <th className="py-3 px-4">เขต/พื้นที่</th>
                      <th className="py-3 px-4">พิกัด GPS (Lat, Lng)</th>
                      <th className="py-3 px-4">รัศมี Geofence</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stationList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          ยังไม่มีข้อมูลจุดตั้งวิน
                        </td>
                      </tr>
                    ) : (
                      stationList.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#A3FF3F]">{st.id}</td>
                          <td className="py-3.5 px-4 font-bold text-white text-sm font-kanit">{st.name}</td>
                          <td className="py-3.5 px-4 text-slate-300">{st.area || 'กรุงเทพมหานคร'}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                            {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                              รัศมี {st.radius_m} ม.
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-kanit">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              เปิดใช้งาน
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setStationForm({ ...st });
                                setIsEditingStation(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-bold border border-slate-700"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => handleDeleteStation(st.id, st.name)}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold border border-red-500/20"
                            >
                              ลบ
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Tab 0: STATS & LIVE OVERVIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'STATS' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#A3FF3F]" />
                  <span>การเงินและแต้มวันนี้ (Financials)</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">รายได้ค่าบริการระบบ:</span>
                    <span className="font-bold text-[#A3FF3F] text-sm">{stats?.financials?.revenueToday ?? 0} บาท</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">ค่าบริการต่อเที่ยว:</span>
                    <span className="font-bold text-white">{baseFarePoints} แต้ม (หัก 100% เข้าวิน/ระบบ)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">วงเงินติดลบฉุกเฉิน:</span>
                    <span className="font-bold text-amber-400">{emergencyLimit} แต้ม</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>สถิติการเดินรถ (Fleet Health)</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">คนขับในระบบทั้งหมด:</span>
                    <span className="font-bold text-white">{stats?.totalDrivers ?? 0} คน</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">คนขับพร้อมรับงาน:</span>
                    <span className="font-bold text-[#A3FF3F]">{stats?.activeDrivers ?? 0} คน</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">เวลารอเฉลี่ย:</span>
                    <span className="font-bold text-white">{stats?.avgWaitTimeSeconds ?? 45} วินาที</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>โครงสร้างพื้นฐาน (Infrastructure)</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">ฐานข้อมูล PostgreSQL:</span>
                    <span className="font-bold text-emerald-400">● ทำงานปกติ (Healthy)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">คิว Redis & Cache:</span>
                    <span className="font-bold text-emerald-400">● เชื่อมต่อสมบูรณ์</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">ระบบรักษาความปลอดภัย:</span>
                    <span className="font-bold text-white">2FA MFA + Audit Logs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Win Stations Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#A3FF3F]" />
                  <span>สถานะคิววินมอเตอร์ไซค์ตามพื้นที่ (Live Win Stations)</span>
                </h3>
                <button
                  onClick={fetchStatsAndConfig}
                  className="text-xs text-[#A3FF3F] hover:underline"
                >
                  รีเฟรชคิว
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeQueues.map((station) => (
                  <div key={station.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <div className="font-bold text-sm text-white">{station.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{station.area}</div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">คิวปัจจุบัน:</span>
                      <span className="text-xl font-black text-[#A3FF3F]">{station.queueCount} คัน</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Tab 1: DRIVERS PENDING APPROVAL */}
        {/* ------------------------------------------------------------- */}
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

        {/* ------------------------------------------------------------- */}
        {/* Tab 2: ALL DRIVERS DIRECTORY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ALL_DRIVERS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white">ทำเนียบคนขับทั้งหมด (Driver Directory)</h2>
                <p className="text-xs text-slate-400">ค้นหาคนขับ, ตรวจสอบสถานะการวิ่งงาน, และจัดการการระงับบัญชี</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ, เบอร์, ทะเบียน..."
                    className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-[#A3FF3F] w-56"
                  />
                </div>

                <select
                  value={driverStatusFilter}
                  onChange={(e) => setDriverStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="ALL">ทุกสถานะ</option>
                  <option value="APPROVED">อนุมัติแล้ว</option>
                  <option value="PENDING">รออนุมัติ</option>
                  <option value="SUSPENDED">ระงับบัญชี</option>
                  <option value="IDLE">ออนไลน์ (ว่าง)</option>
                  <option value="BUSY">กำลังวิ่งงาน</option>
                  <option value="OFFLINE">ออฟไลน์</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">คนขับ</th>
                    <th className="py-3 px-4">เบอร์โทร</th>
                    <th className="py-3 px-4">ทะเบียนรถ</th>
                    <th className="py-3 px-4">วินสังกัด</th>
                    <th className="py-3 px-4">สถานะอนุมัติ</th>
                    <th className="py-3 px-4">สถานะปัจจุบัน</th>
                    <th className="py-3 px-4">งานทั้งหมด</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        ไม่พบข้อมูลคนขับตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    allDrivers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {d.name} {d.nickname && <span className="text-slate-400 text-[11px]">({d.nickname})</span>}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{d.phone}</td>
                        <td className="py-3.5 px-4 font-bold text-yellow-400">{d.plate}</td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">{d.stationId || 'WIN-CENTRAL-01'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.approvalStatus === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : d.approvalStatus === 'REJECTED'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {d.approvalStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.currentStatus === 'SUSPENDED'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : d.currentStatus === 'IDLE'
                              ? 'bg-[#A3FF3F]/10 text-[#A3FF3F] border border-[#A3FF3F]/30'
                              : d.currentStatus === 'BUSY'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {d.currentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">{d.totalTrips} เที่ยว</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleDriverStatus(d)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              d.currentStatus === 'SUSPENDED'
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {d.currentStatus === 'SUSPENDED' ? 'ปลดระงับ' : 'ระงับบัญชี'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Tab 3: PASSENGERS & POINTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'PASSENGERS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white">จัดการข้อมูลผู้โดยสาร & แต้มกระเป๋าเงิน (Passenger CRM)</h2>
                <p className="text-xs text-slate-400">ตรวจสอบแต้มคงเหลือ, ประวัติการเรียก, และปรับปรุงแต้มชดเชย</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={passengerSearch}
                  onChange={(e) => setPassengerSearch(e.target.value)}
                  placeholder="ค้นหาชื่อผู้โดยสาร, เบอร์โทร..."
                  className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-[#A3FF3F] w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ชื่อผู้โดยสาร</th>
                    <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                    <th className="py-3 px-4">แต้มคงเหลือ (Points)</th>
                    <th className="py-3 px-4">จำนวนเที่ยวที่ใช้</th>
                    <th className="py-3 px-4">วันที่สมัคร</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {passengers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        ไม่พบข้อมูลผู้โดยสาร
                      </td>
                    </tr>
                  ) : (
                    passengers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white text-sm font-kanit">{p.name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{p.phone}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-sm text-[#A3FF3F] bg-[#A3FF3F]/10 px-2.5 py-1 rounded-lg border border-[#A3FF3F]/20">
                            {p.pointsBalance} แต้ม
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-bold">{p.totalRides} ครั้ง</td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('th-TH') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setAdjustModal({ open: true, passenger: p, delta: 10, reason: 'ชดเชยระบบ / ส่งเสริมการใช้งาน' })}
                            className="bg-slate-800 hover:bg-slate-700 text-[#A3FF3F] border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                          >
                            + ปรับปรุงแต้ม
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Tab 4: QUEUE MONITOR */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'QUEUE' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white">ลำดับคิววินมอเตอร์ไซค์สด (Live Fair Queue)</h2>
                <p className="text-xs text-slate-400 mt-0.5">ตรวจสอบการจัดลำดับตามอัลกอริทึม Fair Queue ในแต่ละวิน พร้อมระบบจัดลำดับฉุกเฉิน</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">เลือกวิน:</label>
                <select
                  value={selectedWinId}
                  onChange={(e) => setSelectedWinId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  {activeQueues.map((q) => (
                    <option key={q.id} value={q.id}>{q.name} ({q.queueCount} คัน)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Win Detail */}
            {(() => {
              const currentQueue = activeQueues.find((q) => q.id === selectedWinId) || activeQueues[0];
              if (!currentQueue || currentQueue.drivers.length === 0) {
                return (
                  <div className="text-center py-16 text-slate-500 text-sm bg-slate-950/40 rounded-2xl border border-slate-800/40">
                    <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-slate-400">ยังไม่มีคนขับออนไลน์ในคิวของวินนี้</p>
                    <p className="text-xs mt-1 text-slate-600">เมื่อคนขับเปิดสวิตช์พร้อมรับงาน จะเข้าสู่คิวอัตโนมัติ</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {currentQueue.drivers.map((d, index) => (
                    <div
                      key={d.driverId}
                      className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center ${
                          index === 0
                            ? 'bg-[#A3FF3F] text-slate-950 shadow-md shadow-green-900/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-2">
                            <span>{d.driverName}</span>
                            {d.driverPlate && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 font-bold">
                                {d.driverPlate}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Driver ID: {d.driverId} • คะแนน Fair Score: {d.score}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOverrideQueue(selectedWinId, d.driverId)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition-all"
                      >
                        ⚡ ลัดคิวฉุกเฉิน
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Tab 5: PRICING CONFIG */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'PRICING' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm max-w-xl">
            <h2 className="text-lg font-black text-white mb-1">ตั้งค่าอัตราค่าบริการหักแต้ม (Trip Pricing)</h2>
            <p className="text-xs text-slate-400 mb-6">
              กำหนดจำนวนแต้มที่ระบบจะหักจากกระเป๋าเงินผู้โดยสารในแต่ละเที่ยวการเดินทาง (คนขับได้เงินสดเต็มจำนวน 100%)
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

        {/* ------------------------------------------------------------- */}
        {/* Tab 6: INVITE CODES */}
        {/* ------------------------------------------------------------- */}
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

        {/* ------------------------------------------------------------- */}
        {/* Tab 7: AUDIT LOGS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'AUDIT' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">บันทึกประวัติการกระทำของผู้ดูแล (Audit Trail)</h2>
                <p className="text-xs text-slate-400">บันทึกการอนุมัติ, การเปลี่ยนสถานะ, การปรับแต้ม, และการลัดคิวที่แก้ไขไม่ได้</p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700"
              >
                โหลดใหม่
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">วันและเวลา</th>
                    <th className="py-3 px-4">การกระทำ (Action)</th>
                    <th className="py-3 px-4">เป้าหมาย (Resource)</th>
                    <th className="py-3 px-4">ผู้ดูแล (Actor)</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        ยังไม่มีบันทึกประวัติการกระทำล่าสุด
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(log.createdAt).toLocaleString('th-TH')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white">
                          {log.resourceType}: {log.resourceId}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {log.actorRole} ({log.actorId ? log.actorId.slice(0, 8) : 'admin'})
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {log.ipAddress || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Points Modal */}
      {adjustModal.open && adjustModal.passenger && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-1">ปรับปรุงแต้มผู้โดยสาร</h3>
            <p className="text-xs text-slate-400 mb-4">
              ผู้โดยสาร: <strong className="text-white">{adjustModal.passenger.name}</strong> ({adjustModal.passenger.phone})
            </p>

            <form onSubmit={handleExecuteAdjustPoints} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  จำนวนแต้มที่ต้องการปรับ (ใส่ค่าบวกเพื่อเพิ่ม / ค่าลบเพื่อลด)
                </label>
                <input
                  type="number"
                  value={adjustModal.delta}
                  onChange={(e) => setAdjustModal({ ...adjustModal, delta: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-black text-[#A3FF3F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  เหตุผลในการปรับปรุงแต้ม (บันทึกลง Audit Log)
                </label>
                <input
                  type="text"
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
                  placeholder="เช่น ชดเชยระบบขัดข้อง, โอนสลิปผิด"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModal({ open: false, passenger: null, delta: 10, reason: '' })}
                  className="w-1/2 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] rounded-xl text-xs font-extrabold shadow-md"
                >
                  ยืนยันปรับแต้ม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
