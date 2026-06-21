# Passenger Registration Go-Live

## 1. Apply the database migration

Back up PostgreSQL, then run:

```powershell
psql -v ON_ERROR_STOP=1 -d gozipp_db -f packages/api/database/migration_v5_passenger_auth.sql
```

The migration aligns passenger, refresh-session, and passkey columns with the TypeORM entities.

## 2. Configure production secrets

Set every production variable documented in `.env.example`, especially:

- `DB_*`, `REDIS_URL`
- `JWT_SECRET` (at least 64 random characters)
- `THAIBULKSMS_APP_KEY`, `THAIBULKSMS_APP_SECRET`, `SMS_API_URL`
- `ALLOWED_ORIGINS`, `COOKIE_DOMAIN`, `FRONTEND_URL`
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_APP_URL`
- `NODE_ENV=production`, `ALLOW_TEST_OTP=false`, `ALLOW_REGISTRATION_WITHOUT_OTP=false`, `SEED_DEMO_DATA=false`
- `NEXT_PUBLIC_ALLOW_REGISTRATION_WITHOUT_OTP=false`

The API now refuses to boot in production when critical variables are missing, the JWT secret is a placeholder, or test OTP is enabled.

## 3. Verify before shifting traffic

```powershell
npm.cmd run test:registration --workspace @gozipp/api
npm.cmd run build --workspace @gozipp/api
npm.cmd run build --workspace @gozipp/passenger
```

Use a real test SIM to verify:

1. OTP arrives from the approved sender name.
2. A wrong OTP cannot create a passenger.
3. The correct OTP creates exactly one `passengers` row.
4. Reusing the OTP fails.
5. PIN setup succeeds and stores only `pin_hash`.
6. Refreshing the browser restores the authenticated passenger.
7. Logout revokes the refresh session.

Do not enable public registration until the SMS provider account and sender name are approved.
