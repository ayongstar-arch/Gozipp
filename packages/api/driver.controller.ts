import { Controller, Post, Get, Patch, Body, Param, Query, Req, UseGuards, GoneException, Optional } from '@nestjs/common';
import { DriverService } from './driver.service';
import { TaxiMatchingService } from './taxi-matching.service';
import {
  DriverLoginDto,
  DriverOnlineDto,
  TripActionDto,
  DriverRegisterDto,
  UpdateDriverProfileDto,
  UploadDriverDocumentDto,
  SaveDriverPreferencesDto,
  SubmitTrainingDto,
  RegisterVehicleDto,
  UploadVehicleDocumentDto,
  ToggleServiceDto,
  SelectActiveVehicleDto,
  DriverArrivalDto,
} from './dtos';
import { AuthGuard, RolesGuard } from './common/guards';
import { Roles } from './common/decorators';

@Controller('driver')
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    @Optional()
    private readonly taxiMatchingService?: TaxiMatchingService,
  ) {}

  @Post('login')
  async login(@Body() body: DriverLoginDto) {
    // DISABLED legacy flow: plaintext 4-digit OTP compared from Redis (+ test bypass).
    // Driver auth is now Firebase OTP (POST /auth/firebase-verify) + PIN (POST /auth/login-pin).
    throw new GoneException('ช่องทางนี้ปิดแล้ว กรุณาเข้าสู่ระบบด้วย OTP + PIN');
  }

  @Post('register')
  async register(@Body() body: DriverRegisterDto) {
    return this.driverService.register(body);
  }

  @Get('profile')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async getProfile(@Req() req: any) {
    return this.driverService.getProfile(req.user.sub);
  }

  @Get('trips')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async getMyTrips(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: string,
  ) {
    return this.driverService.getDriverTrips(
      req.user.sub,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      status,
    );
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
  async getQueueStatus(@Req() req: any, @Query('driverId') driverId?: string) {
    const targetId = driverId || req.user?.sub;
    return this.driverService.getQueueStatus(targetId);
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

  // --- Dual Mobility Vehicle Management Endpoints (Gate 2.6) ---

  @Get('vehicles')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async getVehicles(@Req() req: any) {
    return this.driverService.getDriverVehicles(req.user.sub);
  }

  @Post('vehicles')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async registerVehicle(@Req() req: any, @Body() body: RegisterVehicleDto) {
    return this.driverService.registerVehicle(req.user.sub, body);
  }

  @Get('vehicles/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async getVehicle(@Req() req: any, @Param('id') id: string) {
    return this.driverService.getVehicleById(req.user.sub, id);
  }

  @Post('vehicles/:id/documents')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async uploadVehicleDoc(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UploadVehicleDocumentDto,
  ) {
    return this.driverService.uploadVehicleDocument(req.user.sub, id, body);
  }

  @Patch('vehicles/:id/select')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async selectActiveVehicle(@Req() req: any, @Param('id') id: string) {
    return this.driverService.selectActiveVehicle(req.user.sub, id);
  }

  // --- Dual Mobility Service Profiles (Gate 2.7) ---

  @Get('services')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async getServices(@Req() req: any) {
    return this.driverService.getServiceProfiles(req.user.sub);
  }

  @Patch('services/:serviceType/toggle')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async toggleService(
    @Req() req: any,
    @Param('serviceType') serviceType: 'MOTO' | 'TAXI',
    @Body() body: ToggleServiceDto,
  ) {
    return this.driverService.toggleServiceAvailability(req.user.sub, serviceType, body);
  }

  // --- Taxi Offer Endpoints (Stage 3) ---

  @Post('taxi/offers/:offerId/accept')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async acceptTaxiOffer(@Req() req: any, @Param('offerId') offerId: string) {
    if (!this.taxiMatchingService) {
      throw new GoneException('Taxi matching engine is not available');
    }
    return this.taxiMatchingService.acceptOffer(req.user.sub, offerId);
  }

  @Post('taxi/offers/:offerId/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('DRIVER')
  async rejectTaxiOffer(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() body: { reason?: string },
  ) {
    if (!this.taxiMatchingService) {
      return { success: true };
    }
    return this.taxiMatchingService.rejectOffer(req.user.sub, offerId, body?.reason);
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

  @Post('arrive')
  @Roles('DRIVER')
  async arriveTrip(@Body() body: DriverArrivalDto & { tripId: string }, @Req() req: any) {
    const driverId = req.user?.sub || req.user?.id;
    return this.driverService.markDriverArrived(driverId, body.tripId, body);
  }

  @Post('complete')
  @Roles('DRIVER')
  async completeTrip(@Body() body: TripActionDto) {
    return this.driverService.completeTrip(body);
  }
}
