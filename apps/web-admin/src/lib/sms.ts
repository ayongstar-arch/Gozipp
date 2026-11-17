import { Buffer } from 'buffer';

/**
 * Convert a Thai mobile number to the canonical 10-digit local form.
 * Accepts common display formats and +66/66 country-code variants.
 */
export function normalizeThaiMobileNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  let digits = value.trim().replace(/\D/g, '');
  if (digits.startsWith('66') && digits.length === 11) {
    digits = `0${digits.slice(2)}`;
  }

  return /^0[689]\d{8}$/.test(digits) ? digits : null;
}

const apiKey = process.env.THAIBULKSMS_APP_KEY || process.env.SMS_API_KEY;
const apiSecret = process.env.THAIBULKSMS_APP_SECRET || process.env.SMS_API_SECRET;
const senderName = process.env.THAIBULKSMS_SENDER_NAME || process.env.SMS_SENDER_NAME || 'OTP';
const apiUrl = process.env.SMS_API_URL || 'https://api-v2.thaibulksms.com/sms';

export async function sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
  const normalized = normalizeThaiMobileNumber(phoneNumber);
  const recipient = normalized ? `66${normalized.slice(1)}` : phoneNumber;
  const message = `รหัส OTP ของคุณคือ ${otp} ใช้ได้ภายใน 5 นาที ห้ามบอกรหัสนี้แก่ผู้อื่น`;

  const hasKeys = !!(apiKey?.trim() && apiSecret?.trim());
  const isMock = process.env.MOCK_SMS === 'true' || !hasKeys;

  if (isMock) {
    console.log(`\n--- [MOCK/DEV-MODE OTP] ---`);
    console.log(`To: ${recipient}`);
    console.log(`Message: ${message}`);
    console.log(`---------------------------\n`);
    return true;
  }

  try {
    const params = new URLSearchParams();
    params.append('msisdn', recipient);
    params.append('message', message);
    if (senderName) {
      params.append('sender', senderName);
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    const responseData = await response.json().catch(() => ({}));
    console.log(`[ThaiBulkSMS] Sent successfully to ${recipient}. Response:`, responseData);
    return true;
  } catch (error: any) {
    console.error(`[ThaiBulkSMS] Failed to send SMS to ${recipient}:`, error?.message || error);
    return false;
  }
}
