require('reflect-metadata');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PassengerService } = require('../dist/passenger.service.js');
const { AuthService } = require('../dist/auth/auth.service.js');

class MemoryRedis {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    const item = this.values.get(key);
    if (!item || (item.expiresAt && item.expiresAt <= Date.now())) {
      this.values.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, ttlSeconds) {
    this.values.set(key, {
      value: String(value),
      expiresAt: mode === 'EX' ? Date.now() + Number(ttlSeconds) * 1000 : null,
    });
    return 'OK';
  }

  async del(key) {
    return this.values.delete(key) ? 1 : 0;
  }
}

function createHarness() {
  const passengers = new Map();
  let deliveredOtp;

  const passengerRepo = {
    async findOne({ where }) {
      return [...passengers.values()].find((passenger) =>
        Object.entries(where).every(([key, value]) => passenger[key] === value)
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
  };

  const service = new PassengerService(
    passengerRepo,
    {},
    { addBonusPoints: async () => undefined },
    {},
    { sendOtp: async (_phone, otp) => { deliveredOtp = otp; return true; } },
    { issueTokens: async () => ({ accessToken: 'access', refreshToken: 'refresh' }) },
  );

  // Replace the constructor-created client so this test never needs external Redis.
  service.redis.disconnect(false);
  service.redis = new MemoryRedis();

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
    id: randomUUID(), phone: '0864445566', name: 'ผู้ใช้ PIN', pin_hash: null,
    email: 'pin@example.com', points_balance: 125, free_rides_remaining: 2,
    avatar_url: null, referral_code: 'PINTEST',
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
  };
  const auth = new AuthService(
    passengerRepo,
    { findOne: async () => null, update: async () => ({ affected: 0 }) },
    refreshRepo,
    { sign: () => 'signed-access-token' },
    {},
    { log: async () => undefined },
    { evaluateLoginRisk: async () => ({ highRisk: false }) },
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

  await assert.rejects(auth.validatePinLogin(user.phone, '111111', 'PASSENGER'), /Invalid PIN/);
});
