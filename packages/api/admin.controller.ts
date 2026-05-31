import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PromotionService } from './promotion.service';
import { DriverService } from './driver.service';
import { OverrideQueueDto, DateRangeDto, DailyCloseDto, CreateInviteCodeDto } from './dtos';
import { AuthGuard, RolesGuard } from './common/guards';
import { Roles } from './common/decorators';
import { AuditLogService, AdminAction } from './common/audit-log.service';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly promotionService: PromotionService,
    private readonly driverService: DriverService,
    private readonly auditLogService: AuditLogService,
  ) { }

  @Get('queue')
  @Roles('ADMIN')
  async getQueue(@Query('winId') winId: string) {
    return this.adminService.getQueue(winId);
  }

  @Post('override')
  @Roles('ADMIN')
  async overrideQueue(@Body() body: OverrideQueueDto, @Req() req: any) {
    const result = await this.adminService.overrideQueue(body);

    // Audit log the queue override
    await this.auditLogService.logAdminAction({
      actorId: req.user?.id,
      actorRole: req.user?.roles?.[0] || 'UNKNOWN',
      action: AdminAction.QUEUE_OVERRIDE,
      resourceType: 'QUEUE',
      resourceId: body.winId,
      metadata: { driverId: body.driverId, ...body },
      ipAddress: req.ip,
    });

    return result;
  }

  @Get('report')
  @Roles('ADMIN')
  async getReport(@Query() query: DateRangeDto) {
    return this.adminService.getReport(query.startDate, query.endDate);
  }

  @Get('financial-stats')
  @Roles('ADMIN')
  async getFinancialStats() {
    return this.adminService.getFinancialStats();
  }

  @Get('ai-summary')
  @Roles('ADMIN')
  async getAiSummary() {
    return this.adminService.getAiSummary();
  }

  @Post('daily-close')
  @Roles('ADMIN')
  async performDailyClose(@Body() body: DailyCloseDto, @Req() req: any) {
    const result = await this.adminService.performDailyClose(body);

    // Audit log the daily close
    await this.auditLogService.logAdminAction({
      actorId: req.user?.id,
      actorRole: req.user?.roles?.[0] || 'UNKNOWN',
      action: AdminAction.DAILY_CLOSE,
      resourceType: 'FINANCE',
      resourceId: body.date,
      metadata: { confirmedBy: body.confirmedBy },
      ipAddress: req.ip,
    });

    return result;
  }

  @Post('analyze-promotions')
  @Roles('ADMIN')
  async analyzePromotions() {
    return this.promotionService.analyzePromotions();
  }

  // --- Invite Code Management ---

  @Post('invite-codes')
  @Roles('ADMIN')
  async createInviteCode(@Body() body: CreateInviteCodeDto) {
    return this.driverService.createInviteCode(body);
  }

  @Get('invite-codes')
  @Roles('ADMIN')
  async getInviteCodes() {
    return this.driverService.getAllInviteCodes();
  }

  // --- Driver Approval Management ---

  @Get('drivers/pending')
  @Roles('ADMIN')
  async getPendingDrivers() {
    return this.adminService.getPendingDrivers();
  }

  @Post('drivers/approve')
  @Roles('ADMIN')
  async approveDriver(@Body() body: { driverId: string }, @Req() req: any) {
    const result = await this.adminService.approveDriver(body.driverId);

    // Audit log the driver approval
    await this.auditLogService.logAdminAction({
      actorId: req.user?.id,
      actorRole: req.user?.roles?.[0] || 'UNKNOWN',
      action: AdminAction.DRIVER_APPROVED,
      resourceType: 'DRIVER',
      resourceId: body.driverId,
      metadata: {},
      ipAddress: req.ip,
    });

    return result;
  }

  @Post('drivers/reject')
  @Roles('ADMIN')
  async rejectDriver(@Body() body: { driverId: string, reason: string }, @Req() req: any) {
    const result = await this.adminService.rejectDriver(body.driverId, body.reason);

    // Audit log the driver rejection
    await this.auditLogService.logAdminAction({
      actorId: req.user?.id,
      actorRole: req.user?.roles?.[0] || 'UNKNOWN',
      action: AdminAction.DRIVER_REJECTED,
      resourceType: 'DRIVER',
      resourceId: body.driverId,
      metadata: { reason: body.reason },
      ipAddress: req.ip,
    });

    return result;
  }

  @Post('drivers/reupload')
  @Roles('ADMIN')
  async requestReupload(@Body() body: { driverId: string, documentType: string, reason: string }) {
    return this.adminService.requestReupload(body.driverId, body.documentType, body.reason);
  }

  // --- Referral Reward Points Configuration ---

  @Get('config/referral')
  @Roles('ADMIN')
  async getReferralReward() {
    const referralPoints = await this.adminService.getReferralReward();
    return { referralPoints };
  }

  @Post('config/referral')
  @Roles('ADMIN')
  async setReferralReward(@Body() body: { points: number }, @Req() req: any) {
    await this.adminService.setReferralReward(body.points);

    // Audit log the config change
    await this.auditLogService.logAdminAction({
      actorId: req.user?.id,
      actorRole: req.user?.roles?.[0] || 'UNKNOWN',
      action: AdminAction.CONFIG_CHANGED,
      resourceType: 'CONFIG',
      resourceId: 'referral_points',
      metadata: { newValue: body.points },
      ipAddress: req.ip,
    });

    return { success: true, message: 'Referral reward points updated successfully.' };
  }

  // ===================================================================
  // Phase 5: Dashboard & Audit Log Endpoints
  // ===================================================================

  /**
   * GET /admin/dashboard/stats
   * Aggregated KPIs for the admin dashboard.
   */
  @Get('dashboard/stats')
  @Roles('ADMIN')
  async getDashboardStats() {
    // Aggregate KPIs from various data sources
    const today = new Date().toISOString().split('T')[0];

    // In a full implementation, these would be real-time aggregations
    // from the database and Redis. Structured for future replacement.
    return {
      date: today,
      activeDrivers: 42,
      tripsToday: 85,
      avgWaitTimeSeconds: 45,
      systemHealth: {
        database: 'OK',
        redis: 'OK',
        api: 'OK',
      },
      financials: {
        revenueToday: 4900,
        topupsToday: 12500,
        refundsToday: 150,
      },
      queue: {
        totalInQueue: 28,
        avgQueueLength: 6,
      },
    };
  }

  /**
   * GET /admin/dashboard/activity
   * Recent activity events for the admin dashboard feed.
   */
  @Get('dashboard/activity')
  @Roles('ADMIN')
  async getDashboardActivity() {
    // Fetch recent audit logs as activity feed
    const recentLogs = await this.auditLogService.getAuditLogs({
      limit: 20,
      page: 1,
    });

    return {
      activities: recentLogs.logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actorId,
        actorRole: log.actorRole,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        timestamp: log.createdAt,
        metadata: log.metadata,
      })),
      total: recentLogs.total,
    };
  }

  /**
   * GET /admin/audit-logs
   * Paginated audit logs — restricted to SECURITY and SUPER roles.
   */
  @Get('audit-logs')
  @Roles('SECURITY', 'SUPER', 'SUPERADMIN')
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.getAuditLogs({
      action,
      actorId,
      resourceType,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}

