import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type OutboxEventStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

@Entity('outbox_events')
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  aggregate_type: string; // 'TRIP', 'DRIVER', etc.

  @Column({ type: 'varchar', length: 100 })
  @Index()
  aggregate_id: string; // e.g. tripId

  @Column({ type: 'varchar', length: 100 })
  event_type: string; // e.g. 'RIDE_REQUESTED', 'OFFER_ACCEPTED'

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  @Index()
  status: OutboxEventStatus;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'int', default: 5 })
  max_retries: number;

  @Column({ type: 'text', nullable: true })
  last_error: string | null;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  correlation_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;
}
