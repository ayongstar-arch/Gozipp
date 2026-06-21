import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('passkey_credentials')
export class PasskeyCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string; // Polymorphic ID (Driver or Passenger)

  @Column({ name: 'user_role', type: 'enum', enum: ['PASSENGER', 'DRIVER'] })
  userRole: string;

  // The credential ID returned by the authenticator (Base64URL encoded)
  @Column({ name: 'credential_id', unique: true })
  credentialID: string;

  // The public key returned by the authenticator (Base64 encoded buffer)
  @Column({ name: 'credential_public_key', type: 'text' })
  credentialPublicKey: string;

  // The counter for replay protection
  @Column({ type: 'bigint', default: 0 })
  counter: number;

  @Column({ name: 'credential_device_type', nullable: true })
  credentialDeviceType: string;

  @Column({ name: 'credential_backed_up', default: false })
  credentialBackedUp: boolean;

  // e.g. ["internal", "hybrid"]
  @Column({ type: 'jsonb', nullable: true })
  transports: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
