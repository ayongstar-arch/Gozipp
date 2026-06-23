import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeThaiMobileNumber } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, role = 'PASSENGER' } = body;

    const normalized = normalizeThaiMobileNumber(phoneNumber);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์มือถือไทยให้ถูกต้อง' },
        { status: 400 }
      );
    }

    let user = null;

    if (role === 'PASSENGER') {
      const { data } = await supabaseAdmin
        .from('passengers')
        .select('pin_hash')
        .eq('phone', normalized)
        .maybeSingle();
      user = data;
    } else if (role === 'DRIVER') {
      const { data } = await supabaseAdmin
        .from('drivers')
        .select('pin_hash')
        .eq('phone', normalized)
        .maybeSingle();
      user = data;
    } else {
      return NextResponse.json(
        { success: false, error: 'บทบาทผู้ใช้ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      hasPin: !!user.pin_hash,
    });
  } catch (error) {
    console.error('Error in check-status handler:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
