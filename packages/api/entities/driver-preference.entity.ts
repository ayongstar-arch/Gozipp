import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('driver_preferences')
export class DriverPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_id' })
  driverId: string;

  @Column()
  key: string;

  @Column({ nullable: true, type: 'text' })
  value: string;

  @CreateDateColumn()
  created_at: Date;
}
