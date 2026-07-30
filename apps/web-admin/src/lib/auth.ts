import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
}

export interface DeviceMetadata {
  ipAddress?: string;
  deviceId?: string;
  deviceName?: string;
  os?: string;
  browser?: string;
  location?: string;
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function issueTokens(
  userId: string,
  role: string,
  deviceMeta: DeviceMetadata = {}
): Promise<{ accessToken: string; refreshToken: string }> {
  // 1. Generate Access Token
  const accessToken = jwt.sign({ sub: userId, role }, JWT_SECRET || 'fallback-secret-for-dev-only-change-this', {
    expiresIn: '1h',
  });

  // 2. Generate Refresh Token
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashRefreshToken(rawToken);

  // 3. Store Refresh Token Hash in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

  const { data: savedToken, error } = await supabaseAdmin
    .from('refresh_tokens')
    .insert({
      user_id: userId,
      user_type: role,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: deviceMeta.ipAddress || null,
      device_id: deviceMeta.deviceId || null,
      device_name: deviceMeta.deviceName || null,
      os: deviceMeta.os || null,
      browser: deviceMeta.browser || null,
      location: deviceMeta.location || null,
      last_active_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !savedToken) {
    console.error('Failed to save refresh token to Supabase:', error);
    throw new Error('Could not issue refresh token');
  }

  // 4. Log Audit Event in database
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      user_type: role,
      action: 'LOGIN',
      ip_address: deviceMeta.ipAddress || null,
      metadata: { method: 'OTP' },
    });
  } catch (auditError) {
    console.error('Audit log failed:', auditError);
  }

  return {
    accessToken,
    refreshToken: `${savedToken.id}:${rawToken}`,
  };
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; role: string } | null> {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
  } catch (error) {
    return null;
  }
}
