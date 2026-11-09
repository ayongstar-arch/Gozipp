const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

class FakeRedis {
  constructor() {
    this.hashes = new Map();
    this.keys = new Map();
    this.sets = new Map();
  }
  async hset(key, ...args) {
    let hash = this.hashes.get(key) || {};
    if (args.length === 1 && typeof args[0] === 'object') {
      Object.assign(hash, args[0]);
    } else {
      for (let i = 0; i < args.length; i += 2) hash[args[i]] = String(args[i + 1]);
    }
    this.hashes.set(key, hash);
    return 1;
  }
  async hget(key, field) {
    const hash = this.hashes.get(key);
    return hash ? hash[field] || null : null;
  }
  async hgetall(key) {
    return this.hashes.get(key) || {};
  }
  async hdel(key, ...fields) {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    for (const f of fields) delete hash[f];
    return 1;
  }
  async set(key, value, ...options) {
    this.keys.set(key, String(value));
    return 'OK';
  }
  async get(key) {
    return this.keys.get(key) || null;
  }
  async del(key) {
    this.keys.delete(key);
    return 1;
  }
  async sadd(key, ...members) {
    let s = this.sets.get(key);
    if (!s) {
      s = new Set();
      this.sets.set(key, s);
    }
    for (const m of members) s.add(m);
    return members.length;
  }
  async smembers(key) {
    const s = this.sets.get(key);
    return s ? Array.from(s) : [];
  }
  async sismember(key, member) {
    const s = this.sets.get(key);
    return s ? (s.has(member) ? 1 : 0) : 0;
  }
  async zrem() { return 1; }
  async zrevrank() { return 0; }
  async zscore() { return '100'; }
  async zcard() { return 1; }
}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'ioredis') return { __esModule: true, default: FakeRedis };
  return originalLoad.call(this, request, parent, isMain);
};

const { TaxiMatchingService } = require('../dist/taxi-matching.service.js');
const { DriverService } = require('../dist/driver.service.js');

function createStage3MockEnvironment() {
  const drivers = new Map();
  const trips = new Map();
  const vehicles = new Map();
  const serviceProfiles = new Map();
  const activeAssignments = new Map();

  const driverRepo = {
    async findOne({ where }) {
      return drivers.get(where.id) || null;
    },
    async update(id, values) {
      const d = drivers.get(id);
      if (d) Object.assign(d, values);
      return { affected: 1 };
    },
    async increment(where, field, val) {
      const d = drivers.get(where.id);
      if (d) d[field] = (d[field] || 0) + val;
      return { affected: 1 };
    },
  };

  const tripRepo = {
    async findOne({ where }) {
      const t = trips.get(where.id);
      if (!t) return null;
      if (where.driver_id && t.driver_id !== where.driver_id) return null;
      return t;
    },
    async update(id, values) {
      const t = trips.get(id);
      if (t) Object.assign(t, values);
      return { affected: 1 };
    },
  };

  const vehicleRepo = {
    async findOne({ where }) {
      if (where.id) return vehicles.get(where.id) || null;
      for (const v of vehicles.values()) {
        if (where.driver_id && v.driver_id !== where.driver_id) continue;
        return v;
      }
      return null;
    },
  };

  const profileRepo = {
    async find({ where }) {
      const list = [];
      for (const sp of serviceProfiles.values()) {
        if (where.service_type && sp.service_type !== where.service_type) continue;
        if (where.is_enabled !== undefined && sp.is_enabled !== where.is_enabled) continue;
        if (where.is_online !== undefined && sp.is_online !== where.is_online) continue;
        if (where.eligibility_status && sp.eligibility_status !== where.eligibility_status) continue;

        // Populate relations
        const enriched = {
          ...sp,
          driver: drivers.get(sp.driver_id) || null,
          active_vehicle: vehicles.get(sp.active_vehicle_id) || null,
        };
        list.push(enriched);
      }
      return list;
    },
    async findOne({ where }) {
      const sp = serviceProfiles.get(`${where.driver_id}:${where.service_type}`);
      if (!sp) return null;
      return {
        ...sp,
        driver: drivers.get(sp.driver_id) || null,
        active_vehicle: vehicles.get(sp.active_vehicle_id) || null,
      };
    },
    async update(id, values) {
      for (const sp of serviceProfiles.values()) {
        if (sp.id === id) Object.assign(sp, values);
      }
      return { affected: 1 };
    },
  };

  const assignmentRepo = {
    create(data) {
      return { id: 'asgn-' + Math.random().toString(36).slice(2, 7), ...data };
    },
    async save(asgn) {
      if (activeAssignments.has(asgn.driver_id)) {
        const err = new Error('duplicate key value violates unique constraint "driver_active_assignments"');
        err.code = '23505';
        throw err;
      }
      activeAssignments.set(asgn.driver_id, asgn);
      return asgn;
    },
    async findOne({ where }) {
      return activeAssignments.get(where.driver_id) || null;
    },
    async update(where, values) {
      for (const a of activeAssignments.values()) {
        if (where.trip_id && a.trip_id === where.trip_id) Object.assign(a, values);
      }
      return { affected: 1 };
    },
    async delete(where) {
      for (const [driverId, a] of activeAssignments.entries()) {
        if (where.trip_id && a.trip_id === where.trip_id) {
          activeAssignments.delete(driverId);
        }
      }
      return { affected: 1 };
    },
  };

  const fakeRedis = new FakeRedis();

  const taxiMatchingService = new TaxiMatchingService(
    driverRepo,
    tripRepo,
    vehicleRepo,
    profileRepo,
    assignmentRepo,
    fakeRedis
  );

  // Enable feature flags for test environment
  taxiMatchingService.updateConfig({
    matchingEnabled: true,
    dispatchEnabled: true,
    publicBookingEnabled: true,
  });

  const driverService = new DriverService(
    driverRepo,
    { findOne: async () => ({ id: 'pass-1' }), update: async () => {}, increment: async () => {} },
    tripRepo,
    {}, {}, {},
    { handleTimeout: async () => {} },
    { deductForRide: async () => true, refundForRide: async () => true, consumeFreeRide: async () => true },
    {}, {},
    vehicleRepo,
    {},
    profileRepo,
    assignmentRepo
  );

  return {
    taxiMatchingService,
    driverService,
    fakeRedis,
    drivers,
    trips,
    vehicles,
    serviceProfiles,
    activeAssignments,
  };
}

// ----------------------------------------------------
// TEST GROUP 1: GATE 3.1 TAXI ELIGIBILITY RULES
// ----------------------------------------------------

test('GATE 3.1: Strict Taxi Eligibility Gating (Verification status, active vehicle, account status)', async () => {
  const env = createStage3MockEnvironment();
  const pickupLat = 13.7563;
  const pickupLng = 100.5018;

  // 1. Eligible Driver & Verified Car
  env.drivers.set('driver-verified', {
    id: 'driver-verified',
    name: 'Somchai Taxi',
    phone: '0811111111',
    rating: 4.9,
    approval_status: 'APPROVED',
    current_status: 'IDLE',
    last_seen_at: new Date(),
    location: { coordinates: [pickupLng + 0.005, pickupLat + 0.005] }, // ~0.7 km away
  });
  env.vehicles.set('veh-verified', {
    id: 'veh-verified',
    driver_id: 'driver-verified',
    category: 'PUBLIC_TAXI',
    plate: 'ทส-1111',
    brand: 'Toyota',
    model: 'Altis',
    color: 'Yellow-Green',
    verification_status: 'VERIFIED',
  });
  env.serviceProfiles.set('driver-verified:TAXI', {
    id: 'sp-1',
    driver_id: 'driver-verified',
    service_type: 'TAXI',
    active_vehicle_id: 'veh-verified',
    is_enabled: true,
    is_online: true,
    eligibility_status: 'ELIGIBLE',
  });

  // 2. Ineligible Driver: Car is LEGACY_REVIEW (Must be excluded from TAXI!)
  env.drivers.set('driver-legacy', {
    id: 'driver-legacy',
    name: 'Somboon Moto/Taxi',
    phone: '0822222222',
    rating: 4.8,
    approval_status: 'APPROVED',
    current_status: 'IDLE',
    last_seen_at: new Date(),
    location: { coordinates: [pickupLng + 0.003, pickupLat + 0.003] },
  });
  env.vehicles.set('veh-legacy', {
    id: 'veh-legacy',
    driver_id: 'driver-legacy',
    category: 'PUBLIC_TAXI',
    plate: 'ทส-2222',
    brand: 'Toyota',
    model: 'Innova',
    color: 'Green',
    verification_status: 'LEGACY_REVIEW', // strictly prohibited for TAXI
  });
  env.serviceProfiles.set('driver-legacy:TAXI', {
    id: 'sp-2',
    driver_id: 'driver-legacy',
    service_type: 'TAXI',
    active_vehicle_id: 'veh-legacy',
    is_enabled: true,
    is_online: true,
    eligibility_status: 'ELIGIBLE',
  });

  // 3. Ineligible Driver: Suspended Account
  env.drivers.set('driver-suspended', {
    id: 'driver-suspended',
    name: 'Suspended Driver',
    phone: '0833333333',
    rating: 3.0,
    approval_status: 'APPROVED',
    current_status: 'SUSPENDED',
    last_seen_at: new Date(),
    location: { coordinates: [pickupLng + 0.002, pickupLat + 0.002] },
  });
  env.vehicles.set('veh-susp', {
    id: 'veh-susp',
    driver_id: 'driver-suspended',
    category: 'PUBLIC_TAXI',
    plate: 'ทส-3333',
    verification_status: 'VERIFIED',
  });
  env.serviceProfiles.set('driver-suspended:TAXI', {
    id: 'sp-3',
    driver_id: 'driver-suspended',
    service_type: 'TAXI',
    active_vehicle_id: 'veh-susp',
    is_enabled: true,
    is_online: true,
    eligibility_status: 'ELIGIBLE',
  });

  // 4. Ineligible Driver: Offline profile
  env.drivers.set('driver-offline', {
    id: 'driver-offline',
    name: 'Offline Driver',
    phone: '0844444444',
    rating: 5.0,
    approval_status: 'APPROVED',
    current_status: 'IDLE',
    last_seen_at: new Date(),
    location: { coordinates: [pickupLng + 0.002, pickupLat + 0.002] },
  });
  env.vehicles.set('veh-off', {
    id: 'veh-off',
    driver_id: 'driver-offline',
    category: 'PUBLIC_TAXI',
    plate: 'ทส-4444',
    verification_status: 'VERIFIED',
  });
  env.serviceProfiles.set('driver-offline:TAXI', {
    id: 'sp-4',
    driver_id: 'driver-offline',
    service_type: 'TAXI',
    active_vehicle_id: 'veh-off',
    is_enabled: true,
    is_online: false, // OFFLINE
    eligibility_status: 'ELIGIBLE',
  });

  // Search Round 1 (1.5 km)
  const candidates = await env.taxiMatchingService.findCandidates(pickupLat, pickupLng, 1.5, 1);

  // Exactly ONE driver must qualify: driver-verified
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].driverId, 'driver-verified');
  assert.equal(candidates[0].vehicleCategory, 'PUBLIC_TAXI');
  assert.equal(candidates[0].eligible, true);
});

// ----------------------------------------------------
// TEST GROUP 2: GATE 3.2 PROGRESSIVE RADIUS SEARCH
// ----------------------------------------------------

test('GATE 3.2: Progressive Radius Expansion (1.5km -> 3.0km -> 5.0km without duplicate candidates)', async () => {
  const env = createStage3MockEnvironment();
  const pickupLat = 13.7563;
  const pickupLng = 100.5018;

  // Driver 1 at ~1.0 km
  env.drivers.set('d-1km', {
    id: 'd-1km',
    name: 'Driver 1km',
    rating: 4.8,
    approval_status: 'APPROVED',
    current_status: 'IDLE',
    last_seen_at: new Date(),
    location: { coordinates: [pickupLng + 0.007, pickupLat + 0.007] }, // ~1.09 km
  });
  env.vehicles.set('v-1km', { id: 'v-1km', driver_id: 'd-1km', category: 'PUBLIC_TAXI', verification_status: 'VERIFIED' });
  env.serviceProfiles.set('d-1km:TAXI', { driver_id: 'd-1km', service_type: 'TAXI', active_vehicle_id: 'v-1km', is_enabled: true, is_online: true, eligibility_status: 'ELIGIBLE' });

  // Driver 2 at ~2.5 km
  env.drivers.set('d-2.5km', {
    id: 'd-2.5km',
    name: 'Driver 2.5km',
    rating: 4.9,
    approval_status: 'APPROVED',
    current_status: 'IDLE',
    last_seen_at: new Date(),
    location: { coordinates: [pickupLng + 0.016, pickupLat + 0.016] }, // ~2.49 km
  });
  env.vehicles.set('v-2.5km', { id: 'v-2.5km', driver_id: 'd-2.5km', category: 'PUBLIC_TAXI', verification_status: 'VERIFIED' });
  env.serviceProfiles.set('d-2.5km:TAXI', { driver_id: 'd-2.5km', service_type: 'TAXI', active_vehicle_id: 'v-2.5km', is_enabled: true, is_online: true, eligibility_status: 'ELIGIBLE' });

  // Driver 3 at ~4.2 km
  env.drivers.set('d-4.2km', {
    id: 'd-4.2km',
    name: 'Driver 4.2km',
    rating: 5.0,
    approval_status: 'APPROVED',
    current_status: 'IDLE',
    last_seen_at: new Date(),
    location: { coordinates: [pickupLng + 0.027, pickupLat + 0.027] }, // ~4.20 km
  });
  env.vehicles.set('v-4.2km', { id: 'v-4.2km', driver_id: 'd-4.2km', category: 'PRIVATE_CAR_FOR_HIRE', verification_status: 'VERIFIED' });
  env.serviceProfiles.set('d-4.2km:TAXI', { driver_id: 'd-4.2km', service_type: 'TAXI', active_vehicle_id: 'v-4.2km', is_enabled: true, is_online: true, eligibility_status: 'ELIGIBLE' });

  // Driver 4 at ~10 km (Beyond max radius)
  env.drivers.set('d-10km', {
    id: 'd-10km',
    name: 'Driver 10km',
    rating: 5.0,
    approval_status: 'APPROVED',
    current_status: 'IDLE',
    last_seen_at: new Date(),
    location: { coordinates: [pickupLng + 0.08, pickupLat + 0.08] }, // ~12 km
  });
  env.vehicles.set('v-10km', { id: 'v-10km', driver_id: 'd-10km', category: 'PUBLIC_TAXI', verification_status: 'VERIFIED' });
  env.serviceProfiles.set('d-10km:TAXI', { driver_id: 'd-10km', service_type: 'TAXI', active_vehicle_id: 'v-10km', is_enabled: true, is_online: true, eligibility_status: 'ELIGIBLE' });

  // Round 1 (1.5 km): Must find only Driver 1
  const round1 = await env.taxiMatchingService.findCandidates(pickupLat, pickupLng, 1.5, 1);
  assert.equal(round1.length, 1);
  assert.equal(round1[0].driverId, 'd-1km');

  // Round 2 (3.0 km) with Driver 1 excluded: Must find only Driver 2
  const excluded = new Set(['d-1km']);
  const round2 = await env.taxiMatchingService.findCandidates(pickupLat, pickupLng, 3.0, 2, excluded);
  assert.equal(round2.length, 1);
  assert.equal(round2[0].driverId, 'd-2.5km');

  // Round 3 (5.0 km) with Driver 1 & 2 excluded: Must find only Driver 3
  excluded.add('d-2.5km');
  const round3 = await env.taxiMatchingService.findCandidates(pickupLat, pickupLng, 5.0, 3, excluded);
  assert.equal(round3.length, 1);
  assert.equal(round3[0].driverId, 'd-4.2km');

  // Round 4 (8.0 km) with Driver 1, 2, 3 excluded: No drivers within 8 km (Driver 4 is at 12km)
  excluded.add('d-4.2km');
  const round4 = await env.taxiMatchingService.findCandidates(pickupLat, pickupLng, 8.0, 4, excluded);
  assert.equal(round4.length, 0);
});

// ----------------------------------------------------
// TEST GROUP 3: GATE 3.3 DRIVER RANKING ENGINE
// ----------------------------------------------------

test('GATE 3.3: Deterministic & Explainable Driver Ranking Engine', async () => {
  const env = createStage3MockEnvironment();
  const radiusKm = 5.0;

  const candidates = [
    {
      driverId: 'd-far-high-rating',
      name: 'Far Driver',
      rating: 5.0,
      distanceKm: 3.5,
      etaMins: 7,
      locationAgeSeconds: 30,
      score: 0,
      eligible: true,
      searchRound: 1,
      explanation: '',
    },
    {
      driverId: 'd-close-normal-rating',
      name: 'Close Driver',
      rating: 4.8,
      distanceKm: 0.8,
      etaMins: 2,
      locationAgeSeconds: 15,
      score: 0,
      eligible: true,
      searchRound: 1,
      explanation: '',
    },
  ];

  const ranked = env.taxiMatchingService.rankCandidates(candidates, radiusKm);

  // Closer driver should achieve higher overall score
  assert.equal(ranked[0].driverId, 'd-close-normal-rating');
  assert.ok(ranked[0].score > ranked[1].score);

  // Explanation breakdown must be deterministic and transparent
  assert.match(ranked[0].explanation, /Score: \d+(\.\d+)? \[Dist: 0.8km/);
  assert.match(ranked[0].explanation, /ETA: 2m/);
  assert.match(ranked[0].explanation, /Rating: 4.8/);
});

// ----------------------------------------------------
// TEST GROUP 4: LOCATION FRESHNESS
// ----------------------------------------------------

test('GATE 3.2: Stale driver GPS location (> 5 mins) is strictly excluded', async () => {
  const env = createStage3MockEnvironment();
  const pickupLat = 13.7563;
  const pickupLng = 100.5018;

  // Driver with stale location (15 minutes ago)
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  env.drivers.set('d-stale', {
    id: 'd-stale',
    name: 'Stale Driver',
    rating: 5.0,
    approval_status: 'APPROVED',
    current_status: 'IDLE',
    last_seen_at: fifteenMinsAgo,
    location: { coordinates: [pickupLng + 0.005, pickupLat + 0.005] },
  });
  env.vehicles.set('v-stale', { id: 'v-stale', driver_id: 'd-stale', category: 'PUBLIC_TAXI', verification_status: 'VERIFIED' });
  env.serviceProfiles.set('d-stale:TAXI', { driver_id: 'd-stale', service_type: 'TAXI', active_vehicle_id: 'v-stale', is_enabled: true, is_online: true, eligibility_status: 'ELIGIBLE' });

  const candidates = await env.taxiMatchingService.findCandidates(pickupLat, pickupLng, 3.0, 1);
  assert.equal(candidates.length, 0); // Excluded due to stale GPS
});

// ----------------------------------------------------
// TEST GROUP 5: GATE 3.4 & 3.5 OFFER & ACCEPTANCE ENGINE
// ----------------------------------------------------

test('GATE 3.4 & 3.5: Offer creation, server-authoritative timeout & ownership security', async () => {
  const env = createStage3MockEnvironment();
  const trip = {
    id: 'trip-taxi-offer-1',
    passenger_id: 'pass-1',
    pickup_lat: 13.7563,
    pickup_lng: 100.5018,
    dest_lat: 13.7663,
    dest_lng: 100.5118,
    pickup_address: 'Central World',
    dest_address: 'Siam Paragon',
    distance_km: 2.5,
    fare: 65,
    status: 'SEARCHING',
  };
  env.trips.set(trip.id, trip);

  const candidate = {
    driverId: 'driver-legit',
    name: 'Legit Taxi',
    vehicleId: 'veh-legit',
    rating: 4.9,
    distanceKm: 1.2,
    etaMins: 3,
  };

  env.drivers.set('driver-legit', {
    id: 'driver-legit',
    name: 'Legit Taxi',
    approval_status: 'APPROVED',
    current_status: 'IDLE',
  });
  env.vehicles.set('veh-legit', {
    id: 'veh-legit',
    driver_id: 'driver-legit',
    category: 'PUBLIC_TAXI',
    verification_status: 'VERIFIED',
  });
  env.serviceProfiles.set('driver-legit:TAXI', {
    driver_id: 'driver-legit',
    service_type: 'TAXI',
    active_vehicle_id: 'veh-legit',
    is_enabled: true,
    is_online: true,
    eligibility_status: 'ELIGIBLE',
  });

  // 1. Create Offer
  const offer = await env.taxiMatchingService.createOffer(trip, candidate, 15);
  assert.ok(offer.offerId.startsWith('offer-trip-taxi-offer-1-driver-legit-'));
  assert.equal(offer.driverId, 'driver-legit');
  assert.equal(offer.state, 'OFFERED');

  // 2. Unauthorized Driver B attempts to accept Driver A's offer -> MUST BE REJECTED
  await assert.rejects(
    env.taxiMatchingService.acceptOffer('driver-impostor', offer.offerId),
    /คุณไม่มีสิทธิ์ตอบรับข้อเสนอนี้/
  );

  // 3. Expired Offer rejection
  offer.expiresAt = Date.now() - 1000; // Expired 1 second ago
  await env.fakeRedis.set(`offer:${offer.offerId}`, JSON.stringify(offer));
  await assert.rejects(
    env.taxiMatchingService.acceptOffer('driver-legit', offer.offerId),
    /ข้อเสนองานนี้หมดเวลาตอบรับแล้ว/
  );

  // 4. Valid Acceptance within TTL
  offer.expiresAt = Date.now() + 15000;
  await env.fakeRedis.set(`offer:${offer.offerId}`, JSON.stringify(offer));

  const acceptRes = await env.taxiMatchingService.acceptOffer('driver-legit', offer.offerId);
  assert.equal(acceptRes.success, true);
  assert.equal(acceptRes.tripId, trip.id);

  // PostgreSQL active assignment created
  assert.ok(env.activeAssignments.has('driver-legit'));
  assert.equal(env.activeAssignments.get('driver-legit').trip_id, trip.id);

  // Trip and driver states updated
  assert.equal(trip.status, 'ACCEPTED');
  assert.equal(trip.driver_id, 'driver-legit');
  assert.equal(env.drivers.get('driver-legit').current_status, 'BUSY');
});

// ----------------------------------------------------
// TEST GROUP 6: GATE 3.6 GLOBAL ACTIVE RIDE LOCK CONCURRENCY
// ----------------------------------------------------

test('GATE 3.6: Cross-Service Active Ride Lock (Driver with active MOTO cannot accept TAXI)', async () => {
  const env = createStage3MockEnvironment();
  const driverId = 'dual-active-driver';

  env.drivers.set(driverId, {
    id: driverId,
    name: 'Dual Driver',
    approval_status: 'APPROVED',
    current_status: 'IDLE',
  });
  env.vehicles.set('veh-taxi', { id: 'veh-taxi', driver_id: driverId, category: 'PUBLIC_TAXI', verification_status: 'VERIFIED' });
  env.serviceProfiles.set(`${driverId}:TAXI`, {
    driver_id: driverId,
    service_type: 'TAXI',
    active_vehicle_id: 'veh-taxi',
    is_enabled: true,
    is_online: true,
    eligibility_status: 'ELIGIBLE',
  });

  // Driver currently has an active MOTO trip
  env.activeAssignments.set(driverId, {
    id: 'asgn-moto-existing',
    driver_id: driverId,
    trip_id: 'trip-moto-running',
    service_type: 'MOTO',
    state: 'IN_PROGRESS',
  });

  const tripTaxi = {
    id: 'trip-taxi-candidate',
    pickup_lat: 13.75,
    pickup_lng: 100.5,
    status: 'SEARCHING',
  };
  env.trips.set(tripTaxi.id, tripTaxi);

  const offer = await env.taxiMatchingService.createOffer(tripTaxi, {
    driverId,
    vehicleId: 'veh-taxi',
  });

  // Attempt to accept TAXI offer while holding active MOTO ride -> BLOCKED
  await assert.rejects(
    env.taxiMatchingService.acceptOffer(driverId, offer.offerId),
    /ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้/
  );
});

// ----------------------------------------------------
// TEST GROUP 7: GATE 3.8 OBSERVABILITY & DISPATCH TELEMETRY
// ----------------------------------------------------

test('GATE 3.8: Observability and structured dispatch telemetry collection', async () => {
  const env = createStage3MockEnvironment();
  const trip = {
    id: 'trip-telemetry-1',
    passenger_id: 'pass-tel-1',
    pickup_lat: 13.7563,
    pickup_lng: 100.5018,
    dest_lat: 13.7663,
    dest_lng: 100.5118,
    pickup_address: 'Asok',
    dest_address: 'Phrom Phong',
    distance_km: 1.5,
    fare: 50,
    status: 'SEARCHING',
  };
  env.trips.set(trip.id, trip);

  // Dispatch trip
  const telemetry = await env.taxiMatchingService.dispatchTaxiTrip(trip.id);

  assert.equal(telemetry.tripId, trip.id);
  assert.equal(telemetry.serviceType, 'TAXI');
  assert.ok(typeof telemetry.searchRoundsCount === 'number');
  assert.ok(typeof telemetry.durationMs === 'number');

  // Verify telemetry log was persisted
  const logs = env.taxiMatchingService.getTelemetryLogs();
  assert.ok(logs.length >= 1);
  const recorded = logs.find((l) => l.tripId === trip.id);
  assert.ok(recorded);
  assert.equal(recorded.serviceType, 'TAXI');
});

// ----------------------------------------------------
// TEST GROUP 8: STAGING FEATURE FLAGS (GATE 3.14)
// ----------------------------------------------------

test('GATE 3.14: Staging feature flag blocks dispatch when disabled', async () => {
  const env = createStage3MockEnvironment();
  // Turn off dispatch flag
  env.taxiMatchingService.updateConfig({ dispatchEnabled: false });

  const trip = {
    id: 'trip-flag-test',
    status: 'SEARCHING',
    pickup_lat: 13.75,
    pickup_lng: 100.5,
  };
  env.trips.set(trip.id, trip);

  const result = await env.taxiMatchingService.dispatchTaxiTrip(trip.id);
  assert.equal(result.finalState, 'FEATURE_FLAG_DISABLED');
  assert.match(result.failureReason, /feature flag is disabled/);
});

test.after(() => {
  Module._load = originalLoad;
});
