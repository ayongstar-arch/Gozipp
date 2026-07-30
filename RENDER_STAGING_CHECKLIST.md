# Render Staging Checklist

This checklist is for the temporary production-like backend used to validate Phase 1 before public launch.

## 1. Create the Render Web Service

- Connect the repository
- Use the `render.yaml` in the repo root
- Confirm the service name is `gozipp-api-staging`
- Confirm `rootDir` is the repository root
- Confirm the service type is `web`

## 2. Set required environment variables

Set the production values for:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `REDIS_URL`
- `JWT_SECRET`
- `WALLET_SECRET`
- `ALLOWED_ORIGINS`
- `COOKIE_DOMAIN`
- `FRONTEND_URL`
- `THAIBULKSMS_APP_KEY`
- `THAIBULKSMS_APP_SECRET`
- `SMS_API_URL`
- `SMS_SENDER_ID`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_USE_REAL_SOCKET=true`
- `SEED_DEMO_DATA=false`
- `ALLOW_TEST_OTP=false`
- `ALLOW_REGISTRATION_WITHOUT_OTP=false`
- `NEXT_PUBLIC_ALLOW_REGISTRATION_WITHOUT_OTP=false`

Do not deploy with placeholder secrets.

## 3. Run the first deployment

Expected build flow:

```powershell
npm install
npm run build --workspace=@gozipp/api
npm run start --workspace=@gozipp/api
```

## 4. Verify health

Open:

```text
/api/v1/health
```

Expected result:

- HTTP 200
- JSON response
- service marked healthy by Render

## 5. Verify auth end-to-end

- Request OTP with a real Thai mobile number
- Confirm SMS delivery
- Verify wrong OTP is rejected
- Verify correct OTP creates exactly one passenger/driver record
- Complete PIN setup
- Close and reopen the app
- Confirm PIN login still works

## 6. Verify ride lifecycle

- Passenger requests ride
- Driver receives request
- Driver accepts
- Driver arrives
- Trip starts
- Trip completes

## 7. Go-live gate

Do not promote from staging unless all of the following are true:

- No auth flow depends on mock or bypass behavior
- Real SMS delivery is stable
- Session restore works after browser refresh
- Backend health check stays green
- Database writes are real and persistent

