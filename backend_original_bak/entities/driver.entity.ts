import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';

@Entity('drivers')
export class DriverEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  phone: string;

  @Column()
  name: string;

  @Column()
  plate: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  line_id: string;

  // Legacy alias (some services use winId)
  get winId(): string { return this.id; }

  @Column({ default: 1 })
  current_onboarding_step: number;

  @Column({ nullable: true, name: 'invite_code' })
  invite_code: string;

  @Column({ name: 'station_id', nullable: true })
  @Index()
  station_id: string;

  @Column({ type: 'enum', enum: ['PENDING', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REUPLOAD_REQUESTED'], default: 'PENDING' })
  approval_status: string;

  @Column({ type: 'enum', enum: ['OFFLINE', 'IDLE', 'BUSY', 'SUSPENDED'], default: 'OFFLINE' })
  current_status: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.00 })
  rating: number;

  @Column({ default: 0 })
  total_trips: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_earnings: number;

  @Column({ nullable: true })
  profile_pic_url: string;

  @Column({ type: 'enum', enum: ['OTP', 'LINE', 'GOOGLE'], default: 'OTP' })
  auth_provider: string;

  @Column({ nullable: true })
  pin_hash: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  provider_id: string;

  // Payout Profile
  @Column({ nullable: true })
  bank_name: string;

  @Column({ nullable: true })
  bank_account_name: string;

  @Column({ nullable: true })
  bank_account_no: string;

  @Column({ nullable: true })
  promptpay_id: string;

  @Column({ nullable: true })
  tax_id: string;

  @Column({ nullable: true, type: 'timestamptz' })
  last_seen_at: Date;

  // Driver document refs (JSON stored as text for simplicity)
  @Column({ nullable: true, type: 'jsonb' })
  documents: any;

  // Driver preferences (JSON stored)
  @Column({ nullable: true, type: 'jsonb' })
  preferences: any;

  // Training statuses (JSON stored)
  @Column({ nullable: true, type: 'jsonb' })
  training_statuses: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}