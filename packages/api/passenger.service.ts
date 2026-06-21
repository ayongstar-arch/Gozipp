import { Injectable, BadRequestException, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import * as argon2 from 'argon2';
import { RideRequestDto, PassengerRegisterDto } from './dtos';
import { CreditService } from './credit.service';
import { MapService } from './map.service';
import { SmsService } from './sms.service';
import { PassengerEntity } from './entities/passenger.entity';
import { TripEntity } from './entities/trip.entity';
import { AuthService, DeviceMetadata } from './auth/auth.service';
import { normalizeThaiMobileNumber } from './common/phone.util';
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
    private creditService: CreditService,
    private mapService: MapService,
    private smsService: SmsService,
    private authService: AuthService,
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

  // --- AUTHENTICATION ---

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

    const hash = await argon2.hash(newPin, { type: argon2.argon2id });
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

  async getProfile(passengerId: string) {
    const passenger = await this.passengerRepo.findOne({ where: { id: passengerId } });
    if (!passenger) throw new NotFoundException('ไม่พบข้อมูลผู้โดยสาร');
    return {
      id: passenger.id,
      name: passenger.name,
      phone: passenger.phone,
      email: passenger.email,
      pointsBalance: passenger.points_balance,
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

    return {
      trips: trips.map(t => ({
        id: t.id,
        status: t.status,
        fare: t.fare,
        credits_used: t.credits_used,
        distance_km: t.distance_km,
        pickup_address: t.pickup_address,
        dest_address: t.dest_address,
        requested_at: t.requested_at,
        completed_at: t.completed_at,
        passenger_rating: t.passenger_rating,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // --- RIDE OPERATIONS ---

  async requestRide(dto: RideRequestDto) {
    const route = await this.mapService.getRoutingInfo(
      dto.pickupLat, dto.pickupLng,
      dto.destLat, dto.destLng
    );

    const estimatedFare = 20 + (route.distanceKm * 5);
    const pointsRequired = Math.ceil(estimatedFare);

    const balance = await this.creditService.getBalance(dto.passengerId);
    const passenger = await this.passengerRepo.findOne({ where: { id: dto.passengerId } });
    const hasFreeRides = (passenger?.free_rides_remaining ?? 0) > 0;
    const canAfford = hasFreeRides || balance >= pointsRequired;

    if (!canAfford) {
      throw new BadRequestException('แต้มไม่เพียงพอ กรุณาเติมเงิน');
    }

    const tripId = crypto.randomUUID();
    const tripFare = hasFreeRides ? 0 : pointsRequired;

    // Save to DB
    await this.tripRepo.save({
      id: tripId,
      passenger_id: dto.passengerId,
      pickup_lat: dto.pickupLat,
      pickup_lng: dto.pickupLng,
      pickup_address: dto.pickupAddress,
      dest_lat: dto.destLat,
      dest_lng: dto.destLng,
      dest_address: dto.destAddress,
      distance_km: route.distanceKm,
      fare: tripFare,
      credits_used: 0,
      status: 'SEARCHING',
    });

    // Cache in Redis for real-time operations
    await this.redis.hset(`trip:${tripId}`, {
      id: tripId,
      passengerId: dto.passengerId,
      status: 'SEARCHING',
      fare: tripFare,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      destLat: dto.destLat,
      destLng: dto.destLng,
      requestedAt: Date.now(),
      distanceKm: route.distanceKm,
    } as any);

    await this.redis.publish('ride:requested', JSON.stringify(tripId));
    this.setupTimeout(tripId);

    return {
      tripId,
      status: 'SEARCHING',
      fare: tripFare,
      isFreeRide: hasFreeRides,
      distance: route.distanceKm.toFixed(1) + ' กม.',
      eta: route.durationMins + ' นาที',
    };
  }

  async getRideStatus(tripId: string, passengerId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, passenger_id: passengerId } });
    if (!trip) throw new NotFoundException('ไม่พบเที่ยวของผู้โดยสารรายนี้');

    const status = await this.redis.hget(`trip:${tripId}`, 'status');
    const driverId = await this.redis.hget(`trip:${tripId}`, 'driverId');

    if (!status) {
      return { tripId, status: trip.status, driverId: trip.driver_id };
    }

    return { tripId, status, driverId: driverId || trip.driver_id };
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
      pickup: { lat: trip.pickup_lat, lng: trip.pickup_lng, address: trip.pickup_address },
      destination: { lat: trip.dest_lat, lng: trip.dest_lng, address: trip.dest_address },
      fare: Number(trip.fare),
      distanceKm: Number(trip.distance_km),
      requestedAt: trip.requested_at,
    };
  }

  async cancelRide(tripId: string, passengerId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, passenger_id: passengerId } });
    if (!trip) throw new NotFoundException('ไม่พบการเดินทาง');
    if (!['SEARCHING', 'ACCEPTED'].includes(trip.status)) {
      throw new BadRequestException('ไม่สามารถยกเลิกในสถานะนี้ได้');
    }

    await this.tripRepo.update(tripId, {
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancel_reason: 'PASSENGER_CANCELLED',
    });
    await this.redis.hset(`trip:${tripId}`, 'status', 'CANCELLED');

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

    return { success: true };
  }

  private setupTimeout(tripId: string) {
    const TIMEOUT_MS = 60000;
    setTimeout(async () => {
      const currentStatus = await this.redis.hget(`trip:${tripId}`, 'status');
      if (currentStatus === 'SEARCHING') {
        await this.redis.hset(`trip:${tripId}`, 'status', 'TIMEOUT_NO_DRIVER');
        await this.tripRepo.update(tripId, { status: 'TIMEOUT_NO_DRIVER' });
        this.logger.log(`Trip ${tripId} timed out.`);
      }
    }, TIMEOUT_MS);
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
        status: In(['SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'])
      }
    });
  }
}
