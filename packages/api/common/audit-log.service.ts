import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { AuditLogEntity } from '../entities/audit-log.entity';

/**
 * Typed admin action constants for consistent audit trail.
 * Use these as the `action` field when logging admin events.
 */
export const AdminAction = {
  DRIVER_APPROVED: 'DRIVER_APPROVED',
  DRIVER_REJECTED: 'DRIVER_REJECTED',
  DRIVER_SUSPENDED: 'DRIVER_SUSPENDED',
  QUEUE_OVERRIDE: 'QUEUE_OVERRIDE',
  POINT_ADJUSTMENT: 'POINT_ADJUSTMENT',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
  DAILY_CLOSE: 'DAILY_CLOSE',
  ROLE_CHANGED: 'ROLE_CHANGED',
  WALLET_ADJUSTMENT: 'WALLET_ADJUSTMENT',
  PIN_RECOVERY_ISSUED: 'PIN_RECOVERY_ISSUED',
} as const;

export type AdminActionType = typeof AdminAction[keyof typeof AdminAction];

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
  resourceType?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>,
  ) {}

  /**
   * General-purpose audit log entry (existing method — preserved).
   * `failClosed: true` aborts the caller when the trail cannot be written
   * (used for security-critical ops); otherwise the entry is preserved to a
   * local fallback file so nothing is ever silently lost.
   */
  async log(data: {
    actorId?: string;
    actorRole?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: any;
    ipAddress?: string;
  }, opts: { failClosed?: boolean } = {}) {
    try {
      const entry = this.auditRepo.create(data);
      await this.auditRepo.save(entry);

      this.logger.log(`Audit Log: ${data.action} - ${data.actorId || 'System'}`);
    } catch (err) {
      this.preserveFallback(data, err);
      if (opts.failClosed) {
        throw new InternalServerErrorException('Audit trail unavailable — operation aborted');
      }
    }
  }

  /**
   * Structured admin action logger.
   * Use this for all admin-panel actions that require an audit trail.
   * Append-only — entries are never updated or deleted.
   */
  async logAdminAction(params: {
    actorId: string;
    actorRole: string;
    action: AdminActionType | string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress || null,
      });
      await this.auditRepo.save(entry);

      this.logger.log(
        `Admin Action: ${params.action} by ${params.actorId} (${params.actorRole}) on ${params.resourceType}:${params.resourceId}`,
      );
    } catch (err) {
      // Never throw from audit logging — it must not break the main operation
      this.preserveFallback(
        {
          actorId: params.actorId,
          actorRole: params.actorRole,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          metadata: params.metadata || {},
          ipAddress: params.ipAddress || null,
        },
        err,
      );
    }
  }

  /**
   * Fallback sink: DB failures must never silently drop audit events.
   * Appends JSONL locally (ops should ship this file to SIEM) and logs loudly.
   */
  private preserveFallback(data: object, err: any) {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...data }) + '\n';
    try {
      const dir = join(process.cwd(), 'logs');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(join(dir, 'audit-fallback.log'), line);
    } catch (fileErr) {
      this.logger.error('Audit fallback file write failed', fileErr);
    }
    this.logger.error('Audit DB write failed — event preserved to logs/audit-fallback.log', err);
  }

  /**
   * Paginated audit log query with multi-field filtering.
   * Append-only guarantee: this method only reads — no updates or deletes.
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<{
    logs: AuditLogEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLogEntity> = {};

    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.actorId) {
      where.actorId = filters.actorId;
    }
    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    // Date range filtering
    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    } else if (filters.startDate) {
      where.createdAt = MoreThanOrEqual(new Date(filters.startDate));
    } else if (filters.endDate) {
      where.createdAt = LessThanOrEqual(new Date(filters.endDate));
    }

    const [logs, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

