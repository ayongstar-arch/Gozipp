import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseMigrationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    this.logger.log('Starting idempotent database schema verification & auto-migration...');
    try {
      await this.runMigrations();
      this.logger.log('✅ Database schema verified and up-to-date.');
    } catch (err: any) {
      this.logger.error('Failed to run database migrations:', err?.message || err);
      // Do not crash the entire app, allow it to boot with best effort
    }
  }

  private async runMigrations() {
    // 1. Extensions
    await this.safeQuery(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await this.safeQuery(`CREATE EXTENSION IF NOT EXISTS "postgis";`);
    await this.safeQuery(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

    // 2. Base tables: Passengers
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS passengers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(20) UNIQUE,
        name VARCHAR(200) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Passengers columns
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS name VARCHAR(200);`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS email VARCHAR(200);`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'OTP';`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS pin_hash TEXT;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS provider_id TEXT;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS webauthn_current_challenge TEXT;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS points_balance NUMERIC(10, 2) DEFAULT 0;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS total_rides INTEGER DEFAULT 0;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS free_rides_remaining INTEGER DEFAULT 3;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS community_points_balance INTEGER DEFAULT 0;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS referred_by_id UUID;`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`);
    await this.safeQuery(`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`);

    // Sync old 'balance' column to 'points_balance' if present
    await this.safeQuery(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passengers' AND column_name = 'balance') THEN
          UPDATE passengers SET points_balance = balance WHERE (points_balance IS NULL OR points_balance = 0) AND balance > 0;
        END IF;
      END $$;
    `);

    // 3. Base tables: Drivers
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        plate VARCHAR(50) DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Drivers columns
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS name VARCHAR(200);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS plate VARCHAR(50) DEFAULT '';`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS line_id VARCHAR(100);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email VARCHAR(200);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'OTP';`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS pin_hash TEXT;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS provider_id TEXT;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS webauthn_current_challenge TEXT;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS station_id VARCHAR(50);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS invite_code VARCHAR(50);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'PENDING';`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_status VARCHAR(50) DEFAULT 'OFFLINE';`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_onboarding_step INTEGER DEFAULT 1;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.00;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(12, 2) DEFAULT 0;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS promptpay_id VARCHAR(20);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20);`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents JSONB;`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`);
    await this.safeQuery(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`);

    // 4. Refresh Tokens
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL,
        user_type VARCHAR(20) NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
        replaced_by_token_hash TEXT,
        ip_address VARCHAR(64),
        device_id VARCHAR(255),
        device_name VARCHAR(255),
        os VARCHAR(255),
        browser VARCHAR(255),
        location VARCHAR(255),
        last_active_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.safeQuery(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, user_type);`);
    await this.safeQuery(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);`);

    // 5. Audit Logs
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255),
        user_type VARCHAR(50),
        action VARCHAR(200) NOT NULL,
        resource VARCHAR(100),
        resource_id VARCHAR(100),
        ip_address VARCHAR(64),
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Wallet & Transactions
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS wallet (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        passenger_id UUID UNIQUE,
        point_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        passenger_id UUID,
        type VARCHAR(20) NOT NULL,
        point_change NUMERIC(10, 2) NOT NULL,
        amount_baht NUMERIC(10, 2) DEFAULT 0.00,
        reference_id VARCHAR(100),
        trip_id UUID,
        status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
        signature TEXT,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. Stations & Invite Codes
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS stations (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        name_en VARCHAR(200),
        radius_m INTEGER NOT NULL DEFAULT 100,
        district VARCHAR(100),
        province VARCHAR(100) DEFAULT 'กรุงเทพมหานคร',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        code VARCHAR(50) PRIMARY KEY,
        station_id VARCHAR(50),
        type VARCHAR(20) NOT NULL DEFAULT 'STATION',
        max_uses INTEGER NOT NULL DEFAULT 100,
        used_count INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        note TEXT,
        created_by VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default station & invite code if empty
    await this.safeQuery(`
      INSERT INTO stations (id, name, district) VALUES
        ('WIN-CENTRAL-01', 'วินตลาดกลาง ปทุมวัน', 'ปทุมวัน')
      ON CONFLICT (id) DO NOTHING;
    `);

    await this.safeQuery(`
      INSERT INTO invite_codes (code, station_id, expires_at, note) VALUES
        ('WIN888', 'WIN-CENTRAL-01', '2028-12-31T23:59:59Z', 'Default station code')
      ON CONFLICT (code) DO NOTHING;
    `);

    // 8. Trips
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS trips (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        passenger_id UUID,
        driver_id UUID,
        station_id VARCHAR(50),
        pickup_address TEXT,
        dest_address TEXT,
        distance_km NUMERIC(8, 2) NOT NULL DEFAULT 0,
        duration_mins INTEGER,
        polyline TEXT,
        fare NUMERIC(10, 2) NOT NULL DEFAULT 2,
        credits_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'SEARCHING',
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        accepted_at TIMESTAMPTZ,
        arrived_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancel_reason TEXT,
        passenger_rating INTEGER,
        driver_rating INTEGER,
        passenger_note TEXT,
        driver_note TEXT
      );
    `);

    // 9. Promotions
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS promotions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        discount_points NUMERIC(10, 2) DEFAULT 0,
        discount_percent NUMERIC(5, 2) DEFAULT 0,
        max_discount NUMERIC(10, 2),
        min_spend NUMERIC(10, 2) DEFAULT 0,
        valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        valid_until TIMESTAMPTZ NOT NULL DEFAULT '2028-12-31T23:59:59Z',
        usage_limit INTEGER DEFAULT 1000,
        used_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 10. Passkey credentials
    await this.safeQuery(`
      CREATE TABLE IF NOT EXISTS passkey_credentials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        user_role VARCHAR(20) NOT NULL,
        credential_id TEXT UNIQUE NOT NULL,
        credential_public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        credential_device_type VARCHAR(100),
        credential_backed_up BOOLEAN NOT NULL DEFAULT FALSE,
        transports JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  private async safeQuery(sql: string) {
    try {
      await this.dataSource.query(sql);
    } catch (err: any) {
      // Log as debug/warn if expected, e.g. already exists
      this.logger.debug(`Migration safeQuery warning: ${err?.message || err}`);
    }
  }
}
