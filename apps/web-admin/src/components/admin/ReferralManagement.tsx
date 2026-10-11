'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  QrCode,
  Gift,
  ShieldCheck,
  TrendingUp,
  Save,
  CheckCircle2,
  Share2,
  Sparkles,
  Award,
  AlertCircle,
  Percent,
} from 'lucide-react';

interface ReferralStats {
  totalReferrals: number;
  conversionRate: number;
  pointsAwarded: number;
  tripsGenerated: number;
  driverReferrals: number;
  passengerReferrals: number;
}

interface ReferralActivity {
  id: string;
  time: string;
  referrer: string;
  referrerRole: 'PASSENGER' | 'DRIVER';
  referee: string;
  refereePhone: string;
  points: number;
  status: 'COMPLETED' | 'FIRST_TRIP_PENDING';
}

export default function ReferralManagement() {
  // Configuration State
  const [referralPoints, setReferralPoints] = useState<number>(50);
  const [freeRides, setFreeRides] = useState<number>(3);
  const [welcomePoints, setWelcomePoints] = useState<number>(20);
  const [triggerCondition, setTriggerCondition] = useState<'ON_OTP' | 'ON_FIRST_TRIP'>('ON_OTP');
  const [isCampaignActive, setIsCampaignActive] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Stats State
  const [stats] = useState<ReferralStats>({
    totalReferrals: 1482,
    conversionRate: 83.5,
    pointsAwarded: 74100,
    tripsGenerated: 3940,
    driverReferrals: 860,
    passengerReferrals: 622,
  });

  // Recent Activities
  const [recentActivities] = useState<ReferralActivity[]>([
    {
      id: 'REF-8012',
      time: '5 นาทีที่แล้ว',
      referrer: 'น.ส. ศิริพร (P-884210)',
      referrerRole: 'PASSENGER',
      referee: 'คุณ กิตติศักดิ์',
      refereePhone: '089-xxx-4123',
      points: 50,
      status: 'COMPLETED',
    },
    {
      id: 'REF-8011',
      time: '18 นาทีที่แล้ว',
      referrer: 'พี่สมศักดิ์ วิน BTS อโศก (D-1029)',
      referrerRole: 'DRIVER',
      referee: 'คุณ วรัญญา',
      refereePhone: '081-xxx-9921',
      points: 50,
      status: 'COMPLETED',
    },
    {
      id: 'REF-8010',
      time: '42 นาทีที่แล้ว',
      referrer: 'คุณ ณัฐพล (P-440192)',
      referrerRole: 'PASSENGER',
      referee: 'คุณ ภัทรพล',
      refereePhone: '095-xxx-3184',
      points: 50,
      status: 'FIRST_TRIP_PENDING',
    },
    {
      id: 'REF-8009',
      time: '1 ชั่วโมงที่แล้ว',
      referrer: 'พี่ประวิทย์ วิน MRT เพชรบุรี (D-1055)',
      referrerRole: 'DRIVER',
      referee: 'คุณ ธนกร',
      refereePhone: '082-xxx-7762',
      points: 50,
      status: 'COMPLETED',
    },
    {
      id: 'REF-8008',
      time: '2 ชั่วโมงที่แล้ว',
      referrer: 'คุณ กัลยา (P-109243)',
      referrerRole: 'PASSENGER',
      referee: 'คุณ ญาณิศา',
      refereePhone: '086-xxx-1590',
      points: 50,
      status: 'COMPLETED',
    },
  ]);

  // Load existing config from API on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/v1/admin/config/referral');
        if (res.ok) {
          const data = await res.json();
          if (data.referralPoints !== undefined) setReferralPoints(data.referralPoints);
          if (data.freeRidesRemaining !== undefined) setFreeRides(data.freeRidesRemaining);
          if (data.refereeBonusPoints !== undefined) setWelcomePoints(data.refereeBonusPoints);
          if (data.active !== undefined) setIsCampaignActive(data.active);
        }
      } catch (err) {
        console.error('Error fetching referral config:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/v1/admin/config/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: referralPoints,
          freeRides: freeRides,
          refereeBonus: welcomePoints,
          active: isCampaignActive,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-2xl bg-[#A3FF3F]/10 text-gozipp-green border border-[#A3FF3F]/20">
              <Share2 size={24} />
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight">
              ระบบแนะนำเพื่อน & สิทธิประโยชน์ (Referral & Rewards)
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            บริหารจัดการแคมเปญแชร์ QR Code ทั้งฝั่งคนขับ (Driver Network) และผู้โดยสาร (Passenger Growth)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-white/10 px-4 py-2.5 rounded-2xl">
            <span className={`w-2.5 h-2.5 rounded-full ${isCampaignActive ? 'bg-gozipp-green animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-bold text-slate-300">
              {isCampaignActive ? 'สถานะแคมเปญ: เปิดใช้งาน' : 'สถานะแคมเปญ: ปิดชั่วคราว'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/80 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-[#A3FF3F]/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">สมาชิกจากการแนะนำ</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">{stats.totalReferrals.toLocaleString()} <span className="text-sm font-semibold text-slate-400">คน</span></div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-gozipp-green">
            <TrendingUp size={14} />
            <span>+18.4% จากสัปดาห์ก่อน</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-[#A3FF3F]/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">อัตราแปลงผลสำเร็จ</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-gozipp-green">
              <Percent size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">{stats.conversionRate}%</div>
          <div className="text-xs font-semibold text-slate-400 mt-2">
            สแกน QR ➔ ลงทะเบียน ➔ เดินทางจริง
          </div>
        </div>

        <div className="bg-slate-900/80 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-[#A3FF3F]/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">แต้มรางวัลสะสมที่แจก</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Gift size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">{stats.pointsAwarded.toLocaleString()} <span className="text-sm font-semibold text-slate-400">แต้ม</span></div>
          <div className="text-xs font-semibold text-slate-400 mt-2">
            มูลค่าเครดิตเทียบเท่า {stats.pointsAwarded.toLocaleString()} บาท
          </div>
        </div>

        <div className="bg-slate-900/80 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-[#A3FF3F]/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">เที่ยววิ่งที่เกิดจากระบบชวน</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">{stats.tripsGenerated.toLocaleString()} <span className="text-sm font-semibold text-slate-400">เที่ยว</span></div>
          <div className="text-xs font-semibold text-slate-400 mt-2">
            สร้างรายได้หมุนเวียนในชุมชน
          </div>
        </div>
      </div>

      {/* Main Grid: Settings & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-7 bg-slate-900 border border-white/5 p-8 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Award size={20} className="text-gozipp-green" />
                  ตั้งค่าโปรโมชั่นและสิทธิประโยชน์ (Admin Rules)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  กำหนดแต้มและเงื่อนไขการให้รางวัลแก่ผู้แนะนำและผู้สมัครใหม่
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCampaignActive(!isCampaignActive)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isCampaignActive
                    ? 'bg-gozipp-green/20 text-gozipp-green border border-gozipp-green/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {isCampaignActive ? 'แคมเปญทำงานอยู่' : 'ระงับแคมเปญ'}
              </button>
            </div>

            <div className="space-y-6">
              {/* Field 1: Referrer Points */}
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <label className="text-sm font-bold text-white">
                      แต้มรางวัลสำหรับผู้แนะนำ (Referrer Bonus)
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ผู้โดยสารเดิมหรือคนขับวินจะได้รับแต้มนี้เข้า Wallet ทันทีที่มีเพื่อนสมัครสำเร็จ
                    </p>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-gozipp-green/10 text-gozipp-green border border-gozipp-green/20">
                    1 แต้ม = 1 บาท
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={referralPoints}
                    onChange={(e) => setReferralPoints(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-36 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xl font-black text-white focus:outline-none focus:border-gozipp-green"
                  />
                  <span className="text-sm font-bold text-slate-400">แต้มต่อคน</span>
                </div>
              </div>

              {/* Field 2: Referee Free Rides */}
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <label className="text-sm font-bold text-white">
                      สิทธิ์นั่งฟรีสำหรับเพื่อนใหม่ (New User Free Rides)
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      สิทธิ์เดินทางฟรีสำหรับการใช้งานครั้งแรก เพื่อจูงใจให้ผู้โดยสารใหม่ทดลองใช้
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={freeRides}
                    onChange={(e) => setFreeRides(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-36 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xl font-black text-white focus:outline-none focus:border-gozipp-green"
                  />
                  <span className="text-sm font-bold text-slate-400">เที่ยวแรกฟรี</span>
                </div>
              </div>

              {/* Field 3: Referee Welcome Points */}
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/5">
                <div>
                  <label className="text-sm font-bold text-white">
                    แต้มโบนัสเริ่มต้นสำหรับเพื่อนใหม่ (Welcome Points)
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    แต้มสะสมในกระเป๋าเงินทันทีหลังยืนยัน OTP ครั้งแรก
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={welcomePoints}
                    onChange={(e) => setWelcomePoints(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-36 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xl font-black text-white focus:outline-none focus:border-gozipp-green"
                  />
                  <span className="text-sm font-bold text-slate-400">แต้ม</span>
                </div>
              </div>

              {/* Field 4: Trigger Condition */}
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/5">
                <label className="text-sm font-bold text-white mb-2 block">
                  เงื่อนไขการปล่อยแต้มรางวัล (Award Release Trigger)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => setTriggerCondition('ON_OTP')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      triggerCondition === 'ON_OTP'
                        ? 'border-gozipp-green bg-gozipp-green/10 text-white'
                        : 'border-white/5 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-black text-sm">ยืนยัน OTP เสร็จสิ้น</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      (Fast Growth) ให้แต้มทันทีที่เพื่อนสมัครและยืนยันเบอร์
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTriggerCondition('ON_FIRST_TRIP')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      triggerCondition === 'ON_FIRST_TRIP'
                        ? 'border-gozipp-green bg-gozipp-green/10 text-white'
                        : 'border-white/5 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-black text-sm">จบเที่ยวเดินทางแรก</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      (High Quality) ให้แต้มเมื่อเพื่อนขึ้นรถและเสร็จสิ้นทริป
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-bold">
              * กฎ 1-Tier ป้องกัน MLM ตาม พ.ร.บ. ขายตรงและสอดคล้องกับ PDPA
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-gozipp-green animate-in fade-in">
                  <CheckCircle2 size={16} /> บันทึกเรียบร้อย
                </span>
              )}
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="bg-gozipp-green hover:bg-green-400 disabled:opacity-50 text-slate-950 font-black px-6 py-3.5 rounded-2xl transition-all shadow-xl shadow-gozipp-green/15 active:scale-95 flex items-center gap-2 text-sm"
              >
                <Save size={18} />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าโปรโมชั่น'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Channels & Security */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          {/* Channel Comparison */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <QrCode size={18} className="text-blue-400" />
              สัดส่วนช่องทางการแนะนำ (Network Channels)
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">คนขับวิน แนะนำผู้โดยสาร (Driver QR)</span>
                  <span className="text-white font-black">58% ({stats.driverReferrals} คน)</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '58%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">ผู้โดยสาร ชวนเพื่อน (Passenger QR & Link)</span>
                  <span className="text-white font-black">42% ({stats.passengerReferrals} คน)</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gozipp-green h-full rounded-full" style={{ width: '42%' }} />
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 leading-relaxed">
              💡 <strong>อินไซต์:</strong> คนขับวินที่ติดป้าย QR Code ที่เบาะหลังสามารถดึงดูดผู้โดยสารใหม่ได้เฉลี่ย <span className="text-white font-bold">14 คนต่อเดือน</span> ในขณะที่ผู้โดยสารนิยมแชร์ผ่าน LINE Link
            </div>
          </div>

          {/* Anti-Fraud Shield */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-gozipp-green" />
              มาตรการป้องกันการปั๊มแต้ม (Anti-Fraud Guard)
            </h3>

            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-white/5">
                <span className="text-gozipp-green font-bold">✓</span>
                <div>
                  <div className="font-bold text-white">NIST Phone & Device Fingerprint</div>
                  <div className="text-[11px] text-slate-500">1 หมายเลขโทรศัพท์ และ 1 อุปกรณ์ ต่อ 1 บัญชีผู้ใช้</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-white/5">
                <span className="text-gozipp-green font-bold">✓</span>
                <div>
                  <div className="font-bold text-white">Single-Tier Direct Referral</div>
                  <div className="text-[11px] text-slate-500">ให้แต้มเฉพาะชั้นลูกโดยตรง 1 ชั้นเท่านั้น ไม่มีระบบเครือข่ายซ้อน</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-white/5">
                <span className="text-gozipp-green font-bold">✓</span>
                <div>
                  <div className="font-bold text-white">Firebase App Check & reCAPTCHA</div>
                  <div className="text-[11px] text-slate-500">ป้องกันบอทสมัครและดักจับการยิง Request อัตโนมัติ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referral Transactions Table */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              ประวัติการแนะนำเพื่อนล่าสุด (Recent Referral Ledger)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ติดตามการได้รับแต้มและสถานะการสมัครของสมาชิกใหม่แบบเรียลไทม์
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 px-4">รหัสทำรายการ</th>
                <th className="pb-3 px-4">เวลา</th>
                <th className="pb-3 px-4">ผู้แนะนำ (Referrer)</th>
                <th className="pb-3 px-4">ประเภท</th>
                <th className="pb-3 px-4">เพื่อนที่สมัคร (Referee)</th>
                <th className="pb-3 px-4">แต้มที่มอบ</th>
                <th className="pb-3 px-4">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {recentActivities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-4 px-4 font-mono text-xs text-slate-400 font-bold">{act.id}</td>
                  <td className="py-4 px-4 text-xs text-slate-400">{act.time}</td>
                  <td className="py-4 px-4 text-white font-bold">{act.referrer}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        act.referrerRole === 'DRIVER'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-gozipp-green border border-emerald-500/30'
                      }`}
                    >
                      {act.referrerRole === 'DRIVER' ? 'คนขับวิน' : 'ผู้โดยสาร'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-white text-xs font-bold">{act.referee}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{act.refereePhone}</div>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-gozipp-green">+{act.points} pts</td>
                  <td className="py-4 px-4">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        act.status === 'COMPLETED'
                          ? 'bg-gozipp-green/10 text-gozipp-green'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {act.status === 'COMPLETED' ? 'สำเร็จ (ได้รับแต้มแล้ว)' : 'รอเที่ยวแรก'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
