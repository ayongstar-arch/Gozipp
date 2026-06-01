import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { 
    generateRegistrationOptions, 
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { PasskeyCredentialEntity } from '../entities/passkey-credential.entity';
import { PassengerEntity } from '../entities/passenger.entity';
import { DriverEntity } from '../entities/driver.entity';
import { AuthService, DeviceMetadata } from './auth.service';
import { AuditLogService } from '../common/audit-log.service';

@Injectable()
export class WebauthnService {
    // The Relying Party ID and Name (Domain of your app)
    private rpName = 'GOZIPP';
    private rpID: string;
    private origin: string;

    constructor(
        @InjectRepository(PasskeyCredentialEntity) private passkeyRepo: Repository<PasskeyCredentialEntity>,
        @InjectRepository(PassengerEntity) private passengerRepo: Repository<PassengerEntity>,
        @InjectRepository(DriverEntity) private driverRepo: Repository<DriverEntity>,
        private configService: ConfigService,
        private authService: AuthService,
        private auditLog: AuditLogService,
    ) {
        // e.g. 'localhost' or 'gozipp.com'
        this.rpID = this.configService.get('RP_ID') || 'localhost'; 
        // e.g. 'http://localhost:5173' or 'https://app.gozipp.com'
        this.origin = this.configService.get('FRONTEND_URL') || `http://${this.rpID}:5173`;
    }

    private async getUser(userId: string, role: 'PASSENGER' | 'DRIVER') {
        if (role === 'PASSENGER') return this.passengerRepo.findOne({ where: { id: userId } });
        return this.driverRepo.findOne({ where: { id: userId } });
    }

    private async saveUserChallenge(userId: string, role: 'PASSENGER' | 'DRIVER', challenge: string) {
        if (role === 'PASSENGER') await this.passengerRepo.update(userId, { webauthn_current_challenge: challenge });
        else await this.driverRepo.update(userId, { webauthn_current_challenge: challenge });
    }

    // --- REGISTRATION ---

    async getRegistrationOptions(userId: string, role: 'PASSENGER' | 'DRIVER') {
        const user = await this.getUser(userId, role);
        if (!user) throw new BadRequestException('User not found');

        const userPasskeys = await this.passkeyRepo.find({ where: { userId } });

        const options = await generateRegistrationOptions({
            rpName: this.rpName,
            rpID: this.rpID,
            userID: new Uint8Array(Buffer.from(user.id)),
            userName: user.phone,
            userDisplayName: user.name,
            attestationType: 'none',
            excludeCredentials: userPasskeys.map(passkey => ({
                id: Buffer.from(passkey.credentialID, 'base64url'),
                type: 'public-key',
                transports: passkey.transports,
            })),
            authenticatorSelection: {
                residentKey: 'required',
                userVerification: 'preferred',
            },
        });

        // Store challenge
        await this.saveUserChallenge(userId, role, options.challenge);

        return options;
    }

    async verifyRegistration(userId: string, role: 'PASSENGER' | 'DRIVER', body: any) {
        const user = await this.getUser(userId, role);
        if (!user || !user.webauthn_current_challenge) {
            throw new BadRequestException('Challenge not found or expired');
        }

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: user.webauthn_current_challenge,
                expectedOrigin: this.origin,
                expectedRPID: this.rpID,
            });
        } catch (error: any) {
            console.error(error);
            throw new BadRequestException(error.message);
        }

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

            const newPasskey = this.passkeyRepo.create({
                userId,
                userRole: role,
                credentialID: Buffer.from(credentialID).toString('base64url'),
                credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
                counter,
                credentialDeviceType,
                credentialBackedUp,
                transports: body.response.transports,
            });

            await this.passkeyRepo.save(newPasskey);

            // Clear challenge
            await this.saveUserChallenge(userId, role, null);

            await this.auditLog.log({
                actorId: userId,
                actorRole: role,
                action: 'REGISTER_PASSKEY',
            });

            return { verified: true };
        }

        throw new BadRequestException('Verification failed');
    }

    // --- AUTHENTICATION ---

    async getAuthenticationOptions(phoneNumber: string, role: 'PASSENGER' | 'DRIVER') {
        let user;
        if (role === 'PASSENGER') user = await this.passengerRepo.findOne({ where: { phone: phoneNumber } });
        else user = await this.driverRepo.findOne({ where: { phone: phoneNumber } });

        if (!user) throw new BadRequestException('User not found');

        const userPasskeys = await this.passkeyRepo.find({ where: { userId: user.id } });
        if (!userPasskeys.length) {
            throw new BadRequestException('No passkeys registered for this user');
        }

        const options = await generateAuthenticationOptions({
            rpID: this.rpID,
            allowCredentials: userPasskeys.map(passkey => ({
                id: Buffer.from(passkey.credentialID, 'base64url'),
                type: 'public-key',
                transports: passkey.transports,
            })),
            userVerification: 'preferred',
        });

        // Store challenge
        await this.saveUserChallenge(user.id, role, options.challenge);

        return options;
    }

    async verifyAuthentication(phoneNumber: string, role: 'PASSENGER' | 'DRIVER', body: any, deviceMeta: DeviceMetadata = {}) {
        let user;
        if (role === 'PASSENGER') user = await this.passengerRepo.findOne({ where: { phone: phoneNumber } });
        else user = await this.driverRepo.findOne({ where: { phone: phoneNumber } });

        if (!user || !user.webauthn_current_challenge) {
            throw new BadRequestException('Challenge not found or expired');
        }

        const passkey = await this.passkeyRepo.findOne({ 
            where: { userId: user.id, credentialID: body.id } 
        });

        if (!passkey) {
            throw new BadRequestException('Passkey not found');
        }

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge: user.webauthn_current_challenge,
                expectedOrigin: this.origin,
                expectedRPID: this.rpID,
                authenticator: {
                    credentialID: Buffer.from(passkey.credentialID, 'base64url'),
                    credentialPublicKey: Buffer.from(passkey.credentialPublicKey, 'base64'),
                    counter: passkey.counter,
                    transports: passkey.transports,
                },
            });
        } catch (error: any) {
            console.error(error);
            throw new BadRequestException(error.message);
        }

        if (verification.verified && verification.authenticationInfo) {
            const { newCounter } = verification.authenticationInfo;

            // Update counter
            passkey.counter = newCounter;
            await this.passkeyRepo.save(passkey);

            // Clear challenge
            await this.saveUserChallenge(user.id, role, null);

            // Issue JWT
            const tokens = await this.authService.issueTokens(user.id, role, deviceMeta);

            await this.auditLog.log({
                actorId: user.id,
                actorRole: role,
                action: 'LOGIN_PASSKEY',
                ipAddress: deviceMeta.ipAddress,
            });

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

        throw new BadRequestException('Verification failed');
    }
}
