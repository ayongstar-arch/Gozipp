import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/v1/auth/firebase-verify — MASTER OTP entrypoint (Firebase Phone Auth).
 *
 * Thin proxy: forwards { idToken, phoneNumber, name, role, referralCode }
 * to the Nest backend `POST /api/v1/auth/firebase-verify`, which:
 *  1. verifies the Firebase ID token signature (firebase-admin),
 *  2. upserts the Passenger/Driver row in Postgres (single source of truth),
 *  3. issues Gozipp JWT + refresh token via HttpOnly cookies.
 *
 * ThaiBulkSMS OTP is deprecated fallback only (OTP_PROVIDER env).
 *
 * Env:
 *  NEST_API_URL | GOZIPP_API_URL | NEXT_PUBLIC_API_URL (default http://localhost:3001)
 */
const NEST_BASE =
  process.env.NEST_API_URL ||
  process.env.GOZIPP_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'ข้อมูลไม่ครบถ้วน กรุณาลองใหม่' },
      { status: 400 },
    );
  }

  const { idToken, phoneNumber, name, purpose, role, referralCode } = body || {};
  if (!idToken || !phoneNumber) {
    return NextResponse.json(
      { success: false, message: 'ข้อมูลไม่ครบถ้วน กรุณาลองใหม่' },
      { status: 400 },
    );
  }

  const nestRole = role === 'DRIVER' ? 'DRIVER' : 'PASSENGER';
  const url = `${NEST_BASE.replace(/\/$/, '')}/api/v1/auth/firebase-verify`;

  let nestRes: Response;
  try {
    nestRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': request.headers.get('x-device-id') || '',
        'X-Device-Name': request.headers.get('x-device-name') || '',
      },
      body: JSON.stringify({
        idToken,
        phoneNumber,
        name,
        role: nestRole,
        referralCode,
      }),
    });
  } catch (err: any) {
    // No silent fallback: a fake session without a DB row would corrupt auth state.
    console.error('firebase-verify proxy: Nest backend unreachable:', err?.message || err);
    return NextResponse.json(
      {
        success: false,
        message: 'เซิร์ฟเวอร์ยืนยันตัวตนไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
      },
      { status: 503 },
    );
  }

  const data = await nestRes.json().catch(() => ({}));
  const res = NextResponse.json(data, { status: nestRes.status });

  // Forward HttpOnly auth cookies set by Nest so the browser session works.
  const setCookie = (nestRes.headers as any).getSetCookie?.() as string[] | undefined;
  if (setCookie?.length) {
    for (const c of setCookie) res.headers.append('Set-Cookie', c);
  } else {
    const single = nestRes.headers.get('set-cookie');
    if (single) res.headers.append('Set-Cookie', single);
  }

  // Back-compat: older clients read `purpose`.
  if (data?.success && purpose && !(data as any).purpose) {
    (data as any).purpose = purpose;
  }
  return res;
}
