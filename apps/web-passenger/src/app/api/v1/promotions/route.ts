import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface PromotionRule {
  id: string;
  name: string;
  code: string;
  type: 'NEW_PASSENGER' | 'REFERRAL' | 'FIRST_RIDE' | 'TOPUP_BONUS' | 'CUSTOM';
  points: number;
  description: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  maxUsageLimit?: number;
  currentUsage: number;
  updatedAt: string;
}

// Default in-memory promotions matching the admin configuration
const defaultPromotions: PromotionRule[] = [
  {
    id: 'PROMO-NEW-PASSENGER',
    name: 'สมัครผู้โดยสารใหม่ รับแต้มฟรี',
    code: 'WELCOME50',
    type: 'NEW_PASSENGER',
    points: 50,
    description: 'ผู้โดยสารใหม่ลงทะเบียนสำเร็จ รับแต้มเข้ากระเป๋าทันที เพื่อใช้เดินทาง',
    isActive: true,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    maxUsageLimit: 10000,
    currentUsage: 1482,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROMO-REFERRAL',
    name: 'โบนัสชวนเพื่อนเดินทาง (Referral Bonus)',
    code: 'FRIEND50',
    type: 'REFERRAL',
    points: 50,
    description: 'รับแต้ม 50 แต้ม เมื่อเพื่อนที่คุณชวนสมัครและเดินทางเที่ยวแรกสำเร็จ',
    isActive: true,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    maxUsageLimit: 50000,
    currentUsage: 860,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROMO-FIRST-RIDE',
    name: 'ของขวัญเที่ยวแรก (First Ride Bonus)',
    code: 'FIRSTRIDE20',
    type: 'FIRST_RIDE',
    points: 20,
    description: 'เดินทางเที่ยวแรกสำเร็จ รับแต้มเงินคืน 20 แต้ม',
    isActive: true,
    startDate: '2026-10-15',
    endDate: '2026-11-30',
    maxUsageLimit: 5000,
    currentUsage: 622,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROMO-TOPUP-BONUS',
    name: 'เติมแต้มรับเพิ่มพิเศษ (Top-up Bonus)',
    code: 'TOPUP10',
    type: 'TOPUP_BONUS',
    points: 10,
    description: 'เติมเงินตั้งแต่ 100 บาทขึ้นไป รับแต้มเพิ่มพิเศษ 10 แต้ม',
    isActive: true,
    startDate: '2026-10-01',
    maxUsageLimit: 2000,
    currentUsage: 310,
    updatedAt: new Date().toISOString(),
  },
];

export async function GET(req: NextRequest) {
  try {
    const client = supabaseAdmin || supabase;
    if (client) {
      const { data, error } = await client
        .from('system_settings')
        .select('value')
        .eq('key', 'promotions_config')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value)) {
        return NextResponse.json(
          {
            success: true,
            source: 'database',
            promotions: data.value,
          },
          {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
          }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        source: 'default',
        promotions: defaultPromotions,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching passenger promotions config:', error);
    return NextResponse.json({
      success: true,
      source: 'fallback',
      promotions: defaultPromotions,
    });
  }
}
