import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { DriverEntity } from './driver.entity';
import { VehicleDocumentEntity } from './vehicle-document.entity';

export type VehicleCategory = 'MOTORCYCLE' | 'PUBLIC_TAXI' | 'PRIVATE_CAR_FOR_HIRE';
export type VehicleVerificationStatus = 'PENDING' | 'LEGACY_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'SUSPENDED';

@Entity('driver_vehicles')
export class DriverVehicleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  driver_id: string;

  @ManyToOne(() => DriverEntity, driver => driver.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: DriverEntity;

  @Column({
    type: 'enum',
    enum: ['MOTORCYCLE', 'PUBLIC_TAXI', 'PRIVATE_CAR_FOR_HIRE'],
    default: 'MOTORCYCLE'
  })
  category: VehicleCategory;

  @Column({ length: 50 })
  plate: string;

  @Column({ length: 100, default: 'กรุงเทพมหานคร' })
  province: string;

  @Column({ length: 100 })
  brand: string;

  @Column({ length: 100 })
  model: string;

  @Column({ length: 50 })
  color: string;

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ type: 'int', default: 1 })
  passenger_capacity: number;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'LEGACY_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED'],
    default: 'PENDING'
  })
  @Index()
  verification_status: VehicleVerificationStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @Column({ type: 'date', nullable: true })
  tax_expiry_date: Date;

  @Column({ type: 'date', nullable: true })
  insurance_expiry_date: Date;

  @OneToMany(() => VehicleDocumentEntity, doc => doc.vehicle)
  documents: VehicleDocumentEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
