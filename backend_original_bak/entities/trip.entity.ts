import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  passenger_id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  driver_id: string;

  @Column({ nullable: true })
  station_id: string;

  // Pickup
  @Column({ type: 'float' })
  pickup_lat: number;

  @Column({ type: 'float' })
  pickup_lng: number;

  @Column({ type: 'text' })
  pickup_address: string;

  // Destination
  @Column({ type: 'float' })
  dest_lat: number;

  @Column({ type: 'float' })
  dest_lng: number;

  @Column({ type: 'text' })
  dest_address: string;

  // Routing
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  distance_km: number;

  @Column({ nullable: true })
  duration_mins: number;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 2 })
  fare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  credits_used: number;

  // Status
  @Column({
    type: 'enum',
    enum: ['SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'TIMEOUT_NO_DRIVER'],
    default: 'SEARCHING'
  })
  status: string;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz' })
  requested_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  arrived_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date;

  @Column({ nullable: true, type: 'text' })
  cancel_reason: string;

  // Rating
  @Column({ nullable: true })
  passenger_rating: number;

  @Column({ nullable: true, type: 'text' })
  passenger_note: string;

  @Column({ nullable: true })
  driver_rating: number;
}