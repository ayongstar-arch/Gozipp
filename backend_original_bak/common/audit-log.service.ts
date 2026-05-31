import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>,
  ) {}

  async log(data: {
    actorId?: string;
    actorRole?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: any;
    ipAddress?: string;
  }) {
    try {
      const entry = this.auditRepo.create(data);
      await this.auditRepo.save(entry);
      
      this.logger.log(`Audit Log: ${data.action} - ${data.actorId || 'System'}`);
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }
}
