const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

class FakeRedis {
  constructor() { this.hashes = new Map(); }
  async hset(key, ...args) {
    const hash = this.hashes.get(key) || {};
    for (let i = 0; i < args.length; i += 2) hash[args[i]] = String(args[i + 1]);
    this.hashes.set(key, hash);
    return 1;
  }
  async set() { return 'OK'; }
  async get() { return null; }
  async del() { return 1; }
  async zrem() { return 1; }
  async hget() { return null; }
  async hdel() { return 1; }
}

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'ioredis') return { __esModule: true, default: FakeRedis };
  return originalLoad.call(this, request, parent, isMain);
};

const { DriverService } = require('../dist/driver.service.js');

test('driver trip lifecycle persists only valid ordered transitions', async () => {
  const trip = { id: 'trip-1', driver_id: 'driver-1', passenger_id: 'passenger-1', status: 'ACCEPTED' };
  const tripRepo = {
    async findOne({ where }) {
      return where.id === trip.id && (!where.driver_id || where.driver_id === trip.driver_id) ? trip : null;
    },
    async update(id, values) {
      assert.equal(id, trip.id);
      Object.assign(trip, values);
      return { affected: 1 };
    },
  };
  const driverRepo = {
    async update() { return { affected: 1 }; },
    async increment() { return { affected: 1 }; },
  };
  const service = new DriverService(
    driverRepo,
    tripRepo,
    {}, {}, {},
    {}, {}, {}, {},
  );

  await assert.rejects(service.startTrip('driver-1', 'trip-1'), /ต้องแจ้งถึงจุดรับ/);
  await service.markDriverArrived('driver-1', 'trip-1');
  assert.equal(trip.status, 'DRIVER_ARRIVED');
  assert.ok(trip.arrived_at instanceof Date);

  await assert.rejects(
    service.completeTrip({ driverId: 'driver-1', tripId: 'trip-1' }),
    /ไม่สามารถจบทริปก่อนเริ่มเดินทาง/,
  );
  await service.startTrip('driver-1', 'trip-1');
  assert.equal(trip.status, 'IN_PROGRESS');
  assert.ok(trip.started_at instanceof Date);

  await service.completeTrip({ driverId: 'driver-1', tripId: 'trip-1' });
  assert.equal(trip.status, 'COMPLETED');
  assert.ok(trip.completed_at instanceof Date);
});

test.after(() => { Module._load = originalLoad; });
