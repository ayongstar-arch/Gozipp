import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AdminAuthController } from './admin-auth.controller';
import { WebauthnController } from './webauthn.controller';
import { AuthService } from './auth.service';
import { AdminAuthService } from './admin-auth.service';
import { FirebaseService } from './firebase.service';
import { WebauthnService } from './webauthn.service';
import { RiskEngineService } from './risk-engine.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { PassengerEntity } from '../entities/passenger.entity';
import { DriverEntity } from '../entities/driver.entity';
import { AdminEntity } from '../entities/admin.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { PasskeyCredentialEntity } from '../entities/passkey-credential.entity';
import { AuditLogService } from '../common/audit-log.service';
import { AuditLogEntity } from '../entities/audit-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([PassengerEntity, DriverEntity, RefreshTokenEntity, PasskeyCredentialEntity, AuditLogEntity, AdminEntity]),
        PassportModule
    ],
    controllers: [AuthController, AdminAuthController, WebauthnController],
    providers: [AuthService, AdminAuthService, FirebaseService, WebauthnService, RiskEngineService, GoogleStrategy, AuditLogService],
    exports: [AuthService, AdminAuthService, FirebaseService, WebauthnService, RiskEngineService, AuditLogService]
})
export class AuthModule { }
