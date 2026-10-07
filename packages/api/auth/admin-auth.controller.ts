import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService, ADMIN_ROLES } from './admin-auth.service';
import { setAuthCookies, clearAuthCookies } from '../common/cookie.util';
import { AuthGuard as ApiAuthGuard } from '../common/guards';
import { Roles } from '../common/decorators';

/**
 * Admin authentication — public login/MFA, guarded self-service.
 * Full sessions arrive as HttpOnly cookies; the JWT role is one of ADMIN_ROLES.
 */
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuth: AdminAuthService) {}

  private getDeviceMeta(req: any) {
    return {
      ipAddress: req.ip || req.connection?.remoteAddress,
      deviceId: req.headers['x-device-id'] as string,
      deviceName: req.headers['x-device-name'] as string,
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5/15min per IP + per-account lockout
  async login(@Body() body: { username: string, password: string }, @Req() req: any) {
    return this.adminAuth.login(body.username, body.password, this.getDeviceMeta(req));
  }

  @Post('mfa/activate')
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  async activateMfa(
    @Body() body: { setupToken: string, code: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminAuth.activateMfa(body.setupToken, body.code, this.getDeviceMeta(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    const { accessToken, refreshToken, ...rest } = result;
    return rest;
  }

  @Post('mfa/verify')
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  async verifyMfa(
    @Body() body: { challengeToken: string, code: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminAuth.verifyMfa(body.challengeToken, body.code, this.getDeviceMeta(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    const { accessToken, refreshToken, ...rest } = result;
    return rest;
  }

  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    return { success: true };
  }

  @Get('me')
  @UseGuards(ApiAuthGuard)
  @Roles(...ADMIN_ROLES)
  async me(@Req() req: any) {
    return this.adminAuth.me(req.user.sub);
  }

  @Post('change-password')
  @UseGuards(ApiAuthGuard)
  @Roles(...ADMIN_ROLES)
  async changePassword(@Body() body: { currentPassword: string, newPassword: string }, @Req() req: any) {
    return this.adminAuth.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }
}
