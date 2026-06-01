import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as qs from 'querystring';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

import { PassengerEntity } from '../entities/passenger.entity';
import { DriverEntity } from '../entities/driver.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { AuditLogService } from '../common/audit-log.service';
import * as crypto from 'crypto';

export interface DeviceMetadata {
    ipAddress?: string;
    deviceId?: string;
    deviceName?: string;
    os?: string;
    browser?: string;
    location?: string;
}

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

    async issueTokens(userId: string, role: string, deviceMeta: DeviceMetadata = {}) {
        const payload = { sub: userId, role };
        
        // 1. Generate Access Token (Short-lived)
        const accessToken = this.jwtService.sign(payload);

        // 2. Generate Refresh Token (Long-lived)
        const rawToken = crypto.randomBytes(40).toString('hex');
        const tokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });

        // 3. Store Refresh Token Hash
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        const savedToken = await this.refreshRepo.save({
            userId,
            userRole: role,
            tokenHash,
            expiresAt,
            ipAddress: deviceMeta.ipAddress,
            deviceId: deviceMeta.deviceId,
            deviceName: deviceMeta.deviceName,
            os: deviceMeta.os,
            browser: deviceMeta.browser,
            location: deviceMeta.location,
            lastActiveAt: new Date(),
        });

        // 4. Log Audit Event
        await this.auditLog.log({
            actorId: userId,
            actorRole: role,
            action: 'LOGIN',
            ipAddress: deviceMeta.ipAddress,
        });

        // Return token as recordId:rawToken for fast O(1) lookup during refresh
        return { accessToken, refreshToken: `${savedToken.id}:${rawToken}` };
    }

    async refreshTokens(oldRefreshToken: string, deviceMeta: DeviceMetadata = {}) {
        if (!oldRefreshToken || !oldRefreshToken.includes(':')) {
             throw new UnauthorizedException('Invalid Refresh Token Format');
        }

        const [recordId, rawToken] = oldRefreshToken.split(':');
        
        // Find the token record
        const tokenRecord = await this.refreshRepo.findOne({ where: { id: recordId } });
        if (!tokenRecord) {
            throw new UnauthorizedException('Refresh Token not found');
        }

        // Verify Hash
        const isValid = await argon2.verify(tokenRecord.tokenHash, rawToken);
        if (!isValid) {
            throw new UnauthorizedException('Invalid Refresh Token');
        }

        // Check Expiry
        if (new Date() > tokenRecord.expiresAt) {
            throw new UnauthorizedException('Refresh Token Expired');
        }

        // REUSE DETECTION (Stolen Token)
        if (tokenRecord.isRevoked) {
            await this.refreshRepo.update({ userId: tokenRecord.userId }, { isRevoked: true });
            await this.auditLog.log({
                actorId: tokenRecord.userId,
                actorRole: tokenRecord.userRole,
                action: 'TOKEN_REUSE_DETECTED',
                ipAddress: deviceMeta.ipAddress,
            });
            throw new UnauthorizedException('Security Alert: Token Reuse Detected. All sessions revoked. Please log in again.');
        }

        // Token is valid. Rotate it. Maintain the same device info if not provided
        const newRawToken = crypto.randomBytes(40).toString('hex');
        const newTokenHash = await argon2.hash(newRawToken, { type: argon2.argon2id });
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);

        const newSavedToken = await this.refreshRepo.save({
            userId: tokenRecord.userId,
            userRole: tokenRecord.userRole,
            tokenHash: newTokenHash,
            expiresAt: newExpiresAt,
            ipAddress: deviceMeta.ipAddress || tokenRecord.ipAddress,
            deviceId: deviceMeta.deviceId || tokenRecord.deviceId,
            deviceName: deviceMeta.deviceName || tokenRecord.deviceName,
            os: deviceMeta.os || tokenRecord.os,
            browser: deviceMeta.browser || tokenRecord.browser,
            location: deviceMeta.location || tokenRecord.location,
            lastActiveAt: new Date(),
        });

        // Revoke the old token and link it to the new one
        tokenRecord.isRevoked = true;
        tokenRecord.replacedByTokenHash = newTokenHash;
        await this.refreshRepo.save(tokenRecord);

        // Generate new Access Token
        const accessToken = this.jwtService.sign({ sub: tokenRecord.userId, role: tokenRecord.userRole });

        return { accessToken, refreshToken: `${newSavedToken.id}:${newRawToken}` };
    }

    // --- GOOGLE HANDLER ---
    async validateGoogleLogin(userProfile: any, userType: 'PASSENGER' | 'DRIVER', deviceMeta: DeviceMetadata = {}) {
        return this.findOrCreateSocialUser(
            'GOOGLE',
            userProfile.providerId,
            userProfile,
            userType,
            deviceMeta
        );
    }

    // --- LINE HANDLER (Manual Implementation) ---
    async handleLineCallback(code: string, userType: 'PASSENGER' | 'DRIVER', deviceMeta: DeviceMetadata = {}) {
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
                userType,
                deviceMeta
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
        userType: 'PASSENGER' | 'DRIVER',
        deviceMeta: DeviceMetadata = {}
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
            const tokens = await this.issueTokens(passenger.id, 'PASSENGER', deviceMeta);

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

            const tokens = await this.issueTokens(driver.id, 'DRIVER', deviceMeta);

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
        const hash = await argon2.hash(pin, { type: argon2.argon2id });

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

    async validatePinLogin(phoneNumber: string, pin: string, role: 'PASSENGER' | 'DRIVER', deviceMeta: DeviceMetadata = {}) {
        let user;
        if (role === 'PASSENGER') {
            user = await this.passengerRepo.findOne({ where: { phone: phoneNumber } });
        } else {
            user = await this.driverRepo.findOne({ where: { phone: phoneNumber } });
        }

        if (!user) throw new UnauthorizedException('User not found');
        if (!user.pin_hash) throw new UnauthorizedException('PIN not set. Use OTP to login.');

        let isValid = false;
        const isLegacyBcrypt = user.pin_hash.startsWith('$2b$') || user.pin_hash.startsWith('$2a$') || user.pin_hash.startsWith('$2y$');

        if (isLegacyBcrypt) {
            isValid = await bcrypt.compare(pin, user.pin_hash);
            if (isValid) {
                // Auto-upgrade to Argon2id
                const newHash = await argon2.hash(pin, { type: argon2.argon2id });
                if (role === 'PASSENGER') await this.passengerRepo.update(user.id, { pin_hash: newHash });
                else await this.driverRepo.update(user.id, { pin_hash: newHash });
            }
        } else {
            isValid = await argon2.verify(user.pin_hash, pin);
        }

        if (!isValid) {
            await this.auditLog.log({
                actorId: user.id,
                actorRole: role,
                action: 'LOGIN_FAILED_PIN',
                metadata: { phone: phoneNumber },
                ipAddress: deviceMeta.ipAddress,
            });
            throw new UnauthorizedException('Invalid PIN');
        }

        // Generate Tokens
        const tokens = await this.issueTokens(user.id, role, deviceMeta);

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

    // --- SESSION MANAGEMENT ---
    async getUserSessions(userId: string) {
        // Return active sessions (not revoked, not expired)
        const sessions = await this.refreshRepo.find({
            where: { userId, isRevoked: false },
            order: { lastActiveAt: 'DESC' }
        });

        // Filter out expired sessions manually or in query
        const now = new Date();
        const activeSessions = sessions.filter(s => s.expiresAt > now).map(s => ({
            id: s.id,
            deviceId: s.deviceId,
            deviceName: s.deviceName || 'Unknown Device',
            os: s.os || 'Unknown OS',
            browser: s.browser || 'Unknown Browser',
            location: s.location || 'Unknown Location',
            lastActiveAt: s.lastActiveAt || s.createdAt,
            ipAddress: s.ipAddress,
            isCurrent: false // We will let the frontend figure this out if they send the current device ID
        }));

        return { sessions: activeSessions };
    }

    async revokeSession(userId: string, sessionId: string) {
        const session = await this.refreshRepo.findOne({ where: { id: sessionId, userId } });
        if (!session) {
            throw new UnauthorizedException('Session not found');
        }

        session.isRevoked = true;
        await this.refreshRepo.save(session);

        await this.auditLog.log({
            actorId: userId,
            actorRole: session.userRole,
            action: 'REVOKE_SESSION',
            metadata: { sessionId }
        });

        return { success: true };
    }
}
