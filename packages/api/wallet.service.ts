import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletEntity, WalletOwnerType, WalletStatus } from './entities/wallet.entity';
import {
  LedgerEntryEntity,
  LedgerType,
  LedgerReferenceType,
} from './entities/ledger-entry.entity';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(WalletEntity)
    private walletRepo: Repository<WalletEntity>,

    @InjectRepository(LedgerEntryEntity)
    private ledgerRepo: Repository<LedgerEntryEntity>,

    private dataSource: DataSource,
  ) {}

  /**
   * Create a new wallet for a user (driver or passenger).
   */
  async createWallet(
    ownerId: string,
    ownerType: WalletOwnerType,
  ): Promise<WalletEntity> {
    // Check for existing wallet
    const existing = await this.walletRepo.findOne({
      where: { ownerId, ownerType },
    });
    if (existing) {
      throw new BadRequestException('Wallet already exists for this owner.');
    }

    const wallet = this.walletRepo.create({
      ownerId,
      ownerType,
      balance: 0,
      currency: 'THB',
      status: WalletStatus.ACTIVE,
    });

    const saved = await this.walletRepo.save(wallet);
    this.logger.log(`Wallet created for ${ownerType} ${ownerId}: ${saved.id}`);
    return saved;
  }

  /**
   * Get current balance for a wallet.
   */
  async getBalance(walletId: string): Promise<{ walletId: string; balance: number }> {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found.');
    }
    return { walletId: wallet.id, balance: Number(wallet.balance) };
  }

  /**
   * Find wallet by owner ID and type.
   */
  async getWalletByOwner(
    ownerId: string,
    ownerType: WalletOwnerType,
  ): Promise<WalletEntity | null> {
    return this.walletRepo.findOne({ where: { ownerId, ownerType } });
  }

  /**
   * Credit (add) points to a wallet.
   * Uses SERIALIZABLE transaction via QueryRunner for atomicity.
   */
  async creditPoints(
    walletId: string,
    amount: number,
    refType: LedgerReferenceType,
    refId?: string,
    description?: string,
    createdBy?: string,
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Credit amount must be positive.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Lock and read wallet within transaction
      const wallet = await queryRunner.manager.findOne(WalletEntity, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found.');
      }
      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException('Wallet is not active.');
      }

      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance + amount;

      // Update wallet balance
      await queryRunner.manager.update(WalletEntity, walletId, {
        balance: newBalance,
      });

      // Create ledger entry
      const ledgerEntry = queryRunner.manager.create(LedgerEntryEntity, {
        walletId,
        type: LedgerType.CREDIT,
        amount,
        balanceAfter: newBalance,
        referenceType: refType,
        referenceId: refId || null,
        description: description || null,
        createdBy: createdBy || null,
      });
      const savedEntry = await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Credit: wallet=${walletId}, amount=${amount}, newBalance=${newBalance}, ref=${refType}`,
      );

      return { newBalance, ledgerEntryId: savedEntry.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Debit (subtract) points from a wallet.
   * Uses SERIALIZABLE transaction via QueryRunner for atomicity.
   * Throws BadRequestException if insufficient balance.
   */
  async debitPoints(
    walletId: string,
    amount: number,
    refType: LedgerReferenceType,
    refId?: string,
    description?: string,
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Debit amount must be positive.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Lock and read wallet within transaction
      const wallet = await queryRunner.manager.findOne(WalletEntity, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found.');
      }
      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException('Wallet is not active.');
      }

      const currentBalance = Number(wallet.balance);
      if (currentBalance < amount) {
        throw new BadRequestException(
          `Insufficient balance. Current: ${currentBalance}, Requested: ${amount}`,
        );
      }

      const newBalance = currentBalance - amount;

      // Update wallet balance
      await queryRunner.manager.update(WalletEntity, walletId, {
        balance: newBalance,
      });

      // Create ledger entry
      const ledgerEntry = queryRunner.manager.create(LedgerEntryEntity, {
        walletId,
        type: LedgerType.DEBIT,
        amount,
        balanceAfter: newBalance,
        referenceType: refType,
        referenceId: refId || null,
        description: description || null,
      });
      const savedEntry = await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Debit: wallet=${walletId}, amount=${amount}, newBalance=${newBalance}, ref=${refType}`,
      );

      return { newBalance, ledgerEntryId: savedEntry.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get paginated transaction history for a wallet.
   */
  async getHistory(
    walletId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    entries: LedgerEntryEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found.');
    }

    const skip = (page - 1) * limit;
    const [entries, total] = await this.ledgerRepo.findAndCount({
      where: { walletId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Real-money top-up — FEATURE FLAGGED.
   * Only operational when ENABLE_REAL_TOPUP=true in environment.
   */
  async topupReal(
    walletId: string,
    amount: number,
    paymentRef: string,
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    if (process.env.ENABLE_REAL_TOPUP !== 'true') {
      throw new ForbiddenException(
        'Real-money top-up is not enabled. Set ENABLE_REAL_TOPUP=true to activate.',
      );
    }

    if (amount <= 0) {
      throw new BadRequestException('Top-up amount must be positive.');
    }

    return this.creditPoints(
      walletId,
      amount,
      LedgerReferenceType.TOPUP,
      paymentRef,
      `Real-money top-up via payment ref: ${paymentRef}`,
    );
  }
}
