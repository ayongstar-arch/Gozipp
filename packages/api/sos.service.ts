import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SosService {
  private readonly logger = new Logger(SosService.name);

  constructor(private readonly dataSource: DataSource) {}

  async createEvent(params: {
    userId: string;
    userType: 'DRIVER' | 'PASSENGER';
    tripId?: string;
    location?: { lat: number; lng: number };
    notes?: string;
  }) {
    if (!params.location || !Number.isFinite(params.location.lat) || !Number.isFinite(params.location.lng)) {
      throw new BadRequestException('SOS location is required');
    }

    const rows = await this.dataSource.query(
      `INSERT INTO sos_events (user_id, user_type, trip_id, location, notes, status, created_at)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, 'ACTIVE', NOW())
       RETURNING id, user_id, user_type, trip_id, notes, status, created_at`,
      [params.userId, params.userType, params.tripId || null, params.location.lng, params.location.lat, params.notes || null]
    );

    this.logger.warn(`SOS created: ${rows[0]?.id} by ${params.userType} ${params.userId}`);
    return rows[0];
  }

  async resolveEvent(eventId: string, resolvedBy: string, status: 'RESOLVED' | 'FALSE_ALARM' = 'RESOLVED') {
    const rows = await this.dataSource.query(
      `UPDATE sos_events
       SET status = $2,
           resolved_by = $3,
           resolved_at = NOW()
       WHERE id = $1
       RETURNING id, status, resolved_by, resolved_at`,
      [eventId, status, resolvedBy]
    );
    if (!rows.length) {
      throw new BadRequestException('SOS event not found');
    }
    return rows[0];
  }

  async getActiveEvents(limit = 20) {
    return this.dataSource.query(
      `SELECT id, user_id, user_type, trip_id, notes, status, created_at,
              ST_X(location) AS lng, ST_Y(location) AS lat
       FROM sos_events
       WHERE status = 'ACTIVE'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
  }
}
