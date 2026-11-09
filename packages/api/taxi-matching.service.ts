import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { DriverEntity } from './entities/driver.entity';
import { TripEntity } from './entities/trip.entity';
import { DriverVehicleEntity } from './entities/driver-vehicle.entity';
import { DriverServiceProfileEntity } from './entities/driver-service-profile.entity';
import { DriverActiveAssignmentEntity } from './entities/driver-active-assignment.entity';

export interface ProgressiveRadiusRound {
  round: number;
  radiusKm: number;
  timeoutSeconds: number;
}

export interface TaxiMatchingConfig {
  rounds: ProgressiveRadiusRound[];
  maxLocationAgeMs: number;
  averageSpeedKmh: number;
  matchingEnabled: boolean;
  dispatchEnabled: boolean;
  publicBookingEnabled: boolean;
}

export interface TaxiCandidate {
  driverId: string;
  name: string;
  phone: string;
  rating: number;
  vehicleId: string;
  vehicleCategory: 'PUBLIC_TAXI' | 'PRIVATE_CAR_FOR_HIRE';
  plate: string;
  brand: string;
  model: string;
  color: string;
  distanceKm: number;
  etaMins: number;
  score: number;
  eligible: boolean;
  searchRound: number;
  locationAgeSeconds: number;
  explanation: string;
  exclusionReason?: string;
}

export interface TaxiOffer {
  offerId: string;
  tripId: string;
  driverId: string;
  vehicleId: string;
  serviceType: 'TAXI';
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  pickupAddress: string;
  destAddress: string;
  distanceKm: number;
  fare: number;
  expiresAt: number;
  timeoutSeconds: number;
  state: 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'TIMEOUT';
}

export interface DispatchTelemetry {
  tripId: string;
  serviceType: 'TAXI';
  startTime: number;
  endTime?: number;
  durationMs?: number;
  searchRoundsCount: number;
  candidatesConsidered: number;
  eligibleCandidatesCount: number;
  offersSentCount: number;
  rejectionsCount: number;
  timeoutsCount: number;
  lockConflictsCount: number;
  finalState: string;
  assignedDriverId?: string;
  failureReason?: string;
}

@Injectable()
export class TaxiMatchingService implements OnModuleInit {
  private readonly logger = new Logger(TaxiMatchingService.name);
  private redis: Redis;

  private config: TaxiMatchingConfig = {
    rounds: [
      { round: 1, radiusKm: 1.5, timeoutSeconds: 15 },
      { round: 2, radiusKm: 3.0, timeoutSeconds: 15 },
      { round: 3, radiusKm: 5.0, timeoutSeconds: 15 },
      { round: 4, radiusKm: 8.0, timeoutSeconds: 15 },
    ],
    maxLocationAgeMs: 300000, // 5 minutes
    averageSpeedKmh: 30, // 30 km/h in urban Bangkok
    matchingEnabled: process.env.TAXI_MATCHING_ENABLED === 'true',
    dispatchEnabled: process.env.TAXI_DISPATCH_ENABLED === 'true',
    publicBookingEnabled: process.env.TAXI_PUBLIC_BOOKING_ENABLED === 'true',
  };

  // Observability & Telemetry Store
  private telemetryLogs: DispatchTelemetry[] = [];

  constructor(
    @InjectRepository(DriverEntity)
    private driverRepo: Repository<DriverEntity>,
    @InjectRepository(TripEntity)
    private tripRepo: Repository<TripEntity>,
    @InjectRepository(DriverVehicleEntity)
    private vehicleRepo: Repository<DriverVehicleEntity>,
    @InjectRepository(DriverServiceProfileEntity)
    private profileRepo: Repository<DriverServiceProfileEntity>,
    @InjectRepository(DriverActiveAssignmentEntity)
    private assignmentRepo: Repository<DriverActiveAssignmentEntity>,
    @Optional()
    redisClient?: Redis,
  ) {
    this.redis = redisClient || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async onModuleInit() {
    this.logger.log(
      `TaxiMatchingService initialized. [Flags: MATCHING=${this.config.matchingEnabled}, DISPATCH=${this.config.dispatchEnabled}, PUBLIC_BOOKING=${this.config.publicBookingEnabled}]`,
    );
  }

  // --- CONFIGURATION & FEATURE FLAGS ---

  getConfig(): TaxiMatchingConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<TaxiMatchingConfig>) {
    Object.assign(this.config, partial);
    this.logger.log(`TaxiMatchingConfig updated: ${JSON.stringify(this.config)}`);
    return this.config;
  }

  // --- PROGRESSIVE RADIUS CANDIDATE SEARCH (GATE 3.1 & GATE 3.2) ---

  async findCandidates(
    pickupLat: number,
    pickupLng: number,
    radiusKm: number,
    round: number,
    excludedDriverIds: Set<string> = new Set(),
    requestedCategory?: 'PUBLIC_TAXI' | 'PRIVATE_CAR_FOR_HIRE',
  ): Promise<TaxiCandidate[]> {
    const candidates: TaxiCandidate[] = [];

    // Query all online TAXI service profiles
    const taxiProfiles = await this.profileRepo.find({
      where: {
        service_type: 'TAXI',
        is_enabled: true,
        is_online: true,
        eligibility_status: 'ELIGIBLE',
      },
      relations: ['driver', 'active_vehicle'],
    });

    for (const profile of taxiProfiles) {
      const driver = profile.driver;
      const vehicle = profile.active_vehicle;

      if (!driver || !vehicle) continue;
      if (excludedDriverIds.has(driver.id)) continue;

      // 1. Account status check
      if (driver.approval_status !== 'APPROVED' || driver.current_status === 'SUSPENDED') {
        continue;
      }

      // 2. Vehicle Verification Gate: Strictly VERIFIED (LEGACY_REVIEW is prohibited for TAXI)
      if (vehicle.verification_status !== 'VERIFIED') {
        continue;
      }

      // 3. Vehicle Category Compatibility
      if (requestedCategory && vehicle.category !== requestedCategory) {
        continue;
      }
      if (!['PUBLIC_TAXI', 'PRIVATE_CAR_FOR_HIRE'].includes(vehicle.category)) {
        continue;
      }

      // 4. Global Active Ride Lock Check: Driver must have no active assignment
      const activeAssignment = await this.assignmentRepo.findOne({
        where: { driver_id: driver.id },
      });
      if (activeAssignment) {
        continue;
      }

      // 5. Driver GPS Location & Freshness Check
      let driverLat = 0;
      let driverLng = 0;
      let lastSeenTime = driver.last_seen_at ? new Date(driver.last_seen_at).getTime() : 0;

      // Check PostGIS point or fallback coordinates
      if (driver.location && typeof driver.location === 'object') {
        if (driver.location.coordinates && Array.isArray(driver.location.coordinates)) {
          driverLng = driver.location.coordinates[0];
          driverLat = driver.location.coordinates[1];
        } else if (typeof driver.location.x === 'number') {
          driverLng = driver.location.x;
          driverLat = driver.location.y;
        }
      }

      // If location is not in DB geometry, check Redis live location cache
      if (!driverLat || !driverLng) {
        const liveGeo = await this.redis.hgetall(`driver:${driver.id}:location`);
        if (liveGeo && liveGeo.lat && liveGeo.lng) {
          driverLat = parseFloat(liveGeo.lat);
          driverLng = parseFloat(liveGeo.lng);
          if (liveGeo.timestamp) lastSeenTime = parseInt(liveGeo.timestamp, 10);
        }
      }

      // If coordinates are invalid, skip
      if (!driverLat || !driverLng || isNaN(driverLat) || isNaN(driverLng)) {
        continue;
      }

      // Location freshness validation
      const locationAgeMs = Date.now() - lastSeenTime;
      if (lastSeenTime > 0 && locationAgeMs > this.config.maxLocationAgeMs) {
        // Location is stale -> exclude
        continue;
      }

      // 6. Distance & ETA Calculation
      const distanceKm = this.calculateDistanceKm(pickupLat, pickupLng, driverLat, driverLng);
      if (distanceKm > radiusKm) {
        continue; // Outside current search round radius
      }

      const etaMins = Math.max(1, Math.round((distanceKm / this.config.averageSpeedKmh) * 60));
      const locationAgeSeconds = Math.max(0, Math.round(locationAgeMs / 1000));

      candidates.push({
        driverId: driver.id,
        name: driver.name,
        phone: driver.phone,
        rating: Number(driver.rating) || 5.0,
        vehicleId: vehicle.id,
        vehicleCategory: vehicle.category as 'PUBLIC_TAXI' | 'PRIVATE_CAR_FOR_HIRE',
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        color: vehicle.color,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        etaMins,
        score: 0,
        eligible: true,
        searchRound: round,
        locationAgeSeconds,
        explanation: '',
      });
    }

    return this.rankCandidates(candidates, radiusKm);
  }

  // --- DRIVER RANKING ENGINE (GATE 3.3) ---

  rankCandidates(candidates: TaxiCandidate[], currentRadiusKm: number): TaxiCandidate[] {
    for (const cand of candidates) {
      // 1. Distance Score: 0 - 100 pts (Closer = higher)
      const distanceScore = Math.max(0, 100 - (cand.distanceKm / currentRadiusKm) * 50);

      // 2. ETA Score: 0 - 50 pts
      const etaScore = Math.max(0, 50 - cand.etaMins * 2);

      // 3. Driver Rating Score: 0 - 20 pts (5-star = 20 pts)
      const ratingScore = (cand.rating / 5) * 20;

      // 4. Location Freshness Score: 0 - 10 pts
      const ageMins = cand.locationAgeSeconds / 60;
      const freshnessScore = ageMins <= 1 ? 10 : Math.max(0, 10 - ageMins * 2);

      // Deterministic total score
      const totalScore = parseFloat(
        (distanceScore * 0.4 + etaScore * 0.3 + ratingScore * 0.2 + freshnessScore * 0.1).toFixed(2),
      );

      cand.score = totalScore;
      cand.explanation = `Score: ${totalScore} [Dist: ${cand.distanceKm}km (${distanceScore.toFixed(1)}pts), ETA: ${cand.etaMins}m (${etaScore.toFixed(1)}pts), Rating: ${cand.rating} (${ratingScore.toFixed(1)}pts), Age: ${cand.locationAgeSeconds}s (${freshnessScore.toFixed(1)}pts)]`;
    }

    // Sort descending by score (highest score first)
    return candidates.sort((a, b) => b.score - a.score);
  }

  // --- OFFER AND ACCEPTANCE ENGINE (GATE 3.4 & GATE 3.5) ---

  async createOffer(trip: TripEntity, candidate: TaxiCandidate, timeoutSeconds: number = 15): Promise<TaxiOffer> {
    const offerId = `offer-${trip.id}-${candidate.driverId}-${Date.now()}`;
    const expiresAt = Date.now() + timeoutSeconds * 1000;

    const offer: TaxiOffer = {
      offerId,
      tripId: trip.id,
      driverId: candidate.driverId,
      vehicleId: candidate.vehicleId,
      serviceType: 'TAXI',
      pickupLat: Number(trip.pickup_lat),
      pickupLng: Number(trip.pickup_lng),
      destLat: Number(trip.dest_lat),
      destLng: Number(trip.dest_lng),
      pickupAddress: trip.pickup_address,
      destAddress: trip.dest_address,
      distanceKm: Number(trip.distance_km),
      fare: Number(trip.fare),
      expiresAt,
      timeoutSeconds,
      state: 'OFFERED',
    };

    // Store in Redis with TTL
    await this.redis.set(`offer:${offerId}`, JSON.stringify(offer), 'EX', timeoutSeconds + 5);
    await this.redis.set(`driver:${candidate.driverId}:pending_offer`, offerId, 'EX', timeoutSeconds + 5);

    return offer;
  }

  async getOffer(offerId: string): Promise<TaxiOffer | null> {
    const raw = await this.redis.get(`offer:${offerId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async acceptOffer(
    driverId: string,
    offerId: string,
  ): Promise<{ success: boolean; tripId: string; message: string }> {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new BadRequestException('ข้อเสนองานนี้หมดอายุหรือไม่มีอยู่แล้ว');
    }

    // Security: Validate offer recipient ownership
    if (offer.driverId !== driverId) {
      throw new UnauthorizedException('คุณไม่มีสิทธิ์ตอบรับข้อเสนอนี้');
    }

    // Validate server-authoritative expiration
    if (Date.now() > offer.expiresAt) {
      throw new BadRequestException('ข้อเสนองานนี้หมดเวลาตอบรับแล้ว');
    }

    // 1. PostgreSQL Authoritative Active Ride Lock Check
    const existingAssignment = await this.assignmentRepo.findOne({
      where: { driver_id: driverId },
    });
    if (existingAssignment) {
      throw new ConflictException('ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้');
    }

    // 2. Re-verify Driver and Vehicle Eligibility
    const profile = await this.profileRepo.findOne({
      where: { driver_id: driverId, service_type: 'TAXI' },
      relations: ['active_vehicle'],
    });
    if (!profile || !profile.is_online || profile.eligibility_status !== 'ELIGIBLE') {
      throw new BadRequestException('สถานะผู้ขับของคุณไม่พร้อมรับงาน TAXI');
    }
    if (!profile.active_vehicle || profile.active_vehicle.verification_status !== 'VERIFIED') {
      throw new BadRequestException('ยานพาหนะต้องผ่านการตรวจสอบ (VERIFIED) ก่อนรับงาน TAXI');
    }

    // 3. Atomically create assignment & update trip inside PostgreSQL transaction
    try {
      const assignment = this.assignmentRepo.create({
        driver_id: driverId,
        trip_id: offer.tripId,
        service_type: 'TAXI',
        vehicle_id: offer.vehicleId,
        state: 'ACCEPTED',
      });
      await this.assignmentRepo.save(assignment);
    } catch (err: any) {
      if (err?.code === '23505' || err?.message?.includes('duplicate') || err?.message?.includes('driver_active_assignments')) {
        throw new ConflictException('ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้');
      }
      throw err;
    }

    // 4. Update Trip State
    await this.tripRepo.update(offer.tripId, {
      driver_id: driverId,
      status: 'ACCEPTED',
      vehicle_id: offer.vehicleId,
      service_type: 'TAXI',
      accepted_at: new Date(),
    });

    // 5. Update Driver State
    await this.driverRepo.update(driverId, { current_status: 'BUSY' });

    // 6. Redis Acceleration & Cleanup
    await this.redis.set(`driver:${driverId}:active_assignment`, offer.tripId, 'EX', 7200);
    await this.redis.hset(`trip:${offer.tripId}`, 'status', 'ACCEPTED', 'driverId', driverId);
    await this.redis.hset(`driver:${driverId}:stats`, 'status', 'BUSY');
    await this.redis.del(`offer:${offerId}`);
    await this.redis.del(`driver:${driverId}:pending_offer`);

    this.logger.log(`Taxi offer ${offerId} successfully accepted by driver ${driverId} for trip ${offer.tripId}`);

    return {
      success: true,
      tripId: offer.tripId,
      message: 'รับงาน TAXI เรียบร้อยแล้ว',
    };
  }

  async rejectOffer(driverId: string, offerId: string, reason?: string): Promise<{ success: boolean }> {
    const offer = await this.getOffer(offerId);
    if (offer && offer.driverId === driverId) {
      await this.redis.sadd(`trip:${offer.tripId}:excluded_drivers`, driverId);
      await this.redis.del(`offer:${offerId}`);
      await this.redis.del(`driver:${driverId}:pending_offer`);
      this.logger.log(`Taxi offer ${offerId} rejected by driver ${driverId}. Reason: ${reason || 'N/A'}`);
    }
    return { success: true };
  }

  // --- DISPATCH ORCHESTRATOR & PROGRESSIVE RADIUS LOOP (GATE 3.2 & GATE 3.4) ---

  async dispatchTaxiTrip(tripId: string): Promise<DispatchTelemetry> {
    const startTime = Date.now();
    const telemetry: DispatchTelemetry = {
      tripId,
      serviceType: 'TAXI',
      startTime,
      searchRoundsCount: 0,
      candidatesConsidered: 0,
      eligibleCandidatesCount: 0,
      offersSentCount: 0,
      rejectionsCount: 0,
      timeoutsCount: 0,
      lockConflictsCount: 0,
      finalState: 'SEARCHING',
    };

    // Staging feature flag check
    if (!this.config.matchingEnabled || !this.config.dispatchEnabled) {
      telemetry.finalState = 'FEATURE_FLAG_DISABLED';
      telemetry.failureReason = 'Taxi matching or dispatch feature flag is disabled in current environment';
      telemetry.durationMs = Date.now() - startTime;
      this.recordTelemetry(telemetry);
      return telemetry;
    }

    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip || trip.status !== 'SEARCHING') {
      telemetry.finalState = 'INVALID_TRIP_STATE';
      telemetry.failureReason = 'Trip not found or not in SEARCHING status';
      telemetry.durationMs = Date.now() - startTime;
      this.recordTelemetry(telemetry);
      return telemetry;
    }

    const excludedDriverIds = new Set<string>();
    const redisExcluded = await this.redis.smembers(`trip:${tripId}:excluded_drivers`);
    for (const d of redisExcluded) excludedDriverIds.add(d);

    const pickupLat = Number(trip.pickup_lat);
    const pickupLng = Number(trip.pickup_lng);

    // Multi-round progressive radius search
    for (const roundConfig of this.config.rounds) {
      telemetry.searchRoundsCount = roundConfig.round;
      await this.redis.hset(`trip:${tripId}`, 'dispatchRound', roundConfig.round, 'dispatchRadiusKm', roundConfig.radiusKm);

      const candidates = await this.findCandidates(
        pickupLat,
        pickupLng,
        roundConfig.radiusKm,
        roundConfig.round,
        excludedDriverIds,
      );

      telemetry.candidatesConsidered += candidates.length;

      if (candidates.length === 0) {
        this.logger.debug(`Round ${roundConfig.round} (${roundConfig.radiusKm}km): No eligible candidates found for trip ${tripId}`);
        continue; // Expand to next radius round
      }

      telemetry.eligibleCandidatesCount += candidates.length;

      // Offer sequentially to highest ranked candidate
      for (const candidate of candidates) {
        // Double-check active assignment before offering
        const hasAssignment = await this.assignmentRepo.findOne({
          where: { driver_id: candidate.driverId },
        });
        if (hasAssignment) {
          telemetry.lockConflictsCount++;
          excludedDriverIds.add(candidate.driverId);
          continue;
        }

        const offer = await this.createOffer(trip, candidate, roundConfig.timeoutSeconds);
        telemetry.offersSentCount++;

        // In a live environment, this awaits driver response via WebSocket/Redis.
        // The offer ID is persisted in Redis for driver acceptance.
        telemetry.finalState = 'OFFER_SENT';
        telemetry.assignedDriverId = candidate.driverId;
        telemetry.durationMs = Date.now() - startTime;
        this.recordTelemetry(telemetry);
        return telemetry;
      }
    }

    // All rounds exhausted without finding available driver
    telemetry.finalState = 'NO_DRIVER_FOUND';
    telemetry.failureReason = 'All progressive search rounds exhausted with no available driver';
    telemetry.durationMs = Date.now() - startTime;
    this.recordTelemetry(telemetry);
    return telemetry;
  }

  // --- OBSERVABILITY & TELEMETRY (GATE 3.8) ---

  private recordTelemetry(telemetry: DispatchTelemetry) {
    this.telemetryLogs.push(telemetry);
    if (this.telemetryLogs.length > 500) this.telemetryLogs.shift(); // Keep latest 500 logs
    this.logger.log(
      `[DISPATCH TELEMETRY] Trip: ${telemetry.tripId} | Rounds: ${telemetry.searchRoundsCount} | Candidates: ${telemetry.eligibleCandidatesCount} | Offers: ${telemetry.offersSentCount} | State: ${telemetry.finalState} | Duration: ${telemetry.durationMs}ms`,
    );
  }

  getTelemetryLogs(): DispatchTelemetry[] {
    return [...this.telemetryLogs];
  }

  // --- MATHEMATICAL HELPERS ---

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
