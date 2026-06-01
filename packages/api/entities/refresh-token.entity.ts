import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  userRole: string;

  @Column({ length: 512 })
  tokenHash: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ length: 512, nullable: true })
  replacedByTokenHash: string;

  @Column({ nullable: true })
  ipAddress: string;

  // --- Device & Session Trust (V2) ---
  @Column({ nullable: true })
  deviceId: string;

  @Column({ nullable: true })
  deviceName: string; // e.g. "iPhone 16 Pro", "Windows PC"

  @Column({ nullable: true })
  os: string;

  @Column({ nullable: true })
  browser: string;

  @Column({ nullable: true })
  location: string; // e.g. "Bangkok, Thailand"

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
