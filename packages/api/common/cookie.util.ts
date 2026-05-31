import { Response } from 'express';

export function setAuthCookies(res: Response, accessToken?: string, refreshToken?: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'lax' : 'lax',
        domain: isProd ? '.gozipp.app' : undefined,
        path: '/',
    } as any;

    if (accessToken) {
        res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 mins
    }
    if (refreshToken) {
        res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
    }
}

export function clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'lax' : 'lax',
        domain: isProd ? '.gozipp.app' : undefined,
        path: '/',
    } as any;
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
}
