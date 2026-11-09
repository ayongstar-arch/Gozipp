import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { DriverEntity } from './driver.entity';
import { DriverVehicleEntity } from './driver-vehicle.entity';

export type ServiceType = 'MOTO' | 'TAXI';
export type EligibilityStatus = 'PENDING' | 'ELIGIBLE' | 'INELIGIBLE' | 'SUSPENDED';

@Entity('driver_service_profiles')
@Unique(['driver_id', 'service_type'])
export class DriverServiceProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  driver_id: string;

  @ManyToOne(() => DriverEntity, driver => driver.service_profiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: DriverEntity;

  @Column({
    type: 'enum',
    enum: ['MOTO', 'TAXI']
  })
  service_type: ServiceType;

  @Column({ type: 'uuid', nullable: true })
  active_vehicle_id: string | null;

  @ManyToOne(() => DriverVehicleEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'active_vehicle_id' })
  active_vehicle: DriverVehicleEntity | null;

  @Column({ default: false })
  is_enabled: boolean;

  @Column({ default: false })
  @Index()
  is_online: boolean;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'ELIGIBLE', 'INELIGIBLE', 'SUSPENDED'],
    default: 'PENDING'
  })
  @Index()
  eligibility_status: EligibilityStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
