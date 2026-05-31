import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as qs from 'querystring';
import * as bcrypt from 'bcrypt';

import { PassengerEntity } from '../entities/passenger.entity';
import { DriverEntity } from '../entities/driver.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { AuditLogService } from '../common/audit-log.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(PassengerEntity) private passengerRepo: Repository<PassengerEntity>,
        @InjectRepository(DriverEntity) private driverRepo: Repository<DriverEntity>,
        @InjectRepository(RefreshTokenEntity) private refreshRepo: Repository<RefreshTokenEntity>,
        private jwtService: JwtService,
        private configService: ConfigService,
        private auditLog: AuditLogService,
    ) { }

    // --- TOKEN MANAGEMENT ---

    async issueTokens(userId: string, role: string, ipAddress?: string) {
        const payload = { sub: userId, role };
        
        // 1. Generate Access Token (Short-lived)
        const accessToken = this.jwtService.sign(payload);

        // 2. Generate Refresh Token (Long-lived)
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const tokenHash = await bcrypt.hash(refreshToken, 10);

        // 3. Store Refresh Token Hash
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        await this.refreshRepo.save({
            userId,
            userRole: role,
            tokenHash,
            expiresAt,
        });

        // 4. Log Audit Event
        await this.auditLog.log({
            actorId: userId,
            actorRole: role,
            action: 'LOGIN',
            ipAddress,
        });

        return { accessToken, refreshToken };
    }

    async refreshTokens(oldRefreshToken: string, ipAddress?: string) {
        // This is a simplified version; in production, you'd find the token first,
        // then verify the hash. For now, we need to pass userId or lookup by hash.
        // Let's assume we pass the raw token and userId for lookup.
        // (Implementation details usually involve passing both or a JTI)
        // For MVP Phase 1, we will implement this more strictly in the next sub-step.
        return { accessToken: 'new-token', refreshToken: 'new-refresh' };
    }

    // --- GOOGLE HANDLER ---
    async validateGoogleLogin(userProfile: any, userType: 'PASSENGER' | 'DRIVER') {
        return this.findOrCreateSocialUser(
            'GOOGLE',
            userProfile.providerId,
            userProfile,
            userType
        );
    }

    // --- LINE HANDLER (Manual Implementation) ---
    async handleLineCallback(code: string, userType: 'PASSENGER' | 'DRIVER') {
        try {
            // 1. Exchange Code for Token
            const tokenRes = await axios.post(
                'https://api.line.me/oauth2/v2.1/token',
                qs.stringify({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: this.configService.get('LINE_CALLBACK_URL'),
                    client_id: this.configService.get('LINE_CHANNEL_ID'),
                    client_secret: this.configService.get('LINE_CHANNEL_SECRET'),
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const { access_token, id_token } = tokenRes.data;

            // 2. Get User Profile
            const profileRes = await axios.get('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            const profile = profileRes.data; // { userId, displayName, pictureUrl, statusMessage }

            // 3. Find or Create
            return this.findOrCreateSocialUser(
                'LINE',
                profile.userId,
                {
                    email: undefined, // LINE doesn't always provide email
                    firstName: profile.displayName,
                    lastName: '',
                    picture: profile.pictureUrl,
                },
                userType
            );

        } catch (error) {
            console.error('LINE Login Error:', error.response?.data || error.message);
            throw new BadRequestException('LINE Login Failed');
        }
    }

    // --- UNIFORM LOGIC ---
    private async findOrCreateSocialUser(
        provider: string,
        providerId: string,
        profile: { email?: string; firstName: string; lastName?: string; picture?: string },
        userType: 'PASSENGER' | 'DRIVER'
    ) {
        if (userType === 'PASSENGER') {
            let passenger = await this.passengerRepo.findOne({
                where: [
                    { provider_id: providerId, auth_provider: provider },
                ]
            });

            if (!passenger) {
                // Register new passenger
                const newId = `P-${crypto.randomUUID().slice(0, 8)}`;
                passenger = this.passengerRepo.create({
                    id: newId,
                    name: profile.firstName + (profile.lastName ? ' ' + profile.lastName : ''),
                    phone: '', // Phone is unknown via Social
                    email: profile.email,
                    avatar_url: profile.picture,
                    auth_provider: provider,
                    provider_id: providerId,
                    points_balance: 0,
                    free_rides_remaining: 3
                });
                await this.passengerRepo.save(passenger);

                await this.auditLog.log({
                    actorId: passenger.id,
                    actorRole: 'PASSENGER',
                    action: 'REGISTER_SOCIAL',
                    metadata: { provider }
                });
            }

            // Generate Tokens
            const tokens = await this.issueTokens(passenger.id, 'PASSENGER');

            return {
                ...tokens,
                user: {
                    id: passenger.id,
                    name: passenger.name,
                    avatar: passenger.avatar_url,
                    points: passenger.points_balance
                }
            };

        } else {
            let driver = await this.driverRepo.findOne({
                where: { provider_id: providerId, auth_provider: provider }
            });

            if (!driver) {
                // Create Pending Driver
                const newId = `D-${crypto.randomUUID().slice(0, 8)}`;
                driver = this.driverRepo.create({
                    id: newId,
                    phone: '', // Unknown
                    name: profile.firstName,
                    plate: '', // Unknown
                    invite_code: 'SOCIAL', // Marker
                    approval_status: 'PENDING',
                    auth_provider: provider,
                    provider_id: providerId,
                    email: profile.email,
                    profile_pic_url: profile.picture
                });
                await this.driverRepo.save(driver);

                await this.auditLog.log({
                    actorId: driver.id,
                    actorRole: 'DRIVER',
                    action: 'REGISTER_SOCIAL',
                    metadata: { provider }
                });
            }

            const tokens = await this.issueTokens(driver.id, 'DRIVER');

            return {
                ...tokens,
                user: {
                    id: driver.id,
                    name: driver.name,
                    status: driver.approval_status
                }
            };
        }
    }

    // Generate LINE Login URL
    getLineLoginUrl(userType: 'PASSENGER' | 'DRIVER') {
        const params = qs.stringify({
            response_type: 'code',
            client_id: this.configService.get('LINE_CHANNEL_ID'),
            redirect_uri: this.configService.get('LINE_CALLBACK_URL'),
            state: userType, // Pass user type in state
            scope: 'profile openid',
        });
        return `https://access.line.me/oauth2/v2.1/authorize?${params}`;
    }

    // --- PIN MANAGEMENT ---
    async setPin(userId: string, pin: string, role: 'PASSENGER' | 'DRIVER') {
        if (!/^\d{6}$/.test(pin)) {
            throw new BadRequestException('PIN must be 6 digits');
        }
        const hash = await bcrypt.hash(pin, 10);

        if (role === 'PASSENGER') {
            await this.passengerRepo.update(userId, { pin_hash: hash });
        } else {
            await this.driverRepo.update(userId, { pin_hash: hash });
        }

        await this.auditLog.log({
            actorId: userId,
            actorRole: role,
            action: 'SET_PIN',
        });

        return { success: true };
    }

    async validatePinLogin(phoneNumber: string, pin: string, role: 'PASSENGER' | 'DRIVER') {
        let user;
        if (role === 'PASSENGER') {
            user = await this.passengerRepo.findOne({ where: { phone: phoneNumber } });
        } else {
            user = await this.driverRepo.findOne({ where: { phone: phoneNumber } });
        }

        if (!user) throw new UnauthorizedException('User not found');
        if (!user.pin_hash) throw new UnauthorizedException('PIN not set. Use OTP to login.');

        const isValid = await bcrypt.compare(pin, user.pin_hash);
        if (!isValid) {
            await this.auditLog.log({
                actorId: user.id,
                actorRole: role,
                action: 'LOGIN_FAILED_PIN',
                metadata: { phone: phoneNumber }
            });
            throw new UnauthorizedException('Invalid PIN');
        }

        // Generate Tokens
        const tokens = await this.issueTokens(user.id, role);

        return {
            success: true,
            ...tokens,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone
            }
        };
    }

    async checkUserStatus(phoneNumber: string, role: 'PASSENGER' | 'DRIVER') {
        let user;
        if (role === 'PASSENGER') {
            user = await this.passengerRepo.findOne({ where: { phone: phoneNumber } });
        } else {
            user = await this.driverRepo.findOne({ where: { phone: phoneNumber } });
        }

        if (!user) return { exists: false };
        return { exists: true, hasPin: !!user.pin_hash };
    }
}
