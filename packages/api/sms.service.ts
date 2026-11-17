import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Buffer } from 'buffer';
import { normalizeThaiMobileNumber } from './common/phone.util';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey =
    process.env.THAIBULKSMS_APP_KEY ||
    process.env.SMS_API_KEY;
  private readonly apiSecret =
    process.env.THAIBULKSMS_APP_SECRET ||
    process.env.SMS_API_SECRET;
  private readonly senderName =
    process.env.THAIBULKSMS_SENDER_NAME ||
    process.env.SMS_SENDER_NAME ||
    'OTP';
  private readonly apiUrl = process.env.SMS_API_URL || 'https://api-v2.thaibulksms.com/sms';

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const normalized = normalizeThaiMobileNumber(phoneNumber);
    const recipient = normalized ? `66${normalized.slice(1)}` : phoneNumber;
    const message = `รหัส OTP ของคุณคือ ${otp} ใช้ได้ภายใน 5 นาที ห้ามบอกรหัสนี้แก่ผู้อื่น`;

    const hasKeys = !!(this.apiKey?.trim() && this.apiSecret?.trim());
    const isMock = process.env.MOCK_SMS === 'true' || !hasKeys;

    if (isMock) {
      this.logger.log(`[MOCK/DEV-MODE] SMS to ${recipient}: ${message}`);
      return true;
    }

    try {
      const params = new URLSearchParams();
      params.append('msisdn', recipient);
      params.append('message', message);
      if (this.senderName) {
        params.append('sender', this.senderName);
      }

      const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

      const response = await axios.post(this.apiUrl, params.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      this.logger.log(`[ThaiBulkSMS] Sent successfully to ${recipient}. Response: ${JSON.stringify(response.data)}`);
      return true;
    } catch (error: any) {
      const errorDetail = error?.response?.data
        ? JSON.stringify(error.response.data)
        : (error?.message || error);
      this.logger.error(`[ThaiBulkSMS] Failed to send SMS to ${recipient}: ${errorDetail}`);
      return false;
    }
  }
}
