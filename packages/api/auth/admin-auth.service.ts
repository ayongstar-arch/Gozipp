import { Injectable, BadRequestException, UnauthorizedException, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { AdminEntity } from '../entities/admin.entity';
import { AuthService, DeviceMetadata } from './auth.service';
import { AuditLogService } from '../common/audit-log.service';
import { hashPin, verifyPin } from '../common/pin-crypto';
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

  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCK_SECONDS = 900;

  constructor(
    @InjectRepository(AdminEntity)
    private adminRepo: Repository<AdminEntity>,
    private jwtService: JwtService,
    private authService: AuthService,
    private auditLog: AuditLogService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async onModuleInit() {
    const username = (process.env.ADMIN_SEED_USERNAME || '').trim();
    const password = process.env.ADMIN_SEED_PASSWORD || '';
    if (!username || !password) {
      this.logger.log('ADMIN_SEED_* not set — admin login disabled until an admin is seeded');
      return;
    }
    const existing = await this.adminRepo.findOne({ where: { username } });
    if (existing) return;
    if (password.length < 12) {
      this.logger.error('ADMIN_SEED_PASSWORD must be at least 12 characters — seed skipped');
      return;
    }
    await this.adminRepo.save({
      username,
      passwordHash: await hashPin(password),
      role: 'SUPER_ADMIN',
      mfaEnabled: false,
      mfaSecret: null,
      isActive: true,
    });
    this.logger.warn(`Seeded SUPER_ADMIN '${username}' — MFA enrollment is FORCED on first login; rotate/remove seed env afterwards`);
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
    const admin = await this.adminRepo.findOne({ where: { username: name } });
    // Uniform response: unknown user behaves like a bad password (no oracle).
    if (!admin || !admin.isActive) throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

    if (await this.redis.exists(this.lockKey(admin.id))) {
      throw new HttpException('บัญชีถูกล็อกชั่วคราว 15 นาที', HttpStatus.TOO_MANY_REQUESTS);
    }

    const check = await verifyPin(admin.passwordHash, password);
    if (check === 'no') {
      const fails = await this.redis.incr(this.failKey(admin.id));
      if (fails === 1) await this.redis.expire(this.failKey(admin.id), AdminAuthService.LOCK_SECONDS);
      if (fails >= AdminAuthService.MAX_ATTEMPTS) {
        await this.redis.set(this.lockKey(admin.id), '1', 'EX', AdminAuthService.LOCK_SECONDS);
        await this.redis.del(this.failKey(admin.id));
        await this.auditLog.log({ actorId: admin.id, actorRole: admin.role, action: 'ADMIN_LOGIN_LOCKED', ipAddress: deviceMeta.ipAddress }, { failClosed: true });
        throw new HttpException('บัญชีถูกล็อกชั่วคราว 15 นาที', HttpStatus.TOO_MANY_REQUESTS);
      }
      await this.auditLog.log({ actorId: admin.id, actorRole: admin.role, action: 'ADMIN_LOGIN_FAILED', ipAddress: deviceMeta.ipAddress });
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    if (check === 'legacy') {
      await this.adminRepo.update(admin.id, { passwordHash: await hashPin(password) });
    }
    await this.redis.del(this.failKey(admin.id));

    if (!admin.mfaEnabled || !admin.mfaSecret) {
      // Forced enrollment on first login.
      const secret = generateTotpSecret();
      await this.redis.set(`admin_mfa_setup:${admin.id}`, secret, 'EX', 600);
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
    const secret = await this.redis.get(`admin_mfa_setup:${admin.id}`);
    if (!secret) throw new BadRequestException('หมดเวลา กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    if (!verifyTotp(secret, code)) throw new BadRequestException('รหัสยืนยันไม่ถูกต้อง');
    await this.adminRepo.update(admin.id, { mfaSecret: secret, mfaEnabled: true, lastLoginAt: new Date() } as any);
    await this.redis.del(`admin_mfa_setup:${admin.id}`);
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
