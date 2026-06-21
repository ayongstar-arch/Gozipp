import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  actorId: string;

  @Column({ name: 'user_type', nullable: true })
  actorRole: string;

  @Column()
  action: string; // e.g., LOGIN, TOPUP, RIDE_REQUEST, ADMIN_ACTION

  @Column({ name: 'resource', nullable: true })
  resourceType: string; // e.g., TRIP, WALLET, USER

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
