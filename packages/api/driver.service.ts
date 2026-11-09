import { Injectable, NotFoundException, BadRequestException, ConflictException, UnauthorizedException, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { FairQueueService } from './fair-queue.service';
import { SmsService } from './sms.service'; // ADDED
import { CreditService } from './credit.service';
import { DriverOnlineDto, TripActionDto, DriverRegisterDto, CreateInviteCodeDto, InviteCode } from './dtos';
import { DriverEntity } from './entities/driver.entity';
import { PassengerEntity } from './entities/passenger.entity';
import { TripEntity } from './entities/trip.entity';
import { DriverDocumentEntity } from './entities/driver-document.entity';
import { DriverPreferenceEntity } from './entities/driver-preference.entity';
import { DriverTrainingStatusEntity } from './entities/driver-training-status.entity';
import { DriverVehicleEntity } from './entities/driver-vehicle.entity';
import { VehicleDocumentEntity } from './entities/vehicle-document.entity';
import { DriverServiceProfileEntity } from './entities/driver-service-profile.entity';
import { DriverActiveAssignmentEntity } from './entities/driver-active-assignment.entity';
import {
  UpdateDriverProfileDto,
  UploadDriverDocumentDto,
  SaveDriverPreferencesDto,
  SubmitTrainingDto,
  RegisterVehicleDto,
  UploadVehicleDocumentDto,
  ToggleServiceDto,
  SelectActiveVehicleDto,
} from './dtos';

@Injectable()
export class DriverService implements OnModuleInit {
  private redis: Redis;
  private readonly logger = new Logger(DriverService.name);

  // Invite Codes 
  private inviteCodes = new Map<string, InviteCode>();

  // WIN MASTER DATA 
  private stations = new Map<string, { id: string, name: string, lat: number, lng: number, radius: number }>();

  constructor(
    @InjectRepository(DriverEntity)
    private driverRepo: Repository<DriverEntity>,
    @InjectRepository(PassengerEntity)
    private passengerRepo: Repository<PassengerEntity>,
    @InjectRepository(TripEntity)
    private tripRepo: Repository<TripEntity>,
    @InjectRepository(DriverDocumentEntity)
    private docRepo: Repository<DriverDocumentEntity>,
    @InjectRepository(DriverPreferenceEntity)
    private prefRepo: Repository<DriverPreferenceEntity>,
    @InjectRepository(DriverTrainingStatusEntity)
    private trainingRepo: Repository<DriverTrainingStatusEntity>,
    private fairQueueService: FairQueueService,
    private creditService: CreditService,
    private jwtService: JwtService,
    private smsService: SmsService, // ADDED
    @Optional()
    @InjectRepository(DriverVehicleEntity)
    private vehicleRepo?: Repository<DriverVehicleEntity>,
    @Optional()
    @InjectRepository(VehicleDocumentEntity)
    private vehicleDocRepo?: Repository<VehicleDocumentEntity>,
    @Optional()
    @InjectRepository(DriverServiceProfileEntity)
    private serviceProfileRepo?: Repository<DriverServiceProfileEntity>,
    @Optional()
    @InjectRepository(DriverActiveAssignmentEntity)
    private assignmentRepo?: Repository<DriverActiveAssignmentEntity>,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    // Seed Stations (Example)
    this.stations.set('WIN-CENTRAL-01', { id: 'WIN-CENTRAL-01', name: 'วินตลาดกลาง', lat: 13.7563, lng: 100.5018, radius: 100 });
    this.stations.set('WIN-TECH-PARK', { id: 'WIN-TECH-PARK', name: 'วินเทคพาร์ค', lat: 13.7663, lng: 100.5118, radius: 100 });

    // Seed default invites
    this.inviteCodes.set('WIN888', {
      code: 'WIN888',
      winId: 'WIN-CENTRAL-01',
      type: 'STATION',
      maxUses: 100,
      usedCount: 0,
      expiresAt: '2025-12-31T23:59:59Z',
      note: 'Default code',
      createdBy: 'ADMIN',
      isActive: true
    });
  }

  async onModuleInit() {
    // Seed Demo User (opt-in only — same guard as PassengerService).
    if (process.env.SEED_DEMO_DATA !== 'true') return;
    // Seed Demo User
    const demoUser = await this.driverRepo.findOne({ where: { phone: '0812345678' } });
    if (!demoUser) {
      await this.driverRepo.save({
        id: 'D-USER',
        phone: '0812345678',
        name: 'Somchai Rider',
        plate: '1กข-9999',
        invite_code: 'WIN888',
        winId: 'WIN-CENTRAL-01',
        approval_status: 'APPROVED',
        current_status: 'OFFLINE'
      });
      this.logger.log('Seeded Demo Driver D-USER');
    }
  }

  // --- Invite Code Management ---
  createInviteCode(dto: CreateInviteCodeDto) {
    if (this.inviteCodes.has(dto.code)) {
      throw new BadRequestException('Code already exists');
    }
    const newCode: InviteCode = { ...dto, usedCount: 0, createdBy: 'ADMIN', isActive: true };
    this.inviteCodes.set(dto.code, newCode);
    return newCode;
  }

  getAllInviteCodes() {
    return Array.from(this.inviteCodes.values());
  }

  // --- CORE LOGIC: Resolve Station by Location ---
  private findNearestStation(lat: number, lng: number): string | null {
    const THRESHOLD_METERS = 100; // 100m Radius
    for (const station of this.stations.values()) {
      const dist = this.calculateDistanceMeters(lat, lng, station.lat, station.lng);
      if (dist <= THRESHOLD_METERS) return station.id;
    }
    return null;
  }

  private calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // --- REAL AUTHENTICATION LOGIC ---

  async requestOtp(phoneNumber: string) {
    // 1. Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Store in Redis (Expire in 5 minutes)
    const key = `otp:${phoneNumber}`;
    await this.redis.set(key, otp, 'EX', 300);

    // 3. Send via Real SMS Service
    await this.smsService.sendOtp(phoneNumber, otp);

    return { success: true, message: 'ส่งรหัส OTP เรียบร้อยแล้ว' };
  }

  async login(phoneNumber: string, otp: string) {
    const key = `otp:${phoneNumber}`;
    const storedOtp = await this.redis.get(key);

    const isTestAccount = otp === '1234' && process.env.ALLOW_TEST_OTP === 'true';

    if (!isTestAccount && storedOtp !== otp) {
      throw new UnauthorizedException('รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
    }

    if (!isTestAccount) await this.redis.del(key);

    const driver = await this.driverRepo.findOne({ where: { phone: phoneNumber } });

    if (!driver) {
      return { isRegistered: false };
    }

    if (driver.approval_status === 'PENDING') {
      return { isRegistered: true, isApproved: false, driverId: driver.id };
    }

    const payload = { sub: driver.id, role: 'DRIVER', phone: driver.phone };
    const token = this.jwtService.sign(payload);

    return {
      isRegistered: true,
      isApproved: true,
      token: token,
      driverId: driver.id,
      name: driver.name,
      hasPin: !!driver.pin_hash,
      profilePic: driver.profile_pic_url
    };
  }

  async register(dto: DriverRegisterDto) {
    const invite = this.inviteCodes.get(dto.inviteCode);
    if (!invite || !invite.isActive) throw new BadRequestException('รหัสเชิญไม่ถูกต้อง');
    if (invite.usedCount >= invite.maxUses) throw new BadRequestException('รหัสเชิญครบจำนวนแล้ว');

    const existing = await this.driverRepo.findOne({ where: { phone: dto.phoneNumber } });
    if (existing) throw new BadRequestException('เบอร์โทรนี้ลงทะเบียนแล้ว');

    const newDriver = this.driverRepo.create({
      phone: dto.phoneNumber,
      name: dto.fullName,
      plate: dto.licensePlate,
      invite_code: dto.inviteCode,
      approval_status: 'PENDING',
      profile_pic_url: dto.profilePicUrl,
    });

    await this.driverRepo.save(newDriver);
    invite.usedCount++;

    // Auto-approve for demo
    if (process.env.NODE_ENV !== 'production') {
      // await this.driverRepo.update(newDriver.id, { approval_status: 'APPROVED' });
    }

    return { success: true, message: 'ลงทะเบียนสำเร็จ รอการอนุมัติ', driverId: newDriver.id };
  }

  async goOnline(dto: DriverOnlineDto) {
    const { driverId, lat, lng } = dto;

    await this.redis.geoadd('drivers:locations', lng, lat, driverId);
    await this.driverRepo.update(driverId, { current_status: 'IDLE' });

    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (driver) {
      await this.redis.hmset(`driver:${driverId}:stats`, {
        status: 'IDLE',
        rating: driver.rating,
        tripsToday: driver.total_trips,
        lastTripTime: Date.now()
      });
    }

    const nearestWinId = this.findNearestStation(lat, lng);

    if (nearestWinId) {
      await this.fairQueueService.joinQueue(nearestWinId, driverId, lat, lng);
      return { status: 'QUEUED', winId: nearestWinId, message: `เข้าคิววิน: ${this.stations.get(nearestWinId)?.name}` };
    } else {
      return { status: 'ROAMING', message: 'อยู่นอกเขตวิน (กำลังวิ่งรับงานอิสระ)' };
    }
  }

  async getQueueStatus(driverId: string) {
    if (!driverId) return { status: 'ROAMING', message: 'No driverId' };
    const winId = await this.redis.hget(`driver:${driverId}:stats`, 'currentWin');
    if (!winId) {
      const driver = await this.driverRepo.findOne({ where: { id: driverId } });
      const station = driver?.station_id ? this.stations.get(driver.station_id) : null;
      return {
        status: 'ROAMING',
        winId: driver?.station_id || null,
        winName: station?.name || 'รับงานอิสระ (Roaming)',
        position: null,
        totalDrivers: 0,
        score: 0,
      };
    }

    const rank = await this.redis.zrevrank(`win:${winId}:queue`, driverId);
    const score = await this.redis.zscore(`win:${winId}:queue`, driverId);
    const totalDrivers = await this.redis.zcard(`win:${winId}:queue`);
    const station = this.stations.get(winId);

    return {
      status: 'QUEUED',
      winId,
      winName: station?.name || winId,
      position: rank !== null ? rank + 1 : 1,
      totalDrivers: Math.max(totalDrivers || 1, 1),
      score: score ? parseFloat(score) : 0,
    };
  }

  async acceptTrip(dto: TripActionDto) {
    // Global Active Ride Lock Check (P0) — PostgreSQL backed
    if (this.assignmentRepo) {
      const activeAssignment = await this.assignmentRepo.findOne({ where: { driver_id: dto.driverId } });
      if (activeAssignment) {
        throw new ConflictException('ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้');
      }
    }

    const lockKey = `trip:${dto.tripId}:lock`;
    // Correct order: key, value, 'EX', seconds, 'NX'
    // Or key, value, 'NX', 'EX', seconds (depending on lib version, but usually options come after value)
    // ioredis often supports: redis.set(key, value, "EX", 10, "NX")
    const acquired = await this.redis.set(lockKey, dto.driverId, 'EX', 30, 'NX');

    if (!acquired) throw new BadRequestException('งานนี้หมดอายุหรือมีคนรับไปแล้ว');

    const trip = await this.tripRepo.findOne({ where: { id: dto.tripId } });
    if (!trip || !['SEARCHING', 'SCHEDULED'].includes(trip.status)) {
      await this.redis.del(lockKey);
      throw new BadRequestException('งานนี้ไม่อยู่ในสถานะรอคนขับ');
    }

    if (trip.preferred_driver_id && trip.preferred_driver_id !== dto.driverId && trip.status === 'SCHEDULED') {
      await this.redis.del(lockKey);
      throw new BadRequestException('งานนี้ถูกนัดหมายไว้สำหรับวินประจำท่านอื่น');
    }

    const passengerId = await this.redis.hget(`trip:${dto.tripId}`, 'passengerId');
    const tripFare = parseFloat(await this.redis.hget(`trip:${dto.tripId}`, 'fare') || '2');
    const shouldCharge = tripFare > 0;
    const isEmergency = (await this.redis.hget(`trip:${dto.tripId}`, 'isEmergency')) === 'true';
    const deductionSuccess = shouldCharge ? await this.creditService.deductForRide(passengerId, dto.tripId, tripFare, isEmergency) : true;

    if (!deductionSuccess) {
      await this.redis.del(lockKey);
      throw new BadRequestException('Passenger balance is insufficient');
    }

    try {
      const serviceType = trip.service_type || 'MOTO';
      let vehicleId = trip.vehicle_id;
      if (!vehicleId && this.serviceProfileRepo) {
        const profile = await this.serviceProfileRepo.findOne({
          where: { driver_id: dto.driverId, service_type: serviceType as any },
        });
        vehicleId = profile?.active_vehicle_id || null;
      }
      if (!vehicleId && this.vehicleRepo) {
        const defaultVeh = await this.vehicleRepo.findOne({
          where: { driver_id: dto.driverId },
        });
        vehicleId = defaultVeh?.id || null;
      }

      // Enforce Global Active Ride Lock via PostgreSQL Unique Constraint
      if (this.assignmentRepo) {
        try {
          const assignment = this.assignmentRepo.create({
            driver_id: dto.driverId,
            trip_id: dto.tripId,
            service_type: (serviceType as any) || 'MOTO',
            vehicle_id: vehicleId || dto.driverId,
            state: 'ACCEPTED',
          });
          await this.assignmentRepo.save(assignment);
        } catch (err: any) {
          if (err?.code === '23505' || err?.message?.includes('duplicate') || err?.message?.includes('driver_active_assignments')) {
            throw new ConflictException('ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้');
          }
          throw err;
        }
      }

      await this.redis.set(`driver:${dto.driverId}:active_assignment`, dto.tripId, 'EX', 7200);
      await this.redis.hset(`trip:${dto.tripId}`, 'status', 'ACCEPTED', 'driverId', dto.driverId);
      await this.redis.hset(`driver:${dto.driverId}:stats`, 'status', 'BUSY');

      await this.driverRepo.update(dto.driverId, { current_status: 'BUSY' });
      await this.tripRepo.update(dto.tripId, {
        driver_id: dto.driverId,
        status: 'ACCEPTED',
        vehicle_id: vehicleId || undefined,
        accepted_at: new Date(),
      });

      const winId = await this.redis.hget(`driver:${dto.driverId}:stats`, 'currentWin');
      if (winId) {
        await this.redis.zrem(`win:${winId}:queue`, dto.driverId);
        await this.redis.hdel(`driver:${dto.driverId}:stats`, 'currentWin');
      }

      const driver = await this.driverRepo.findOne({ where: { id: dto.driverId } });
      return {
        success: true,
        passengerId: trip.passenger_id,
        driver: driver ? {
          id: driver.id,
          name: driver.name,
          plate: driver.plate,
          phone: driver.phone,
          rating: Number(driver.rating),
        } : null,
      };
    } catch (error) {
      if (deductionSuccess && shouldCharge) {
        await this.creditService.refundForRide(passengerId, dto.tripId, tripFare, 'Ride acceptance rolled back');
      }
      await this.redis.del(lockKey);
      throw error;
    }
  }

  async markDriverArrived(
    driverId: string,
    tripId: string,
    telemetry?: { lat?: number; lng?: number; accuracyMeters?: number; clientTimestamp?: number }
  ) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, driver_id: driverId } });
    if (!trip || trip.status !== 'ACCEPTED') {
      throw new BadRequestException('ไม่สามารถแจ้งถึงจุดรับในสถานะปัจจุบัน');
    }

    let arrivalVerified = false;
    let distanceMeters = 0;
    const accuracyMeters = telemetry?.accuracyMeters || 0;
    let verificationStatus = 'UNVERIFIED';

    if (telemetry && telemetry.lat !== undefined && telemetry.lng !== undefined) {
      distanceMeters = this.calculateDistanceMeters(
        telemetry.lat,
        telemetry.lng,
        trip.pickup_lat,
        trip.pickup_lng
      );

      const isWithinGeofence = distanceMeters <= 100;
      const isAccurateGps = accuracyMeters <= 50;
      const isFreshTimestamp = !telemetry.clientTimestamp || Math.abs(Date.now() - telemetry.clientTimestamp) <= 60000;

      if (isWithinGeofence && isAccurateGps && isFreshTimestamp) {
        arrivalVerified = true;
        verificationStatus = 'VERIFIED';
      } else {
        arrivalVerified = false;
        verificationStatus = 'LOCATION_UNVERIFIED';
        this.logger.warn(
          `Driver ${driverId} arrival unverified for trip ${tripId}: dist=${distanceMeters.toFixed(1)}m, acc=${accuracyMeters}m`
        );
      }
    }

    await this.tripRepo.update(tripId, {
      status: 'DRIVER_ARRIVED',
      arrived_at: new Date(),
      arrival_verified: arrivalVerified,
      arrival_gps_accuracy: accuracyMeters || undefined,
      arrival_distance_meters: Math.round(distanceMeters),
      arrival_verification_status: verificationStatus,
    });
    await this.redis.hset(`trip:${tripId}`, {
      status: 'DRIVER_ARRIVED',
      arrivalVerified: arrivalVerified ? 'true' : 'false',
      verificationStatus,
    });
    if (this.assignmentRepo) {
      await this.assignmentRepo.update({ trip_id: tripId }, { state: 'ARRIVED' });
    }
    return {
      success: true,
      status: 'DRIVER_ARRIVED',
      arrivalVerified,
      distanceToPickupMeters: Math.round(distanceMeters),
      verificationStatus,
    };
  }

  async startTrip(driverId: string, tripId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, driver_id: driverId } });
    if (!trip || trip.status !== 'DRIVER_ARRIVED') {
      throw new BadRequestException('ต้องแจ้งถึงจุดรับก่อนเริ่มเดินทาง');
    }
    await this.tripRepo.update(tripId, { status: 'IN_PROGRESS', started_at: new Date() });
    await this.redis.hset(`trip:${tripId}`, 'status', 'IN_PROGRESS');
    if (this.assignmentRepo) {
      await this.assignmentRepo.update({ trip_id: tripId }, { state: 'IN_PROGRESS' });
    }
    return { success: true, status: 'IN_PROGRESS' };
  }

  async rejectTrip(dto: TripActionDto) {
    const winId = await this.redis.hget(`driver:${dto.driverId}:stats`, 'currentWin');
    if (winId) {
      await this.fairQueueService.handleTimeout(winId, dto.driverId);
    }
    return { success: true, message: 'ปฏิเสธงานแล้ว อันดับคิวของคุณจะถูกปรับเปลี่ยน' };
  }

  // --- ONBOARDING METHODS ---

  async updateOnboardingProfile(dto: UpdateDriverProfileDto) {
    const driver = await this.driverRepo.findOne({ where: { id: dto.driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    Object.assign(driver, {
      name: dto.fullName,
      nickname: dto.nickname,
      line_id: dto.lineId,
      profile_pic_url: dto.profilePicUrl,
      current_onboarding_step: 2 // After profile is Step 2
    });

    await this.driverRepo.save(driver);
    return { success: true };
  }

  async uploadOnboardingDocument(dto: UploadDriverDocumentDto) {
    const doc = this.docRepo.create({
      driverId: dto.driverId,
      type: dto.type,
      url: dto.url,
      status: 'PENDING'
    });
    await this.docRepo.save(doc);

    // Increment step to 3 if first doc
    await this.driverRepo.update(dto.driverId, { current_onboarding_step: 3 });
    return { success: true, docId: doc.id };
  }

  async saveOnboardingPreferences(dto: SaveDriverPreferencesDto) {
    // Clear old preferences
    await this.prefRepo.delete({ driverId: dto.driverId });

    // Save Zones
    for (const zone of dto.zones) {
      await this.prefRepo.save({ driverId: dto.driverId, type: 'ZONE', value: zone });
    }
    // Save Shifts
    for (const shift of dto.shifts) {
      await this.prefRepo.save({ driverId: dto.driverId, type: 'SHIFT', value: shift });
    }
    // Save Service Types
    for (const type of dto.serviceTypes) {
      await this.prefRepo.save({ driverId: dto.driverId, type: 'SERVICE_TYPE', value: type });
    }

    await this.driverRepo.update(dto.driverId, { current_onboarding_step: 4 });
    return { success: true };
  }

  async submitTraining(dto: SubmitTrainingDto) {
    let training = await this.trainingRepo.findOne({ where: { driverId: dto.driverId, module_id: dto.moduleId } });
    if (!training) {
      training = this.trainingRepo.create({ driverId: dto.driverId, module_id: dto.moduleId });
    }
    training.status = 'COMPLETED';
    training.completed_at = new Date();
    await this.trainingRepo.save(training);

    await this.driverRepo.update(dto.driverId, { current_onboarding_step: 5 });
    return { success: true };
  }

  async submitOnboarding(driverId: string) {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    driver.approval_status = 'PENDING_REVIEW';
    driver.current_onboarding_step = 6;
    await this.driverRepo.save(driver);

    return { success: true, message: 'Submitted for review' };
  }

  async getOnboardingStatus(driverId: string) {
    const driver = await this.driverRepo.findOne({ 
      where: { id: driverId },
      relations: ['documents', 'preferences', 'training_statuses']
    });
    return driver;
  }

  async completeTrip(dto: TripActionDto) {
    const trip = await this.tripRepo.findOne({ where: { id: dto.tripId, driver_id: dto.driverId } });
    if (!trip || !['DRIVER_ARRIVED', 'IN_PROGRESS', 'ACCEPTED'].includes(trip.status)) {
      throw new BadRequestException('ไม่สามารถจบทริปในสถานะนี้ได้');
    }
    await this.redis.hset(`trip:${dto.tripId}`, 'status', 'COMPLETED');
    await this.redis.hset(`driver:${dto.driverId}:stats`, 'status', 'IDLE');
    await this.redis.del(`driver:${dto.driverId}:active_assignment`);

    if (this.assignmentRepo) {
      await this.assignmentRepo.delete({ trip_id: dto.tripId });
    }

    await this.tripRepo.update(dto.tripId, {
      status: 'COMPLETED',
      completed_at: new Date(),
      started_at: trip.started_at || new Date(),
    });
    await this.driverRepo.update(dto.driverId, { current_status: 'IDLE' });
    await this.driverRepo.increment({ id: dto.driverId }, 'total_trips', 1);

    const tripFare = Number(trip.fare) || 0;
    if (tripFare > 0) {
      await this.driverRepo.increment({ id: dto.driverId }, 'total_earnings', tripFare);
    }

    // Passenger Referral Logic (Award points on first trip)
    const passenger = await this.passengerRepo.findOne({ where: { id: trip.passenger_id } });
    if (passenger) {
      await this.passengerRepo.increment({ id: trip.passenger_id }, 'total_rides', 1);
      
      if (passenger.total_rides === 0 && passenger.referred_by_id) {
        const REWARD_POINTS = 10; // Configure this from Campaign Center
        await this.passengerRepo.increment({ id: passenger.referred_by_id }, 'community_points_balance', REWARD_POINTS);
        this.logger.log(`Awarded ${REWARD_POINTS} community points to referrer ${passenger.referred_by_id} for new passenger ${passenger.id}`);
      }
    }

    if (Number(trip.fare) <= 0) {
      await this.creditService.consumeFreeRide(trip.passenger_id, trip.id);
    }

    return { success: true };
  }

  async getProfile(driverId: string) {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    let stationName = driver.station_id || '';
    if (driver.station_id) {
      const station = this.stations.get(driver.station_id);
      if (station) stationName = station.name;
    }

    return {
      id: driver.id,
      phone: driver.phone,
      name: driver.name,
      nickname: driver.nickname,
      plate: driver.plate,
      lineId: driver.line_id,
      stationId: driver.station_id,
      stationName,
      approvalStatus: driver.approval_status,
      currentStatus: driver.current_status,
      rating: Number(driver.rating) || 5.0,
      totalTrips: driver.total_trips || 0,
      totalEarnings: Number(driver.total_earnings) || 0,
      profilePicUrl: driver.profile_pic_url,
      hasPin: Boolean(driver.pin_hash),
    };
  }

  async getDriverTrips(driverId: string, page = 1, limit = 10, statusFilter?: string) {
    const where: any = { driver_id: driverId };
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    const [trips, total] = await this.tripRepo.findAndCount({
      where,
      order: { requested_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const passengerIds = Array.from(new Set(trips.map(t => t.passenger_id).filter(Boolean)));
    const passengers = passengerIds.length > 0
      ? await this.passengerRepo.find({ where: { id: In(passengerIds) } })
      : [];
    const passengerMap = new Map(passengers.map(p => [p.id, p.name]));

    return {
      trips: trips.map(t => ({
        id: t.id,
        status: t.status,
        fare: Number(t.fare) || 0,
        credits_used: Number(t.credits_used) || 0,
        distance_km: Number(t.distance_km) || 0,
        pickup_address: t.pickup_address,
        dest_address: t.dest_address,
        passenger_name: passengerMap.get(t.passenger_id) || 'ผู้โดยสาร',
        requested_at: t.requested_at,
        completed_at: t.completed_at,
        passenger_rating: t.passenger_rating,
        driver_rating: t.driver_rating,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getActiveTripForDriver(driverId: string): Promise<any | null> {
    const trip = await this.tripRepo.findOne({
      where: {
        driver_id: driverId,
        status: In(['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS']),
      },
    });
    if (!trip) return null;

    const passenger = await this.passengerRepo.findOne({ where: { id: trip.passenger_id } });

    return {
      id: trip.id,
      tripId: trip.id,
      status: trip.status,
      passengerId: trip.passenger_id,
      passengerName: passenger?.name || 'ผู้โดยสาร',
      passengerPhone: passenger?.phone,
      pickup: {
        lat: Number(trip.pickup_lat),
        lng: Number(trip.pickup_lng),
        address: trip.pickup_address,
      },
      destination: {
        lat: Number(trip.dest_lat),
        lng: Number(trip.dest_lng),
        address: trip.dest_address,
      },
      distanceKm: Number(trip.distance_km),
      fare: Number(trip.fare),
      requestedAt: trip.requested_at,
      arrivedAt: trip.arrived_at,
      startedAt: trip.started_at,
    };
  }

  async getPublicDriver(driverId: string | null | undefined) {
    if (!driverId) return null;
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) return null;
    return {
      id: driver.id,
      name: driver.name,
      plate: driver.plate,
      phone: driver.phone,
      rating: Number(driver.rating),
    };
  }

  // ==========================================
  // VEHICLE MANAGEMENT API (GATE 2.6)
  // ==========================================

  async getDriverVehicles(driverId: string) {
    if (!this.vehicleRepo) return [];
    return this.vehicleRepo.find({
      where: { driver_id: driverId },
      relations: ['documents'],
      order: { created_at: 'DESC' },
    });
  }

  async getVehicleById(driverId: string, vehicleId: string) {
    if (!this.vehicleRepo) throw new NotFoundException('Vehicle repository not initialized');
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId, driver_id: driverId },
      relations: ['documents'],
    });
    if (!vehicle) throw new NotFoundException('ไม่พบข้อมูลยานพาหนะ');
    return vehicle;
  }

  async registerVehicle(driverId: string, dto: RegisterVehicleDto) {
    if (!this.vehicleRepo) throw new BadRequestException('Vehicle repository not initialized');

    // DLT Compliance checks
    if (dto.category === 'PRIVATE_CAR_FOR_HIRE') {
      if (dto.passenger_capacity && dto.passenger_capacity < 4) {
        throw new BadRequestException('รถยนต์รับจ้างผ่านระบบอิเล็กทรอนิกส์ต้องมีความจุผู้โดยสารไม่น้อยกว่า 4 ที่นั่ง');
      }
      if (dto.year) {
        const currentYear = new Date().getFullYear();
        if (currentYear - dto.year > 9) {
          throw new BadRequestException('รถยนต์รับจ้างผ่านระบบอิเล็กทรอนิกส์ต้องมีอายุการใช้งานไม่เกิน 9 ปี');
        }
      }
    }

    const vehicle = this.vehicleRepo.create({
      driver_id: driverId,
      category: dto.category,
      plate: dto.plate,
      province: dto.province || 'กรุงเทพมหานคร',
      brand: dto.brand,
      model: dto.model,
      color: dto.color,
      year: dto.year || null,
      passenger_capacity: dto.passenger_capacity || (dto.category === 'MOTORCYCLE' ? 1 : 4),
      verification_status: 'PENDING',
    });

    const saved = await this.vehicleRepo.save(vehicle);

    // If driver has no active vehicle for this service type, auto-link it
    const serviceType = dto.category === 'MOTORCYCLE' ? 'MOTO' : 'TAXI';
    if (this.serviceProfileRepo) {
      let profile = await this.serviceProfileRepo.findOne({
        where: { driver_id: driverId, service_type: serviceType },
      });
      if (!profile) {
        profile = this.serviceProfileRepo.create({
          driver_id: driverId,
          service_type: serviceType,
          active_vehicle_id: saved.id,
          is_enabled: serviceType === 'MOTO',
          is_online: false,
          eligibility_status: 'PENDING',
        });
        await this.serviceProfileRepo.save(profile);
      } else if (!profile.active_vehicle_id) {
        await this.serviceProfileRepo.update(profile.id, { active_vehicle_id: saved.id });
      }
    }

    return saved;
  }

  async uploadVehicleDocument(driverId: string, vehicleId: string, dto: UploadVehicleDocumentDto) {
    if (!this.vehicleRepo || !this.vehicleDocRepo) {
      throw new BadRequestException('Repositories not initialized');
    }
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId, driver_id: driverId } });
    if (!vehicle) throw new NotFoundException('ไม่พบข้อมูลยานพาหนะ');

    const doc = this.vehicleDocRepo.create({
      vehicle_id: vehicleId,
      document_type: dto.document_type as any,
      file_url: dto.file_url,
      expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : null,
      verification_status: 'PENDING',
    });
    const savedDoc = await this.vehicleDocRepo.save(doc);

    // If vehicle was REJECTED, reset to PENDING when new documents are provided
    if (vehicle.verification_status === 'REJECTED') {
      await this.vehicleRepo.update(vehicleId, {
        verification_status: 'PENDING',
        rejection_reason: null,
      });
    }

    return savedDoc;
  }

  async selectActiveVehicle(driverId: string, vehicleId: string) {
    if (!this.vehicleRepo || !this.serviceProfileRepo) {
      throw new BadRequestException('Repositories not initialized');
    }
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId, driver_id: driverId } });
    if (!vehicle) throw new NotFoundException('ไม่พบข้อมูลยานพาหนะ');

    const serviceType: 'MOTO' | 'TAXI' = vehicle.category === 'MOTORCYCLE' ? 'MOTO' : 'TAXI';

    // Gate verification: TAXI strictly requires VERIFIED status
    if (serviceType === 'TAXI' && vehicle.verification_status !== 'VERIFIED') {
      throw new BadRequestException('ยานพาหนะสำหรับบริการ TAXI ต้องผ่านการตรวจสอบเอกสาร (VERIFIED) จากเจ้าหน้าที่ก่อนเลือกใช้งาน');
    }

    // For MOTO: allow VERIFIED or LEGACY_REVIEW (backward compatibility)
    if (serviceType === 'MOTO' && !['VERIFIED', 'LEGACY_REVIEW'].includes(vehicle.verification_status)) {
      throw new BadRequestException('ยานพาหนะสำหรับบริการ MOTO ไม่อยู่ในสถานะที่ใช้งานได้');
    }

    let profile = await this.serviceProfileRepo.findOne({
      where: { driver_id: driverId, service_type: serviceType },
    });

    if (!profile) {
      profile = this.serviceProfileRepo.create({
        driver_id: driverId,
        service_type: serviceType,
        active_vehicle_id: vehicleId,
        is_enabled: true,
        is_online: false,
        eligibility_status: serviceType === 'TAXI' ? 'ELIGIBLE' : 'ELIGIBLE',
      });
      await this.serviceProfileRepo.save(profile);
    } else {
      await this.serviceProfileRepo.update(profile.id, {
        active_vehicle_id: vehicleId,
        eligibility_status: 'ELIGIBLE',
      });
    }

    return { success: true, service_type: serviceType, active_vehicle_id: vehicleId };
  }

  // ==========================================
  // DRIVER SERVICE PROFILE API (GATE 2.7)
  // ==========================================

  async getServiceProfiles(driverId: string) {
    const profiles = this.serviceProfileRepo
      ? await this.serviceProfileRepo.find({
          where: { driver_id: driverId },
          relations: ['active_vehicle'],
        })
      : [];

    const activeAssignment = this.assignmentRepo
      ? await this.assignmentRepo.findOne({
          where: { driver_id: driverId },
        })
      : null;

    return {
      profiles,
      active_assignment: activeAssignment
        ? {
            trip_id: activeAssignment.trip_id,
            service_type: activeAssignment.service_type,
            state: activeAssignment.state,
            assigned_at: activeAssignment.assigned_at,
          }
        : null,
    };
  }

  async toggleServiceAvailability(driverId: string, serviceType: 'MOTO' | 'TAXI', dto: ToggleServiceDto) {
    if (!this.serviceProfileRepo) throw new BadRequestException('ServiceProfile repository not initialized');

    let profile = await this.serviceProfileRepo.findOne({
      where: { driver_id: driverId, service_type: serviceType },
      relations: ['active_vehicle'],
    });

    if (!profile) {
      const category = serviceType === 'MOTO' ? 'MOTORCYCLE' : 'PUBLIC_TAXI';
      const defaultVehicle = this.vehicleRepo
        ? await this.vehicleRepo.findOne({
            where: { driver_id: driverId, category: category as any },
          })
        : null;

      profile = this.serviceProfileRepo.create({
        driver_id: driverId,
        service_type: serviceType,
        active_vehicle_id: defaultVehicle?.id || null,
        is_enabled: true,
        is_online: false,
        eligibility_status: serviceType === 'MOTO' ? 'ELIGIBLE' : 'PENDING',
      });
      profile = await this.serviceProfileRepo.save(profile);
    }

    // Eligibility and verification enforcement on going online
    if (dto.is_online === true) {
      if (!profile.active_vehicle_id) {
        throw new BadRequestException(`กรุณาเลือกยานพาหนะที่ต้องการใช้สำหรับบริการ ${serviceType} ก่อนเปิดรับงาน`);
      }

      const vehicle = profile.active_vehicle || (this.vehicleRepo ? await this.vehicleRepo.findOne({ where: { id: profile.active_vehicle_id } }) : null);
      if (!vehicle) {
        throw new BadRequestException('ไม่พบข้อมูลยานพาหนะที่เลือก');
      }

      if (serviceType === 'TAXI') {
        if (vehicle.verification_status !== 'VERIFIED') {
          throw new BadRequestException('ไม่สามารถเปิดรับงาน TAXI ได้ เนื่องจากยานพาหนะยังไม่ผ่านการอนุมัติ (ต้องเป็น VERIFIED)');
        }
        if (profile.eligibility_status !== 'ELIGIBLE') {
          throw new BadRequestException('สถานะของคุณยังไม่ผ่านคุณสมบัติผู้ขับ TAXI');
        }
      } else if (serviceType === 'MOTO') {
        if (!['VERIFIED', 'LEGACY_REVIEW'].includes(vehicle.verification_status)) {
          throw new BadRequestException('ยานพาหนะไม่อยู่ในสถานะพร้อมให้บริการ');
        }
      }
    }

    const updates: Partial<DriverServiceProfileEntity> = {};
    if (typeof dto.is_online === 'boolean') updates.is_online = dto.is_online;
    if (typeof dto.is_enabled === 'boolean') updates.is_enabled = dto.is_enabled;

    await this.serviceProfileRepo.update(profile.id, updates);

    // Redis presence update
    const redisKey = `driver:${driverId}:services:${serviceType}`;
    if (dto.is_online !== undefined) {
      if (dto.is_online) {
        await this.redis.hset(redisKey, 'online', '1', 'vehicleId', profile.active_vehicle_id || '');
      } else {
        await this.redis.hset(redisKey, 'online', '0');
      }
    }

    return {
      success: true,
      service_type: serviceType,
      ...updates,
    };
  }
}
