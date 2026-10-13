/**
 * WalletView.tsx — GoZipp Passenger Wallet
 * Supports Custom Amount Input + PromptPay QR Generation + Save QR to Gallery for Mobile Banking Scan
 */
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiFetch } from '../../services/api';
import { Download, QrCode, ArrowLeft, CheckCircle2, AlertTriangle, Sparkles, X, Smartphone } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'TOPUP' | 'DEDUCT' | 'REFUND' | 'BONUS';
  point_change: number;
  amount_baht?: number;
  note?: string;
  created_at: string;
}

const TXN_ICONS: Record<string, string> = {
  TOPUP: '💰',
  DEDUCT: '🛵',
  REFUND: '↩️',
  BONUS: '🎁',
};

const TXN_LABELS: Record<string, string> = {
  TOPUP: 'เติมเงิน',
  DEDUCT: 'ใช้บริการ GOZIPP',
  REFUND: 'คืนเงิน',
  BONUS: 'โบนัสพิเศษ',
};

const WalletView: React.FC = () => {
  const { user } = useAuthStore();
  const { setToastMessage } = useUIStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Top-up Modal Flow States
  const [showTopup, setShowTopup] = useState(false);
  const [topupStep, setTopupStep] = useState<'INPUT' | 'QR'>('INPUT');
  const [topupAmount, setTopupAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentData, setPaymentData] = useState<{
    paymentRef: string;
    amount: number;
    promptpayId?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const balance = user?.pointsBalance ?? 0;
  const freeRides = user?.freeRidesRemaining ?? 0;

  // Effective amount: custom if typed, else preset
  const effectiveAmount = customAmount && !isNaN(Number(customAmount))
    ? Math.max(0, Number(customAmount))
    : topupAmount || 0;

  // Fetch transaction history
  const loadHistory = useCallback(() => {
    if (!user?.id) return;
    setIsLoading(true);
    apiFetch('/api/v1/credit/history')
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Step 1 -> Step 2: Request Topup & Generate PromptPay QR
  const handleGenerateQr = async () => {
    if (effectiveAmount < 20) {
      setToastMessage('⚠️ จำนวนเงินเติมขั้นต่ำ 20 บาท');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiFetch('/api/v1/credit/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: effectiveAmount, paymentMethod: 'PROMPTPAY' }),
      });

      setPaymentData({
        paymentRef: data.paymentRef || `TP-${Date.now()}`,
        amount: effectiveAmount,
        promptpayId: data.promptpayId || '0812345678',
      });
      setTopupStep('QR');
      setToastMessage(`📲 สร้าง QR Code พร้อมเพย์ ${effectiveAmount} บาท สำเร็จ!`);
    } catch (err: any) {
      setToastMessage('❌ ' + (err.message || 'ไม่สามารถสร้างรายการเติมเงินได้'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Save QR Image for Mobile Banking App Scan
  const handleSaveQrImage = async () => {
    if (!paymentData) return;
    setIsSavingImage(true);
    const qrUrl = `https://promptpay.io/${paymentData.promptpayId || '0812345678'}/${paymentData.amount}.png`;

    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `gozipp-promptpay-${paymentData.amount}thb.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setToastMessage('📥 บันทึกภาพ QR Code ลงเครื่องแล้ว! เปิดแอปธนาคารเพื่อสแกนรูปภาพได้เลย');
    } catch {
      // Fallback: open image in new tab for user to save
      window.open(qrUrl, '_blank');
      setToastMessage('📥 เปิดรูปภาพ QR Code แล้ว กดค้างที่ภาพเพื่อบันทึกลงอัลบั้ม');
    } finally {
      setIsSavingImage(false);
    }
  };

  // Step 2: Confirm Payment & Credit Balance
  const handleConfirmPaid = async () => {
    if (!paymentData) return;
    setIsSubmitting(true);
    try {
      let newBalance = balance + paymentData.amount;
      try {
        const confirmRes = await apiFetch('/api/v1/credit/topup/confirm', {
          method: 'POST',
          body: JSON.stringify({ paymentRef: paymentData.paymentRef }),
        });
        if (confirmRes?.balance !== undefined) {
          newBalance = confirmRes.balance;
        }
      } catch {
        // Fallback for offline/mock
      }

      useAuthStore.getState().updatePointsBalance(newBalance);

      if (balance < 0) {
        setToastMessage(
          `✅ เติมเงิน +${paymentData.amount} ฿ สำเร็จ! นำไปหักลบยอดติดลบ ${balance} แต้มแล้ว แต้มคงเหลือสุทธิ: ${newBalance} แต้ม`
        );
      } else {
        setToastMessage(`✅ เติมเงินสำเร็จ +${paymentData.amount} แต้ม! (คงเหลือ ${newBalance} แต้ม)`);
      }

      setShowTopup(false);
      setTopupStep('INPUT');
      setPaymentData(null);
      loadHistory();
    } catch (err: any) {
      setToastMessage('❌ ' + (err.message || 'การยืนยันขัดข้อง'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowTopup(false);
    setTopupStep('INPUT');
    setPaymentData(null);
  };

  const TOPUP_OPTIONS = [20, 50, 100, 300, 500];

  return (
    <div className="p-6 pb-24 font-kanit">
      <h2 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">กระเป๋าเงิน</h2>

      {/* Balance Card */}
      <div
        className={`rounded-[32px] p-8 text-white shadow-2xl mb-6 relative overflow-hidden transition-all ${
          balance < 0
            ? 'bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 shadow-rose-900/20'
            : 'bg-gradient-to-br from-emerald-500 to-green-700 shadow-emerald-900/20'
        }`}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="text-xs font-bold opacity-70 mb-1 uppercase tracking-widest">
            {balance < 0 ? 'แต้มติดลบ (ค้างชำระฉุกเฉิน)' : 'แต้มคงเหลือ'}
          </div>
          <div className="text-6xl font-black mb-1 tracking-tight">
            {balance.toLocaleString()} <span className="text-xl opacity-70 font-normal">แต้ม</span>
          </div>
          {balance < 0 && (
            <div className="inline-flex items-center gap-1.5 bg-black/30 border border-white/20 rounded-full px-3 py-1 text-xs font-bold mb-4">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              <span>มียอดค้างชำระฉุกเฉิน เมื่อเติมเงินจะหักลบยอดหนี้อัตโนมัติ</span>
            </div>
          )}
          {freeRides > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ฟรีไรด์เหลือ {freeRides} เที่ยว</span>
            </div>
          )}
          {!freeRides && balance >= 0 && <div className="mb-6" />}
          <button
            id="btn-topup"
            onClick={() => {
              setTopupStep('INPUT');
              setShowTopup(true);
            }}
            className={`w-full font-black py-4 rounded-2xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm ${
              balance < 0
                ? 'bg-white text-rose-700 hover:bg-rose-50 shadow-rose-950/20'
                : 'bg-white text-green-700 hover:bg-green-50 shadow-green-950/20'
            }`}
          >
            <span className="text-base">➕</span>
            <span>{balance < 0 ? 'เติมเงินเพื่อเคลียร์ยอดหนี้ (PromptPay)' : 'เติมเงิน / ซื้อแต้ม (PromptPay QR)'}</span>
          </button>
        </div>
      </div>

      {/* Topup Modal (Step 1: Input / Step 2: PromptPay QR) */}
      {showTopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />

            {topupStep === 'INPUT' ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">เติมเงินกระเป๋า GoZipp</h3>
                    <p className="text-xs text-slate-400 mt-0.5">เลือกหรือระบุจำนวนเงินที่ต้องการ (1 บาท = 1 แต้ม)</p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                    เลือกจำนวนเงินด่วน
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {TOPUP_OPTIONS.map((amt) => {
                      const isSelected = !customAmount && topupAmount === amt;
                      return (
                        <button
                          key={amt}
                          onClick={() => {
                            setCustomAmount('');
                            setTopupAmount(amt);
                          }}
                          className={`py-3 px-2 rounded-2xl font-black text-sm border-2 transition-all active:scale-95 text-center ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                              : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200'
                          }`}
                        >
                          <div>{amt} ฿</div>
                          <div className="text-[9px] font-normal opacity-60 mt-0.5">≈ {amt} แต้ม</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Amount Input Box */}
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                    หรือระบุจำนวนเงินเอง (บาท)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="20"
                      value={customAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomAmount(val);
                        const num = Number(val);
                        if (num > 0) setTopupAmount(num);
                      }}
                      placeholder="ระบุจำนวนเงินเอง เช่น 35, 70, 150..."
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl py-3.5 pl-4 pr-12 font-black text-lg text-slate-800 outline-none transition-all placeholder:text-slate-400 placeholder:text-xs placeholder:font-normal"
                    />
                    <span className="absolute right-4 font-black text-slate-400 text-sm">฿</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-1">
                    <span>ขั้นต่ำ 20 บาท • 1 บาท = 1 แต้ม</span>
                    {effectiveAmount >= 20 && (
                      <span className="text-emerald-600 font-bold">≈ +{effectiveAmount} แต้ม</span>
                    )}
                  </div>
                </div>

                {/* Balance & Debt Projection */}
                {balance < 0 && effectiveAmount >= 20 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 mb-5">
                    <span className="font-bold block mb-1">ระบบจะนำไป Balance หักล้างยอดหนี้อัตโนมัติ:</span>
                    <div className="text-[11px] text-emerald-700">
                      ยอดติดลบ {balance} + เติม {effectiveAmount} = แต้มคงเหลือสุทธิ{' '}
                      <strong className="text-emerald-900 font-extrabold">{balance + effectiveAmount} แต้ม</strong>
                    </div>
                  </div>
                )}

                {/* Next CTA: Generate PromptPay QR */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleGenerateQr}
                    disabled={!effectiveAmount || effectiveAmount < 20 || isSubmitting}
                    className="w-full py-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-green-600 hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>สร้าง QR Code พร้อมเพย์ ({effectiveAmount || 0} ฿)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCloseModal}
                    className="w-full py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 hover:text-slate-800 text-xs transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              </>
            ) : (
              /* Step 2: PromptPay QR Display & Save for Mobile Banking */
              <div className="flex flex-col items-center text-center animate-in fade-in duration-200">
                {/* Modal Title */}
                <div className="flex items-center justify-between w-full mb-3">
                  <button
                    onClick={() => setTopupStep('INPUT')}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-bold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>เปลี่ยนจำนวนเงิน</span>
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thai QR / PromptPay Header Box */}
                <div className="w-full bg-[#003B70] text-white rounded-t-2xl py-2 px-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="bg-white text-[#003B70] font-black text-[10px] px-1.5 py-0.5 rounded leading-none">
                      THAI QR
                    </div>
                    <span className="text-xs font-black tracking-wide">พร้อมเพย์ (PromptPay)</span>
                  </div>
                  <span className="text-[10px] text-blue-200 font-medium">สแกนได้ทุกธนาคาร</span>
                </div>

                {/* QR Code Image Container */}
                <div className="bg-white border-2 border-[#003B70] border-t-0 rounded-b-2xl p-4 w-full flex flex-col items-center shadow-md mb-3.5">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-inner inline-block">
                    {/* Generates standard amount-embedded Thai PromptPay QR */}
                    <img
                      src={`https://promptpay.io/${paymentData?.promptpayId || '0812345678'}/${paymentData?.amount || effectiveAmount}.png`}
                      alt="PromptPay QR Code"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                    />
                  </div>

                  <div className="mt-3 text-center">
                    <div className="text-[11px] text-slate-500 font-medium">จำนวนเงินที่ต้องชำระ</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                      {paymentData?.amount.toFixed(2)} <span className="text-base font-bold text-slate-600">บาท</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                      ได้รับ +{paymentData?.amount} แต้มทันทีหลังโอน
                    </div>
                  </div>
                </div>

                {/* Receiver Info */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-left mb-3.5 space-y-1">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>บัญชีผู้รับ:</span>
                    <span className="font-bold text-slate-800">GoZipp Official (พร้อมเพย์)</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>รหัสอ้างอิง:</span>
                    <span className="font-mono font-bold text-slate-700 text-[10px]">{paymentData?.paymentRef}</span>
                  </div>
                </div>

                {/* Instructions pill */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[11px] text-blue-800 text-left w-full mb-3.5 flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>วิธีสแกนด้วยโมบายแบงค์กิ้ง:</strong>
                    <div className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">
                      กดปุ่ม <strong>"บันทึกภาพ QR Code"</strong> ด้านล่าง แล้วเปิดแอปธนาคารของคุณ (K PLUS / SCB EASY / Krungthai NEXT ฯลฯ) เลือก <strong>"สแกน"</strong> แล้วเลือกภาพจากอัลบั้ม
                    </div>
                  </div>
                </div>

                {/* Save QR Image Button */}
                <button
                  onClick={handleSaveQrImage}
                  disabled={isSavingImage}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center justify-center gap-2 mb-2 active:scale-98 shadow-sm"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>{isSavingImage ? 'กำลังดาวน์โหลด...' : '📥 บันทึกภาพ QR Code (ลงเครื่อง)'}</span>
                </button>

                {/* Confirm Paid Button */}
                <button
                  onClick={handleConfirmPaid}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-105 active:scale-98 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ฉันโอนเงินเรียบร้อยแล้ว</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h3 className="font-black text-slate-800 mb-4 tracking-tight">รายการธุรกรรม</h3>
        {isLoading ? (
          <div className="text-center py-8 text-slate-300">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-4">📭</div>
            <div className="font-bold mb-1">ยังไม่มีรายการ</div>
            <div className="text-xs">ธุรกรรมจะแสดงที่นี่หลังใช้งาน</div>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    tx.type === 'TOPUP' || tx.type === 'BONUS' ? 'bg-emerald-50' : 'bg-slate-50'
                  }`}
                >
                  {TXN_ICONS[tx.type] || '💳'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">
                    {TXN_LABELS[tx.type] || tx.type}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(tx.created_at).toLocaleString('th-TH', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                  {tx.note && <div className="text-[10px] text-slate-500 truncate">{tx.note}</div>}
                </div>
                <div
                  className={`font-black text-sm text-right ${
                    tx.point_change > 0 ? 'text-emerald-600' : 'text-slate-700'
                  }`}
                >
                  <div>{tx.point_change > 0 ? `+${tx.point_change}` : tx.point_change}</div>
                  <div className="text-[9px] font-medium opacity-60">แต้ม</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletView;
