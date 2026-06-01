import { Controller, Get, Post, Body, Req, Res, UseGuards, Query } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { WebauthnService } from './webauthn.service';
import { setAuthCookies } from '../common/cookie.util';

@Controller('auth/webauthn')
export class WebauthnController {
    constructor(private readonly webauthnService: WebauthnService) {}

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

    // --- REGISTRATION ---

    @Get('generate-registration-options')
    @UseGuards(AuthGuard('jwt'))
    async generateRegistrationOptions(@Req() req: any, @Query('role') role: 'PASSENGER' | 'DRIVER' = 'PASSENGER') {
        const userId = req.user?.sub || req.user?.userId;
        return this.webauthnService.getRegistrationOptions(userId, role);
    }

    @Post('verify-registration')
    @UseGuards(AuthGuard('jwt'))
    async verifyRegistration(@Req() req: any, @Body() body: any, @Query('role') role: 'PASSENGER' | 'DRIVER' = 'PASSENGER') {
        const userId = req.user?.sub || req.user?.userId;
        return this.webauthnService.verifyRegistration(userId, role, body);
    }

    // --- AUTHENTICATION ---

    @Post('generate-authentication-options')
    async generateAuthenticationOptions(@Body() body: { phoneNumber: string, role: 'PASSENGER' | 'DRIVER' }) {
        return this.webauthnService.getAuthenticationOptions(body.phoneNumber, body.role);
    }

    @Post('verify-authentication')
    async verifyAuthentication(@Body() body: { phoneNumber: string, role: 'PASSENGER' | 'DRIVER', response: any }, @Req() req: any, @Res({ passthrough: true }) res: Response) {
        const deviceMeta = this.getDeviceMeta(req);
        const result = await this.webauthnService.verifyAuthentication(body.phoneNumber, body.role, body.response, deviceMeta);
        
        setAuthCookies(res, result.accessToken, result.refreshToken);
        
        const { accessToken, refreshToken, ...rest } = result;
        return rest;
    }
}
