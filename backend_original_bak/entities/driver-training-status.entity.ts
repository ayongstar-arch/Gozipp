import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('driver_training_statuses')
export class DriverTrainingStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_id' })
  driverId: string;

  @Column()
  module_id: string;

  @Column({ default: 'NOT_STARTED' }) // NOT_STARTED, IN_PROGRESS, COMPLETED
  status: string;

  @Column({ nullable: true, type: 'timestamptz' })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
