import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeThaiMobileNumber } from '@/lib/sms';
import { issueTokens } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-this';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, fullName, licensePlate, inviteCode, profilePicUrl, registrationToken } = body;

    const normalized = normalizeThaiMobileNumber(phoneNumber);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์มือถือไทยให้ถูกต้อง' },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อจริง' },
        { status: 400 }
      );
    }

    if (!registrationToken) {
      return NextResponse.json(
        { success: false, error: 'กรุณายืนยัน OTP ก่อนลงทะเบียนคนขับ' },
        { status: 400 }
      );
    }

    try {
      const claims = jwt.verify(registrationToken, JWT_SECRET) as { phone?: string; role?: string; purpose?: string };
      if (claims.phone !== normalized || claims.role !== 'DRIVER' || claims.purpose !== 'DRIVER_REGISTER') {
        return NextResponse.json(
          { success: false, error: 'โทเค็นยืนยันไม่ถูกต้อง' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'โทเค็นยืนยันหมดอายุหรือไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Check if already exists
    const { data: existingDriver } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('phone', normalized)
      .maybeSingle();

    if (existingDriver) {
      return NextResponse.json(
        { success: false, error: 'เบอร์นี้ได้ลงทะเบียนเป็นคนขับแล้ว' },
        { status: 400 }
      );
    }

    // Insert driver
    const { data: newDriver, error: insertError } = await supabaseAdmin
      .from('drivers')
      .insert({
        phone: normalized,
        name: fullName.trim(),
        plate: licensePlate || 'TBD',
        invite_code: inviteCode || null,
        profile_pic_url: profilePicUrl || null,
        approval_status: 'PENDING',
        current_status: 'OFFLINE',
        current_onboarding_step: 2 // Assuming step 2 after basic info
      })
      .select()
      .single();

    if (insertError || !newDriver) {
      console.error('Error inserting new driver:', insertError);
      return NextResponse.json(
        { success: false, error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
        { status: 500 }
      );
    }

    // Issue tokens
    const tokens = await issueTokens(newDriver.id, 'DRIVER', {
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      ...tokens,
      token: tokens.accessToken,
      driverId: newDriver.id,
      name: newDriver.name,
      onboardingStep: newDriver.current_onboarding_step
    });

  } catch (error: any) {
    console.error('Error in driver-register handler:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
