import { Controller, Get, Post, Body, Req, Res, UseGuards, Query, Delete, Param } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { setAuthCookies, clearAuthCookies } from '../common/cookie.util';
import { AuthGuard as ApiAuthGuard } from '../common/guards';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) { }

    // --- GOOGLE ---
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth(@Req() req) { }

    @Get('google/callback')
    @UseGuards(PassportAuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res: Response) {
        const userType = req.query.state as 'PASSENGER' | 'DRIVER';
        const deviceMeta = this.getDeviceMeta(req);
        const result = await this.authService.validateGoogleLogin(req.user, userType, deviceMeta);

        setAuthCookies(res, result.accessToken, result.refreshToken);

        // Redirect to Frontend without token in URL
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/#oauth_callback?type=${userType}`);
    }

    // --- LINE ---
    @Get('line')
    async lineAuth(@Res() res, @Query('type') type: 'PASSENGER' | 'DRIVER' = 'PASSENGER') {
        const url = this.authService.getLineLoginUrl(type);
        return res.redirect(url);
    }

    @Get('line/callback')
    async lineCallback(@Req() req: any, @Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
        if (!code) return res.redirect('/#login?error=no_code');

        const userType = (state as 'PASSENGER' | 'DRIVER') || 'PASSENGER';
        const deviceMeta = this.getDeviceMeta(req);

        try {
            const result = await this.authService.handleLineCallback(code, userType, deviceMeta);
            setAuthCookies(res, result.accessToken, result.refreshToken);

            const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/#oauth_callback?type=${userType}`);
        } catch (err) {
            console.error(err);
            return res.redirect(`${this.configService.get('FRONTEND_URL')}/#${userType.toLowerCase()}?error=line_failed`);
        }
    }

    // --- PIN AUTHENTICATION ---

    private getDeviceMeta(req: any) {
        const UAParser = require('ua-parser-js');
        const parser = new UAParser(req.headers['user-agent']);
        const result = parser.getResult();
        
        return {
            ipAddress: req.ip || req.connection?.remoteAddress,
            deviceId: req.headers['x-device-id'] as string,
            deviceName: (req.headers['x-device-name'] as string) || `${result.device.vendor || result.os.name} ${result.device.model || ''}`.trim(),
            os: `${result.os.name} ${result.os.version || ''}`.trim(),
            browser: `${result.browser.name} ${result.browser.version || ''}`.trim(),
            location: req.headers['x-device-location'] as string,
        };
    }

    @Post('check-status')
    async checkStatus(@Body() body: { phoneNumber: string, role: 'PASSENGER' | 'DRIVER' }) {
        return this.authService.checkUserStatus(body.phoneNumber, body.role);
    }

    @Post('login-pin')
    async loginWithPin(@Body() body: { phoneNumber: string, pin: string, role: 'PASSENGER' | 'DRIVER' }, @Req() req: any, @Res({ passthrough: true }) res: Response) {
        const deviceMeta = this.getDeviceMeta(req);
        const result = await this.authService.validatePinLogin(body.phoneNumber, body.pin, body.role, deviceMeta);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        
        const { accessToken, refreshToken, ...rest } = result;
        return rest;
    }

    @Post('set-pin')
    @UseGuards(ApiAuthGuard)
    async setPin(@Body() body: { pin: string, role: 'PASSENGER' | 'DRIVER' }, @Req() req: any) {
        // Both identity and role come from the verified JWT, never from client input.
        return this.authService.setPin(req.user.sub, body.pin, req.user.role);
    }

    @Post('change-pin')
    @UseGuards(ApiAuthGuard)
    @Throttle({ default: { limit: 5, ttl: 900000 } })
    async changePin(@Body() body: { currentPin: string, newPin: string }, @Req() req: any) {
        return this.authService.changePin(req.user.sub, body.currentPin, body.newPin, req.user.role);
    }

    @Post('refresh')
    async refresh(@Body() body: { refreshToken: string }, @Req() req: any, @Res({ passthrough: true }) res: Response) {
        // Typically refreshToken is read from cookies, but keeping body for backward compatibility if needed, or we can read from cookies.
        const tokenToRefresh = body?.refreshToken || req.cookies?.refresh_token;
        const deviceMeta = this.getDeviceMeta(req);
        const result = await this.authService.refreshTokens(tokenToRefresh, deviceMeta);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        const { accessToken, refreshToken, ...rest } = result;
        return rest;
    }

    @Post('logout')
    async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        await this.authService.revokeRefreshToken(req.cookies?.refresh_token);
        clearAuthCookies(res);
        return { success: true };
    }

    // --- SESSION MANAGEMENT ---
    
    @Get('sessions')
    @UseGuards(ApiAuthGuard)
    async getSessions(@Req() req: any) {
        const userId = req.user?.sub || req.user?.userId;
        return this.authService.getUserSessions(userId);
    }

    @Delete('sessions/:id')
    @UseGuards(ApiAuthGuard)
    async revokeSession(@Req() req: any, @Param('id') sessionId: string) {
        const userId = req.user?.sub || req.user?.userId;
        return this.authService.revokeSession(userId, sessionId);
    }

    @Delete('sessions')
    @UseGuards(ApiAuthGuard)
    async revokeOtherSessions(@Req() req: any) {
        const userId = req.user?.sub || req.user?.userId;
        const currentDeviceId = req.headers['x-device-id'] as string | undefined;
        return this.authService.revokeOtherSessions(userId, currentDeviceId);
    }

    // --- PIN RESET VIA TRUSTED DEVICE ---
    @Post('pin-reset/request')
    async requestPinReset(@Body() body: { phoneNumber: string, role: 'PASSENGER' | 'DRIVER' }) {
        return this.authService.createPinResetRequest(body.phoneNumber, body.role);
    }

    @Get('pin-reset/:requestId')
    async getPinReset(@Param('requestId') requestId: string) {
        return this.authService.getPinResetRequest(requestId);
    }

    @Get('pin-reset')
    @UseGuards(ApiAuthGuard)
    async listPinResets(@Req() req: any) {
        const userId = req.user?.sub || req.user?.userId;
        return this.authService.listPendingPinResetRequests(userId, req.user.role);
    }

    @Post('pin-reset/:requestId/approve')
    @UseGuards(ApiAuthGuard)
    async approvePinReset(@Req() req: any, @Param('requestId') requestId: string) {
        const userId = req.user?.sub || req.user?.userId;
        return this.authService.approvePinResetRequest(requestId, userId, req.user.role);
    }

    @Post('pin-reset/:requestId/complete')
    async completePinReset(@Param('requestId') requestId: string, @Body() body: { newPin: string }) {
        return this.authService.completePinReset(requestId, body.newPin);
    }
}
