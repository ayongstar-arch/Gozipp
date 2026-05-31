/**
 * WalletView.tsx — Production Wallet
 * Shows real balance from auth store + fetches transaction history from API
 */
'use client';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { API_BASE_URL } from '@/constants';

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
  const { user, token } = useAuthStore();
  const { setToastMessage } = useUIStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const [showTopup, setShowTopup] = useState(false);

  const balance = user?.pointsBalance ?? 0;
  const freeRides = user?.freeRidesRemaining ?? 0;

  // Fetch transaction history
  useEffect(() => {
    if (!token || !user?.id) return;
    setIsLoading(true);
    fetch(`${API_BASE_URL}/api/v1/credit/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
        else if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token, user?.id]);

  const handleTopup = async (amount: number) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/credit/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, paymentMethod: 'PROMPTPAY' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      useAuthStore.getState().updatePointsBalance(data.balance);
      setToastMessage(`✅ เติมเงินสำเร็จ +${data.pointsAdded} แต้ม`);
      setShowTopup(false);
    } catch (err: any) {
      setToastMessage('❌ ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const TOPUP_OPTIONS = [50, 100, 200, 500];

  return (
    <div className="p-6 pb-24">
      <h2 className="text-2xl font-black text-slate-800 mb-6">กระเป๋าเงิน</h2>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-green-700 rounded-[32px] p-8 text-white shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="text-xs font-bold opacity-70 mb-1 uppercase tracking-widest">แต้มคงเหลือ</div>
          <div className="text-6xl font-black mb-1">
            {balance.toLocaleString()} <span className="text-xl opacity-60">แต้ม</span>
          </div>
          {freeRides > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs font-bold mb-6">
              🎁 ฟรีไรด์เหลือ {freeRides} เที่ยว
            </div>
          )}
          {!freeRides && <div className="mb-6" />}
          <button
            id="btn-topup"
            onClick={() => setShowTopup(true)}
            className="w-full bg-white text-green-700 font-black py-4 rounded-2xl shadow-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span>➕</span> เติมเงิน / ซื้อแต้ม
          </button>
        </div>
      </div>

      {/* Topup Modal */}
      {showTopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end">
          <div className="bg-white w-full rounded-t-[32px] p-6 pb-10 shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-black text-slate-900 mb-1">เติมเงิน</h3>
            <p className="text-xs text-slate-400 mb-6">เลือกจำนวนเงินที่ต้องการเติม (ชำระผ่าน PromptPay)</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {TOPUP_OPTIONS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt)}
                  className={`py-5 rounded-2xl font-black text-lg border-2 transition-all ${
                    topupAmount === amt
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-100 bg-slate-50 text-slate-800'
                  }`}
                >
                  {amt} ฿
                  <div className="text-[9px] font-medium opacity-60 mt-1">≈ {amt} แต้ม</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTopup(false)}
                className="flex-1 py-4 rounded-2xl border border-slate-200 font-bold text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => topupAmount && handleTopup(topupAmount)}
                disabled={!topupAmount || isLoading}
                className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-black disabled:opacity-40"
              >
                {isLoading ? 'กำลังดำเนินการ...' : `ยืนยัน ${topupAmount ? topupAmount + ' ฿' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h3 className="font-black text-slate-800 mb-4">รายการธุรกรรม</h3>
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
            {transactions.map(tx => (
              <div key={tx.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                  tx.type === 'TOPUP' || tx.type === 'BONUS' ? 'bg-emerald-50' : 'bg-slate-50'
                }`}>
                  {TXN_ICONS[tx.type] || '💳'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{TXN_LABELS[tx.type] || tx.type}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(tx.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  {tx.note && <div className="text-[10px] text-slate-500 truncate">{tx.note}</div>}
                </div>
                <div className={`font-black text-sm ${tx.point_change > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {tx.point_change > 0 ? `+${tx.point_change}` : tx.point_change}
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
