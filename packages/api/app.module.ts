import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // Security: Rate Limiting
import { join } from 'path';

import { FairQueueService } from './fair-queue.service';
import { SmsService } from './sms.service';
import { MapService } from './map.service';

import { DriverEntity } from './entities/driver.entity';
import { TripEntity } from './entities/trip.entity';
import { ChatMessageEntity } from './entities/chat.entity';
import { PassengerEntity } from './entities/passenger.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { DriverDocumentEntity } from './entities/driver-document.entity';
import { DriverPreferenceEntity } from './entities/driver-preference.entity';
import { DriverTrainingStatusEntity } from './entities/driver-training-status.entity';

import { AppGateway } from './app.gateway';

import { DriverController, TripController } from './driver.controller';
import { DriverService } from './driver.service';

import { PassengerController, RideController } from './passenger.controller';
import { PassengerService } from './passenger.service';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UploadController } from './common/upload.controller';
import { S3Service } from './common/s3.service';
import { AuditLogService } from './common/audit-log.service';

import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { PromotionService } from './promotion.service';
import { ChatService } from './chat.service';
import { AuthModule } from './auth/auth.module'; // NEW

import { LoggingInterceptor, ResilienceInterceptor } from './common/interceptors';
import { AiService } from './ai.service';

@Global()
@Module({
  imports: [
    AuthModule, // NEW
    // 1. Config Module
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Security: Rate Limiting (Prevent DDoS/Spam)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // Max 100 requests per minute per IP
    }]),

    // 3. JWT Authentication Module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is missing in environment variables!');
        }
        return {
          secret: secret,
          signOptions: { expiresIn: '1h' }, // Reduced from 7d to 1h for better security (Refresh Token flow to come)
        };
      },
      inject: [ConfigService],
    }),

    // 4. Serve React Frontend
    ServeStaticModule.forRoot({
      rootPath: join((process as any).cwd(), 'client_build'),
      exclude: ['/api/(.*)'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join((process as any).cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // 5. Database — PostgreSQL + PostGIS
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gozipp_db',
      entities: [DriverEntity, TripEntity, ChatMessageEntity, PassengerEntity, AuditLogEntity, RefreshTokenEntity, DriverDocumentEntity, DriverPreferenceEntity, DriverTrainingStatusEntity, __dirname + '/**/*.entity{.ts,.js}'],
      // CRITICAL FOR PRODUCTION: Disable synchronize to prevent data loss
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
      retryAttempts: 3,
      retryDelay: 3000,
      extra: { max: 20, idleTimeoutMillis: 30000 },
      autoLoadEntities: true,
    }),

    TypeOrmModule.forFeature([DriverEntity, TripEntity, ChatMessageEntity, PassengerEntity, AuditLogEntity, RefreshTokenEntity, DriverDocumentEntity, DriverPreferenceEntity, DriverTrainingStatusEntity]),
  ],
  controllers: [
    DriverController,
    TripController,
    PassengerController,
    RideController,
    AdminController,
    CreditController,
    UploadController // NEW
  ],
  providers: [
    AppGateway,
    FairQueueService,
    SmsService,
    MapService,
    DriverService,
    PassengerService,
    AdminService,
    AiService,
    CreditService,
    PromotionService,
    ChatService,
    AuditLogService,
    S3Service,
    // Add Throttler Guard globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResilienceInterceptor },
  ],
  exports: [JwtModule, SmsService, MapService, AiService]
})
export class AppModule { }