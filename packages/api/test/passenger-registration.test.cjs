require('reflect-metadata');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');

class MemoryRedis {
  constructor() {
    this.store = new Map();
    this.hashes = new Map();
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

  async set(key, value, mode, ttlSeconds) {
    this.store.set(key, {
      value: String(value),
      expiresAt: mode === 'EX' ? Date.now() + Number(ttlSeconds) * 1000 : null,
    });
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.hashes.delete(key);
    return 1;
  }

  async incr(key) {
    const item = this.store.get(key);
    const current = parseInt(item?.value || '0', 10);
    const next = current + 1;
    this.store.set(key, { value: String(next) });
    return next;
  }

  async exists(key) {
    const item = this.store.get(key) || this.hashes.get(key);
    return item ? 1 : 0;
  }

  async expire(key, ttlSeconds) {
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

  async hmset(key, obj) {
    return this.hset(key, obj);
  }

  async hgetall(key) {
    return this.hashes.get(key) || {};
  }

  multi() {
    const chain = {
      hmset: (key, obj) => {
        this.hmset(key, obj);
        return chain;
      },
      set: (key, val, mode, ttl) => {
        this.set(key, val, mode, ttl);
        return chain;
      },
      expire: (key, ttl) => chain,
      del: (key) => {
        this.del(key);
        return chain;
      },
      exec: async () => [],
    };
    return chain;
  }

  disconnect() {}
  on() {}
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

const { PassengerService } = require('../dist/passenger.service.js');
const { AuthService } = require('../dist/auth/auth.service.js');

function createHarness() {
  const passengers = new Map();
  let deliveredOtp;

  const passengerRepo = {
    async findOne({ where }) {
      return [...passengers.values()].find((p) =>
        Object.entries(where).every(([key, value]) => p[key] === value)
      ) || null;
    },
    create(value) {
      return { id: randomUUID(), total_rides: 0, ...value };
    },
    async save(value) {
      const passenger = {
        points_balance: 0,
        free_rides_remaining: 3,
        ...value,
      };
      passengers.set(passenger.id, passenger);
      return passenger;
    },
    async update(id, values) {
      const p = passengers.get(id);
      if (p) Object.assign(p, values);
      return { affected: p ? 1 : 0 };
    },
  };

  const smsService = {
    async sendOtp(_phone, otp) {
      deliveredOtp = otp;
      return true;
    },
  };

  const authService = {
    async issueTokens() {
      return { accessToken: 'access', refreshToken: 'refresh' };
    },
  };

  const service = new PassengerService(
    passengerRepo, // 1: passengerRepo
    {},            // 2: tripRepo
    {},            // 3: driverRepo
    { addBonusPoints: async () => undefined, deductForRide: async () => true }, // 4: creditService
    {},            // 5: mapService
    smsService,    // 6: smsService
    authService,   // 7: authService
  );

  return { service, passengers, getOtp: () => deliveredOtp };
}

test('registration requires the OTP delivered for the canonical phone number', async () => {
  const { service, passengers, getOtp } = createHarness();

  await service.requestOtp('081-234-5678');
  await assert.rejects(
    service.register({ phoneNumber: '0812345678', name: 'ผู้โดยสารใหม่', otp: '000000' }),
    /OTP/,
  );
  assert.equal(passengers.size, 0);

  const result = await service.register({
    phoneNumber: '+66 81 234 5678',
    name: ' ผู้โดยสารใหม่ ',
    otp: getOtp(),
  });

  assert.equal(result.success, true);
  assert.equal(result.accessToken, 'access');
  assert.equal(result.refreshToken, 'refresh');
  assert.equal(passengers.size, 1);
  assert.equal([...passengers.values()][0].phone, '0812345678');
});

test('a verified OTP is single-use', async () => {
  const { service, getOtp } = createHarness();
  await service.requestOtp('0899999998');
  const otp = getOtp();

  await service.verifyOtp('0899999998', otp);
  await assert.rejects(service.verifyOtp('0899999998', otp), /OTP/);
});

test('SMS delivery failure leaves no usable OTP', async () => {
  const { service } = createHarness();
  service.smsService = { sendOtp: async () => false };

  await assert.rejects(service.requestOtp('0861112233'), /ไม่สามารถส่ง OTP/);
  await assert.rejects(service.verifyOtp('0861112233', '123456'), /OTP/);
});

test('temporary non-production mode can register without OTP', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousBypass = process.env.ALLOW_REGISTRATION_WITHOUT_OTP;
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_REGISTRATION_WITHOUT_OTP = 'true';

  try {
    const { service, passengers } = createHarness();
    const result = await service.register({ phoneNumber: '0862223344', name: 'ผู้โดยสารทดสอบ' });
    assert.equal(result.success, true);
    assert.equal(passengers.size, 1);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ALLOW_REGISTRATION_WITHOUT_OTP = previousBypass;
  }
});

test('production never permits registration without OTP', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousBypass = process.env.ALLOW_REGISTRATION_WITHOUT_OTP;
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_REGISTRATION_WITHOUT_OTP = 'true';

  try {
    const { service } = createHarness();
    await assert.rejects(
      service.register({ phoneNumber: '0863334455', name: 'ผู้โดยสารทดสอบ' }),
      /OTP/,
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ALLOW_REGISTRATION_WITHOUT_OTP = previousBypass;
  }
});

test('PIN is hashed, persisted, and can be used for a new login session', async () => {
  const user = {
    id: randomUUID(),
    phone: '0864445566',
    name: 'ผู้ใช้ PIN',
    pin_hash: null,
    email: 'pin@example.com',
    points_balance: 125,
    free_rides_remaining: 2,
    avatar_url: null,
    referral_code: 'PINTEST',
  };
  const sessions = [];
  const passengerRepo = {
    async findOne({ where }) {
      return (where.id === user.id || where.phone === user.phone) ? user : null;
    },
    async update(id, values) {
      if (id === user.id) Object.assign(user, values);
      return { affected: id === user.id ? 1 : 0 };
    },
  };
  const refreshRepo = {
    async save(value) {
      const saved = { id: value.id || randomUUID(), ...value };
      sessions.push(saved);
      return saved;
    },
    async update() {
      return { affected: 1 };
    },
  };
  const auth = new AuthService(
    passengerRepo, // 1: passengerRepo
    { findOne: async () => null, update: async () => ({ affected: 0 }) }, // 2: driverRepo
    refreshRepo,   // 3: refreshRepo
    { query: async () => [] },  // 4: dataSource
    { sign: () => 'signed-access-token' }, // 5: jwtService
    { get: () => null },        // 6: configService
    { log: async () => undefined, logAdminAction: async () => undefined }, // 7: auditLog
    { evaluateLoginRisk: async () => ({ highRisk: false }) }, // 8: riskEngine
    {},            // 9: firebaseService
  );

  await auth.setPin(user.id, '246810', 'PASSENGER');
  assert.notEqual(user.pin_hash, '246810');
  assert.match(user.pin_hash, /^\$argon2id\$/);

  const login = await auth.validatePinLogin(user.phone, '246810', 'PASSENGER');
  assert.equal(login.success, true);
  assert.equal(login.user.id, user.id);
  assert.equal(login.user.pointsBalance, 125);
  assert.equal(login.user.freeRidesRemaining, 2);
  assert.equal(login.accessToken, 'signed-access-token');
  assert.equal(sessions.length, 1);

  await assert.rejects(auth.validatePinLogin(user.phone, '111111', 'PASSENGER'), /PIN/);
});

test.after(() => {
  Module._load = originalLoad;
});
