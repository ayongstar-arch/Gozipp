import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import ReferralView from '../passenger/ReferralView';
import DevicesView from './DevicesView';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../stores/uiStore';
import { apiFetch } from '../../services/api';
import {
  QrCode,
  Share2,
  Copy,
  Check,
  Download,
  Maximize2,
  X,
  Phone,
  MessageCircle,
  Mail,
  HelpCircle,
  ShieldCheck,
  MapPin,
  CreditCard,
  Lock,
  Smartphone,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Home,
  Briefcase,
  Star,
} from 'lucide-react';

const ProfileView: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();
  const isLoading = useUIStore((state) => state.isLoading);
  const setToastMessage = useUIStore((state) => state.setToastMessage);

  // Sub-views & Modals
  const [showReferral, setShowReferral] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showQrZoom, setShowQrZoom] = useState(false);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // States for Copy & Share
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);

  // Change PIN Form
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  // Referral / Share Link Construction
  const referralCode =
    user?.referralCode || user?.avatarSeed || (user?.id ? user.id.slice(0, 8).toUpperCase() : 'GOZIPP');
  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/passenger?ref=${referralCode}`
      : `https://www.gozipp.app/passenger?ref=${referralCode}`;

  // High-contrast, pure white background QR Code for reliable camera scanning
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    inviteUrl
  )}&margin=12`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setToastMessage(`📋 คัดลอกรหัสแนะนำ "${referralCode}" เรียบร้อยแล้ว`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setToastMessage('🔗 คัดลอกลิงก์แนะนำเพื่อนเรียบร้อยแล้ว');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ชวนเพื่อนใช้ GoZipp',
          text: `นั่งวินมอเตอร์ไซค์สะดวก ปลอดภัยกับ GoZipp! สมัครผ่านรหัสแนะนำของฉัน: ${referralCode} รับสิทธิ์นั่งฟรี 3 เที่ยวและแต้มสะสมพิเศษทันที!`,
          url: inviteUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = async () => {
    setIsSavingImage(true);
    try {
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `gozipp-qr-${referralCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setToastMessage('📥 บันทึกภาพ QR Code ลงเครื่องแล้ว!');
    } catch {
      window.open(qrImageUrl, '_blank');
      setToastMessage('📥 เปิดภาพ QR Code แล้ว กดค้างที่ภาพเพื่อบันทึก');
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleChangePin = async () => {
    if (!/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin) || newPin !== confirmPin) {
      setPinError('กรุณากรอกรหัส PIN 6 หลักให้ครบถ้วนและตรงกัน');
      return;
    }

    try {
      setPinBusy(true);
      setPinError('');
      await apiFetch('/api/v1/auth/change-pin', {
        method: 'POST',
        body: JSON.stringify({ currentPin, newPin }),
      });
      setShowChangePin(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setToastMessage('✅ เปลี่ยนรหัส PIN สำเร็จเรียบร้อย');
    } catch (err: any) {
      setPinError(err.message || 'เปลี่ยนรหัส PIN ไม่สำเร็จ');
    } finally {
      setPinBusy(false);
    }
  };

  if (showReferral) {
    return <ReferralView onClose={() => setShowReferral(false)} />;
  }

  if (showDevices) {
    return <DevicesView onClose={() => setShowDevices(false)} />;
  }

  // 100% Thai Menu Items
  const menuItems = [
    {
      label: 'ชวนเพื่อนรับแต้มสะสม (รับสิทธิ์นั่งฟรี & โบนัส)',
      desc: 'แชร์รหัสแนะนำ รับแต้มสะสมและสิทธิ์นั่งฟรี 3 เที่ยว',
      icon: '🎁',
      color: 'text-pink-400',
      onClick: () => setShowReferral(true),
    },
    {
      label: 'อุปกรณ์ที่เข้าสู่ระบบ (อุปกรณ์ของฉัน)',
      desc: 'ตรวจสอบและจัดการประวัติการเข้าสู่ระบบในแต่ละอุปกรณ์',
      icon: '📱',
      color: 'text-[#39B54A]',
      onClick: () => setShowDevices(true),
    },
    {
      label: 'สถานที่ที่บันทึกไว้ (บ้าน / ที่ทำงาน / จุดประจำ)',
      desc: 'บันทึกสถานที่โปรดเพื่อความสะดวกรวดเร็วในการเรียกรถ',
      icon: '📍',
      color: 'text-blue-400',
      onClick: () => setShowSavedPlaces(true),
    },
    {
      label: 'วิธีการชำระเงินและกระเป๋าเงิน (GoZipp Wallet)',
      desc: 'เติมแต้มด้วย PromptPay QR หรือตรวจสอบประวัติการเงิน',
      icon: '💳',
      color: 'text-emerald-400',
      onClick: () => useUIStore.getState().setActiveTab('WALLET'),
    },
    {
      label: 'ศูนย์ช่วยเหลือและติดต่อเจ้าหน้าที่ (บริการ 24 ชม.)',
      desc: 'แจ้งปัญหาการใช้งาน ร้องเรียน หรือโทรสายด่วนบริการลูกค้า',
      icon: '💬',
      color: 'text-amber-400',
      onClick: () => setShowSupport(true),
    },
    {
      label: 'ความเป็นส่วนตัวและความปลอดภัย (คุ้มครองข้อมูล PDPA)',
      desc: 'นโยบายคุ้มครองข้อมูลส่วนบุคคลและมาตรฐานความปลอดภัยบัญชี',
      icon: '🛡️',
      color: 'text-slate-400',
      onClick: () => setShowPrivacy(true),
    },
    {
      label: 'เปลี่ยนรหัส PIN เข้าใช้งาน (6 หลัก)',
      desc: 'ตั้งรหัสผ่าน PIN ใหม่เพื่อความปลอดภัยในการเข้าสู่ระบบ',
      icon: '🔐',
      color: 'text-emerald-400',
      onClick: () => setShowChangePin(true),
    },
  ];

  if (showChangePin) {
    return (
      <div className="flex-1 bg-slate-950 font-kanit p-6 overflow-y-auto">
        <button
          onClick={() => setShowChangePin(false)}
          className="w-10 h-10 rounded-full bg-slate-900 text-white mb-6 flex items-center justify-center hover:bg-slate-800 transition-colors"
        >
          ←
        </button>
        <h2 className="text-2xl font-black text-white mb-1">เปลี่ยนรหัส PIN เข้าใช้งาน</h2>
        <p className="text-slate-400 text-sm mb-6">กรุณายืนยันรหัส PIN เดิมก่อนทำการตั้งรหัสผ่านใหม่ 6 หลัก</p>
        {pinError && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {pinError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">รหัส PIN เดิม (6 หลัก)</label>
            <input
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="กรอก PIN เดิม"
              className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white text-lg tracking-widest outline-none focus:border-[#39B54A]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">รหัส PIN ใหม่ (6 หลัก)</label>
            <input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="กรอก PIN ใหม่"
              className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white text-lg tracking-widest outline-none focus:border-[#39B54A]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">ยืนยันรหัส PIN ใหม่ อีกครั้ง</label>
            <input
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="ยืนยัน PIN ใหม่"
              className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white text-lg tracking-widest outline-none focus:border-[#39B54A]"
            />
          </div>
          <button
            disabled={pinBusy}
            onClick={handleChangePin}
            className="w-full rounded-2xl bg-[#39B54A] text-slate-950 font-black py-4 transition-all disabled:opacity-50 active:scale-98 shadow-lg shadow-[#39B54A]/20"
          >
            {pinBusy ? 'กำลังบันทึกรหัสผ่าน...' : 'บันทึกรหัส PIN ใหม่'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 font-kanit p-4 sm:p-6 overflow-y-auto min-h-screen">
      {/* 1. Profile Header & User Info */}
      <div className="flex flex-col items-center pt-4 pb-6 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-emerald-500/20 border-2 border-emerald-400/30 mb-3 relative group">
          <span>{user?.name ? user.name.slice(0, 1) : '👤'}</span>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-[10px]">
            ⚡
          </div>
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-0.5">
          {user?.name || 'ผู้โดยสาร GoZipp'}
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>{user?.phone || 'ยังไม่ได้ระบุเบอร์โทร'}</span>
          <span>•</span>
          <span className="text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px]">
            ผู้โดยสารทั่วไป (ใช้งานปกติ)
          </span>
        </div>
      </div>

      {/* 2. REAL SCANNABLE QR CODE CARD FOR SHARING (แชร์ให้สแกนได้จริง) */}
      <div className="bg-gradient-to-b from-[#0b1f2e] to-[#07131d] border border-emerald-500/30 rounded-3xl p-5 mb-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">QR Code แนะนำเพื่อนของฉัน</h3>
              <p className="text-[10px] text-slate-400">สแกนเพื่อสมัครสมาชิก & รับสิทธิ์นั่งฟรี</p>
            </div>
          </div>
          <button
            onClick={() => setShowQrZoom(true)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-bold"
            title="ขยายเต็มจอ"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>ขยาย</span>
          </button>
        </div>

        {/* High-Contrast Scannable QR Code Canvas */}
        <div className="flex flex-col items-center text-center">
          <div
            onClick={() => setShowQrZoom(true)}
            className="bg-white p-3.5 rounded-2xl border-4 border-slate-800 shadow-xl inline-block cursor-pointer hover:scale-105 active:scale-95 transition-transform group"
          >
            <img
              src={qrImageUrl}
              alt="GoZipp Referral QR Code"
              className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
            />
            <div className="text-[10px] text-slate-700 font-bold mt-1 tracking-wider uppercase">
              แตะเพื่อดูภาพขยาย
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-300 font-medium">
            เปิดกล้องมือถือ, LINE หรือแอปธนาคาร เพื่อสแกนได้ทันที
          </div>

          {/* Referral Code Pill + Copy */}
          <div className="mt-3 w-full max-w-xs bg-slate-900/90 border border-slate-700 rounded-2xl p-2.5 flex items-center justify-between">
            <div className="text-left pl-1">
              <span className="text-[10px] text-slate-400 block font-bold">รหัสแนะนำของคุณ</span>
              <span className="text-base font-black text-emerald-400 tracking-wider">
                {referralCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 transition-colors active:scale-95"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
            </button>
          </div>

          {/* Quick Actions (Share & Download) */}
          <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-3">
            <button
              onClick={handleShare}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-105 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>แชร์ลิงก์ให้เพื่อน</span>
            </button>
            <button
              onClick={handleDownloadQr}
              disabled={isSavingImage}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isSavingImage ? 'กำลังบันทึก...' : 'บันทึกภาพ QR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Thai Menu Options (เมนูภาษาไทยทั้งหมด) */}
      <div className="space-y-2.5 mb-8">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">
          ตั้งค่าและบริการทั้งหมด
        </h4>
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            className="w-full bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-4 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.99] text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div
                className={`w-10 h-10 rounded-2xl bg-slate-800/90 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform ${item.color}`}
              >
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold text-sm tracking-tight truncate">
                  {item.label}
                </div>
                <div className="text-slate-400 text-xs truncate mt-0.5">{item.desc}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        ))}
      </div>

      {/* 4. Logout & Footer Info */}
      <div className="space-y-4 pb-6">
        <button
          onClick={logout}
          disabled={isLoading}
          className="w-full bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-black py-4 rounded-2xl transition-all text-sm active:scale-98 flex items-center justify-center gap-2"
        >
          <span>{isLoading ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}</span>
        </button>

        <div className="text-center pt-2">
          <div className="text-xs text-slate-500 font-bold">
            GoZipp เวอร์ชัน 2.0.0 (เวอร์ชันล่าสุดสำหรับผู้โดยสาร)
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            © 2026 GoZipp Technologies — แพลตฟอร์มเรียกรถจักรยานยนต์รับจ้างอัจฉริยะ
          </div>
        </div>
      </div>

      {/* MODAL 1: FULLSCREEN QR CODE ZOOM */}
      {showQrZoom && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b1f2e] border border-emerald-500/40 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative text-center">
            <button
              onClick={() => setShowQrZoom(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-black text-white">QR Code แนะนำเพื่อน</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ยื่นให้เพื่อนสแกนด้วยกล้องมือถือได้โดยตรง
              </p>
            </div>

            <div className="bg-white p-4 rounded-3xl border-4 border-emerald-500 inline-block shadow-2xl">
              <img
                src={qrImageUrl}
                alt="Enlarged QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
              <span className="text-[11px] text-slate-400 block font-bold">รหัสแนะนำของคุณ</span>
              <span className="text-xl font-black text-emerald-400 tracking-wider">
                {referralCode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownloadQr}
                className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>บันทึกภาพ</span>
              </button>
              <button
                onClick={handleShare}
                className="py-3 px-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25"
              >
                <Share2 className="w-4 h-4" />
                <span>แชร์ลิงก์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SAVED PLACES (สถานที่ที่บันทึกไว้) */}
      {showSavedPlaces && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#091b27] border-t sm:border border-blue-500/40 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">สถานที่ที่บันทึกไว้</h4>
                  <p className="text-[10px] text-slate-400">จุดหมายปลายทางยอดนิยมสำหรับเรียกรถด่วน</p>
                </div>
              </div>
              <button
                onClick={() => setShowSavedPlaces(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">บ้าน (Home)</span>
                    <span className="text-[11px] text-slate-400">ยังไม่ได้ระบุที่อยู่</span>
                  </div>
                </div>
                <button
                  onClick={() => setToastMessage('📍 สามารถตั้งค่าบ้านได้โดยตรงบนหน้าแผนที่')}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300"
                >
                  + ตั้งค่า
                </button>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">ที่ทำงาน (Work)</span>
                    <span className="text-[11px] text-slate-400">ยังไม่ได้ระบุที่อยู่</span>
                  </div>
                </div>
                <button
                  onClick={() => setToastMessage('📍 สามารถตั้งค่าที่ทำงานได้โดยตรงบนหน้าแผนที่')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  + ตั้งค่า
                </button>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">สถานที่โปรดอื่นๆ</span>
                    <span className="text-[11px] text-slate-400">บันทึกจุดหมายปลายทางประจำ</span>
                  </div>
                </div>
                <button
                  onClick={() => setToastMessage('📍 สามารถกดบันทึกดาวที่อยู่จากหน้าแผนที่หลัก')}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300"
                >
                  + เพิ่ม
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSavedPlaces(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPPORT CENTER (ศูนย์ช่วยเหลือ) */}
      {showSupport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#091b27] border-t sm:border border-amber-500/40 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">ศูนย์ช่วยเหลือและบริการลูกค้า</h4>
                  <p className="text-[10px] text-slate-400">ติดต่อเจ้าหน้าที่ GoZipp ตลอด 24 ชั่วโมง</p>
                </div>
              </div>
              <button
                onClick={() => setShowSupport(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <a
                href="tel:021234567"
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">สายด่วนบริการลูกค้า</span>
                    <span className="text-[11px] text-slate-400">โทร: 02-123-4567 (โทรฟรี 24 ชม.)</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </a>

              <a
                href="https://line.me"
                target="_blank"
                rel="noreferrer"
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">LINE Official Account</span>
                    <span className="text-[11px] text-slate-400">แอดไลน์: @gozipp</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </a>

              <a
                href="mailto:support@gozipp.app"
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">อีเมลสนับสนุน</span>
                    <span className="text-[11px] text-slate-400">support@gozipp.app</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </a>
            </div>

            <button
              onClick={() => setShowSupport(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: PRIVACY & SECURITY (PDPA) */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#091b27] border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">ความเป็นส่วนตัวและความปลอดภัย</h4>
                  <p className="text-[10px] text-slate-400">การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">1.</span>
                <span>
                  <strong>การเข้ารหัสข้อมูล:</strong> ข้อมูลรหัสผ่าน PIN และประวัติการทำธุรกรรมของคุณได้รับการเข้ารหัสด้วยมาตรฐานระดับสากล (Argon2id และ AES-256)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">2.</span>
                <span>
                  <strong>การคุ้มครองพิกัด GPS:</strong> พิกัดการเดินทางของคุณจะถูกส่งต่อเฉพาะผู้ขับขี่ที่รับงานเท่านั้น และจะถูกลบออกจากสถานะเรียลไทม์หลังการเดินทางสิ้นสุด
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">3.</span>
                <span>
                  <strong>นโยบายไม่เปิดเผยข้อมูล:</strong> GoZipp จะไม่เปิดเผยข้อมูลส่วนบุคคลหรือหมายเลขโทรศัพท์แก่บุคคลภายนอกโดยไม่ได้รับความยินยอม
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowPrivacy(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-colors"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
