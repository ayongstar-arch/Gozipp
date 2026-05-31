import { Controller, Post, Get, Body, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { setAuthCookies } from './common/cookie.util';
import { DriverService } from './driver.service';
import { DriverLoginDto, DriverOnlineDto, TripActionDto, DriverRegisterDto, UpdateDriverProfileDto, UploadDriverDocumentDto, SaveDriverPreferencesDto, SubmitTrainingDto } from './dtos';
import { AuthGuard, RolesGuard } from './common/guards';
import { Roles } from './common/decorators';

@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post('login')
  async login(@Body() body: DriverLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.driverService.login(body.phoneNumber, body.pin);
    if (result.token) {
        setAuthCookies(res, result.token);
        delete result.token;
    }
    return result;
  }

  @Post('register')
  async register(@Body() body: DriverRegisterDto) {
    return this.driverService.register(body);
  }

  @Post('online')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async goOnline(@Body() body: DriverOnlineDto) {
    return this.driverService.goOnline(body);
  }

  @Get('queue-status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async getQueueStatus(@Query('driverId') driverId: string) {
    return this.driverService.getQueueStatus(driverId);
  }

  // --- ONBOARDING ENDPOINTS ---

  @Post('onboarding/profile')
  async updateProfile(@Body() body: UpdateDriverProfileDto) {
    return this.driverService.updateOnboardingProfile(body);
  }

  @Post('onboarding/document')
  async uploadDocument(@Body() body: UploadDriverDocumentDto) {
    return this.driverService.uploadOnboardingDocument(body);
  }

  @Post('onboarding/preferences')
  async savePreferences(@Body() body: SaveDriverPreferencesDto) {
    return this.driverService.saveOnboardingPreferences(body);
  }

  @Post('onboarding/training')
  async submitTraining(@Body() body: SubmitTrainingDto) {
    return this.driverService.submitTraining(body);
  }

  @Post('onboarding/submit')
  async submitOnboarding(@Body() body: { driverId: string }) {
    return this.driverService.submitOnboarding(body.driverId);
  }

  @Get('onboarding/status')
  async getStatus(@Query('driverId') driverId: string) {
    return this.driverService.getOnboardingStatus(driverId);
  }
}

@Controller('trip')
@UseGuards(AuthGuard, RolesGuard)
export class TripController {
  constructor(private readonly driverService: DriverService) {}

  @Post('accept')
  @Roles('DRIVER')
  async acceptTrip(@Body() body: TripActionDto) {
    // Idempotency is handled inside service via Redis Locks
    return this.driverService.acceptTrip(body);
  }

  @Post('reject')
  @Roles('DRIVER')
  async rejectTrip(@Body() body: TripActionDto) {
    return this.driverService.rejectTrip(body);
  }

  @Post('complete')
  @Roles('DRIVER')
  async completeTrip(@Body() body: TripActionDto) {
    return this.driverService.completeTrip(body);
  }
}
