import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAccessToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing or invalid token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired access token' },
        { status: 401 }
      );
    }

    const { sub: userId, role } = decoded;

    // 2. Validate Request Body
    const body = await req.json();
    const { pin } = body;

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN ต้องเป็นตัวเลข 6 หลัก' },
        { status: 400 }
      );
    }

    // 3. Hash and Save PIN
    const pinHash = await bcrypt.hash(pin, 10);
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

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ pin_hash: pinHash })
      .eq('id', userId);

    if (updateError) {
      console.error(`Failed to update PIN for ${role}:`, updateError);
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถตั้งค่า PIN ได้ในขณะนี้' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ตั้งค่า PIN สำเร็จ',
    });
  } catch (error) {
    console.error('Error in set-pin handler:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
