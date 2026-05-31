'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ArrowLeft, Copy, Check, QrCode, Gift, Users, Share2 } from 'lucide-react';

interface ReferralViewProps {
  onClose: () => void;
}

const ReferralView: React.FC<ReferralViewProps> = ({ onClose }) => {
  const { user } = useAuthStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralCode = user?.referralCode || 'P-SYSTEM';
  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/register?code=${referralCode}`
    : `https://app.gozipp.com/register?code=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'สมัครใช้งาน GOZIPP',
          text: `สมัครใช้งาน GOZIPP วันนี้ผ่านรหัสแนะนำของฉัน: ${referralCode} เพื่อรับสิทธิพิเศษ!`,
          url: inviteUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteUrl)}&color=059669&bgcolor=0f172a`;

  return (
    <div className="flex-1 bg-slate-950 font-sans p-6 overflow-y-auto min-h-screen animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onClose}
          className="p-3 bg-slate-900 rounded-2xl border border-white/5 text-slate-400 hover:text-white transition-colors active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">ชวนเพื่อน (Referral)</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Invite friends & earn rewards</p>
        </div>
      </div>

      {/* Intro Card */}
      <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/5 p-6 rounded-3xl border border-emerald-500/10 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Gift size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white mb-1">แนะนำเพื่อนสมัครใช้งาน</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              ชวนเพื่อนใหม่มาสมัครใช้งาน GOZIPP เมื่อเพื่อนลงทะเบียนด้วยรหัสแนะนำของคุณ คุณจะได้รับแต้มโบนัสพิเศษฟรี! สะสมไว้ใช้เดินทางได้เลย
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center mb-8 shadow-2xl relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gozipp-green text-slate-950 text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg shadow-gozipp-green/20">
          QR Code แนะนำ
        </div>

        <div className="bg-slate-950 p-4 rounded-3xl border border-white/5 shadow-inner mb-6 mt-2 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gozipp-green/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {/* QR Code Image */}
          <img 
            src={qrImageUrl} 
            alt="Referral QR Code" 
            className="w-48 h-48 rounded-xl object-contain bg-slate-950 relative z-10"
          />
        </div>

        <div className="text-slate-400 text-xs font-bold mb-6">
          ให้เพื่อนของคุณสแกนเพื่อลงทะเบียนได้ทันที
        </div>

        {/* Copy Referral Code Section */}
        <div className="w-full space-y-3">
          <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div className="text-left">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">รหัสแนะนำของคุณ</div>
              <div className="text-lg font-black text-white tracking-wider mt-0.5">{referralCode}</div>
            </div>
            <button 
              onClick={handleCopyCode}
              className="p-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95 flex items-center gap-2 border border-white/5"
            >
              {copiedCode ? <Check size={16} className="text-gozipp-green" /> : <Copy size={16} />}
              <span className="text-xs font-black uppercase tracking-tighter">{copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleCopyLink}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black py-4 px-6 rounded-2xl border border-white/5 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
            >
              {copiedLink ? <Check size={16} className="text-gozipp-green" /> : <Share2 size={16} />}
              <span>{copiedLink ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์'}</span>
            </button>
            <button 
              onClick={handleShare}
              className="bg-gozipp-green hover:bg-green-400 text-slate-950 font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-xl shadow-gozipp-green/15 active:scale-[0.98]"
            >
              <Users size={16} />
              <span>แชร์ด่วน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <QrCode size={14} className="text-gozipp-green" />
          เงื่อนไขการแนะนำและรับแต้มโบนัส
        </h4>
        <ul className="space-y-3 text-slate-500 text-xs font-semibold leading-relaxed">
          <li className="flex gap-2">
            <span className="text-gozipp-green">1.</span>
            <span>สิทธิ์รับรางวัลสงวนไว้เฉพาะการเชิญชวนแบบ 1 ชั้น (ชั้นลูกตรง) เท่านั้น โดยผู้แนะนำจะได้รับแต้มสะสมเมื่อผู้สมัครใหม่ลงทะเบียนและผ่านการรับรองระบบเสร็จสิ้น</span>
          </li>
          <li className="flex gap-2">
            <span className="text-gozipp-green">2.</span>
            <span>จำนวนแต้มโบนัสต่อการแนะนำเพื่อนสำเร็จ จะกำหนดโดยผู้ดูแลระบบ (Admin หลังบ้าน) และสามารถเปลี่ยนแปลงได้ตามความเหมาะสมของโปรโมชัน</span>
          </li>
          <li className="flex gap-2">
            <span className="text-gozipp-green">3.</span>
            <span>การกระทำอันเข้าข่ายการทุจริตเพื่อรับแต้มแนะนำ จะถูกระงับบัญชีการใช้งานในระบบโดยทันทีและระงับการถอนแต้มทั้งหมด</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ReferralView;
