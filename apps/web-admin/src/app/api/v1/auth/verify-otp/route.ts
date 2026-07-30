import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeThaiMobileNumber } from '@/lib/sms';
import { issueTokens } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-this';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, otp, purpose = 'REGISTER', name = 'ผู้ใช้งานใหม่', referralCode, newPin, role = 'PASSENGER' } = body;

    const normalized = normalizeThaiMobileNumber(phoneNumber);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์มือถือไทยให้ถูกต้อง' },
        { status: 400 }
      );
    }

    if (!otp) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัส OTP' },
        { status: 400 }
      );
    }

    // 1. Verify OTP
    const isTestMode = (otp === '123456' || otp === '1234') && 
      process.env.ALLOW_TEST_OTP === 'true' && process.env.NODE_ENV !== 'production';

    if (!isTestMode) {
      const { data: storedOtp, error: otpError } = await supabaseAdmin
        .from('otps')
        .select('*')
        .eq('phone', normalized)
        .maybeSingle();

      if (otpError || !storedOtp) {
        return NextResponse.json(
          { success: false, error: 'รหัส OTP หมดอายุหรือไม่ถูกต้อง' },
          { status: 400 }
        );
      }

      // Check expiry
      if (new Date() > new Date(storedOtp.expires_at)) {
        return NextResponse.json(
          { success: false, error: 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่' },
          { status: 400 }
        );
      }

      // Check attempts
      const currentAttempts = storedOtp.attempt_count || 0;
      if (currentAttempts >= 5) {
        await supabaseAdmin.from('otps').delete().eq('phone', normalized);
        return NextResponse.json(
          { success: false, error: 'กรอกรหัส OTP ผิดครบจำนวนครั้งแล้ว กรุณาขอรหัสใหม่' },
          { status: 400 }
        );
      }

      // Check match
      if (storedOtp.otp !== otp) {
        const nextAttempts = currentAttempts + 1;
        await supabaseAdmin
          .from('otps')
          .update({ attempt_count: nextAttempts })
          .eq('phone', normalized);

        if (nextAttempts >= 5) {
          await supabaseAdmin.from('otps').delete().eq('phone', normalized);
          return NextResponse.json(
            { success: false, error: 'กรอกรหัส OTP ผิดเกินกำหนด กรุณาขอรหัสใหม่' },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { success: false, error: 'รหัส OTP ไม่ถูกต้อง' },
          { status: 400 }
        );
      }

      // Delete OTP on success
      await supabaseAdmin.from('otps').delete().eq('phone', normalized);
    }

    // 2. Handle Purpose
    if (purpose === 'RESET_PIN') {
      if (!newPin) {
        return NextResponse.json(
          { success: false, error: 'กรุณากำหนด PIN ใหม่' },
          { status: 400 }
        );
      }
      if (!/^\d{6}$/.test(newPin)) {
        return NextResponse.json(
          { success: false, error: 'PIN ต้องเป็นตัวเลข 6 หลัก' },
          { status: 400 }
        );
      }

      // Find user (passenger)
      const { data: passenger, error: passError } = await supabaseAdmin
        .from('passengers')
        .select('*')
        .eq('phone', normalized)
        .maybeSingle();

      if (passError || !passenger) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบบัญชีผู้โดยสารนี้' },
          { status: 404 }
        );
      }

      const pinHash = await bcrypt.hash(newPin, 10);
      const { error: updateError } = await supabaseAdmin
        .from('passengers')
        .update({ pin_hash: pinHash })
        .eq('id', passenger.id);

      if (updateError) {
        console.error('Failed to update PIN hash:', updateError);
        return NextResponse.json(
          { success: false, error: 'ไม่สามารถบันทึก PIN ได้ในขณะนี้' },
          { status: 500 }
        );
      }

      const tokens = await issueTokens(passenger.id, 'PASSENGER', {
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });

      return NextResponse.json({
        success: true,
        message: 'รีเซ็ต PIN สำเร็จ',
        ...tokens,
        passengerId: passenger.id,
        name: passenger.name,
        freeRidesRemaining: passenger.free_rides_remaining,
        purpose: 'RESET_PIN'
      });
    }

    let isRegistered = true;
    let isApproved = false;
    let onboardingStep = 1;
    let hasPin = false;
    let passenger: any;

    if (role === 'DRIVER') {
      const { data: existingDriver, error: selectDriverError } = await supabaseAdmin
        .from('drivers')
        .select('*')
        .eq('phone', normalized)
        .maybeSingle();

      if (selectDriverError) console.error('Error fetching driver:', selectDriverError);

      if (!existingDriver) {
        // Return without issuing tokens, let the driver-register endpoint handle creation
        return NextResponse.json({
          success: true,
          isRegistered: false,
          registrationToken: jwt.sign(
            { phone: normalized, role: 'DRIVER', purpose: 'DRIVER_REGISTER' },
            JWT_SECRET,
            { expiresIn: '10m' }
          )
        });
      }

      isRegistered = true;
      isApproved = existingDriver.approval_status === 'APPROVED';
      onboardingStep = existingDriver.current_onboarding_step || 1;
      hasPin = !!existingDriver.pin_hash;

      const tokens = await issueTokens(existingDriver.id, 'DRIVER', {
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });

      return NextResponse.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        ...tokens,
        token: tokens.accessToken,
        user: existingDriver,
        isRegistered,
        isApproved,
        onboardingStep,
        hasPin,
        purpose: 'LOGIN'
      });
    }

    // Default purpose: REGISTER (Passenger logic)
    // Check if passenger already exists
    const { data: existingPassenger, error: selectPassError } = await supabaseAdmin
      .from('passengers')
      .select('*')
      .eq('phone', normalized)
      .maybeSingle();

    if (selectPassError) {
      console.error('Error fetching passenger:', selectPassError);
    }

    passenger = existingPassenger;

    if (existingPassenger?.pin_hash) {
      return NextResponse.json(
        { success: false, error: 'หมายเลขนี้มีบัญชีที่ตั้ง PIN แล้ว กรุณาเข้าสู่ระบบด้วย PIN' },
        { status: 400 }
      );
    }

    let inviterId: string | null = null;
    if (referralCode) {
      const { data: inviter } = await supabaseAdmin
        .from('passengers')
        .select('id')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (inviter) {
        inviterId = inviter.id;
      }
    }

    if (passenger) {
      // Update existing record
      const updatedFields: any = { name: name.trim() || passenger.name };
      if (referralCode && !passenger.referral_code) {
        updatedFields.referral_code = referralCode;
      }
      
      const { data: updatedPassenger, error: updateError } = await supabaseAdmin
        .from('passengers')
        .update(updatedFields)
        .eq('id', passenger.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating passenger:', updateError);
        return NextResponse.json(
          { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้' },
          { status: 500 }
        );
      }
      passenger = updatedPassenger;
    } else {
      // Create new passenger record
      const generatedReferral = `P-${Math.random().toString(36).toUpperCase().slice(-6)}`;
      const { data: newPassenger, error: insertError } = await supabaseAdmin
        .from('passengers')
        .insert({
          phone: normalized,
          name: name.trim(),
          points_balance: 0,
          free_rides_remaining: 3,
          referral_code: generatedReferral,
          referred_by_id: inviterId || null,
        })
        .select()
        .single();

      if (insertError || !newPassenger) {
        console.error('Error inserting new passenger:', insertError);
        return NextResponse.json(
          { success: false, error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
          { status: 500 }
        );
      }
      passenger = newPassenger;

      // Create wallet record
      await supabaseAdmin.from('wallet').insert({
        passenger_id: passenger.id,
        point_balance: 0
      });

      // Issue referral bonus points if invited
      if (inviterId) {
        try {
          // Default to 50 points
          const referralPoints = 50; 
          
          // Get inviter current balance
          const { data: inviterObj } = await supabaseAdmin
            .from('passengers')
            .select('points_balance')
            .eq('id', inviterId)
            .single();

          if (inviterObj) {
            const newBalance = Number(inviterObj.points_balance || 0) + referralPoints;
            await supabaseAdmin
              .from('passengers')
              .update({ points_balance: newBalance })
              .eq('id', inviterId);

            // Log referral txn
            await supabaseAdmin.from('wallet_transactions').insert({
              passenger_id: inviterId,
              type: 'BONUS',
              point_change: referralPoints,
              note: 'Referral Bonus',
              status: 'SUCCESS'
            });
          }
        } catch (refError) {
          console.error('Error awarding referral points:', refError);
        }
      }
    }

    const tokens = await issueTokens(passenger.id, 'PASSENGER', {
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ กรุณาตั้ง PIN เพื่อใช้งานครั้งถัดไป',
      ...tokens,
      token: tokens.accessToken,
      passengerId: passenger.id,
      name: passenger.name,
      freeRidesRemaining: passenger.free_rides_remaining,
      purpose: 'REGISTER'
    });
  } catch (error: any) {
    console.error('Error in verify-otp handler:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
