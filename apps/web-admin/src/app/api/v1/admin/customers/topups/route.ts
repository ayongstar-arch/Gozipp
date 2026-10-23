import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface TopupTransaction {
  id: string;
  paymentRef: string;
  timestamp: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  amountBaht: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  paymentMethod: 'PROMPTPAY' | 'BANK_TRANSFER' | 'CREDIT_CARD';
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
  promoApplied?: string;
  bankRef?: string;
  qrPayload?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// In-memory persistent stream of recent topups for local & realtime demonstration
let topupFeed: TopupTransaction[] = [
  {
    id: 'TXN-TP-001',
    paymentRef: 'TP-20261023-8841',
    timestamp: '2026-10-23T11:45:12+07:00',
    passengerId: 'P-9921',
    passengerName: 'สมชาย พัฒนกิจ',
    passengerPhone: '089-123-4567',
    amountBaht: 100,
    basePoints: 100,
    bonusPoints: 10,
    totalPoints: 110,
    paymentMethod: 'PROMPTPAY',
    status: 'COMPLETED',
    promoApplied: 'TOPUP-BONUS (เติม 100 ฟรี 10)',
    bankRef: 'BAY-PP-994182',
    reviewedBy: 'ระบบอัตโนมัติ (FastPay Webhook)',
    reviewedAt: '2026-10-23T11:45:14+07:00',
  },
  {
    id: 'TXN-TP-002',
    paymentRef: 'TP-20261023-7729',
    timestamp: '2026-10-23T11:32:04+07:00',
    passengerId: 'P-8834',
    passengerName: 'นริศรา สุวรรณเมธา',
    passengerPhone: '081-999-8888',
    amountBaht: 50,
    basePoints: 50,
    bonusPoints: 0,
    totalPoints: 50,
    paymentMethod: 'PROMPTPAY',
    status: 'COMPLETED',
    bankRef: 'KBANK-PP-114298',
    reviewedBy: 'ระบบอัตโนมัติ (FastPay Webhook)',
    reviewedAt: '2026-10-23T11:32:05+07:00',
  },
  {
    id: 'TXN-TP-003',
    paymentRef: 'TP-20261023-6612',
    timestamp: '2026-10-23T11:15:33+07:00',
    passengerId: 'P-7712',
    passengerName: 'กิตติศักดิ์ เจริญดี',
    passengerPhone: '062-555-4321',
    amountBaht: 200,
    basePoints: 200,
    bonusPoints: 20,
    totalPoints: 220,
    paymentMethod: 'PROMPTPAY',
    status: 'COMPLETED',
    promoApplied: 'TOPUP-BONUS (เติม 200 ฟรี 20)',
    bankRef: 'SCB-PP-772910',
    reviewedBy: 'ระบบอัตโนมัติ (FastPay Webhook)',
    reviewedAt: '2026-10-23T11:15:35+07:00',
  },
  {
    id: 'TXN-TP-004',
    paymentRef: 'TP-20261023-5501',
    timestamp: '2026-10-23T10:58:20+07:00',
    passengerId: 'P-6623',
    passengerName: 'พิมพ์มาดา อมรรัตน์',
    passengerPhone: '090-111-2222',
    amountBaht: 50,
    basePoints: 50,
    bonusPoints: 0,
    totalPoints: 50,
    paymentMethod: 'PROMPTPAY',
    status: 'COMPLETED',
    bankRef: 'BBL-PP-551029',
    reviewedBy: 'ระบบอัตโนมัติ (FastPay Webhook)',
    reviewedAt: '2026-10-23T10:58:22+07:00',
  },
  {
    id: 'TXN-TP-005',
    paymentRef: 'TP-20261023-4418',
    timestamp: '2026-10-23T10:40:15+07:00',
    passengerId: 'P-5590',
    passengerName: 'ธนวัฒน์ ศรีสุข',
    passengerPhone: '088-777-6666',
    amountBaht: 100,
    basePoints: 100,
    bonusPoints: 10,
    totalPoints: 110,
    paymentMethod: 'PROMPTPAY',
    status: 'COMPLETED',
    promoApplied: 'TOPUP-BONUS (เติม 100 ฟรี 10)',
    bankRef: 'KTB-PP-339102',
    reviewedBy: 'ระบบอัตโนมัติ (FastPay Webhook)',
    reviewedAt: '2026-10-23T10:40:17+07:00',
  },
  {
    id: 'TXN-TP-006',
    paymentRef: 'TP-20261023-3399',
    timestamp: '2026-10-23T10:12:45+07:00',
    passengerId: 'P-4421',
    passengerName: 'วาสนา บุญฤทธิ์',
    passengerPhone: '086-444-3322',
    amountBaht: 30,
    basePoints: 30,
    bonusPoints: 0,
    totalPoints: 30,
    paymentMethod: 'PROMPTPAY',
    status: 'COMPLETED',
    bankRef: 'TTB-PP-128841',
    reviewedBy: 'ระบบอัตโนมัติ (FastPay Webhook)',
    reviewedAt: '2026-10-23T10:12:47+07:00',
  },
  {
    id: 'TXN-TP-007',
    paymentRef: 'TP-20261023-2210',
    timestamp: '2026-10-23T09:30:10+07:00',
    passengerId: 'P-3319',
    passengerName: 'ชวลิต วงศ์สว่าง',
    passengerPhone: '082-333-1122',
    amountBaht: 500,
    basePoints: 500,
    bonusPoints: 50,
    totalPoints: 550,
    paymentMethod: 'PROMPTPAY',
    status: 'COMPLETED',
    promoApplied: 'TOPUP-BONUS (เติม 500 ฟรี 50)',
    bankRef: 'KBANK-PP-990142',
    reviewedBy: 'ระบบอัตโนมัติ (FastPay Webhook)',
    reviewedAt: '2026-10-23T09:30:12+07:00',
  },
];

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'ALL';

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('payment_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: TopupTransaction[] = data.map((row: any) => ({
            id: row.id,
            paymentRef: row.payment_ref,
            timestamp: row.created_at,
            passengerId: row.passenger_id,
            passengerName: row.passenger_name || 'ผู้โดยสาร',
            passengerPhone: row.phone || '-',
            amountBaht: Number(row.amount_baht) || 0,
            basePoints: Number(row.amount_baht) || 0,
            bonusPoints: Number(row.bonus_points) || 0,
            totalPoints: (Number(row.amount_baht) || 0) + (Number(row.bonus_points) || 0),
            paymentMethod: row.payment_method || 'PROMPTPAY',
            status: row.status === 'CONFIRMED' ? 'COMPLETED' : row.status,
            promoApplied: row.promo_name,
            bankRef: row.bank_ref,
            reviewedBy: 'ระบบอัตโนมัติ',
            reviewedAt: row.confirmed_at,
          }));
          topupFeed = mapped;
        }
      } catch (dbErr) {
        // Fallback to topupFeed
      }
    }

    let filtered = topupFeed;

    if (query) {
      filtered = filtered.filter(
        (t) =>
          t.passengerName.toLowerCase().includes(query) ||
          t.passengerPhone.includes(query) ||
          t.paymentRef.toLowerCase().includes(query) ||
          (t.bankRef && t.bankRef.toLowerCase().includes(query))
      );
    }

    if (status !== 'ALL') {
      filtered = filtered.filter((t) => t.status === status);
    }

    const totalVolumeBaht = topupFeed.reduce((acc, curr) => acc + curr.amountBaht, 0);
    const totalPointsGiven = topupFeed.reduce((acc, curr) => acc + curr.totalPoints, 0);
    const totalBonusGiven = topupFeed.reduce((acc, curr) => acc + curr.bonusPoints, 0);

    return NextResponse.json({
      success: true,
      topups: filtered,
      summary: {
        totalTransactions: topupFeed.length,
        totalVolumeBaht,
        totalPointsGiven,
        totalBonusGiven,
        avgTopupAmount: topupFeed.length > 0 ? Math.round(totalVolumeBaht / topupFeed.length) : 0,
        lastUpdatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
