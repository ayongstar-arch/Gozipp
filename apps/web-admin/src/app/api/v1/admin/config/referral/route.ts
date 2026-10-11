import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// In-memory fallback if database table is not yet initialized
let cachedReferralConfig = {
  referralPoints: 50,
  freeRidesRemaining: 3,
  refereeBonusPoints: 20,
  active: true,
  updatedAt: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'referral_config')
        .maybeSingle();

      if (!error && data?.value) {
        return NextResponse.json({
          success: true,
          ...data.value,
        });
      }
    }

    return NextResponse.json({
      success: true,
      ...cachedReferralConfig,
    });
  } catch (error: any) {
    console.error('Error fetching referral config:', error);
    return NextResponse.json({
      success: true,
      ...cachedReferralConfig,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { points, freeRides = 3, refereeBonus = 20, active = true } = body || {};

    const updatedConfig = {
      referralPoints: typeof points === 'number' ? Math.max(0, points) : (cachedReferralConfig.referralPoints),
      freeRidesRemaining: typeof freeRides === 'number' ? Math.max(0, freeRides) : (cachedReferralConfig.freeRidesRemaining),
      refereeBonusPoints: typeof refereeBonus === 'number' ? Math.max(0, refereeBonus) : (cachedReferralConfig.refereeBonusPoints),
      active: typeof active === 'boolean' ? active : true,
      updatedAt: new Date().toISOString(),
    };

    cachedReferralConfig = updatedConfig;

    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('system_settings')
          .upsert({
            key: 'referral_config',
            value: updatedConfig,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch (dbErr) {
        console.warn('Database upsert skipped for system_settings:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าระบบแนะนำเพื่อนสำเร็จ',
      data: updatedConfig,
    });
  } catch (error: any) {
    console.error('Error saving referral config:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกการตั้งค่าได้' },
      { status: 500 }
    );
  }
}
