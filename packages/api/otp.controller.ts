import { Body, Controller, HttpCode, HttpStatus, Post, BadRequestException } from '@nestjs/common';
import { PassengerService } from './passenger.service';
import { AuthService } from './auth/auth.service';
import { PassengerRegisterDto, PassengerRequestOtpDto, PassengerVerifyOtpDto } from './dtos';

@Controller('auth')
export class OtpController {
  constructor(
    private readonly passengerService: PassengerService,
    private readonly authService: AuthService,
  ) {}

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() body: PassengerRequestOtpDto & { purpose?: 'REGISTER' | 'RESET_PIN'; role?: 'PASSENGER' | 'DRIVER' }) {
    const purpose = body.purpose || 'REGISTER';
    if (purpose === 'RESET_PIN') {
      return this.passengerService.requestPinResetOtp(body.phoneNumber);
    }
    return this.passengerService.requestOtp(body.phoneNumber, 'REGISTER');
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: PassengerVerifyOtpDto & { purpose?: 'REGISTER' | 'RESET_PIN'; name?: string; referralCode?: string; newPin?: string; role?: 'PASSENGER' | 'DRIVER' }) {
    const purpose = body.purpose || 'REGISTER';

    if (purpose === 'RESET_PIN') {
      if (!body.newPin) {
        throw new BadRequestException('กรุณากำหนด PIN ใหม่');
      }
      const result = await this.passengerService.resetPinWithOtp(body.phoneNumber, body.otp, body.newPin);
      return { ...result, purpose: 'RESET_PIN' };
    }

    // Role-aware registration
    if (body.role === 'DRIVER') {
      // 1. Verify OTP with Redis
      await this.passengerService.verifyOtp(body.phoneNumber, body.otp, 'REGISTER');

      // 2. Register/Find Driver entity
      const driver = await this.authService.registerDriver({
        phoneNumber: body.phoneNumber,
        fullName: body.name || 'พาร์ทเนอร์คนขับ',
        inviteCode: body.referralCode || 'WIN888',
      });

      const tokens = await this.authService.issueTokens(driver.id, 'DRIVER');

      return {
        success: true,
        ...tokens,
        driverId: driver.id,
        user: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
        },
        hasPin: !!driver.pin_hash,
        purpose: 'REGISTER',
      };
    }

    const result = await this.passengerService.register({
      phoneNumber: body.phoneNumber,
      otp: body.otp,
      name: body.name || 'ผู้ใช้งานใหม่',
      referralCode: body.referralCode,
    } as PassengerRegisterDto);

    return { ...result, purpose: 'REGISTER' };
  }
}
