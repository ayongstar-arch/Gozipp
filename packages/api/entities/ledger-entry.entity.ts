import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WalletEntity } from './wallet.entity';

export enum LedgerType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum LedgerReferenceType {
  TOPUP = 'TOPUP',
  RIDE_FEE = 'RIDE_FEE',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  PROMO_BONUS = 'PROMO_BONUS',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('ledger_entries')
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => WalletEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: WalletEntity;

  @Column({
    type: 'enum',
    enum: LedgerType,
  })
  type: LedgerType;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount: number;

  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  balanceAfter: number;

  @Index()
  @Column({
    name: 'reference_type',
    type: 'enum',
    enum: LedgerReferenceType,
  })
  referenceType: LedgerReferenceType;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
