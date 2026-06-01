import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('passengers')
export class PassengerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  phone: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  profile_pic_url: string;

  // Auth
  @Column({ type: 'enum', enum: ['OTP', 'LINE', 'GOOGLE'], default: 'OTP' })
  auth_provider: string;

  @Column({ nullable: true })
  pin_hash: string; // bcrypt hash of 6-digit PIN

  @Column({ nullable: true })
  provider_id: string; // LINE userId or Google sub

  @Column({ nullable: true })
  webauthn_current_challenge: string; // Stores challenge for WebAuthn Registration/Authentication

  // Credits
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  points_balance: number;

  @Column({ default: 0 })
  total_rides: number;

  @Column({ default: 3 })
  free_rides_remaining: number;

  // Referral
  @Column({ nullable: true })
  referral_code: string;

  @Column({ nullable: true }) // New column for tracking who referred this passenger
  referred_by_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
