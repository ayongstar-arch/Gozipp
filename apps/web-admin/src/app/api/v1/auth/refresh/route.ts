import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashRefreshToken } from '@/lib/auth';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-this';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken: oldRefreshToken } = body;

    if (!oldRefreshToken || !oldRefreshToken.includes(':')) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบ Refresh Token ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const [recordId, rawToken] = oldRefreshToken.split(':');

    // 1. Fetch token record from Supabase
    const { data: tokenRecord, error: selectError } = await supabaseAdmin
      .from('refresh_tokens')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();

    if (selectError || !tokenRecord) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Refresh Token ในระบบ กรุณาเข้าสู่ระบบใหม่' },
        { status: 401 }
      );
    }

    // 2. Token Reuse Detection
    if (tokenRecord.is_revoked) {
      // Security breach: token reuse detected. Revoke all sessions for this user.
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('user_id', tokenRecord.user_id);

      try {
        await supabaseAdmin.from('audit_logs').insert({
          user_id: tokenRecord.user_id,
          user_type: tokenRecord.user_type,
          action: 'TOKEN_REUSE_DETECTED',
          ip_address: req.headers.get('x-forwarded-for') || null,
          metadata: { recordId },
        });
      } catch (e) {
        console.error('Audit logging reuse failed:', e);
      }

      return NextResponse.json(
        { success: false, error: 'คำเตือนด้านความปลอดภัย: เซสชันถูกระงับเนื่องจากมีการใช้โทเค็นซ้ำ กรุณาเข้าสู่ระบบใหม่' },
        { status: 401 }
      );
    }

    // 3. Verify Hash (SHA-256)
    const computedHash = hashRefreshToken(rawToken);
    
    // Check if the hash starts with argon2 signature (indicating legacy NestJS token)
    if (tokenRecord.token_hash.startsWith('$argon2')) {
      return NextResponse.json(
        { success: false, error: 'หมดอายุการใช้งานเนื่องจากการอัปเกรดระบบ กรุณาเข้าสู่ระบบใหม่' },
        { status: 401 }
      );
    }

    if (tokenRecord.token_hash !== computedHash) {
      return NextResponse.json(
        { success: false, error: 'Refresh Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // 4. Check Expiry
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return NextResponse.json(
        { success: false, error: 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่' },
        { status: 401 }
      );
    }

    // 5. Rotate Token
    const newRawToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = hashRefreshToken(newRawToken);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30); // 30 days expiry

    // Save new refresh token
    const { data: newSavedToken, error: insertError } = await supabaseAdmin
      .from('refresh_tokens')
      .insert({
        user_id: tokenRecord.user_id,
        user_type: tokenRecord.user_type,
        token_hash: newTokenHash,
        expires_at: newExpiresAt.toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || tokenRecord.ip_address,
        device_id: tokenRecord.device_id,
        device_name: tokenRecord.device_name,
        os: tokenRecord.os,
        browser: tokenRecord.browser,
        location: tokenRecord.location,
        last_active_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !newSavedToken) {
      console.error('Failed to issue new refresh token:', insertError);
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถประมวลผลเซสชันใหม่ได้' },
        { status: 500 }
      );
    }

    // Revoke old refresh token and link it to the new one
    await supabaseAdmin
      .from('refresh_tokens')
      .update({
        is_revoked: true,
        replaced_by_token_hash: newTokenHash,
      })
      .eq('id', tokenRecord.id);

    // 6. Generate new Access Token
    const accessToken = jwt.sign(
      { sub: tokenRecord.user_id, role: tokenRecord.user_type },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken: `${newSavedToken.id}:${newRawToken}`,
    });
  } catch (error) {
    console.error('Error in refresh handler:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
