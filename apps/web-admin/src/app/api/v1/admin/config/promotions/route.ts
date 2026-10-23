import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase';

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

// Default in-memory promotions if database has not yet initialized
let cachedPromotions: PromotionRule[] = [
  {
    id: 'PROMO-NEW-PASSENGER',
    name: 'สมัครผู้โดยสารใหม่ รับแต้มฟรี',
    code: 'WELCOME50',
    type: 'NEW_PASSENGER',
    points: 50,
    description: 'ผู้โดยสารใหม่ลงทะเบียนสำเร็จ รับแต้มเข้ากระเป๋าทันที 50 แต้มเพื่อใช้เดินทาง',
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

// Resolve path to packages/shared/promotions-config.json
function getSharedConfigPath(): string {
  const candidates = [
    path.join(process.cwd(), 'packages', 'shared', 'promotions-config.json'),
    path.join(process.cwd(), '..', '..', 'packages', 'shared', 'promotions-config.json'),
    path.join(process.cwd(), '..', 'packages', 'shared', 'promotions-config.json'),
    path.resolve('c:/Users/acer/Videos/Project/Gozipp/packages/shared/promotions-config.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return candidates[0];
}

function readSharedConfig(): PromotionRule[] | null {
  try {
    const configPath = getSharedConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading shared promotions config in admin:', err);
  }
  return null;
}

function writeSharedConfig(promotions: PromotionRule[]) {
  try {
    const configPath = getSharedConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(promotions, null, 2), 'utf8');
  } catch (err) {
    console.warn('Error writing shared promotions config in admin:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'promotions_config')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value)) {
        return NextResponse.json({
          success: true,
          source: 'database',
          promotions: data.value,
        });
      }
    }

    // Try reading persistent shared monorepo config
    const sharedData = readSharedConfig();
    if (sharedData) {
      cachedPromotions = sharedData;
      return NextResponse.json({
        success: true,
        source: 'shared_file',
        promotions: sharedData,
      });
    }

    return NextResponse.json({
      success: true,
      source: 'memory',
      promotions: cachedPromotions,
    });
  } catch (error: any) {
    console.error('Error fetching promotions config:', error);
    const sharedData = readSharedConfig();
    return NextResponse.json({
      success: true,
      source: sharedData ? 'shared_file_fallback' : 'memory_fallback',
      promotions: sharedData || cachedPromotions,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { promotions } = body || {};

    if (!Array.isArray(promotions)) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลโปรโมชั่นต้องเป็นรายการ Array' },
        { status: 400 }
      );
    }

    const sanitizedPromotions: PromotionRule[] = promotions.map((p, index) => ({
      id: p.id || `PROMO-CUSTOM-${Date.now()}-${index}`,
      name: String(p.name || 'โปรโมชั่น').trim(),
      code: String(p.code || `PROMO${index + 1}`).trim().toUpperCase(),
      type: p.type || 'CUSTOM',
      points: typeof p.points === 'number' ? Math.max(0, p.points) : 0,
      description: String(p.description || '').trim(),
      isActive: Boolean(p.isActive),
      startDate: p.startDate ? String(p.startDate).trim() : undefined,
      endDate: p.endDate ? String(p.endDate).trim() : undefined,
      maxUsageLimit: typeof p.maxUsageLimit === 'number' ? p.maxUsageLimit : undefined,
      currentUsage: typeof p.currentUsage === 'number' ? p.currentUsage : 0,
      updatedAt: new Date().toISOString(),
    }));

    cachedPromotions = sanitizedPromotions;

    // 1. Immediately persist to shared monorepo file for cross-process sync
    writeSharedConfig(sanitizedPromotions);

    // 2. Persist to Supabase if configured
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('system_settings')
          .upsert(
            {
              key: 'promotions_config',
              value: sanitizedPromotions,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          );
      } catch (dbErr) {
        console.warn('Database upsert skipped for system_settings (promotions_config):', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าโปรโมชั่นสำเร็จเรียบร้อย',
      promotions: sanitizedPromotions,
    });
  } catch (error: any) {
    console.error('Error saving promotions config:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกโปรโมชั่นได้' },
      { status: 500 }
    );
  }
}
