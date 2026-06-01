import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('passkey_credentials')
export class PasskeyCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string; // Polymorphic ID (Driver or Passenger)

  @Column({ type: 'enum', enum: ['PASSENGER', 'DRIVER'] })
  userRole: string;

  // The credential ID returned by the authenticator (Base64URL encoded)
  @Column({ unique: true })
  credentialID: string;

  // The public key returned by the authenticator (Base64 encoded buffer)
  @Column()
  credentialPublicKey: string;

  // The counter for replay protection
  @Column({ type: 'bigint', default: 0 })
  counter: number;

  @Column({ nullable: true })
  credentialDeviceType: string;

  @Column({ default: false })
  credentialBackedUp: boolean;

  // e.g. ["internal", "hybrid"]
  @Column({ type: 'jsonb', nullable: true })
  transports: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
