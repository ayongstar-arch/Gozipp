const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

class FakeRedis {
  constructor() {
    this.hashes = new Map();
    this.keys = new Map();
  }
  async hset(key, ...args) {
    const hash = this.hashes.get(key) || {};
    for (let i = 0; i < args.length; i += 2) hash[args[i]] = String(args[i + 1]);
    this.hashes.set(key, hash);
    return 1;
  }
  async hget(key, field) {
    const hash = this.hashes.get(key);
    return hash ? hash[field] || null : null;
  }
  async hdel(key, ...fields) {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    for (const f of fields) delete hash[f];
    return 1;
  }
  async set(key, value) {
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

const { DriverService } = require('../dist/driver.service.js');

// Mock Repositories
function createMockDriverService() {
  const drivers = new Map();
  const trips = new Map();
  const vehicles = new Map();
  const vehicleDocs = new Map();
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
    async save(val) {
      drivers.set(val.id, val);
      return val;
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
    create(data) {
      return { id: 'veh-' + Math.random().toString(36).slice(2, 7), ...data };
    },
    async save(v) {
      vehicles.set(v.id, v);
      return v;
    },
    async find({ where }) {
      const list = [];
      for (const v of vehicles.values()) {
        if (v.driver_id === where.driver_id) list.push(v);
      }
      return list;
    },
    async findOne({ where }) {
      if (where.id) {
        const v = vehicles.get(where.id);
        if (v && (!where.driver_id || v.driver_id === where.driver_id)) return v;
      }
      for (const v of vehicles.values()) {
        if (where.driver_id && v.driver_id !== where.driver_id) continue;
        if (where.category && v.category !== where.category) continue;
        return v;
      }
      return null;
    },
    async update(id, values) {
      const v = vehicles.get(id);
      if (v) Object.assign(v, values);
      return { affected: 1 };
    },
  };

  const vehicleDocRepo = {
    create(data) {
      return { id: 'doc-' + Math.random().toString(36).slice(2, 7), ...data };
    },
    async save(d) {
      vehicleDocs.set(d.id, d);
      return d;
    },
  };

  const serviceProfileRepo = {
    create(data) {
      return { id: 'sp-' + Math.random().toString(36).slice(2, 7), ...data };
    },
    async save(sp) {
      serviceProfiles.set(`${sp.driver_id}:${sp.service_type}`, sp);
      return sp;
    },
    async findOne({ where }) {
      return serviceProfiles.get(`${where.driver_id}:${where.service_type}`) || null;
    },
    async find({ where }) {
      const list = [];
      for (const sp of serviceProfiles.values()) {
        if (sp.driver_id === where.driver_id) list.push(sp);
      }
      return list;
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

  const creditService = {
    async deductForRide() { return true; },
    async refundForRide() { return true; },
    async consumeFreeRide() { return true; },
  };

  const service = new DriverService(
    driverRepo,
    { findOne: async () => ({ id: 'pass-1', total_rides: 1 }), update: async () => {}, increment: async () => {} },
    tripRepo,
    {}, // docRepo
    {}, // prefRepo
    {}, // trainingRepo
    { handleTimeout: async () => {} },
    creditService,
    {}, // jwtService
    {}, // smsService
    vehicleRepo,
    vehicleDocRepo,
    serviceProfileRepo,
    assignmentRepo
  );

  return {
    service,
    drivers,
    trips,
    vehicles,
    serviceProfiles,
    activeAssignments,
  };
}

// ----------------------------------------------------
// TEST SUITE 1: GATE 2.5 GLOBAL ACTIVE RIDE LOCK (P0)
// ----------------------------------------------------

test('P0: Global Active Ride Lock blocks a driver from accepting multiple trips concurrently', async () => {
  const env = createMockDriverService();
  const driverId = 'driver-dual-1';
  env.drivers.set(driverId, {
    id: driverId,
    name: 'Dual Driver Somchai',
    plate: '1กข-1234',
    phone: '0812345678',
    rating: 4.9,
    current_status: 'IDLE',
  });

  const trip1 = {
    id: 'trip-moto-1',
    passenger_id: 'pass-1',
    status: 'SEARCHING',
    service_type: 'MOTO',
    fare: 2,
    pickup_lat: 13.75,
    pickup_lng: 100.5,
    dest_lat: 13.76,
    dest_lng: 100.51,
  };
  const trip2 = {
    id: 'trip-taxi-2',
    passenger_id: 'pass-2',
    status: 'SEARCHING',
    service_type: 'TAXI',
    fare: 50,
    pickup_lat: 13.75,
    pickup_lng: 100.5,
    dest_lat: 13.80,
    dest_lng: 100.55,
  };

  env.trips.set(trip1.id, trip1);
  env.trips.set(trip2.id, trip2);

  // 1. Accept first trip (MOTO)
  const res1 = await env.service.acceptTrip({ driverId, tripId: trip1.id });
  assert.equal(res1.success, true);
  assert.equal(trip1.status, 'ACCEPTED');
  assert.equal(trip1.driver_id, driverId);

  // Active assignment must exist in PostgreSQL layer
  assert.ok(env.activeAssignments.has(driverId));
  assert.equal(env.activeAssignments.get(driverId).trip_id, trip1.id);

  // 2. Attempt to accept second trip (TAXI) while trip1 is active -> MUST BE BLOCKED
  await assert.rejects(
    env.service.acceptTrip({ driverId, tripId: trip2.id }),
    (err) => {
      assert.match(err.message, /ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้/);
      return true;
    }
  );

  // Trip 2 must remain in SEARCHING state, not stolen
  assert.equal(trip2.status, 'SEARCHING');
  assert.equal(trip2.driver_id, undefined);

  // 3. Complete trip 1 -> Active assignment is cleanly deleted
  await env.service.completeTrip({ driverId, tripId: trip1.id });
  assert.equal(trip1.status, 'COMPLETED');
  assert.equal(env.activeAssignments.has(driverId), false);

  // 4. Now driver can accept trip 2 (TAXI) -> MUST SUCCEED
  const res2 = await env.service.acceptTrip({ driverId, tripId: trip2.id });
  assert.equal(res2.success, true);
  assert.equal(trip2.status, 'ACCEPTED');
  assert.equal(trip2.driver_id, driverId);
  assert.equal(env.activeAssignments.get(driverId).trip_id, trip2.id);
});

// ----------------------------------------------------
// TEST SUITE 2: GATE 2.6 VEHICLE MANAGEMENT & DLT RULES
// ----------------------------------------------------

test('GATE 2.6: DLT eligibility and vehicle verification constraints', async () => {
  const env = createMockDriverService();
  const driverId = 'driver-dlt-1';

  // 1. Motorcycle registration defaults to PENDING, capacity 1
  const moto = await env.service.registerVehicle(driverId, {
    category: 'MOTORCYCLE',
    plate: '1กก-1111',
    province: 'กรุงเทพมหานคร',
    brand: 'Honda',
    model: 'Wave 110i',
    color: 'Red',
  });
  assert.equal(moto.category, 'MOTORCYCLE');
  assert.equal(moto.passenger_capacity, 1);
  assert.equal(moto.verification_status, 'PENDING');

  // 2. Private hire car registration with capacity < 4 must be rejected
  await assert.rejects(
    env.service.registerVehicle(driverId, {
      category: 'PRIVATE_CAR_FOR_HIRE',
      plate: '2ขข-2222',
      province: 'กรุงเทพมหานคร',
      brand: 'Smart',
      model: 'ForTwo',
      color: 'White',
      passenger_capacity: 2, // invalid for electronic private hire
    }),
    /รถยนต์รับจ้างผ่านระบบอิเล็กทรอนิกส์ต้องมีความจุผู้โดยสารไม่น้อยกว่า 4 ที่นั่ง/
  );

  // 3. Private hire car registration with age > 9 years must be rejected
  await assert.rejects(
    env.service.registerVehicle(driverId, {
      category: 'PRIVATE_CAR_FOR_HIRE',
      plate: '3คค-3333',
      province: 'กรุงเทพมหานคร',
      brand: 'Toyota',
      model: 'Corolla',
      color: 'Black',
      year: 2012, // older than 9 years relative to current year
      passenger_capacity: 4,
    }),
    /รถยนต์รับจ้างผ่านระบบอิเล็กทรอนิกส์ต้องมีอายุการใช้งานไม่เกิน 9 ปี/
  );

  // 4. Valid private hire car registers successfully with PENDING status
  const car = await env.service.registerVehicle(driverId, {
    category: 'PRIVATE_CAR_FOR_HIRE',
    plate: '4งง-4444',
    province: 'กรุงเทพมหานคร',
    brand: 'Toyota',
    model: 'Yaris Cross',
    color: 'White',
    year: 2024,
    passenger_capacity: 4,
  });
  assert.equal(car.verification_status, 'PENDING');

  // 5. Selecting unverified car for TAXI must be blocked
  await assert.rejects(
    env.service.selectActiveVehicle(driverId, car.id),
    /ยานพาหนะสำหรับบริการ TAXI ต้องผ่านการตรวจสอบเอกสาร \(VERIFIED\) จากเจ้าหน้าที่ก่อนเลือกใช้งาน/
  );

  // 6. When verified by admin/audit, selection succeeds
  car.verification_status = 'VERIFIED';
  const selectRes = await env.service.selectActiveVehicle(driverId, car.id);
  assert.equal(selectRes.success, true);
  assert.equal(selectRes.service_type, 'TAXI');
  assert.equal(selectRes.active_vehicle_id, car.id);

  // 7. Selecting LEGACY_REVIEW motorcycle for MOTO succeeds (backward compatibility)
  moto.verification_status = 'LEGACY_REVIEW';
  const motoSelectRes = await env.service.selectActiveVehicle(driverId, moto.id);
  assert.equal(motoSelectRes.success, true);
  assert.equal(motoSelectRes.service_type, 'MOTO');
});

// ----------------------------------------------------
// TEST SUITE 3: GATE 2.7 SERVICE AVAILABILITY TOGGLES
// ----------------------------------------------------

test('GATE 2.7: Simultaneous MOTO and TAXI availability and gating controls', async () => {
  const env = createMockDriverService();
  const driverId = 'driver-simul-1';

  // Setup verified MOTO and TAXI vehicles
  const moto = await env.service.registerVehicle(driverId, {
    category: 'MOTORCYCLE',
    plate: '5จจ-5555',
    province: 'กรุงเทพมหานคร',
    brand: 'Yamaha',
    model: 'Grand Filano',
    color: 'Blue',
  });
  moto.verification_status = 'LEGACY_REVIEW';

  const taxi = await env.service.registerVehicle(driverId, {
    category: 'PUBLIC_TAXI',
    plate: 'ทส-9999',
    province: 'กรุงเทพมหานคร',
    brand: 'Toyota',
    model: 'Altis',
    color: 'Yellow-Green',
    year: 2023,
    passenger_capacity: 4,
  });

  // TAXI is unverified initially
  await assert.rejects(
    env.service.toggleServiceAvailability(driverId, 'TAXI', { is_online: true }),
    /ไม่สามารถเปิดรับงาน TAXI ได้ เนื่องจากยานพาหนะยังไม่ผ่านการอนุมัติ/
  );

  // Now verify TAXI and select vehicle
  taxi.verification_status = 'VERIFIED';
  await env.service.selectActiveVehicle(driverId, taxi.id);
  await env.service.selectActiveVehicle(driverId, moto.id);

  // Driver goes online for MOTO
  const motoOnline = await env.service.toggleServiceAvailability(driverId, 'MOTO', { is_online: true });
  assert.equal(motoOnline.success, true);
  assert.equal(motoOnline.is_online, true);

  // Driver goes online for TAXI SIMULTANEOUSLY (Dual Mobility!)
  const taxiOnline = await env.service.toggleServiceAvailability(driverId, 'TAXI', { is_online: true });
  assert.equal(taxiOnline.success, true);
  assert.equal(taxiOnline.is_online, true);

  // Query service profiles: both MOTO and TAXI are online simultaneously
  const res = await env.service.getServiceProfiles(driverId);
  assert.equal(res.profiles.length, 2);
  const motoProf = res.profiles.find((p) => p.service_type === 'MOTO');
  const taxiProf = res.profiles.find((p) => p.service_type === 'TAXI');
  assert.equal(motoProf.is_online, true);
  assert.equal(taxiProf.is_online, true);
});

// ----------------------------------------------------
// TEST SUITE 4: RACE CONDITION CONCURRENCY COLLISION
// ----------------------------------------------------

test('P0: High-concurrency simultaneous acceptance race condition safely resolves to exactly 1 winner', async () => {
  const env = createMockDriverService();
  const driverId = 'driver-race-1';
  env.drivers.set(driverId, {
    id: driverId,
    name: 'Racer Driver',
    plate: '1กก-9999',
    phone: '0891112222',
    rating: 5.0,
    current_status: 'IDLE',
  });

  const tripM = {
    id: 'trip-concurrent-moto',
    passenger_id: 'pass-c1',
    status: 'SEARCHING',
    service_type: 'MOTO',
    fare: 2,
  };
  const tripT = {
    id: 'trip-concurrent-taxi',
    passenger_id: 'pass-c2',
    status: 'SEARCHING',
    service_type: 'TAXI',
    fare: 60,
  };

  env.trips.set(tripM.id, tripM);
  env.trips.set(tripT.id, tripT);

  // Fire both accept requests simultaneously via Promise.allSettled
  const results = await Promise.allSettled([
    env.service.acceptTrip({ driverId, tripId: tripM.id }),
    env.service.acceptTrip({ driverId, tripId: tripT.id }),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  // Exactly ONE must succeed and exactly ONE must be rejected with 409 Conflict
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].reason.message, /ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้/);

  // Exactly one active assignment exists in PostgreSQL
  assert.equal(env.activeAssignments.size, 1);
  assert.ok(env.activeAssignments.has(driverId));
});

// ----------------------------------------------------
// TEST SUITE 5: MOTO ZERO GP & FLAT 2 THB FEE PRESERVATION
// ----------------------------------------------------

test('PRESERVATION: Existing MOTO business rules remain 100% intact (0% GP, 2 THB fee)', async () => {
  const env = createMockDriverService();
  const driverId = 'driver-legacy-moto';
  env.drivers.set(driverId, {
    id: driverId,
    name: 'Legacy Moto Driver',
    plate: '1กข-0001',
    phone: '0867778888',
    rating: 5.0,
    total_trips: 10,
    total_earnings: 200,
    current_status: 'IDLE',
  });

  const trip = {
    id: 'trip-legacy-1',
    passenger_id: 'pass-leg-1',
    status: 'SEARCHING',
    service_type: 'MOTO',
    fare: 25, // 25 THB ride
  };
  env.trips.set(trip.id, trip);

  // Driver accepts without prior vehicle table record (backward compatibility)
  const acceptRes = await env.service.acceptTrip({ driverId, tripId: trip.id });
  assert.equal(acceptRes.success, true);
  assert.equal(trip.status, 'ACCEPTED');

  // Complete trip: driver receives full 25 THB (0% driver GP commission deducted)
  await env.service.completeTrip({ driverId, tripId: trip.id });
  const updatedDriver = env.drivers.get(driverId);
  assert.equal(updatedDriver.total_trips, 11);
  assert.equal(updatedDriver.total_earnings, 225); // 200 + 25 = 225 (0% GP!)
});

test.after(() => {
  Module._load = originalLoad;
});
