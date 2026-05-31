import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('driver_documents')
export class DriverDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_id' })
  driverId: string;

  @Column()
  type: string; // ID_CARD, LICENSE, VEHICLE_PHOTO, PLATE_NUMBER, SELFIE

  @Column()
  url: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true })
  rejection_reason: string;

  @CreateDateColumn()
  created_at: Date;
}
