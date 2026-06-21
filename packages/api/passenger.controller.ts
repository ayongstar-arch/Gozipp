import {
  Controller, Post, Get, Body, Query, Param,
  UseGuards, Req, HttpCode, HttpStatus, Logger,
  Delete, Res
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PassengerService } from './passenger.service';
import {
  RideRequestDto, PassengerRequestOtpDto,
  PassengerVerifyOtpDto, PassengerRegisterDto
} from './dtos';
import { AuthGuard, RolesGuard } from './common/guards';
import { Roles } from './common/decorators';
import { setAuthCookies } from './common/cookie.util';

// ===== PASSENGER AUTH & PROFILE =====
@Controller('passenger')
export class PassengerController {
  private readonly logger = new Logger(PassengerController.name);

  constructor(private readonly passengerService: PassengerService) { }

  // --- PUBLIC ENDPOINTS (No Auth Required) ---

  /** POST /api/v1/passenger/otp */
  @Post('otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // Max 3 OTPs per 15 minutes
  async requestOtp(@Body() body: PassengerRequestOtpDto) {
    return this.passengerService.requestOtp(body.phoneNumber, 'REGISTER');
  }

  /** POST /api/v1/passenger/request-otp (legacy alias) */
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtpLegacy(@Body() body: PassengerRequestOtpDto) {
    return this.passengerService.requestOtp(body.phoneNumber, 'REGISTER');
  }

  /** POST /api/v1/passenger/login */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: PassengerVerifyOtpDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.passengerService.login(body.phoneNumber, body.otp, {
      ipAddress: req.ip,
      deviceId: req.headers['x-device-id'],
      deviceName: req.headers['x-device-name'],
    });
  }

  /** POST /api/v1/passenger/register */
  @Post('register')
  async register(@Body() body: PassengerRegisterDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.passengerService.register(body, {
      ipAddress: req.ip,
      deviceId: req.headers['x-device-id'],
      deviceName: req.headers['x-device-name'],
    });
    if (result.accessToken) {
      setAuthCookies(res, result.accessToken, result.refreshToken);
      delete result.accessToken;
      delete result.refreshToken;
    }
    return result;
  }

  // --- PROTECTED ENDPOINTS (Auth Required) ---

  /** GET /api/v1/passenger/me */
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('PASSENGER')
  async getMe(@Req() req: any) {
    // This allows the frontend to restore session state from the HttpOnly cookie
    const profile = await this.passengerService.getProfile(req.user.sub);
    return {
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        pointsBalance: profile.pointsBalance,
        freeRidesRemaining: profile.freeRidesRemaining,
      }
    };
  }

  /** GET /api/v1/passenger/profile */
  @Get('profile')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('PASSENGER')
  async getProfile(@Req() req: any) {
    return this.passengerService.getProfile(req.user.sub);
  }

  /** GET /api/v1/passenger/trips?page=1&limit=10 */
  @Get('trips')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('PASSENGER')
  async getMyTrips(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.passengerService.getPassengerTrips(
      req.user.sub,
      parseInt(page),
      parseInt(limit),
    );
  }
}

// ===== RIDE OPERATIONS =====
@Controller('passenger/ride')
export class RideController {
  private readonly logger = new Logger(RideController.name);

  constructor(private readonly passengerService: PassengerService) { }

  /** POST /api/v1/passenger/ride/request */
  @Post('request')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('PASSENGER')
  async requestRide(@Body() body: RideRequestDto, @Req() req: any) {
    // Inject passengerId from JWT token (don't trust client-sent ID)
    body.passengerId = req.user.sub;
    return this.passengerService.requestRide(body);
  }

  /** GET /api/v1/passenger/ride/:tripId/status */
  @Get(':tripId/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('PASSENGER')
  async getRideStatus(@Param('tripId') tripId: string, @Req() req: any) {
    return this.passengerService.getRideStatus(tripId, req.user.sub);
  }

  /** POST /api/v1/passenger/ride/:tripId/cancel */
  @Post(':tripId/cancel')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('PASSENGER')
  @HttpCode(HttpStatus.OK)
  async cancelRide(@Param('tripId') tripId: string, @Req() req: any) {
    return this.passengerService.cancelRide(tripId, req.user.sub);
  }

  /** POST /api/v1/passenger/ride/:tripId/rate */
  @Post(':tripId/rate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('PASSENGER')
  @HttpCode(HttpStatus.OK)
  async rateRide(
    @Param('tripId') tripId: string,
    @Body() body: { rating: number; note?: string },
    @Req() req: any,
  ) {
    return this.passengerService.rateRide(tripId, req.user.sub, body.rating, body.note);
  }
}
