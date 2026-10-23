import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'gozipp-api',
      version: '1.0.3-hotfix',
      buildTime: '2026-10-23T14:55:00Z',
      timestamp: new Date().toISOString(),
    };
  }
}
