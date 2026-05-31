import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(public configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: configService.get<string>('JWT_SECRET'), // Access token and refresh token share secret for simplicity in this MVP, but usually different.
      passReqToCallback: true,
    });
  }

  validate(req: any, payload: any) {
    const refreshToken = req.body.refreshToken;
    return { ...payload, refreshToken };
  }
}
