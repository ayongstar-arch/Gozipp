import { Controller, Get, Post, Body, Req, Res, UseGuards, Query } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { setAuthCookies, clearAuthCookies } from '../common/cookie.util';

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
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res: Response) {
        const userType = req.query.state as 'PASSENGER' | 'DRIVER';
        const result = await this.authService.validateGoogleLogin(req.user, userType);

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
    async lineCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
        if (!code) return res.redirect('/#login?error=no_code');

        const userType = (state as 'PASSENGER' | 'DRIVER') || 'PASSENGER';

        try {
            const result = await this.authService.handleLineCallback(code, userType);
            setAuthCookies(res, result.accessToken, result.refreshToken);

            const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/#oauth_callback?type=${userType}`);
        } catch (err) {
            console.error(err);
            return res.redirect(`${this.configService.get('FRONTEND_URL')}/#${userType.toLowerCase()}?error=line_failed`);
        }
    }

    // --- PIN AUTHENTICATION ---

    @Post('check-status')
    async checkStatus(@Body() body: { phoneNumber: string, role: 'PASSENGER' | 'DRIVER' }) {
        return this.authService.checkUserStatus(body.phoneNumber, body.role);
    }

    @Post('login-pin')
    async loginWithPin(@Body() body: { phoneNumber: string, pin: string, role: 'PASSENGER' | 'DRIVER' }, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.validatePinLogin(body.phoneNumber, body.pin, body.role);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        
        const { accessToken, refreshToken, ...rest } = result;
        return rest;
    }

    @Post('set-pin')
    @UseGuards(AuthGuard('jwt'))
    async setPin(@Body() body: { pin: string, role: 'PASSENGER' | 'DRIVER' }, @Req() req: any) {
        // Extract userId from JWT, don't trust body
        return this.authService.setPin(req.user?.sub || req.user?.userId, body.pin, body.role);
    }

    @Post('refresh')
    async refresh(@Body() body: { refreshToken: string }, @Res({ passthrough: true }) res: Response) {
        // Typically refreshToken is read from cookies, but keeping body for backward compatibility if needed, or we can read from cookies.
        const tokenToRefresh = body.refreshToken || (req => req.cookies?.refresh_token)(res.req);
        const result = await this.authService.refreshTokens(tokenToRefresh);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        const { accessToken, refreshToken, ...rest } = result;
        return rest;
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        clearAuthCookies(res);
        return { success: true };
    }
}
