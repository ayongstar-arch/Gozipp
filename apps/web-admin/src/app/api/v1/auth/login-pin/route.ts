import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeThaiMobileNumber } from '@/lib/sms';
import { issueTokens } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, pin, role = 'PASSENGER' } = body;

    const normalized = normalizeThaiMobileNumber(phoneNumber);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์มือถือไทยให้ถูกต้อง' },
        { status: 400 }
      );
    }

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN ต้องเป็นตัวเลข 6 หลัก' },
        { status: 400 }
      );
    }

    let user = null;
    let table = '';

    if (role === 'PASSENGER') {
      table = 'passengers';
    } else if (role === 'DRIVER') {
      table = 'drivers';
    } else {
      return NextResponse.json(
        { success: false, error: 'บทบาทผู้ใช้ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const { data: userData, error: selectError } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('phone', normalized)
      .maybeSingle();

    if (selectError || !userData) {
      return NextResponse.json(
        { success: false, error: 'เบอร์โทรศัพท์หรือ PIN ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    user = userData;

    if (!user.pin_hash) {
      return NextResponse.json(
        { success: false, error: 'ยังไม่ได้ตั้งค่า PIN กรุณาสมัครสมาชิกใหม่' },
        { status: 400 }
      );
    }

    // Verify PIN hash using bcryptjs
    const isValid = await bcrypt.compare(pin, user.pin_hash);
    if (!isValid) {
      // Log failed audit event
      try {
        await supabaseAdmin.from('audit_logs').insert({
          user_id: user.id,
          user_type: role,
          action: 'LOGIN_FAILED_PIN',
          ip_address: req.headers.get('x-forwarded-for') || null,
          metadata: { phone: normalized },
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      return NextResponse.json(
        { success: false, error: 'เบอร์โทรศัพท์หรือ PIN ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Issue tokens
    const tokens = await issueTokens(user.id, role, {
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      ...tokens,
      token: tokens.accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        ...(role === 'PASSENGER'
          ? {
              pointsBalance: Number(user.points_balance || 0),
              freeRidesRemaining: Number(user.free_rides_remaining || 0),
              avatarUrl: user.avatar_url || '',
              referralCode: user.referral_code || '',
            }
          : {
              plate: user.plate || '',
              nickname: user.nickname || '',
              approvalStatus: user.approval_status || 'PENDING',
              profilePicUrl: user.profile_pic_url || '',
            }),
      },
    });
  } catch (error) {
    console.error('Error in login-pin handler:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
