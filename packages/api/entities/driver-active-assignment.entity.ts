import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { DriverEntity } from './driver.entity';
import { TripEntity } from './trip.entity';
import { DriverVehicleEntity } from './driver-vehicle.entity';

export type AssignmentState = 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS';

@Entity('driver_active_assignments')
export class DriverActiveAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  @Index({ unique: true })
  driver_id: string;

  @OneToOne(() => DriverEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: DriverEntity;

  @Column({ type: 'uuid', unique: true })
  @Index({ unique: true })
  trip_id: string;

  @OneToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;

  @Column({
    type: 'enum',
    enum: ['MOTO', 'TAXI']
  })
  service_type: 'MOTO' | 'TAXI';

  @Column({ type: 'uuid' })
  vehicle_id: string;

  @ManyToOne(() => DriverVehicleEntity)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: DriverVehicleEntity;

  @Column({
    type: 'enum',
    enum: ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'],
    default: 'ACCEPTED'
  })
  state: AssignmentState;

  @CreateDateColumn({ type: 'timestamptz' })
  assigned_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
