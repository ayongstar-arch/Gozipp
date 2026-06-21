import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'user_type' })
  userRole: string;

  @Column({ name: 'token_hash', type: 'text' })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'replaced_by_token_hash', type: 'text', nullable: true })
  replacedByTokenHash: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  // --- Device & Session Trust (V2) ---
  @Column({ name: 'device_id', nullable: true })
  deviceId: string;

  @Column({ name: 'device_name', nullable: true })
  deviceName: string; // e.g. "iPhone 16 Pro", "Windows PC"

  @Column({ nullable: true })
  os: string;

  @Column({ nullable: true })
  browser: string;

  @Column({ nullable: true })
  location: string; // e.g. "Bangkok, Thailand"

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
