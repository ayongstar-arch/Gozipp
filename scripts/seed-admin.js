require('dotenv').config();
const argon2 = require('argon2');
const { Client } = require('pg');

async function main() {
  const pepper = process.env.PIN_PEPPER || '';
  const hash = await argon2.hash('GozippAdmin2026!' + pepper, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gozipp_db',
  });

  await c.connect();
  const query = `
    INSERT INTO admins (username, password_hash, role, mfa_enabled, is_active)
    VALUES ('admin', $1, 'SUPER_ADMIN', false, true)
    ON CONFLICT (username) 
    DO UPDATE SET 
      password_hash = $1, 
      is_active = true, 
      locked_until = NULL, 
      failed_attempts = 0
    RETURNING id, username, role, is_active, mfa_enabled;
  `;
  const res = await c.query(query, [hash]);
  console.log('Successfully upserted admin record:', res.rows[0]);
  await c.end();
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
