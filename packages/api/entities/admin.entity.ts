import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Admin accounts — the ONLY source of ADMIN-family JWT roles.
 * Separate table from passengers/drivers by design: admins can never
 * obtain their role through the user registration flows.
 */
@Entity('admins')
export class AdminEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string; // Argon2id + server pepper (see pin-crypto.hashPin)

  @Column({ default: 'ADMIN' })
  @Index()
  role: string; // SUPER_ADMIN | ADMIN | SECURITY | FINANCE | OPERATIONS | MARKETING | SUPPORT | SAFETY | AUDITOR | REGIONAL_ADMIN | WIN_LEADER

  @Column({ name: 'mfa_secret', nullable: true, type: 'text' })
  mfaSecret: string | null; // base32 TOTP secret — never returned by any API

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'failed_attempts', default: 0 })
  failedAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
