import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TopupDto, AdminRefundDto } from './dtos';
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

  constructor(
    private dataSource: DataSource,
    private promotionService: PromotionService,
    private configService: ConfigService
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.txSecret = this.configService.get<string>('WALLET_SECRET') || 'WINNO_TX_SECURE_2026';
  }

  private async acquireLock(passengerId: string): Promise<boolean> {
    const key = `lock:passenger:${passengerId}:credit`;
    const result = await this.redis.set(key, 'LOCKED', 'EX', 5, 'NX');
    return result === 'OK';
  }

  private async releaseLock(passengerId: string): Promise<void> {
    await this.redis.del(`lock:passenger:${passengerId}:credit`);
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

  async topup(dto: TopupDto) {
    const locked = await this.acquireLock(dto.passengerId);
    if (!locked) throw new BadRequestException('กำลังดำเนินการทำรายการอื่นอยู่ กรุณารอสักครู่');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { bonus } = this.promotionService.evaluateTopup(dto.passengerId, dto.amount);
      const totalPoints = dto.amount + bonus;

      // 1. Update Wallet
      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET} (passenger_id, point_balance, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (passenger_id) 
         DO UPDATE SET point_balance = ${TABLE_WALLET}.point_balance + $2, updated_at = NOW()`,
        [dto.passengerId, totalPoints]
      );

      // 2. Sign Transaction
      const txPayload = {
        userId: dto.passengerId,
        type: 'TOPUP',
        change: totalPoints,
        ts: Date.now()
      };
      const signature = signTransaction(txPayload, this.txSecret);

      // 3. Log Transaction
      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET_TXN} 
         (passenger_id, type, point_change, amount_baht, reference_id, status, signature, created_at)
         VALUES ($1, 'TOPUP', $2, $3, $4, 'SUCCESS', $5, NOW())`,
        [dto.passengerId, totalPoints, dto.amount, 'PP-' + Date.now(), signature]
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Wallet Top-up Success: User ${dto.passengerId} +${totalPoints} pts`);
      
      return { success: true, pointsAdded: totalPoints, balance: await this.getBalance(dto.passengerId) };

    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Top-up failed for User ${dto.passengerId}: ${err.message}`);
      throw new InternalServerErrorException('การประมวลผลการชำระเงินล้มเหลว');
    } finally {
      await queryRunner.release();
      await this.releaseLock(dto.passengerId);
    }
  }

  async deductForRide(passengerId: string, tripId: string, amount: number): Promise<boolean> {
    const locked = await this.acquireLock(passengerId);
    if (!locked) return false;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await this.getBalance(passengerId);
      if (balance < amount) throw new Error('ยอดเงินคงเหลือไม่เพียงพอ');

      await queryRunner.query(
        `UPDATE ${TABLE_WALLET} SET point_balance = point_balance - $1, updated_at = NOW() WHERE passenger_id = $2`,
        [amount, passengerId]
      );

      const txPayload = { userId: passengerId, type: 'DEDUCT', change: -amount, tripId };
      const signature = signTransaction(txPayload, this.txSecret);

      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET_TXN} 
         (passenger_id, type, point_change, reference_id, signature, created_at)
         VALUES ($1, 'DEDUCT', $2, $3, $4, NOW())`,
        [passengerId, -amount, tripId, signature]
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

  async addBonusPoints(passengerId: string, points: number, note: string = 'Referral Bonus'): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 1. Update Wallet
      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET} (passenger_id, point_balance, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (passenger_id) 
         DO UPDATE SET point_balance = ${TABLE_WALLET}.point_balance + $2, updated_at = NOW()`,
        [passengerId, points]
      );
      // 2. Update Passenger Points Balance
      await queryRunner.query(
        `UPDATE passengers SET points_balance = points_balance + $1 WHERE id = $2`,
        [points, passengerId]
      );
      // 3. Sign Transaction
      const txPayload = { userId: passengerId, type: 'BONUS', change: points, ts: Date.now() };
      const signature = signTransaction(txPayload, this.txSecret);
      // 4. Log Transaction
      await queryRunner.query(
        `INSERT INTO ${TABLE_WALLET_TXN} 
         (passenger_id, type, point_change, reference_id, status, signature, note, created_at)
         VALUES ($1, 'BONUS', $2, $3, 'SUCCESS', $4, $5, NOW())`,
        [passengerId, points, 'REF-' + Date.now(), signature, note]
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