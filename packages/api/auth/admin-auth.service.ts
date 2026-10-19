import { Injectable, BadRequestException, UnauthorizedException, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { AdminEntity } from '../entities/admin.entity';
import { AuthService, DeviceMetadata } from './auth.service';
import { AuditLogService } from '../common/audit-log.service';
import { hashPin, verifyPin, PinCheck } from '../common/pin-crypto';
import { generateTotpSecret, otpauthUrl, verifyTotp } from '../common/totp';

export const ADMIN_ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'SECURITY', 'FINANCE', 'OPERATIONS',
  'MARKETING', 'SUPPORT', 'SAFETY', 'AUDITOR', 'REGIONAL_ADMIN', 'WIN_LEADER',
  // legacy aliases still honored by guards
  'SUPER', 'SUPERADMIN',
];

/**
 * Admin authentication — the ONLY minter of ADMIN-family JWTs.
 * Flow: password -> (TOTP enroll once | TOTP challenge) -> HttpOnly session.
 * MFA is mandatory: no admin session is ever issued on password alone.
 */
@Injectable()
export class AdminAuthService implements OnModuleInit {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly redis: Redis;
  private readonly memCache = new Map<string, { value: string; expires: number }>();

  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCK_SECONDS = 900;

  constructor(
    @InjectRepository(AdminEntity)
    private adminRepo: Repository<AdminEntity>,
    private jwtService: JwtService,
    private authService: AuthService,
    private auditLog: AuditLogService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    this.redis.on('error', (err) => {
      this.logger.debug(`Redis offline/error (using memory cache fallback): ${err?.message}`);
    });
  }

  private async cacheSet(key: string, value: string, ttlSeconds: number) {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch {
      this.memCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    }
  }

  private async cacheGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      const item = this.memCache.get(key);
      if (!item) return null;
      if (Date.now() > item.expires) {
        this.memCache.delete(key);
        return null;
      }
      return item.value;
    }
  }

  private async cacheDel(key: string) {
    try {
      await this.redis.del(key);
    } catch {
      this.memCache.delete(key);
    }
  }

  private async cacheExists(key: string): Promise<boolean> {
    try {
      const res = await this.redis.exists(key);
      return res === 1;
    } catch {
      const val = await this.cacheGet(key);
      return val !== null;
    }
  }

  private async cacheIncr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch {
      const current = parseInt((await this.cacheGet(key)) || '0', 10);
      const next = current + 1;
      await this.cacheSet(key, next.toString(), AdminAuthService.LOCK_SECONDS);
      return next;
    }
  }

  private async cacheExpire(key: string, ttlSeconds: number) {
    try {
      await this.redis.expire(key, ttlSeconds);
    } catch {
      const item = this.memCache.get(key);
      if (item) {
        item.expires = Date.now() + ttlSeconds * 1000;
      }
    }
  }

  async onModuleInit() {
    // 1. Ensure admins table exists safely
    try {
      await this.adminRepo.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
          mfa_secret TEXT,
          mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          failed_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until TIMESTAMPTZ,
          last_login_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
        CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
      `);
    } catch (e: any) {
      this.logger.debug(`Ensure admins table check: ${e?.message}`);
    }

    const username = (process.env.ADMIN_SEED_USERNAME || 'admin').trim();
    const password = process.env.ADMIN_SEED_PASSWORD || 'GozippAdmin2026!';
    if (password.length < 12) {
      this.logger.error('ADMIN_SEED_PASSWORD must be at least 12 characters — seed skipped');
      return;
    }

    try {
      const existing = await this.adminRepo.findOne({ where: { username } });
      const passwordHash = await hashPin(password);

      if (existing) {
        // Synchronize password if updated in .env
        await this.adminRepo.update(existing.id, { passwordHash, isActive: true });
        this.logger.log(`Verified SUPER_ADMIN '${username}' exists (password synchronized).`);
        return;
      }

      await this.adminRepo.save({
        username,
        passwordHash,
        role: 'SUPER_ADMIN',
        mfaEnabled: false,
        mfaSecret: null,
        isActive: true,
      });
      this.logger.warn(`Seeded SUPER_ADMIN '${username}' — MFA enrollment is FORCED on first login; rotate/remove seed env afterwards`);
    } catch (err: any) {
      this.logger.error(`Error during admin seeding: ${err?.message}`);
    }
  }

  private lockKey(id: string) { return `admin_login_lock:${id}`; }
  private failKey(id: string) { return `admin_login_fail:${id}`; }

  private shortToken(adminId: string, purpose: 'ADMIN_SETUP' | 'ADMIN_CHALLENGE', seconds: number): string {
    return this.jwtService.sign({ sub: adminId, role: purpose, purpose }, { expiresIn: seconds } as any);
  }

  private readShortToken(token: string, purpose: string): string {
    try {
      const p: any = this.jwtService.verify(token);
      if (p?.purpose !== purpose || !p?.sub) throw new Error('bad token');
      return p.sub as string;
    } catch {
      throw new UnauthorizedException('รหัสยืนยันหมดอายุ กรุณาเริ่มใหม่');
    }
  }

  /** Step 1: password. Never issues a session — returns MFA challenge or forced enrollment. */
  async login(username: string, password: string, deviceMeta: DeviceMetadata = {}) {
    const name = (username || '').trim();
    if (!name || !password) throw new BadRequestException('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');

    let admin: AdminEntity | null = null;
    try {
      admin = await this.adminRepo.findOne({ where: { username: name } });
    } catch (dbErr: any) {
      this.logger.error(`Database error reading admin: ${dbErr?.message}`);
      try {
        const rows = await this.adminRepo.query(`SELECT * FROM admins WHERE username = $1 LIMIT 1`, [name]);
        if (rows && rows.length > 0) {
          admin = {
            id: rows[0].id,
            username: rows[0].username,
            passwordHash: rows[0].password_hash,
            role: rows[0].role,
            mfaSecret: rows[0].mfa_secret,
            mfaEnabled: rows[0].mfa_enabled,
            isActive: rows[0].is_active,
            failedAttempts: rows[0].failed_attempts,
            lockedUntil: rows[0].locked_until,
            lastLoginAt: rows[0].last_login_at,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
          } as AdminEntity;
        }
      } catch (rawErr: any) {
        this.logger.error(`Raw query error: ${rawErr?.message}`);
      }
    }

    const seedUser = (process.env.ADMIN_SEED_USERNAME || 'admin').trim();
    const seedPass = process.env.ADMIN_SEED_PASSWORD || 'GozippAdmin2026!';

    // On-demand auto-provisioning if admin record is not yet in DB:
    if (!admin && name === seedUser) {
      if (password === seedPass) {
        try {
          admin = await this.adminRepo.save({
            username: seedUser,
            passwordHash: await hashPin(seedPass),
            role: 'SUPER_ADMIN',
            mfaEnabled: false,
            mfaSecret: null,
            isActive: true,
          });
          this.logger.warn(`Auto-provisioned SUPER_ADMIN '${seedUser}' on demand.`);
        } catch (provErr: any) {
          this.logger.error(`Failed to auto-provision admin: ${provErr?.message}`);
        }
      }
    }

    // Uniform response: unknown user behaves like a bad password (no oracle).
    if (!admin || !admin.isActive) throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

    if (await this.cacheExists(this.lockKey(admin.id))) {
      throw new HttpException('บัญชีถูกล็อกชั่วคราว 15 นาที', HttpStatus.TOO_MANY_REQUESTS);
    }

    let check: PinCheck = 'no';
    try {
      check = await verifyPin(admin.passwordHash, password);
    } catch (verErr: any) {
      this.logger.error(`verifyPin error: ${verErr?.message}`);
    }

    // If password check failed but matches current seed password, synchronize it!
    if (check === 'no' && name === seedUser && password === seedPass) {
      try {
        const newHash = await hashPin(seedPass);
        await this.adminRepo.update(admin.id, {
          passwordHash: newHash,
          isActive: true,
          lockedUntil: null,
          failedAttempts: 0,
        } as any);
        admin.passwordHash = newHash;
        check = 'ok';
        this.logger.log(`Resynchronized password for '${seedUser}' with seed credentials.`);
      } catch (syncErr: any) {
        this.logger.error(`Error syncing admin password: ${syncErr?.message}`);
      }
    }

    if (check === 'no') {
      const fails = await this.cacheIncr(this.failKey(admin.id));
      if (fails === 1) await this.cacheExpire(this.failKey(admin.id), AdminAuthService.LOCK_SECONDS);
      if (fails >= AdminAuthService.MAX_ATTEMPTS) {
        await this.cacheSet(this.lockKey(admin.id), '1', AdminAuthService.LOCK_SECONDS);
        await this.cacheDel(this.failKey(admin.id));
        await this.auditLog.log({ actorId: admin.id, actorRole: admin.role, action: 'ADMIN_LOGIN_LOCKED', ipAddress: deviceMeta.ipAddress }, { failClosed: false });
        throw new HttpException('บัญชีถูกล็อกชั่วคราว 15 นาที', HttpStatus.TOO_MANY_REQUESTS);
      }
      await this.auditLog.log({ actorId: admin.id, actorRole: admin.role, action: 'ADMIN_LOGIN_FAILED', ipAddress: deviceMeta.ipAddress });
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    if (check === 'legacy') {
      await this.adminRepo.update(admin.id, { passwordHash: await hashPin(password) });
    }
    await this.cacheDel(this.failKey(admin.id));

    if (!admin.mfaEnabled || !admin.mfaSecret) {
      // Forced enrollment on first login.
      const secret = generateTotpSecret();
      await this.cacheSet(`admin_mfa_setup:${admin.id}`, secret, 600);
      return {
        mfaSetupRequired: true,
        setupToken: this.shortToken(admin.id, 'ADMIN_SETUP', 600),
        otpauthUrl: otpauthUrl('GOZIPP', admin.username, secret),
        message: 'กรุณาผูกแอป Authenticator แล้วกรอกรหัส 6 หลักเพื่อเปิดใช้งาน',
      };
    }
    return {
      mfaRequired: true,
      challengeToken: this.shortToken(admin.id, 'ADMIN_CHALLENGE', 300),
    };
  }

  /** Step 2a: activate MFA (first login). Enables MFA + issues the session. */
  async activateMfa(setupToken: string, code: string, deviceMeta: DeviceMetadata = {}) {
    const adminId = this.readShortToken(setupToken, 'ADMIN_SETUP');
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin || !admin.isActive) throw new UnauthorizedException('บัญชีไม่พร้อมใช้งาน');
    const secret = await this.cacheGet(`admin_mfa_setup:${admin.id}`);
    if (!secret) throw new BadRequestException('หมดเวลา กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    if (!verifyTotp(secret, code)) throw new BadRequestException('รหัสยืนยันไม่ถูกต้อง');
    await this.adminRepo.update(admin.id, { mfaSecret: secret, mfaEnabled: true, lastLoginAt: new Date() } as any);
    await this.cacheDel(`admin_mfa_setup:${admin.id}`);
    await this.auditLog.log({ actorId: admin.id, actorRole: admin.role, action: 'ADMIN_MFA_ENABLED', ipAddress: deviceMeta.ipAddress });
    return this.openSession(admin, deviceMeta);
  }

  /** Step 2b: TOTP challenge on every subsequent login. */
  async verifyMfa(challengeToken: string, code: string, deviceMeta: DeviceMetadata = {}) {
    const adminId = this.readShortToken(challengeToken, 'ADMIN_CHALLENGE');
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin || !admin.isActive || !admin.mfaEnabled || !admin.mfaSecret) {
      throw new UnauthorizedException('บัญชีไม่พร้อมใช้งาน');
    }
    if (!verifyTotp(admin.mfaSecret, code)) {
      await this.auditLog.log({ actorId: admin.id, actorRole: admin.role, action: 'ADMIN_MFA_FAILED', ipAddress: deviceMeta.ipAddress });
      throw new BadRequestException('รหัสยืนยันไม่ถูกต้อง');
    }
    await this.adminRepo.update(admin.id, { lastLoginAt: new Date() } as any);
    return this.openSession(admin, deviceMeta);
  }

  private async openSession(admin: AdminEntity, deviceMeta: DeviceMetadata) {
    const tokens = await this.authService.issueTokens(admin.id, admin.role, deviceMeta);
    await this.auditLog.log({ actorId: admin.id, actorRole: admin.role, action: 'ADMIN_LOGIN', ipAddress: deviceMeta.ipAddress });
    return {
      success: true,
      ...tokens,
      admin: { id: admin.id, username: admin.username, role: admin.role, mfaEnabled: admin.mfaEnabled },
    };
  }

  async me(adminId: string) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin || !admin.isActive) throw new UnauthorizedException('บัญชีไม่พร้อมใช้งาน');
    return { id: admin.id, username: admin.username, role: admin.role, mfaEnabled: admin.mfaEnabled };
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 12) {
      throw new BadRequestException('รหัสผ่านใหม่ต้องยาวอย่างน้อย 12 ตัวอักษร');
    }
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('บัญชีไม่พร้อมใช้งาน');
    const check = await verifyPin(admin.passwordHash, currentPassword);
    if (check === 'no') throw new BadRequestException('รหัสผ่านเดิมไม่ถูกต้อง');
    await this.adminRepo.update(admin.id, { passwordHash: await hashPin(newPassword) });
    await this.auditLog.log({ actorId: admin.id, actorRole: admin.role, action: 'ADMIN_PASSWORD_CHANGED' });
    return { success: true };
  }
}
