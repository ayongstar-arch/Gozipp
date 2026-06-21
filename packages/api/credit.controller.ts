import { Controller, Post, Get, Body, Query, UseGuards, Req, Logger, Headers, Param } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreateTopupIntentDto } from './dtos';
import { AuthGuard } from './common/guards';

@Controller('credit')
export class CreditController {
  private readonly logger = new Logger(CreditController.name);

  constructor(private readonly creditService: CreditService) {}

  @Get('balance')
  @UseGuards(AuthGuard)
  async getBalance(@Req() req: any) {
    const balance = await this.creditService.getBalance(req.user.sub);
    return { passengerId: req.user.sub, balance };
  }

  @Get('history')
  @UseGuards(AuthGuard)
  async getHistory(@Req() req: any, @Query('limit') limit = '20') {
    return this.creditService.getTransactionHistory(req.user.sub, parseInt(limit));
  }

  @Get('topup/:paymentRef')
  @UseGuards(AuthGuard)
  async getTopupStatus(@Req() req: any, @Param('paymentRef') paymentRef: string) {
    return this.creditService.getTopupStatus(req.user.sub, paymentRef);
  }

  @Post('topup')
  @UseGuards(AuthGuard)
  async topup(@Req() req: any, @Body() body: CreateTopupIntentDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.creditService.requestTopup(req.user.sub, body, idempotencyKey);
  }

  /**
   * WEBHOOK: Receive callback from Payment Gateway (e.g., GBPrimePay, Omise)
   * URL: POST /api/credit/webhook
   * This logic is critical for Production.
   */
  @Post('webhook')
  async paymentWebhook(@Body() payload: any, @Headers('x-signature') signature: string) {
    this.logger.log(`Received Payment Webhook: ${JSON.stringify(payload)}`);
    return this.creditService.processPaymentWebhook(payload, signature);
  }
}
