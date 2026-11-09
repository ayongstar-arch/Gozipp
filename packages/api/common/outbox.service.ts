import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { OutboxEventEntity, OutboxEventStatus } from '../entities/outbox-event.entity';
import Redis from 'ioredis';

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private workerInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis
  ) {}

  onModuleInit() {
    // Start background polling worker every 1 second
    this.workerInterval = setInterval(() => {
      void this.processPendingEvents();
    }, 1000);
    if (this.workerInterval.unref) {
      this.workerInterval.unref();
    }
    this.logger.log('OutboxService background polling worker initialized');
  }

  onModuleDestroy() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
  }

  /**
   * Records an outbound domain event. When passed an EntityManager,
   * the event is committed within the caller's ACID transaction.
   */
  async recordEvent(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, any>,
    correlationId: string,
    manager?: EntityManager
  ): Promise<OutboxEventEntity> {
    const event = new OutboxEventEntity();
    event.aggregate_type = aggregateType;
    event.aggregate_id = aggregateId;
    event.event_type = eventType;
    event.payload = payload;
    event.correlation_id = correlationId;
    event.status = 'PENDING';
    event.retry_count = 0;
    event.max_retries = 5;

    if (manager) {
      return manager.save(OutboxEventEntity, event);
    }
    return this.outboxRepo.save(event);
  }

  /**
   * Processes a batch of pending events and publishes them to the message broker.
   */
  async processPendingEvents(batchSize = 25): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processedCount = 0;
    try {
      // Fetch pending events
      const events = await this.outboxRepo.find({
        where: { status: 'PENDING' },
        order: { created_at: 'ASC' },
        take: batchSize,
      });

      for (const event of events) {
        try {
          await this.publishEvent(event);
          event.status = 'PUBLISHED';
          event.published_at = new Date();
          await this.outboxRepo.save(event);
          processedCount++;
        } catch (pubErr: any) {
          event.retry_count += 1;
          event.last_error = pubErr?.message || String(pubErr);
          if (event.retry_count >= event.max_retries) {
            event.status = 'FAILED';
            this.logger.error(
              `Outbox event ${event.id} (${event.event_type}) failed after ${event.retry_count} retries: ${event.last_error}`
            );
          } else {
            this.logger.warn(
              `Outbox event ${event.id} failed attempt ${event.retry_count}/${event.max_retries}: ${event.last_error}`
            );
          }
          await this.outboxRepo.save(event);
        }
      }
    } catch (err: any) {
      this.logger.debug(`processPendingEvents error: ${err?.message || err}`);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Routes domain events to appropriate Redis Pub/Sub channels.
   */
  private async publishEvent(event: OutboxEventEntity): Promise<void> {
    if (event.event_type === 'RIDE_REQUESTED') {
      const tripId = event.payload.tripId || event.aggregate_id;
      await this.redis.publish('ride:requested', tripId);
      this.logger.debug(`Published RIDE_REQUESTED for trip ${tripId} (correlation: ${event.correlation_id})`);
    } else if (event.event_type === 'RIDE_SCHEDULED') {
      await this.redis.publish('ride:scheduled', JSON.stringify(event.payload));
      this.logger.debug(`Published RIDE_SCHEDULED for trip ${event.aggregate_id}`);
    } else {
      await this.redis.publish(`events:${event.aggregate_type.toLowerCase()}`, JSON.stringify(event.payload));
    }
  }

  /**
   * Retries all failed events (Dead-Letter recovery).
   */
  async retryFailedEvents(): Promise<number> {
    const failedEvents = await this.outboxRepo.find({ where: { status: 'FAILED' } });
    for (const evt of failedEvents) {
      evt.status = 'PENDING';
      evt.retry_count = 0;
      evt.last_error = null;
    }
    await this.outboxRepo.save(failedEvents);
    return failedEvents.length;
  }
}
