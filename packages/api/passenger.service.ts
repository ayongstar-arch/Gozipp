import { Injectable, BadRequestException, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { RideRequestDto, PassengerRegisterDto } from './dtos';
import { CreditService } from './credit.service';
import { MapService } from './map.service';
import { SmsService } from './sms.service';
import { PassengerEntity } from './entities/passenger.entity';
import { TripEntity } from './entities/trip.entity';

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
    private jwtService: JwtService
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async onModuleInit() {
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

  async requestOtp(phoneNumber: string) {
    const rateLimitKey = `otp_limit:passenger:${phoneNumber}`;
    const requests = await this.redis.get(rateLimitKey);
    const count = requests ? parseInt(requests) : 0;

    if (count >= 3) {
      throw new BadRequestException('คุณขอ OTP บ่อยเกินไป กรุณาลองใหม่ในอีก 10 นาที');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `otp:passenger:${phoneNumber}`;
    await this.redis.set(key, otp, 'EX', 300);
    await this.redis.set(rateLimitKey, count + 1, 'EX', 600);
    await this.smsService.sendOtp(phoneNumber, otp);

    this.logger.log(`OTP requested for passenger ${phoneNumber}`);
    return { success: true, message: 'OTP ถูกส่งไปยังเบอร์ของคุณแล้ว' };
  }

  async verifyOtp(phoneNumber: string, otp: string) {
    const key = `otp:passenger:${phoneNumber}`;
    const storedOtp = await this.redis.get(key);
    const isTestMode = otp === '123456' && process.env.ALLOW_TEST_OTP === 'true';

    if (!isTestMode && storedOtp !== otp) {
      throw new BadRequestException('รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
    }

    if (!isTestMode) await this.redis.del(key);
    return { success: true };
  }

  async login(phoneNumber: string, otp: string) {
    await this.verifyOtp(phoneNumber, otp);

    const passenger = await this.passengerRepo.findOne({ where: { phone: phoneNumber } });

    if (!passenger) {
      return { isRegistered: false };
    }

    const payload = { sub: passenger.id, role: 'PASSENGER', phone: passenger.phone };
    const token = this.jwtService.sign(payload);

    return {
      isRegistered: true,
      token,
      passengerId: passenger.id,
      name: passenger.name,
      pointsBalance: passenger.points_balance,
      freeRidesRemaining: passenger.free_rides_remaining,
    };
  }

  async register(dto: PassengerRegisterDto) {
    const existing = await this.passengerRepo.findOne({ where: { phone: dto.phoneNumber } });
    if (existing) {
      throw new BadRequestException('เบอร์โทรนี้ลงทะเบียนแล้ว');
    }

    let inviterId: string | null = null;
    if (dto.referralCode) {
      const inviter = await this.passengerRepo.findOne({ where: { referral_code: dto.referralCode } });
      if (inviter) {
        inviterId = inviter.id;
        const referralPoints = parseInt(await this.redis.get('config:referral_points') || '50');
        await this.creditService.addBonusPoints(inviter.id, referralPoints, 'Referral Bonus');
      }
    }

    const newPassenger = this.passengerRepo.create({
      phone: dto.phoneNumber,
      name: dto.name,
      points_balance: 0,
      free_rides_remaining: 3,
      referral_code: `P-${Math.random().toString(36).toUpperCase().slice(-6)}`,
      referred_by_id: inviterId || undefined,
    });

    await this.passengerRepo.save(newPassenger);

    const payload = { sub: newPassenger.id, role: 'PASSENGER', phone: newPassenger.phone };
    const token = this.jwtService.sign(payload);

    this.logger.log(`New passenger registered: ${newPassenger.id}`);

    return {
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      token,
      passengerId: newPassenger.id,
      name: newPassenger.name,
      freeRidesRemaining: newPassenger.free_rides_remaining,
    };
  }

  async getProfile(passengerId: string) {
    const passenger = await this.passengerRepo.findOne({ where: { id: passengerId } });
    if (!passenger) throw new NotFoundException('ไม่พบข้อมูลผู้โดยสาร');
    return {
      id: passenger.id,
      name: passenger.name,
      phone: passenger.phone,
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

  async getRideStatus(tripId: string) {
    const status = await this.redis.hget(`trip:${tripId}`, 'status');
    const driverId = await this.redis.hget(`trip:${tripId}`, 'driverId');

    if (!status) {
      const trip = await this.tripRepo.findOne({ where: { id: tripId } });
      return { tripId, status: trip?.status || 'NOT_FOUND', driverId: trip?.driver_id };
    }

    return { tripId, status, driverId };
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

    return { success: true, message: 'ยกเลิกการเดินทางแล้ว' };
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

  async getActiveTripForPassenger(passengerId: string): Promise<TripEntity | null> {
    return this.tripRepo.findOne({
      where: {
        passenger_id: passengerId,
        status: In(['SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'])
      }
    });
  }
}