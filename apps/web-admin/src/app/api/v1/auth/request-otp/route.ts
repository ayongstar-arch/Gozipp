import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendOtp, normalizeThaiMobileNumber } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, purpose = 'REGISTER' } = body;

    const normalized = normalizeThaiMobileNumber(phoneNumber);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์มือถือไทยให้ถูกต้อง' },
        { status: 400 }
      );
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 1. Fetch existing OTP record from Supabase
    const { data: existingOtp, error: selectError } = await supabaseAdmin
      .from('otps')
      .select('*')
      .eq('phone', normalized)
      .maybeSingle();

    if (selectError) {
      console.error('Error fetching OTP from Supabase:', selectError);
    }

    if (existingOtp) {
      const lastRequested = new Date(existingOtp.last_requested_at);
      const timeDiffSeconds = Math.floor((now.getTime() - lastRequested.getTime()) / 1000);

      // Check cooldown (60 seconds)
      if (timeDiffSeconds < 60) {
        return NextResponse.json(
          { 
            success: false, 
            error: `กรุณารอ ${60 - timeDiffSeconds} วินาทีก่อนขอรหัส OTP ใหม่` 
          },
          { status: 429 }
        );
      }

      // Check hourly limit (5 requests per hour)
      const isWithinLastHour = lastRequested >= oneHourAgo;
      const count = existingOtp.request_count || 0;
      if (isWithinLastHour && count >= 5) {
        return NextResponse.json(
          { success: false, error: 'เบอร์นี้ขอ OTP ครบโควตาชั่วโมงนี้แล้ว กรุณาลองใหม่ภายหลัง' },
          { status: 429 }
        );
      }
    }

    // 2. Generate random 6-digit OTP
    let otp = '';
    const allowTestOtp = process.env.ALLOW_TEST_OTP === 'true' || process.env.NODE_ENV !== 'production';
    
    // Test mode bypass for specific numbers or standard fallback
    if (allowTestOtp && (normalized === '0899999999' || normalized === '0812345678')) {
      otp = '123456';
    } else {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // Expires in 5 minutes

    // Calculate hourly request count
    const isWithinLastHour = existingOtp && new Date(existingOtp.last_requested_at) >= oneHourAgo;
    const requestCount = isWithinLastHour ? (existingOtp.request_count || 0) + 1 : 1;

    // 3. Upsert OTP record in Supabase
    const { error: upsertError } = await supabaseAdmin
      .from('otps')
      .upsert({
        phone: normalized,
        otp: otp,
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        last_requested_at: now.toISOString(),
        request_count: requestCount,
        attempt_count: 0
      });

    if (upsertError) {
      console.error('Failed to save OTP to Supabase:', upsertError);
      return NextResponse.json(
        { success: false, error: 'เกิดข้อผิดพลาดในการประมวลผลข้อมูลในระบบ' },
        { status: 500 }
      );
    }

    // 4. Send SMS
    const smsSent = await sendOtp(normalized, otp);
    if (!smsSent) {
      console.error('Failed to send SMS through ThaiBulkSMS API');
    }

    return NextResponse.json({
      success: true,
      message: 'OTP ถูกส่งไปยังเบอร์ของคุณแล้ว',
      expiresInSeconds: 300,
      resendAvailableInSeconds: 60,
      purpose,
    });
  } catch (error: any) {
    console.error('Error in request-otp handler:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
