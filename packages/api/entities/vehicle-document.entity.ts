import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { DriverVehicleEntity } from './driver-vehicle.entity';

export type VehicleDocumentType =
  | 'VEHICLE_REGISTRATION'
  | 'COMPULSORY_INSURANCE'
  | 'VOLUNTARY_INSURANCE'
  | 'TAXI_METER_CERT'
  | 'DLT_INSPECTION_CERT'
  | 'TAXI_SIGN_PERMIT'
  | 'VEHICLE_FRONT'
  | 'VEHICLE_SIDE'
  | 'VEHICLE_INSIDE';

export type VehicleDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

@Entity('vehicle_documents')
export class VehicleDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  vehicle_id: string;

  @ManyToOne(() => DriverVehicleEntity, vehicle => vehicle.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: DriverVehicleEntity;

  @Column({ length: 50 })
  document_type: VehicleDocumentType;

  @Column({ length: 500 })
  file_url: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING'
  })
  verification_status: VehicleDocumentStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @Column({ type: 'date', nullable: true })
  expiry_date: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
