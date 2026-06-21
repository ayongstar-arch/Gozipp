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
  private readonly apiUrl = process.env.SMS_API_URL || 'https://api-v2.thaibulksms.com/sms';
  private readonly isProduction = process.env.NODE_ENV === 'production';

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const normalized = normalizeThaiMobileNumber(phoneNumber);
    const recipient = normalized ? `66${normalized.slice(1)}` : phoneNumber;
    const message = `รหัส OTP ของคุณคือ ${otp} ใช้ได้ภายใน 5 นาที ห้ามบอกรหัสนี้แก่ผู้อื่น`;

    if (!this.isProduction || !this.apiKey || !this.apiSecret) {
      this.logger.log(`[DEV-MODE] SMS to ${recipient}: ${message}`);
      return true;
    }

    try {
      const payload = {
        msisdn: recipient,
        message,
      };

      const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

      await axios.post(this.apiUrl, payload, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      this.logger.log(`SMS sent to ${recipient} successfully.`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send SMS: ${error?.message || error}`);
      return false;
    }
  }
}
