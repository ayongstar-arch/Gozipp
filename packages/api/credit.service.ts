import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { CreateTopupIntentDto } from './dtos';
import { PromotionService } from './promotion.service';
import { signTransaction, verifyTransaction } from './common/utils/crypto';

const TABLE_WALLET = 'wallet';
const TABLE_WALLET_TXN = 'wallet_transactions';
const TABLE_PAYMENT_TXN = 'payment_transactions';

@Injectable()
export class CreditService {
  private readonly redis: Redis;
  private readonly logger = new Logger(CreditService.name);
  private readonly txSecret: string;
  private readonly paymentWebhookSecret: string;
  private readonly paymentProvider: string;

  constructor(
    private dataSource: DataSource,
    private promotionService: PromotionService,
    private configService: ConfigService
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.txSecret = this.configService.get<string>('WALLET_SECRET') || 'WINNO_TX_SECURE_2026';
    this.paymentWebhookSecret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET') || '';
    this.paymentProvider = (this.configService.get<string>('PAYMENT_PROVIDER') || 'PROMPTPAY').trim().toUpperCase();
  }

  private async acquireLock(passengerId: string): Promise<boolean> {
    const key = `lock:passenger:${passengerId}:credit`;
    const result = await this.redis.set(key, 'LOCKED', 'EX', 5, 'NX');
    return result === 'OK';
  }

  private async releaseLock(passengerId: string): Promise<void> {
    await this.redis.del(`lock:passenger:${passengerId}:credit`);
  }

  private createPaymentRef(): string {
    return `TP-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private normalizeMethod(paymentMethod?: string) {
    const method = (paymentMethod || 'PROMPTPAY').trim().toUpperCase();
    return method || 'PROMPTPAY';
  }

  private isPaymentProviderReady() {
    return Boolean(this.paymentProvider) && this.paymentProvider !== 'NONE';
  }

  async getTopupStatus(passengerId: string, paymentRef: string) {
    const rows = await this.dataSource.query(
      `SELECT payment_ref, status, amount_baht, bonus_points, provider_name, payment_method, created_at, confirmed_at
       FROM ${TABLE_PAYMENT_TXN}
       WHERE passenger_id = $1 AND payment_ref = $2
       LIMIT 1`,
      [passengerId, paymentRef]
    );

    if (!rows.length) {
      throw new BadRequestException('Payment reference not found');
    }

    const row = rows[0];
    return {
      success: true,
      paymentRef: row.payment_ref,
      status: row.status,
      amount: Number(row.amount_baht),
      bonusPoints: Number(row.bonus_points),
      providerName: row.provider_name,
      paymentMethod: row.payment_method,
      createdAt: row.created_at,
      confirmedAt: row.confirmed_at,
      providerReady: this.isPaymentProviderReady(),
      providerConfiguredName: this.paymentProvider,
      message: row.status === 'CONFIRMED'
        ? 'รายการนี้ได้รับการยืนยันแล้ว'
        : 'รายการนี้ยังรอการยืนยันจากผู้ให้บริการชำระเงิน',
    };
  }

  async getBalance(passengerId: string): Promise<number> {
    const res = await this.dataSource.query(
      `SELECT point_balance FROM ${TABLE_WALLET} WHERE passenger_id = $1`,
      [passengerId]
    );
    return res.length ? parseFloat(res[0].point_balance) : 0;
  }

  async getTransactionHistory(passengerId: string, limit = 20) {
    const res = await this.dataSource.query(
      `SELECT id, type, point_change, amount_baht, reference_id, trip_id, status, note, created_at
       FROM ${TABLE_WALLET_TXN}
       WHERE passenger_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [passengerId, limit]
    );
    return res;
  }

  /**
   * Integrity Check: Reconcile wallet balance with transaction history
   */
  async reconcileBalance(passengerId: string): Promise<{ actual: number; calculated: number; isValid: boolean }> {
    const actualRes = await this.dataSource.query(
      `SELECT point_balance FROM ${TABLE_WALLET} WHERE passenger_id = $1`,
      [passengerId]
    );
    const actual = actualRes.length ? parseFloat(actualRes[0].point_balance) : 0;

    const calcRes = await this.dataSource.query(
      `SELECT SUM(point_change) as total FROM ${TABLE_WALLET_TXN} WHERE passenger_id = $1 AND status = 'SUCCESS'`,
      [passengerId]
    );
    const calculated = calcRes[0]?.total ? parseFloat(calcRes[0].total) : 0;

    return {
      actual,
      calculated,
      isValid: Math.abs(actual - calculated) < 0.01
    };
  }

  async requestTopup(
    passengerId: string,
    dto: CreateTopupIntentDto,
    idempotencyKey?: string,
  ) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Top-up amount must be positive');
    }

    const paymentMethod = this.normalizeMethod(dto.paymentMethod);
    const bonus = this.promotionService.evaluateTopup(passengerId, amount).bonus;

    if (idempotencyKey) {
      const existing = await this.dataSource.query(
        `SELECT payment_ref, status, amount_baht, bonus_points, provider_name, payment_method, created_at
         FROM ${TABLE_PAYMENT_TXN}
         WHERE passenger_id = $1 AND idempotency_key = $2
         LIMIT 1`,
        [passengerId, idempotencyKey]
      );
      if (existing.length) {
        const row = existing[0];
        return {
          success: true,
          status: row.status,
          paymentRef: row.payment_ref,
          amount: Number(row.amount_baht),
          bonusPoints: Number(row.bonus_points),
          paymentMethod: row.payment_method,
          providerName: row.provider_name,
          balance: await this.getBalance(passengerId),
          message: row.status === 'CONFIRMED'
            ? 'รายการเติมเงินนี้ได้รับการยืนยันแล้ว'
            : 'สร้างรายการเติมเงินไว้แล้ว กรุณาชำระด้วยอ้างอิงเดิม',
        };
      }
    }

    const paymentRef = this.createPaymentRef();
    const paymentSignature = signTransaction(
      { passengerId, paymentRef, amount, bonus, paymentMethod },
      this.txSecret,
    );

    await this.dataSource.query(
      `INSERT INTO ${TABLE_PAYMENT_TXN}
        (passenger_id, payment_ref, idempotency_key, provider_name, payment_method, amount_baht, bonus_points, status, signature, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, NOW(), NOW())`,
      [
        passengerId,
        paymentRef,
        idempotencyKey || null,
        paymentMethod,
        paymentMethod,
        amount,
        bonus,
        paymentSignature,
      ]
    );

    return {
      success: true,
      status: 'PENDING',
      paymentRef,
      paymentMethod,
      amount,
      bonusPoints: bonus,
      balance: await this.getBalance(passengerId),
      providerReady: this.isPaymentProviderReady(),
      providerConfiguredName: this.paymentProvider,
      message: 'สร้างรายการเติมเงินแล้ว รอการยืนยันจากช่องทางชำระเงิน',
      instructions: paymentMethod === 'PROMPTPAY'
        ? 'ชำระผ่าน PromptPay แล้วระบบจะอัปเดตแต้มเมื่อ webhook ยืนยัน'
        : 'รายการถูกบันทึกแล้ว รอการยืนยันจากผู้ให้บริการชำระเงิน',
    };
  }

  async processPaymentWebhook(payload: any, signature?: string) {
    const paymentRef = payload?.referenceNo || payload?.reference_id || payload?.paymentRef || payload?.transactionId;
    if (!paymentRef) {
      throw new BadRequestException('Missing payment reference');
    }

    if (this.paymentWebhookSecret) {
      if (!signature) {
        throw new BadRequestException('Missing webhook signature');
      }
      if (!verifyTransaction(payload, signature, this.paymentWebhookSecret)) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const status = String(payload?.status || '').toUpperCase();
    const amount = Number(payload?.amount ?? payload?.amount_baht ?? 0);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paymentRows = await queryRunner.query(
        `SELECT * FROM ${TABLE_PAYMENT_TXN} WHERE payment_ref = $1 FOR UPDATE`,
        [paymentRef]
      );
      if (!paymentRows.length) {
        throw new BadRequestException('Unknown payment reference');
      }

      const payment = paymentRows[0];
      if (payment.status === 'CONFIRMED') {
        await queryRunner.commitTransaction();
        return {
          success: true,
          status: 'CONFIRMED',
          paymentRef,
          providerReady: this.isPaymentProviderReady(),
          balance: await this.getBalance(payment.passenger_id),
        };
      }

      if (status && status !== 'SUCCESS' && status !== 'PAID' && status !== 'CONFIRMED') {
        await queryRunner.query(
          `UPDATE ${TABLE_PAYMENT_TXN}
           SET status = 'FAILED', provider_payload = $2, signature = $3, updated_at = NOW()
           WHERE payment_ref = $1`,
          [paymentRef, JSON.stringify(payload), signature || null]
        );
        await queryRunner.commitTransaction();
        return {
          success: true,
          status: 'FAILED',
          paymentRef,
        };
      }

      const expectedAmount = Number(payment.amount_baht);
      if (expectedAmount > 0 && amount > 0 && Math.abs(expectedAmount - amount) > 0.01) {
        throw new BadRequestException('Payment amount mismatch');
      }

      const totalPoints = await this.creditWalletFromPayment(
        queryRunner,
        payment.passenger_id,
        expectedAmount,
        Number(payment.bonus_points || 0),
        paymentRef,
        payment.payment_method,
        payload,
        signature || null,
      );

      await queryRunner.query(
        `UPDATE ${TABLE_PAYMENT_TXN}
         SET status = 'CONFIRMED', provider_payload = $2, signature = $3, confirmed_at = NOW(), updated_at = NOW()
         WHERE payment_ref = $1`,
        [paymentRef, JSON.stringify(payload), signature || null]
      );

      await queryRunner.commitTransaction();
      const balance = await this.getBalance(payment.passenger_id);
      return {
        success: true,
        status: 'CONFIRMED',
        paymentRef,
        pointsAdded: totalPoints,
        providerReady: this.isPaymentProviderReady(),
        balance,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Webhook processing failed for ${paymentRef}: ${err.message}`);
      throw new InternalServerErrorException('ไม่สามารถประมวลผลการชำระเงินได้');
    } finally {
      await queryRunner.release();
    }
  }

  private async creditWalletFromPayment(
    queryRunner: any,
    passengerId: string,
    amount: number,
    bonus: number,
    paymentRef: string,
    paymentMethod: string,
    payload: any,
    signature: string | null,
  ): Promise<number> {
    const totalPoints = amount + bonus;
    const txPayload = {
      userId: passengerId,
      type: 'TOPUP',
      change: totalPoints,
      paymentRef,
    };
    const walletSignature = signTransaction(txPayload, this.txSecret);

    await queryRunner.query(
      `INSERT INTO ${TABLE_WALLET} (passenger_id, point_balance, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (passenger_id)
       DO UPDATE SET point_balance = ${TABLE_WALLET}.point_balance + EXCLUDED.point_balance,
                     updated_at = NOW()`,
      [passengerId, totalPoints]
    );

    await queryRunner.query(
      `INSERT INTO ${TABLE_WALLET_TXN}
       (passenger_id, type, point_change, amount_baht, reference_id, status, signature, note, created_at)
       VALUES ($1, 'TOPUP', $2, $3, $4, 'SUCCESS', $5, $6, NOW())`,
      [
        passengerId,
        totalPoints,
        amount,
        paymentRef,
        walletSignature,
        `Top-up via ${paymentMethod}${signature ? ' / webhook verified' : ''}`,
      ]
    );

    if (payload) {
      await queryRunner.query(
        `UPDATE ${TABLE_PAYMENT_TXN}
         SET provider_payload = $2, signature = COALESCE($3, signature), updated_at = NOW()
         WHERE payment_ref = $1`,
        [paymentRef, JSON.stringify(payload), signature]
      );
    }

    return totalPoints;
  }

  async deductForRide(passengerId: string, tripId: string, amount: number): Promise<boolean> {
    if (amount <= 0) return true;

    const locked = await this.acquireLock(passengerId);
    if (!locked) return false;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rows = await queryRunner.query(
        `SELECT passenger_id, point_balance
         FROM ${TABLE_WALLET}
         WHERE passenger_id = $1
         FOR UPDATE`,
        [passengerId]
      );

      if (!rows.length) {
        throw new BadRequestException('Wallet not found');
      }

      const currentBalance = Number(rows[0].point_balance);
      if (currentBalance < amount) {
        throw new BadRequestException('ยอดเงินคงเหลือไม่เพียงพอ');
      }

      const newBalance = currentBalance - amount;
      await queryRunner.query(
        `UPDATE ${TABLE_WALLET}
         SET point_balance = $1, updated_at = NOW()
         WHERE passenger_id = $2`,
        [newBalance, passengerId]
      );

      const txPayload = { userId: passengerId, type: 'DEDUCT', change: -amount, tripId };
      const signature = signTransaction(txPayload, this.txSecret);

      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET_TXN}
         (passenger_id, type, point_change, reference_id, trip_id, status, signature, note, created_at)
         VALUES ($1, 'DEDUCT', $2, $3, $4, 'SUCCESS', $5, $6, NOW())`,
        [passengerId, -amount, tripId, tripId, signature, 'Ride charge']
      );

      await queryRunner.commitTransaction();
      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
      await this.releaseLock(passengerId);
    }
  }

  async refundForRide(passengerId: string, tripId: string, amount: number, note = 'Ride cancellation refund'): Promise<boolean> {
    if (amount <= 0) return true;

    const locked = await this.acquireLock(passengerId);
    if (!locked) return false;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const txPayload = { userId: passengerId, type: 'REFUND', change: amount, tripId };
      const signature = signTransaction(txPayload, this.txSecret);

      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET}
         (passenger_id, point_balance, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (passenger_id)
         DO UPDATE SET point_balance = ${TABLE_WALLET}.point_balance + EXCLUDED.point_balance,
                       updated_at = NOW()`,
        [passengerId, amount]
      );

      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET_TXN}
         (passenger_id, type, point_change, reference_id, trip_id, status, signature, note, created_at)
         VALUES ($1, 'REFUND', $2, $3, $4, 'SUCCESS', $5, $6, NOW())`,
        [passengerId, amount, tripId, tripId, signature, note]
      );

      await queryRunner.commitTransaction();
      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Refund failed for passenger ${passengerId}: ${err.message}`);
      return false;
    } finally {
      await queryRunner.release();
      await this.releaseLock(passengerId);
    }
  }

  async consumeFreeRide(passengerId: string, tripId: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE passengers
       SET free_rides_remaining = GREATEST(free_rides_remaining - 1, 0),
           updated_at = NOW()
       WHERE id = $1 AND free_rides_remaining > 0
       RETURNING free_rides_remaining`,
      [passengerId]
    );

    if (!result.length) {
      this.logger.warn(`Free ride was not available for passenger ${passengerId} on trip ${tripId}`);
      return false;
    }

    return true;
  }

  async addBonusPoints(passengerId: string, points: number, note: string = 'Referral Bonus'): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET} (passenger_id, point_balance, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (passenger_id)
         DO UPDATE SET point_balance = ${TABLE_WALLET}.point_balance + EXCLUDED.point_balance,
                       updated_at = NOW()`,
        [passengerId, points]
      );

      await queryRunner.query(
        `UPDATE passengers SET points_balance = points_balance + $1 WHERE id = $2`,
        [points, passengerId]
      );

      const txPayload = { userId: passengerId, type: 'BONUS', change: points, ts: Date.now() };
      const signature = signTransaction(txPayload, this.txSecret);

      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET_TXN}
         (passenger_id, type, point_change, reference_id, status, signature, note, created_at)
         VALUES ($1, 'BONUS', $2, $3, 'SUCCESS', $4, $5, NOW())`,
        [passengerId, points, `REF-${Date.now()}`, signature, note]
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Wallet Bonus Points Success: User ${passengerId} +${points} pts`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Bonus points failed for User ${passengerId}: ${err.message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
