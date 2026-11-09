import { Injectable, BadRequestException, Logger, OnModuleInit, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import * as argon2 from 'argon2';
import { RideRequestDto, PassengerRegisterDto, FareEstimateDto } from './dtos';
import { CreditService } from './credit.service';
import { MapService } from './map.service';
import { SmsService } from './sms.service';
import { PassengerEntity } from './entities/passenger.entity';
import { TripEntity } from './entities/trip.entity';
import { DriverEntity } from './entities/driver.entity';
import { AuthService, DeviceMetadata } from './auth/auth.service';
import { OutboxService } from './common/outbox.service';
import { FareEstimationService } from './fare-estimation.service';
import { normalizeThaiMobileNumber } from './common/phone.util';
import { hashPin } from './common/pin-crypto';
import { randomInt } from 'crypto';

type OtpPurpose = 'REGISTER' | 'RESET_PIN';

@Injectable()
export class PassengerService implements OnModuleInit {
  private redis: Redis;
  private readonly logger = new Logger(PassengerService.name);

  constructor(
    @InjectRepository(PassengerEntity)
    private passengerRepo: Repository<PassengerEntity>,
    @InjectRepository(TripEntity)
    private tripRepo: Repository<TripEntity>,
    @InjectRepository(DriverEntity)
    private driverRepo: Repository<DriverEntity>,
    private creditService: CreditService,
    private mapService: MapService,
    private smsService: SmsService,
    private authService: AuthService,
    @Optional()
    private outboxService?: OutboxService,
    @Optional()
    private fareService?: FareEstimationService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async onModuleInit() {
    if (process.env.SEED_DEMO_DATA !== 'true') return;
    const demoUser = await this.passengerRepo.findOne({ where: { phone: '0899999999' } });
    if (!demoUser) {
      await this.passengerRepo.save({
        phone: '0899999999',
        name: 'ผู้โดยสารทดสอบ',
        points_balance: 100,
        free_rides_remaining: 3,
      });
      this.logger.log('Seeded Demo Passenger');
    }
  }

  // --- AUTHENTICATION (DEPRECATED fallback: Firebase is MASTER) ---

  /**
   * @deprecated Use Firebase Phone Auth (POST /auth/firebase-verify) instead.
   * Kept only as fallback when OTP_PROVIDER=thaibulksms.
   */

  async requestOtp(phoneNumber: string, purpose: OtpPurpose = 'REGISTER') {
    phoneNumber = this.requirePhoneNumber(phoneNumber);
    const cooldownKey = `otp_cooldown:passenger:${phoneNumber}`;
    const rateLimitKey = `otp_limit:passenger:${phoneNumber}:${new Date().toISOString().slice(0, 13)}`;
    const otpKey = `otp:passenger:${phoneNumber}`;

    if (await this.redis.exists(cooldownKey)) {
      throw new BadRequestException('กรุณารอ 60 วินาทีก่อนขอรหัส OTP ใหม่');
    }

    const requests = await this.redis.get(rateLimitKey);
    const count = requests ? parseInt(requests, 10) : 0;
    if (count >= 5) {
      throw new BadRequestException('เบอร์นี้ขอ OTP ครบโควตาชั่วโมงนี้แล้ว กรุณาลองใหม่ภายหลัง');
    }

    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const otpHash = await argon2.hash(otp, { type: argon2.argon2id });

    await this.redis
      .multi()
      .hmset(otpKey, {
        otp_hash: otpHash,
        purpose,
        attempt_count: '0',
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .expire(otpKey, 300)
      .set(cooldownKey, '1', 'EX', 60)
      .set(rateLimitKey, String(count + 1), 'EX', 3600)
      .exec();

    const sent = await this.smsService.sendOtp(phoneNumber, otp);
    if (!sent) {
      await this.redis.del(otpKey);
      throw new BadRequestException('ไม่สามารถส่ง OTP ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    }

    this.logger.log(`OTP requested for passenger ${phoneNumber}`);
    return {
      success: true,
      message: 'OTP ถูกส่งไปยังเบอร์ของคุณแล้ว',
      expiresInSeconds: 300,
      resendAvailableInSeconds: 60,
      purpose,
    };
  }

  async verifyOtp(phoneNumber: string, otp: string, purpose: OtpPurpose = 'REGISTER') {
    phoneNumber = this.requirePhoneNumber(phoneNumber);
    const key = `otp:passenger:${phoneNumber}`;
    const stored = await this.redis.hgetall(key);
    const isTestMode = otp === '123456'
      && process.env.ALLOW_TEST_OTP === 'true'
      && process.env.NODE_ENV !== 'production';

    if (!isTestMode) {
      if (!stored.otp_hash) {
        throw new BadRequestException('รหัส OTP หมดอายุหรือไม่ถูกต้อง');
      }
      if (stored.purpose && stored.purpose !== purpose) {
        throw new BadRequestException('OTP นี้ยังไม่ตรงกับขั้นตอนที่คุณใช้งาน');
      }

      const currentAttempts = parseInt(stored.attempt_count || '0', 10);
      if (currentAttempts >= 5) {
        await this.redis.del(key);
        throw new BadRequestException('กรอกรหัส OTP ผิดครบจำนวนครั้งแล้ว กรุณาขอรหัสใหม่');
      }

      const isValid = await argon2.verify(stored.otp_hash, otp);
      if (!isValid) {
        const failedAttempts = currentAttempts + 1;
        await this.redis.hset(key, 'attempt_count', String(failedAttempts));
        if (failedAttempts >= 5) {
          await this.redis.del(key);
          throw new BadRequestException('กรอกรหัส OTP ผิดเกินกำหนด กรุณาขอรหัสใหม่');
        }
        throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
      }
      // Delete after successful use
      await this.redis.del(key);
    }
    
    return { success: true };
  }

  async login(phoneNumber: string, otp: string, deviceMeta: DeviceMetadata = {}) {
    phoneNumber = this.requirePhoneNumber(phoneNumber);
    throw new BadRequestException('การเข้าสู่ระบบผู้โดยสารใช้ PIN เท่านั้น');
  }

  async register(dto: PassengerRegisterDto, deviceMeta: DeviceMetadata = {}) {
    dto.phoneNumber = this.requirePhoneNumber(dto.phoneNumber);
    dto.name = dto.name.trim();

    const existing = await this.passengerRepo.findOne({ where: { phone: dto.phoneNumber } });
    if (existing?.pin_hash) {
      throw new BadRequestException('หมายเลขนี้มีบัญชีที่ตั้ง PIN แล้ว กรุณาเข้าสู่ระบบด้วย PIN');
    }

    const allowRegistrationWithoutOtp = process.env.NODE_ENV !== 'production'
      && process.env.ALLOW_REGISTRATION_WITHOUT_OTP === 'true';

    if (!allowRegistrationWithoutOtp) {
      if (!dto.otp) throw new BadRequestException('กรุณายืนยัน OTP สำหรับการสมัครครั้งแรก');
      await this.verifyOtp(dto.phoneNumber, dto.otp, 'REGISTER');
    } else {
      this.logger.warn(`OTP bypass used for passenger registration ${dto.phoneNumber}`);
    }

    let inviterId: string | null = null;
    if (dto.referralCode) {
      const inviter = await this.passengerRepo.findOne({ where: { referral_code: dto.referralCode } });
      if (inviter) {
        inviterId = inviter.id;
      }
    }

    let passenger = existing;
    if (passenger) {
      passenger.name = dto.name || passenger.name;
      if (dto.referralCode && !passenger.referral_code) {
        passenger.referral_code = dto.referralCode;
      }
      await this.passengerRepo.save(passenger);
    } else {
      passenger = this.passengerRepo.create({
        phone: dto.phoneNumber,
        name: dto.name,
        points_balance: 0,
        free_rides_remaining: 3,
        referral_code: `P-${Math.random().toString(36).toUpperCase().slice(-6)}`,
        referred_by_id: inviterId || undefined,
      });
      await this.passengerRepo.save(passenger);

      if (inviterId) {
        const referralPoints = parseInt(await this.redis.get('config:referral_points') || '50');
        await this.creditService.addBonusPoints(inviterId, referralPoints, 'Referral Bonus');
      }
    }

    const tokens = await this.authService.issueTokens(passenger.id, 'PASSENGER', deviceMeta);

    this.logger.log(`Passenger signup completed: ${passenger.id}`);

    return {
      success: true,
      message: 'ลงทะเบียนสำเร็จ กรุณาตั้ง PIN เพื่อใช้งานครั้งถัดไป',
      ...tokens,
      passengerId: passenger.id,
      name: passenger.name,
      freeRidesRemaining: passenger.free_rides_remaining,
    };
  }

  async requestPinResetOtp(phoneNumber: string) {
    phoneNumber = this.requirePhoneNumber(phoneNumber);
    const existing = await this.passengerRepo.findOne({ where: { phone: phoneNumber } });
    if (!existing) {
      throw new BadRequestException('ไม่พบบัญชีผู้โดยสารนี้');
    }
    return this.requestOtp(phoneNumber, 'RESET_PIN');
  }

  async resetPinWithOtp(phoneNumber: string, otp: string, newPin: string, deviceMeta: DeviceMetadata = {}) {
    phoneNumber = this.requirePhoneNumber(phoneNumber);
    const existing = await this.passengerRepo.findOne({ where: { phone: phoneNumber } });
    if (!existing) {
      throw new BadRequestException('ไม่พบบัญชีผู้โดยสารนี้');
    }

    await this.verifyOtp(phoneNumber, otp, 'RESET_PIN');

    if (!/^\d{6}$/.test(newPin)) {
      throw new BadRequestException('PIN ต้องเป็นตัวเลข 6 หลัก');
    }

    const hash = await hashPin(newPin);
    await this.passengerRepo.update(existing.id, { pin_hash: hash });
    const tokens = await this.authService.issueTokens(existing.id, 'PASSENGER', deviceMeta);

    return {
      success: true,
      message: 'รีเซ็ต PIN สำเร็จ',
      ...tokens,
      passengerId: existing.id,
      name: existing.name,
      freeRidesRemaining: existing.free_rides_remaining,
    };
  }

  private requirePhoneNumber(value: string): string {
    const normalized = normalizeThaiMobileNumber(value);
    if (!normalized) {
      throw new BadRequestException('กรุณากรอกเบอร์โทรศัพท์มือถือไทยให้ถูกต้อง');
    }
    return normalized;
  }

  private getWelcomePromotionPoints(): number {
    try {
      const fs = require('fs');
      const path = require('path');
      const candidates = [
        path.resolve(process.cwd(), 'packages', 'shared', 'promotions-config.json'),
        path.resolve(process.cwd(), '..', '..', 'packages', 'shared', 'promotions-config.json'),
        path.resolve(process.cwd(), '..', 'packages', 'shared', 'promotions-config.json'),
        'c:/Users/acer/Videos/Project/Gozipp/packages/shared/promotions-config.json',
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          const parsed = JSON.parse(fs.readFileSync(c, 'utf8'));
          const promo = parsed.find((p: any) => p.type === 'NEW_PASSENGER' && p.isActive);
          if (promo && typeof promo.points === 'number') {
            return promo.points;
          }
        }
      }
    } catch {}
    return 60;
  }

  async getProfile(passengerId: string) {
    const passenger = await this.passengerRepo.findOne({ where: { id: passengerId } });
    if (!passenger) throw new NotFoundException('ไม่พบข้อมูลผู้โดยสาร');

    let points = Number(passenger.points_balance) || 0;
    const totalRides = Number(passenger.total_rides) || 0;

    // Retroactive Welcome Credit Catch-up:
    // If passenger is new (0 rides) and points balance is 0, award welcome promotion points
    if (points <= 0 && totalRides === 0) {
      const welcomePts = this.getWelcomePromotionPoints();
      if (welcomePts > 0) {
        points = welcomePts;
        try {
          await this.passengerRepo.update(passenger.id, { points_balance: welcomePts });
        } catch (e: any) {
          this.logger.warn(`Failed to persist welcome points catchup: ${e?.message}`);
        }
      }
    }

    return {
      id: passenger.id,
      name: passenger.name,
      phone: passenger.phone,
      email: passenger.email,
      pointsBalance: points,
      totalRides: passenger.total_rides,
      freeRidesRemaining: passenger.free_rides_remaining,
      avatarUrl: passenger.avatar_url,
      referralCode: passenger.referral_code,
    };
  }

  // --- RIDE HISTORY (Paginated) ---

  async getPassengerTrips(passengerId: string, page = 1, limit = 10) {
    const [trips, total] = await this.tripRepo.findAndCount({
      where: { passenger_id: passengerId },
      order: { requested_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const driverIds = Array.from(new Set(trips.map(t => t.driver_id).filter(Boolean)));
    const drivers = driverIds.length > 0
      ? await this.driverRepo.find({ where: { id: In(driverIds) } })
      : [];
    const driverMap = new Map(drivers.map(d => [d.id, d]));

    return {
      trips: trips.map(t => {
        const d = t.driver_id ? driverMap.get(t.driver_id) : null;
        return {
          id: t.id,
          status: t.status,
          fare: Number(t.fare) || 0,
          credits_used: Number(t.credits_used) || 0,
          distance_km: Number(t.distance_km) || 0,
          pickup_address: t.pickup_address,
          dest_address: t.dest_address,
          driver_name: d?.name || 'พาร์ทเนอร์คนขับ',
          driver_plate: d?.plate || '',
          driver_rating: d?.rating ? Number(d.rating) : 5.0,
          requested_at: t.requested_at,
          completed_at: t.completed_at,
          passenger_rating: t.passenger_rating,
        };
      }),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getPricingConfig() {
    const baseFare = await this.redis.get('config:trip_base_fare_points');
    const overdraftLimit = await this.redis.get('config:emergency_overdraft_limit');
    return {
      baseFarePoints: baseFare ? parseInt(baseFare, 10) : 2,
      emergencyOverdraftLimit: overdraftLimit ? parseInt(overdraftLimit, 10) : 5,
    };
  }

  // --- RIDE OPERATIONS ---

  async requestRide(dto: RideRequestDto) {
    try {
      // 0. Idempotency Check (Stage 4)
      if (dto.idempotencyKey) {
        try {
          const existing = await this.tripRepo.findOne({ where: { idempotency_key: dto.idempotencyKey } });
          if (existing) {
            this.logger.log(`Idempotent request returning existing trip ${existing.id}`);
            return {
              tripId: existing.id,
              status: existing.status,
              fare: Number(existing.fare),
              isFreeRide: Number(existing.fare) === 0,
              distance: `${existing.distance_km || 0} กม.`,
              eta: `${existing.duration_mins || 5} นาที`,
              scheduledAt: existing.scheduled_at ? existing.scheduled_at.toISOString() : undefined,
              preferredDriverId: existing.preferred_driver_id || undefined,
              isDuplicate: true,
              correlationId: `corr-${existing.id}`,
            };
          }
        } catch (e: any) {
          this.logger.debug(`Idempotency check warning: ${e?.message || e}`);
        }
      }

      // 1. Resolve & normalize passenger entity
      let passengerId = dto.passengerId;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(passengerId || '');

      let passenger: PassengerEntity | null = null;
      if (isUUID) {
        try {
          passenger = await this.passengerRepo.findOne({ where: { id: passengerId } });
        } catch (e: any) {
          this.logger.warn(`Failed finding passenger by UUID: ${e?.message || e}`);
        }
      } else if (passengerId) {
        try {
          passenger = await this.passengerRepo.findOne({
            where: [{ phone: passengerId }, { provider_id: passengerId }],
          });
          if (passenger) passengerId = passenger.id;
        } catch (e: any) {
          this.logger.warn(`Failed finding passenger by phone/provider_id: ${e?.message || e}`);
        }
      }

      // If still not found, check or provision passenger
      if (!passenger) {
        try {
          const newId = isUUID && passengerId ? passengerId : crypto.randomUUID();
          passenger = await this.passengerRepo.save({
            id: newId,
            name: 'ผู้โดยสาร',
            points_balance: 60,
            free_rides_remaining: 3,
          });
          passengerId = passenger.id;
        } catch (e: any) {
          this.logger.warn(`Failed auto-provisioning passenger: ${e?.message || e}`);
        }
      }

      dto.passengerId = passengerId || (passenger ? passenger.id : crypto.randomUUID());

      // 2. Map route
      const route = await this.mapService.getRoutingInfo(
        dto.pickupLat, dto.pickupLng,
        dto.destLat, dto.destLng
      );

      // 3. Pricing & Balance
      const pricing = await this.getPricingConfig();
      const pointsRequired = pricing.baseFarePoints;

      let balance = 0;
      try {
        balance = await this.creditService.getBalance(dto.passengerId);
      } catch (err: any) {
        this.logger.warn(`Could not fetch balance from credit service: ${err?.message || err}`);
        balance = passenger ? Number(passenger.points_balance) : 60;
      }

      const hasFreeRides = (passenger?.free_rides_remaining ?? 0) > 0;
      const canAfford = hasFreeRides || balance >= pointsRequired;

      if (!canAfford) {
        if (dto.isEmergency) {
          if (balance < -pricing.emergencyOverdraftLimit) {
            throw new BadRequestException(`ยอดแต้มติดลบฉุกเฉินสะสมเกินกำหนด (-${pricing.emergencyOverdraftLimit} แต้ม) กรุณาเติมแต้มก่อนใช้งานต่อ`);
          }
        } else {
          throw new BadRequestException('แต้มไม่เพียงพอ กรุณาเติมแต้ม หรือเลือกใช้งานฉุกเฉิน');
        }
      }

      // 4. Determine if advance ride scheduling
      let tripStatus = 'SEARCHING';
      let scheduledDate: Date | null = null;
      if (dto.scheduledAt) {
        const parsed = new Date(dto.scheduledAt);
        if (isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
          throw new BadRequestException('เวลานัดหมายล่วงหน้าต้องเป็นเวลาในอนาคต');
        }
        scheduledDate = parsed;
        tripStatus = 'SCHEDULED';
      }

      const tripId = crypto.randomUUID();
      const serviceType = (dto.serviceType || 'MOTO').toUpperCase();

      // Feature Flag Check: Staging isolation — public TAXI booking blocked if disabled
      if (serviceType === 'TAXI') {
        const publicBooking = process.env.TAXI_PUBLIC_BOOKING_ENABLED === 'true';
        if (!publicBooking) {
          throw new BadRequestException('บริการ GOZIPP TAXI ยังไม่เปิดให้บริการสาธารณะในขณะนี้ (อยู่ระหว่างการทดสอบระบบ)');
        }
      }

      const tripFare = serviceType === 'TAXI'
        ? (this.fareService ? this.fareService.estimateFare({ pickupLat: dto.pickupLat, pickupLng: dto.pickupLng, destLat: dto.destLat, destLng: dto.destLng, serviceType: 'TAXI', distanceKm: route.distanceKm }).estimatedFare : 60)
        : (hasFreeRides ? 0 : pointsRequired);

      const correlationId = `corr-${tripId}-${Date.now()}`;

      // 5. Save to DB with resilience
      try {
        await this.tripRepo.save({
          id: tripId,
          passenger_id: dto.passengerId,
          service_type: serviceType,
          pickup_lat: dto.pickupLat,
          pickup_lng: dto.pickupLng,
          pickup_address: dto.pickupAddress,
          dest_lat: dto.destLat,
          dest_lng: dto.destLng,
          dest_address: dto.destAddress,
          distance_km: route.distanceKm,
          fare: tripFare,
          credits_used: 0,
          status: tripStatus,
          scheduled_at: scheduledDate || undefined,
          preferred_driver_id: dto.preferredDriverId || undefined,
          idempotency_key: dto.idempotencyKey || undefined,
          arrival_verified: false,
          arrival_verification_status: 'UNVERIFIED',
        });
      } catch (dbErr: any) {
        this.logger.warn(`tripRepo.save encountered error (${dbErr.message}), attempting fallback insert`);
        try {
          await this.tripRepo.query(
            `INSERT INTO trips (id, passenger_id, service_type, pickup_address, dest_address, distance_km, fare, credits_used, status, scheduled_at, preferred_driver_id, idempotency_key, arrival_verified, arrival_verification_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [tripId, dto.passengerId, serviceType, dto.pickupAddress, dto.destAddress, route.distanceKm, tripFare, 0, tripStatus, scheduledDate || null, dto.preferredDriverId || null, dto.idempotencyKey || null, false, 'UNVERIFIED']
          );
        } catch (fbErr: any) {
          this.logger.error(`Fallback trip insert failed: ${fbErr.message}`);
        }
      }

      // Record in Outbox table (Stage 4 Transactional Reliability)
      if (this.outboxService) {
        try {
          await this.outboxService.recordEvent(
            'TRIP',
            tripId,
            tripStatus === 'SEARCHING' ? 'RIDE_REQUESTED' : 'RIDE_SCHEDULED',
            {
              tripId,
              serviceType,
              passengerId: dto.passengerId,
              pickupLat: dto.pickupLat,
              pickupLng: dto.pickupLng,
              destLat: dto.destLat,
              destLng: dto.destLng,
              fare: tripFare,
              scheduledAt: scheduledDate ? scheduledDate.toISOString() : null,
              preferredDriverId: dto.preferredDriverId || null,
            },
            correlationId
          );
        } catch (outboxErr: any) {
          this.logger.error(`Failed recording outbox event for trip ${tripId}: ${outboxErr.message}`);
        }
      }

      // 6. Cache in Redis for real-time operations
      try {
        await this.redis.hset(`trip:${tripId}`, {
          id: tripId,
          passengerId: dto.passengerId,
          serviceType: serviceType,
          status: tripStatus,
          fare: tripFare,
          pickupLat: dto.pickupLat,
          pickupLng: dto.pickupLng,
          destLat: dto.destLat,
          destLng: dto.destLng,
          requestedAt: Date.now(),
          distanceKm: route.distanceKm,
          isEmergency: dto.isEmergency ? 'true' : 'false',
          scheduledAt: scheduledDate ? scheduledDate.toISOString() : '',
          preferredDriverId: dto.preferredDriverId || '',
          correlationId,
        } as any);

        if (tripStatus === 'SEARCHING') {
          await this.redis.publish('ride:requested', JSON.stringify(tripId));
          this.setupTimeout(tripId);
        } else {
          await this.redis.publish('ride:scheduled', JSON.stringify({
            tripId,
            scheduledAt: scheduledDate?.toISOString(),
            preferredDriverId: dto.preferredDriverId || null,
            passengerId: dto.passengerId,
          }));
        }
      } catch (redisErr: any) {
        this.logger.error(`Redis operation failed for trip ${tripId}: ${redisErr.message}`);
      }

      return {
        tripId,
        status: tripStatus,
        fare: tripFare,
        isFreeRide: hasFreeRides,
        distance: route.distanceKm.toFixed(1) + ' กม.',
        eta: route.durationMins + ' นาที',
        scheduledAt: scheduledDate ? scheduledDate.toISOString() : undefined,
        preferredDriverId: dto.preferredDriverId || undefined,
        correlationId,
      };
    } catch (err: any) {
      this.logger.error(`requestRide error: ${err.message}`, err.stack);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(err.message || 'เกิดข้อผิดพลาดในการเรียกรถ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async getFareEstimate(dto: FareEstimateDto) {
    if (this.fareService) {
      return this.fareService.estimateFare(dto);
    }
    const serviceType = (dto.serviceType || 'MOTO').toUpperCase();
    if (serviceType === 'MOTO') {
      return {
        serviceType: 'MOTO',
        distanceKm: 3.5,
        durationMins: 10,
        estimatedFare: 2,
        currency: 'THB',
        breakdown: { driverCommissionRate: 0, passengerSystemFee: 2 },
        isQuotationConfirmed: true,
        requiresPoints: 2,
      };
    }
    return {
      serviceType: 'TAXI',
      distanceKm: 3.5,
      durationMins: 15,
      estimatedFare: 60,
      currency: 'THB',
      breakdown: { baseFare: 35, distanceFare: 25 },
      isQuotationConfirmed: false,
      isTestingQuotation: true,
      disclaimer: 'GOZIPP TAXI is currently in staging certification.',
    };
  }

  async getRideStatus(tripId: string, passengerId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, passenger_id: passengerId } });
    if (!trip) throw new NotFoundException('ไม่พบเที่ยวของผู้โดยสารรายนี้');

    const status = await this.redis.hget(`trip:${tripId}`, 'status');
    const driverId = await this.redis.hget(`trip:${tripId}`, 'driverId');
    const effectiveDriverId = driverId || trip.driver_id;

    let driverData: any = null;
    if (effectiveDriverId) {
      const driver = await this.driverRepo.findOne({ where: { id: effectiveDriverId } });
      if (driver) {
        driverData = {
          id: driver.id,
          name: driver.name,
          plate: driver.plate,
          phone: driver.phone || '',
          rating: Number(driver.rating) || 5.0,
        };
      }
    }

    return {
      tripId,
      status: status || trip.status,
      driverId: effectiveDriverId,
      driver: driverData,
      scheduledAt: trip.scheduled_at,
      preferredDriverId: trip.preferred_driver_id,
    };
  }

  async canAccessTrip(tripId: string, userId: string): Promise<boolean> {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    return !!trip && (trip.passenger_id === userId || trip.driver_id === userId);
  }

  async getTripForDispatch(tripId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) return null;
    const passenger = await this.passengerRepo.findOne({ where: { id: trip.passenger_id } });
    return {
      id: trip.id,
      passengerId: trip.passenger_id,
      passengerName: passenger?.name || 'ผู้โดยสาร',
      status: trip.status,
      service_type: trip.service_type || 'MOTO',
      pickup: { lat: trip.pickup_lat, lng: trip.pickup_lng, address: trip.pickup_address },
      destination: { lat: trip.dest_lat, lng: trip.dest_lng, address: trip.dest_address },
      fare: Number(trip.fare),
      distanceKm: Number(trip.distance_km),
      requestedAt: trip.requested_at,
      scheduledAt: trip.scheduled_at,
      preferredDriverId: trip.preferred_driver_id,
    };
  }

  async cancelRide(tripId: string, passengerId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, passenger_id: passengerId } });
    if (!trip) throw new NotFoundException('ไม่พบการเดินทาง');
    if (!['SEARCHING', 'SCHEDULED', 'ACCEPTED'].includes(trip.status)) {
      throw new BadRequestException('ไม่สามารถยกเลิกในสถานะนี้ได้');
    }

    await this.tripRepo.update(tripId, {
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancel_reason: 'PASSENGER_CANCELLED',
    });
    await this.redis.hset(`trip:${tripId}`, 'status', 'CANCELLED');

    if (trip.driver_id) {
      await this.redis.del(`driver:${trip.driver_id}:active_assignment`);
      await this.driverRepo.update(trip.driver_id, { current_status: 'IDLE' });
      await this.redis.hset(`driver:${trip.driver_id}:stats`, 'status', 'IDLE');
      try {
        await this.tripRepo.manager.query('DELETE FROM driver_active_assignments WHERE trip_id = $1', [tripId]);
      } catch {}
    }

    if (trip.status === 'ACCEPTED' && Number(trip.fare) > 0) {
      await this.creditService.refundForRide(passengerId, tripId, Number(trip.fare), 'Trip cancelled before departure');
    }

    return { success: true, message: 'Ride cancelled successfully' };
  }

  async rateRide(tripId: string, passengerId: string, rating: number, note?: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, passenger_id: passengerId } });
    if (!trip) throw new NotFoundException('ไม่พบการเดินทาง');
    if (trip.status !== 'COMPLETED') {
      throw new BadRequestException('สามารถให้คะแนนได้เฉพาะการเดินทางที่สำเร็จ');
    }
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('คะแนนต้องอยู่ระหว่าง 1-5');
    }

    await this.tripRepo.update(tripId, {
      passenger_rating: rating,
      passenger_note: note,
    });

    if (trip.driver_id) {
      try {
        const stats = await this.tripRepo
          .createQueryBuilder('trip')
          .select('AVG(trip.passenger_rating)', 'avgRating')
          .where('trip.driver_id = :driverId AND trip.passenger_rating IS NOT NULL', { driverId: trip.driver_id })
          .getRawOne();
        const avg = parseFloat(stats?.avgRating);
        if (!isNaN(avg)) {
          await this.driverRepo.update(trip.driver_id, { rating: Number(avg.toFixed(2)) });
        }
      } catch (e: any) {
        this.logger.warn(`Failed to update driver avg rating: ${e?.message}`);
      }
    }

    return { success: true };
  }

  private setupTimeout(tripId: string) {
    const TIMEOUT_MS = 60000;
    const timer = setTimeout(async () => {
      const currentStatus = await this.redis.hget(`trip:${tripId}`, 'status');
      if (currentStatus === 'SEARCHING') {
        await this.redis.hset(`trip:${tripId}`, 'status', 'TIMEOUT_NO_DRIVER');
        await this.tripRepo.update(tripId, { status: 'TIMEOUT_NO_DRIVER' });
        this.logger.log(`Trip ${tripId} timed out.`);
      }
    }, TIMEOUT_MS);
    if (timer.unref) {
      timer.unref();
    }
  }

  async resumeSearchingTrips(): Promise<string[]> {
    const trips = await this.tripRepo.find({ where: { status: 'SEARCHING' } });
    const activeTripIds: string[] = [];
    const now = Date.now();
    for (const trip of trips) {
      const requestedAt = trip.requested_at ? new Date(trip.requested_at).getTime() : now;
      const remainingMs = Math.max(0, 60000 - (now - requestedAt));
      if (remainingMs === 0) {
        await this.redis.hset(`trip:${trip.id}`, 'status', 'TIMEOUT_NO_DRIVER');
        await this.tripRepo.update(trip.id, { status: 'TIMEOUT_NO_DRIVER' });
        continue;
      }
      activeTripIds.push(trip.id);
      setTimeout(async () => {
        const latest = await this.tripRepo.findOne({ where: { id: trip.id } });
        if (latest?.status === 'SEARCHING') {
          await this.redis.hset(`trip:${trip.id}`, 'status', 'TIMEOUT_NO_DRIVER');
          await this.tripRepo.update(trip.id, { status: 'TIMEOUT_NO_DRIVER' });
        }
      }, remainingMs);
    }
    return activeTripIds;
  }

  async getSearchingTripIds(): Promise<string[]> {
    const trips = await this.tripRepo.find({ where: { status: 'SEARCHING' } });
    return trips.map((trip) => trip.id);
  }

  async getActiveTripForPassenger(passengerId: string): Promise<TripEntity | null> {
    return this.tripRepo.findOne({
      where: {
        passenger_id: passengerId,
        status: In(['SEARCHING', 'SCHEDULED', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'])
      }
    });
  }

  // --- DRIVER LOOKUP FOR REGULAR / FAVORITE DRIVERS ---

  async lookupDrivers(query: string) {
    if (!query || query.trim().length === 0) return [];
    const clean = query.trim();
    const qb = this.driverRepo.createQueryBuilder('driver')
      .where('driver.approval_status = :approved', { approved: 'APPROVED' });

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
      qb.andWhere('driver.id = :id', { id: clean });
    } else {
      qb.andWhere(
        '(driver.name ILIKE :q OR driver.nickname ILIKE :q OR driver.plate ILIKE :q OR driver.phone ILIKE :q)',
        { q: `%${clean}%` }
      );
    }

    const drivers = await qb.take(8).getMany();
    return drivers.map((d) => ({
      id: d.id,
      name: d.name,
      nickname: d.nickname || d.name,
      plate: d.plate,
      phone: d.phone,
      rating: Number(d.rating || 5),
      stationId: d.station_id,
      totalTrips: d.total_trips,
    }));
  }

  async getFavoriteCandidates(stationId?: string) {
    const qb = this.driverRepo.createQueryBuilder('driver')
      .where('driver.approval_status = :approved', { approved: 'APPROVED' });
    if (stationId) {
      qb.andWhere('driver.station_id = :stationId', { stationId });
    }
    const drivers = await qb.orderBy('driver.rating', 'DESC').take(6).getMany();
    return drivers.map((d) => ({
      id: d.id,
      name: d.name,
      nickname: d.nickname || d.name,
      plate: d.plate,
      phone: d.phone,
      rating: Number(d.rating || 5),
      stationId: d.station_id,
      totalTrips: d.total_trips,
    }));
  }
}
