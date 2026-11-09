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

  @Column({ type: 'varchar', length: 20, default: 'MOTO' })
  @Index()
  service_type: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  vehicle_id: string;

  @Column({ nullable: true })
  station_id: string;

  // Pickup
  @Column({ type: 'float' })
  pickup_lat: number;

  @Column({ type: 'float' })
  pickup_lng: number;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true
  })
  @Index({ spatial: true })
  pickup_location: any;

  @Column({ type: 'text' })
  pickup_address: string;

  // Destination
  @Column({ type: 'float' })
  dest_lat: number;

  @Column({ type: 'float' })
  dest_lng: number;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true
  })
  @Index({ spatial: true })
  dest_location: any;

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
    enum: ['SEARCHING', 'SCHEDULED', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'TIMEOUT_NO_DRIVER'],
    default: 'SEARCHING'
  })
  status: string;

  // Advance Ride Scheduling & Preferred Driver
  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date;

  @Column({ nullable: true })
  preferred_driver_id: string;

  // Idempotency Protection (Stage 4)
  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  idempotency_key: string;

  // Arrival Verification Telemetry (Stage 4)
  @Column({ type: 'boolean', default: false })
  arrival_verified: boolean;

  @Column({ type: 'float', nullable: true })
  arrival_gps_accuracy: number;

  @Column({ type: 'float', nullable: true })
  arrival_distance_meters: number;

  @Column({ type: 'varchar', length: 30, default: 'UNVERIFIED' })
  arrival_verification_status: string;

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