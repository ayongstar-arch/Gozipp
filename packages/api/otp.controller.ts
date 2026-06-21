import { Body, Controller, HttpCode, HttpStatus, Post, BadRequestException } from '@nestjs/common';
import { PassengerService } from './passenger.service';
import { PassengerRegisterDto, PassengerRequestOtpDto, PassengerVerifyOtpDto } from './dtos';

@Controller('auth')
export class OtpController {
  constructor(private readonly passengerService: PassengerService) {}

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() body: PassengerRequestOtpDto & { purpose?: 'REGISTER' | 'RESET_PIN' }) {
    const purpose = body.purpose || 'REGISTER';
    if (purpose === 'RESET_PIN') {
      return this.passengerService.requestPinResetOtp(body.phoneNumber);
    }
    return this.passengerService.requestOtp(body.phoneNumber, 'REGISTER');
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: PassengerVerifyOtpDto & { purpose?: 'REGISTER' | 'RESET_PIN'; name?: string; referralCode?: string; newPin?: string }) {
    const purpose = body.purpose || 'REGISTER';

    if (purpose === 'RESET_PIN') {
      if (!body.newPin) {
        throw new BadRequestException('กรุณากำหนด PIN ใหม่');
      }
      const result = await this.passengerService.resetPinWithOtp(body.phoneNumber, body.otp, body.newPin);
      return { ...result, purpose: 'RESET_PIN' };
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
