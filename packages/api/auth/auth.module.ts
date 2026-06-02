import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { WebauthnController } from './webauthn.controller';
import { AuthService } from './auth.service';
import { WebauthnService } from './webauthn.service';
import { RiskEngineService } from './risk-engine.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { PassengerEntity } from '../entities/passenger.entity';
import { DriverEntity } from '../entities/driver.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { PasskeyCredentialEntity } from '../entities/passkey-credential.entity';
import { AuditLogService } from '../common/audit-log.service';
import { AuditLogEntity } from '../entities/audit-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([PassengerEntity, DriverEntity, RefreshTokenEntity, PasskeyCredentialEntity, AuditLogEntity]),
        PassportModule
    ],
    controllers: [AuthController, WebauthnController],
    providers: [AuthService, WebauthnService, RiskEngineService, GoogleStrategy, AuditLogService],
    exports: [AuthService, WebauthnService, RiskEngineService, AuditLogService]
})
export class AuthModule { }
