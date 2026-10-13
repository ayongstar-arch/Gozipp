import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// In-memory fallback if database table is not yet initialized (Default: 2 บาท/แต้ม, ฉุกเฉิน 5 บาท/แต้ม)
let cachedPricingConfig = {
  baseFarePoints: 2,
  emergencyOverdraftLimit: 5,
  updatedAt: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'pricing_config')
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
      ...cachedPricingConfig,
    });
  } catch (error: any) {
    console.error('Error fetching pricing config:', error);
    return NextResponse.json({
      success: true,
      ...cachedPricingConfig,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseFarePoints, emergencyOverdraftLimit } = body || {};

    const updatedConfig = {
      baseFarePoints: typeof baseFarePoints === 'number' ? Math.max(0, baseFarePoints) : cachedPricingConfig.baseFarePoints,
      emergencyOverdraftLimit: typeof emergencyOverdraftLimit === 'number' ? Math.max(0, emergencyOverdraftLimit) : cachedPricingConfig.emergencyOverdraftLimit,
      updatedAt: new Date().toISOString(),
    };

    cachedPricingConfig = updatedConfig;

    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('system_settings')
          .upsert({
            key: 'pricing_config',
            value: updatedConfig,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch (dbErr) {
        console.warn('Database upsert skipped for system_settings (pricing_config):', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าค่าบริการหักแต้มและวงเงินฉุกเฉินสำเร็จ',
      data: updatedConfig,
      ...updatedConfig,
    });
  } catch (error: any) {
    console.error('Error saving pricing config:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกการตั้งค่าได้' },
      { status: 500 }
    );
  }
}
