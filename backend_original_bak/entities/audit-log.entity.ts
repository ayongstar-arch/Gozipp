import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  actorId: string;

  @Column({ nullable: true })
  actorRole: string;

  @Column()
  action: string; // e.g., LOGIN, TOPUP, RIDE_REQUEST, ADMIN_ACTION

  @Column({ nullable: true })
  resourceType: string; // e.g., TRIP, WALLET, USER

  @Column({ nullable: true })
  resourceId: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
