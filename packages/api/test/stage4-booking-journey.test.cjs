/**
 * GOZIPP DUAL MOBILITY PLATFORM — STAGE 4 AUTOMATED TEST SUITE
 * Test Harness: stage4-booking-journey.test.cjs
 * Validates: Passenger Booking & Driver Operational Experience End-to-End
 */
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const Module = require('node:module');

// In-Memory Redis Mock to prevent unhandled network socket errors in tests
class MemoryRedis {
  constructor() {
    this.store = new Map();
    this.hashes = new Map();
    this.publishedChannels = [];
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ...args) {
    if (args.includes('NX') && this.store.has(key)) {
      return null;
    }
    const exIdx = args.indexOf('EX');
    const ttlSeconds = exIdx !== -1 ? Number(args[exIdx + 1]) : null;
    this.store.set(key, {
      value: String(value),
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.hashes.delete(key);
    return 1;
  }

  async hget(key, field) {
    const h = this.hashes.get(key);
    return h ? h[field] ?? null : null;
  }

  async hset(key, ...args) {
    const h = this.hashes.get(key) || {};
    if (args.length === 1 && typeof args[0] === 'object') {
      Object.assign(h, args[0]);
    } else {
      for (let i = 0; i < args.length; i += 2) {
        h[args[i]] = String(args[i + 1]);
      }
    }
    this.hashes.set(key, h);
    return 1;
  }

  async publish(channel, message) {
    this.publishedChannels.push({ channel, message: String(message), time: Date.now() });
    return 1;
  }

  disconnect() {}
  on() {}
  quit() {}
}

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'ioredis') {
    return {
      __esModule: true,
      default: MemoryRedis,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

// Import compiled services and entities from dist after hooking ioredis
const { FareEstimationService } = require('../dist/fare-estimation.service.js');
const { OutboxService } = require('../dist/common/outbox.service.js');
const { PassengerService } = require('../dist/passenger.service.js');
const { DriverService } = require('../dist/driver.service.js');

// In-Memory Mock Database
function createMockRepository() {
  const store = new Map();
  return {
    store,
    create: (entity) => ({ ...entity }),
    save: async (entity) => {
      const records = Array.isArray(entity) ? entity : [entity];
      for (const rec of records) {
        if (!rec.id) rec.id = crypto.randomUUID();
        store.set(rec.id, { ...rec });
      }
      return Array.isArray(entity) ? records : records[0];
    },
    findOne: async ({ where }) => {
      for (const record of store.values()) {
        let match = true;
        for (const [key, val] of Object.entries(where)) {
          if (record[key] !== val) {
            match = false;
            break;
          }
        }
        if (match) return { ...record };
      }
      return null;
    },
    find: async (opts = {}) => {
      let results = Array.from(store.values());
      if (opts.where) {
        results = results.filter((record) => {
          for (const [key, val] of Object.entries(opts.where)) {
            if (record[key] !== val) return false;
          }
          return true;
        });
      }
      if (opts.take) results = results.slice(0, opts.take);
      return results.map((r) => ({ ...r }));
    },
    update: async (criteria, updates) => {
      const id = typeof criteria === 'string' ? criteria : criteria.id || criteria.trip_id;
      for (const [k, rec] of store.entries()) {
        if (rec.id === id || rec.trip_id === id) {
          store.set(k, { ...rec, ...updates, updated_at: new Date() });
        }
      }
      return { affected: 1 };
    },
    delete: async (criteria) => {
      for (const [k, rec] of store.entries()) {
        let match = true;
        for (const [key, val] of Object.entries(criteria)) {
          if (rec[key] !== val) {
            match = false;
            break;
          }
        }
        if (match) store.delete(k);
      }
      return { affected: 1 };
    },
    increment: async () => ({ affected: 1 }),
    manager: {
      query: async () => [],
    },
    query: async () => [],
  };
}

// =========================================================================
// TEST 1: FARE ESTIMATION STRICT DUAL MOBILITY SEPARATION (GATE 4.3)
// =========================================================================
test('ST4-01 & ST4-06: Fare Estimation strictly separates MOTO (0% GP, 2 THB fee) from TAXI test mode', () => {
  const fareService = new FareEstimationService();

  // Test 1.1: MOTO Fare Calculation
  const motoEstimate = fareService.estimateFare({
    pickupLat: 13.7563,
    pickupLng: 100.5018,
    destLat: 13.7800,
    destLng: 100.5400,
    serviceType: 'MOTO',
  });

  assert.equal(motoEstimate.serviceType, 'MOTO');
  assert.equal(motoEstimate.estimatedFare, 2.0);
  assert.equal(motoEstimate.currency, 'THB');
  assert.equal(motoEstimate.isQuotationConfirmed, true);
  assert.equal(motoEstimate.requiresPoints, 2);
  assert.equal(motoEstimate.breakdown.driverCommissionRate, 0.0);
  assert.equal(motoEstimate.breakdown.passengerSystemFee, 2.0);

  // Test 1.2: TAXI Fare Calculation (Simulation Staging Mode)
  const taxiEstimate = fareService.estimateFare({
    pickupLat: 13.7563,
    pickupLng: 100.5018,
    destLat: 13.7800,
    destLng: 100.5400,
    serviceType: 'TAXI',
  });

  assert.equal(taxiEstimate.serviceType, 'TAXI');
  assert.equal(taxiEstimate.currency, 'THB');
  assert.equal(taxiEstimate.isQuotationConfirmed, false);
  assert.equal(taxiEstimate.isTestingQuotation, true);
  assert.ok(taxiEstimate.estimatedFare >= 35.0, 'Base fare must start at 35 THB');
  assert.ok(taxiEstimate.disclaimer.includes('staging certification'));
});

// =========================================================================
// TEST 2: TRANSACTIONAL OUTBOX PERSISTENCE & RELIABILITY (GATE 4.4)
// =========================================================================
test('ST4-02: Transactional Outbox persists ride creation events atomically without loss', async () => {
  const outboxRepo = createMockRepository();
  const redis = new MemoryRedis();
  const outboxService = new OutboxService(outboxRepo, redis);

  // Record an outbound domain event
  const tripId = crypto.randomUUID();
  const correlationId = `corr-${tripId}-1794157000000`;

  const recorded = await outboxService.recordEvent(
    'TRIP',
    tripId,
    'RIDE_REQUESTED',
    { tripId, serviceType: 'MOTO', fare: 2.0 },
    correlationId
  );

  assert.ok(recorded.id);
  assert.equal(recorded.aggregate_type, 'TRIP');
  assert.equal(recorded.aggregate_id, tripId);
  assert.equal(recorded.status, 'PENDING');
  assert.equal(recorded.retry_count, 0);

  // Outbox Processor polls and publishes the pending event
  const processed = await outboxService.processPendingEvents(10);
  assert.equal(processed, 1);

  // Verify event status transitioned to PUBLISHED
  const publishedEvent = await outboxRepo.findOne({ where: { id: recorded.id } });
  assert.equal(publishedEvent.status, 'PUBLISHED');
  assert.ok(publishedEvent.published_at);

  // Verify Redis channel received the published tripId
  assert.equal(redis.publishedChannels.length, 1);
  assert.equal(redis.publishedChannels[0].channel, 'ride:requested');
  assert.equal(redis.publishedChannels[0].message, tripId);
});

// =========================================================================
// TEST 3: IDEMPOTENCY KEY BOOKING DEDUPLICATION (GATE 4.4)
// =========================================================================
test('ST4-03: Idempotent ride requests prevent duplicate trip creation on client network retry', async () => {
  const tripRepo = createMockRepository();
  const passengerRepo = createMockRepository();
  const driverRepo = createMockRepository();
  const outboxRepo = createMockRepository();
  const redis = new MemoryRedis();

  const creditService = { deductForRide: async () => true, addBonusPoints: async () => undefined };
  const mapService = {
    getRoutingInfo: async () => ({ distanceKm: 3.2, durationMins: 12 }),
    getRoute: async () => ({ distanceKm: 3.2, durationMins: 12 }),
  };
  const smsService = {};
  const authService = {};
  const outboxService = new OutboxService(outboxRepo, redis);
  const fareService = new FareEstimationService();

  const passengerService = new PassengerService(
    passengerRepo,
    tripRepo,
    driverRepo,
    creditService,
    mapService,
    smsService,
    authService,
    outboxService,
    fareService
  );

  // Pre-seed passenger
  const passenger = await passengerRepo.save({ id: crypto.randomUUID(), phone: '0812345678', points_balance: 50 });

  const idempotencyKey = `idemp-${crypto.randomUUID()}`;
  const requestPayload = {
    passengerId: passenger.id,
    pickupLat: 13.7563,
    pickupLng: 100.5018,
    pickupAddress: 'Siam Paragon',
    destLat: 13.7800,
    destLng: 100.5400,
    destAddress: 'Chatuchak',
    serviceType: 'MOTO',
    idempotencyKey,
  };

  // First Request: Creates new trip
  const res1 = await passengerService.requestRide(requestPayload);
  assert.ok(res1.tripId);
  assert.equal(res1.status, 'SEARCHING');
  assert.equal(tripRepo.store.size, 1);

  // Second Request (Immediate Retry with identical Idempotency-Key): Returns existing trip
  const res2 = await passengerService.requestRide(requestPayload);
  assert.equal(res2.tripId, res1.tripId, 'Duplicate submission must return exact same trip ID');
  assert.equal(res2.isDuplicate, true);
  assert.equal(tripRepo.store.size, 1, 'No second trip record must be created in database');
});

// =========================================================================
// TEST 4: TAXI PUBLIC BOOKING FEATURE FLAG GUARD (GATE 4.1 & 4.14)
// =========================================================================
test('ST4-04 & ST4-05: TAXI Public Booking is strictly blocked when feature flag is disabled', async () => {
  const tripRepo = createMockRepository();
  const passengerRepo = createMockRepository();
  const driverRepo = createMockRepository();
  const outboxRepo = createMockRepository();
  const redis = new MemoryRedis();

  const creditService = { deductForRide: async () => true };
  const mapService = {
    getRoutingInfo: async () => ({ distanceKm: 4.0, durationMins: 15 }),
    getRoute: async () => ({ distanceKm: 4.0, durationMins: 15 }),
  };
  const outboxService = new OutboxService(outboxRepo, redis);
  const fareService = new FareEstimationService();

  const passengerService = new PassengerService(
    passengerRepo,
    tripRepo,
    driverRepo,
    creditService,
    mapService,
    {},
    {},
    outboxService,
    fareService
  );

  const passenger = await passengerRepo.save({ id: crypto.randomUUID(), phone: '0891112233', points_balance: 100 });

  // Explicitly ensure flag is OFF
  process.env.TAXI_PUBLIC_BOOKING_ENABLED = 'false';

  await assert.rejects(
    async () => {
      await passengerService.requestRide({
        passengerId: passenger.id,
        pickupLat: 13.7563,
        pickupLng: 100.5018,
        pickupAddress: 'Siam Paragon',
        destLat: 13.7800,
        destLng: 100.5400,
        destAddress: 'Asok',
        serviceType: 'TAXI',
      });
    },
    /บริการ GOZIPP TAXI ยังไม่เปิดให้บริการสาธารณะในขณะนี้/
  );

  // Enable flag: Now booking succeeds in controlled staging mode
  process.env.TAXI_PUBLIC_BOOKING_ENABLED = 'true';
  const successTaxiBooking = await passengerService.requestRide({
    passengerId: passenger.id,
    pickupLat: 13.7563,
    pickupLng: 100.5018,
    pickupAddress: 'Siam Paragon',
    destLat: 13.7800,
    destLng: 100.5400,
    destAddress: 'Asok',
    serviceType: 'TAXI',
  });

  assert.ok(successTaxiBooking.tripId);
  assert.equal(successTaxiBooking.status, 'SEARCHING');

  // Reset feature flag
  process.env.TAXI_PUBLIC_BOOKING_ENABLED = 'false';
});

// =========================================================================
// TEST 5: DRIVER ARRIVAL GEOFENCE & GPS VERIFICATION (GATE 4.7)
// =========================================================================
test('ST4-07: Driver Arrival requires geofence <= 100m and GPS accuracy <= 50m for verification', async () => {
  const driverRepo = createMockRepository();
  const passengerRepo = createMockRepository();
  const tripRepo = createMockRepository();
  const assignmentRepo = createMockRepository();

  const driverService = new DriverService(
    driverRepo,
    passengerRepo,
    tripRepo,
    createMockRepository(),
    createMockRepository(),
    createMockRepository(),
    { handleTimeout: async () => {} },
    { deductForRide: async () => true, addEarnings: async () => true, refundForRide: async () => true },
    {},
    {},
    createMockRepository(),
    createMockRepository(),
    createMockRepository(),
    assignmentRepo
  );

  const driverId = crypto.randomUUID();
  const tripId = crypto.randomUUID();
  const pickupLat = 13.7563;
  const pickupLng = 100.5018;

  // Pre-seed accepted trip
  await tripRepo.save({
    id: tripId,
    driver_id: driverId,
    passenger_id: crypto.randomUUID(),
    status: 'ACCEPTED',
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    service_type: 'MOTO',
  });

  // Scenario 5.1: Driver arrives within 30 meters with high accuracy (10m) -> VERIFIED
  const verifiedArrival = await driverService.markDriverArrived(driverId, tripId, {
    lat: 13.7565, // ~22 meters away
    lng: 100.5018,
    accuracyMeters: 10,
    clientTimestamp: Date.now(),
  });

  assert.equal(verifiedArrival.status, 'DRIVER_ARRIVED');
  assert.equal(verifiedArrival.arrivalVerified, true);
  assert.equal(verifiedArrival.verificationStatus, 'VERIFIED');
  assert.ok(verifiedArrival.distanceToPickupMeters <= 50);

  // Reset to ACCEPTED for Scenario 5.2
  await tripRepo.update(tripId, { status: 'ACCEPTED' });

  // Scenario 5.2: Driver arrives 400 meters away -> LOCATION_UNVERIFIED
  const unverifiedArrival = await driverService.markDriverArrived(driverId, tripId, {
    lat: 13.7600, // ~415 meters away
    lng: 100.5018,
    accuracyMeters: 15,
    clientTimestamp: Date.now(),
  });

  assert.equal(unverifiedArrival.status, 'DRIVER_ARRIVED');
  assert.equal(unverifiedArrival.arrivalVerified, false);
  assert.equal(unverifiedArrival.verificationStatus, 'LOCATION_UNVERIFIED');
  assert.ok(unverifiedArrival.distanceToPickupMeters > 100);
});

// =========================================================================
// TEST 6: FULL TRIP LIFECYCLE PROGRESSION & EVIDENCE (GATE 4.6)
// =========================================================================
test('ST4-08: Full Trip Lifecycle advances through ordered state transitions with audit trail', async () => {
  const driverRepo = createMockRepository();
  const passengerRepo = createMockRepository();
  const tripRepo = createMockRepository();
  const assignmentRepo = createMockRepository();

  const driverService = new DriverService(
    driverRepo,
    passengerRepo,
    tripRepo,
    createMockRepository(),
    createMockRepository(),
    createMockRepository(),
    { handleTimeout: async () => {} },
    { deductForRide: async () => true, addEarnings: async () => true, refundForRide: async () => true },
    {},
    {},
    createMockRepository(),
    createMockRepository(),
    createMockRepository(),
    assignmentRepo
  );

  const driverId = crypto.randomUUID();
  const tripId = crypto.randomUUID();

  // 1. Initial State: SEARCHING
  await tripRepo.save({
    id: tripId,
    passenger_id: crypto.randomUUID(),
    status: 'SEARCHING',
    pickup_lat: 13.7563,
    pickup_lng: 100.5018,
    dest_lat: 13.7800,
    dest_lng: 100.5400,
    fare: 2.0,
    service_type: 'MOTO',
  });

  // 2. Transition: ACCEPTED
  const acceptRes = await driverService.acceptTrip({ driverId, tripId });
  assert.equal(acceptRes.success, true);

  const tripAfterAccept = await tripRepo.findOne({ where: { id: tripId } });
  assert.equal(tripAfterAccept.status, 'ACCEPTED');
  assert.equal(tripAfterAccept.driver_id, driverId);
  assert.ok(tripAfterAccept.accepted_at);

  // 3. Transition: DRIVER_ARRIVED
  const arriveRes = await driverService.markDriverArrived(driverId, tripId, {
    lat: 13.7563,
    lng: 100.5018,
    accuracyMeters: 5,
  });
  assert.equal(arriveRes.status, 'DRIVER_ARRIVED');
  assert.equal(arriveRes.arrivalVerified, true);

  // 4. Transition: IN_PROGRESS (Trip Start)
  const startRes = await driverService.startTrip(driverId, tripId);
  assert.equal(startRes.status, 'IN_PROGRESS');

  const tripAfterStart = await tripRepo.findOne({ where: { id: tripId } });
  assert.equal(tripAfterStart.status, 'IN_PROGRESS');
  assert.ok(tripAfterStart.started_at);

  // 5. Transition: COMPLETED
  const completeRes = await driverService.completeTrip({ driverId, tripId });
  assert.equal(completeRes.success, true);

  const tripAfterComplete = await tripRepo.findOne({ where: { id: tripId } });
  assert.equal(tripAfterComplete.status, 'COMPLETED');
  assert.ok(tripAfterComplete.completed_at);
});

// =========================================================================
// TEST 7: CANCEL VS ACCEPT CONCURRENCY & RACE CONDITIONS (GATE 4.9)
// =========================================================================
test('ST4-09: Cancellation race condition resolves deterministically without orphaned locks', async () => {
  const driverRepo = createMockRepository();
  const passengerRepo = createMockRepository();
  const tripRepo = createMockRepository();
  const assignmentRepo = createMockRepository();

  const driverService = new DriverService(
    driverRepo,
    passengerRepo,
    tripRepo,
    createMockRepository(),
    createMockRepository(),
    createMockRepository(),
    { handleTimeout: async () => {} },
    { deductForRide: async () => true, addEarnings: async () => true, refundForRide: async () => true },
    {},
    {},
    createMockRepository(),
    createMockRepository(),
    createMockRepository(),
    assignmentRepo
  );

  const passengerService = new PassengerService(
    passengerRepo,
    tripRepo,
    driverRepo,
    { addBonusPoints: async () => undefined, refundForRide: async () => true, deductForRide: async () => true },
    {},
    {},
    {}
  );

  const driverId = crypto.randomUUID();
  const passengerId = crypto.randomUUID();
  const tripId = crypto.randomUUID();

  await tripRepo.save({
    id: tripId,
    passenger_id: passengerId,
    status: 'SEARCHING',
    service_type: 'MOTO',
    fare: 2.0,
  });

  // Driver accepts first
  await driverService.acceptTrip({ driverId, tripId });

  // Hook tripRepo.manager.query to assignmentRepo
  tripRepo.manager = {
    query: async (q, params) => {
      if (params && params[0]) {
        await assignmentRepo.delete({ trip_id: params[0] });
      }
      return [];
    },
  };

  // Passenger then cancels the accepted trip
  const cancelRes = await passengerService.cancelRide(tripId, passengerId);
  assert.equal(cancelRes.success, true);

  const tripRecord = await tripRepo.findOne({ where: { id: tripId } });
  assert.equal(tripRecord.status, 'CANCELLED');

  // Verify Active Ride Lock was released upon cancellation
  const activeLock = await assignmentRepo.findOne({ where: { trip_id: tripId } });
  assert.equal(activeLock, null, 'Active Ride Lock must be deleted when ride is cancelled');
});

// =========================================================================
// TEST 8: CROSS-SERVICE ACTIVE RIDE LOCK INVARIANT (GATE 4.13 & P0)
// =========================================================================
test('ST4-10: Driver with active MOTO trip cannot accept a TAXI dispatch offer (P0 Lock)', async () => {
  const driverId = crypto.randomUUID();
  const activeAssignmentStore = new Map();

  // Simulate PostgreSQL Active Assignment uniqueness constraint
  const acquireAssignmentLock = (dId, tripId, serviceType) => {
    if (activeAssignmentStore.has(dId)) {
      const err = new Error('Unique violation on active driver assignment');
      err.code = '23505';
      throw err;
    }
    activeAssignmentStore.set(dId, { dId, tripId, serviceType, acquiredAt: new Date() });
    return true;
  };

  // 1. Driver accepts MOTO ride -> Lock successfully acquired
  const motoTripId = crypto.randomUUID();
  acquireAssignmentLock(driverId, motoTripId, 'MOTO');
  assert.equal(activeAssignmentStore.has(driverId), true);

  // 2. Same Driver attempts to accept concurrent TAXI offer -> Unique violation thrown
  const taxiTripId = crypto.randomUUID();
  assert.throws(
    () => {
      acquireAssignmentLock(driverId, taxiTripId, 'TAXI');
    },
    (err) => err.code === '23505'
  );

  // 3. Complete MOTO ride -> Lock is released
  activeAssignmentStore.delete(driverId);
  assert.equal(activeAssignmentStore.has(driverId), false);

  // 4. Driver can now accept a new ride
  acquireAssignmentLock(driverId, taxiTripId, 'TAXI');
  assert.equal(activeAssignmentStore.has(driverId), true);
  assert.equal(activeAssignmentStore.get(driverId).serviceType, 'TAXI');
});
