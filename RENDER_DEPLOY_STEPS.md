# Render Deploy Steps for GOZIPP Staging

Use this when you want a temporary cloud backend for real testing before AWS.

## Before you start

Make sure you have:

- A Render account
- A PostgreSQL database
- A Redis instance
- Your ThaiBulkSMS app key and secret
- A production JWT secret
- The frontend staging URLs you plan to use

## 1) Create the Render web service

1. Open Render dashboard
2. Click `New +`
3. Choose `Blueprint`
4. Select the GOZIPP repository
5. Confirm it reads the root `render.yaml`
6. Create the service

Expected service:

- Name: `gozipp-api-staging`
- Type: `Web Service`
- Runtime: `Node`

## 2) Connect the database

Point the service to your PostgreSQL database.

Set:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

If you are using Render Postgres, copy the internal connection details from Render.

## 3) Connect Redis

Set:

- `REDIS_URL`

Use a managed Redis instance or compatible service.

## 4) Set security and auth env vars

Set these values in Render:

- `JWT_SECRET`
- `WALLET_SECRET`
- `ALLOWED_ORIGINS`
- `COOKIE_DOMAIN`
- `FRONTEND_URL`
- `NEXT_PUBLIC_APP_URL`

Use long random secrets and real production domains.

## 5) Set SMS env vars

Set:

- `THAIBULKSMS_APP_KEY`
- `THAIBULKSMS_APP_SECRET`
- `SMS_API_URL=https://api-v2.thaibulksms.com/sms`
- `SMS_SENDER_ID=GOZIPP`

## 6) Set runtime flags

Set:

- `NODE_ENV=production`
- `SEED_DEMO_DATA=false`
- `ALLOW_TEST_OTP=false`
- `ALLOW_REGISTRATION_WITHOUT_OTP=false`
- `NEXT_PUBLIC_ALLOW_REGISTRATION_WITHOUT_OTP=false`
- `NEXT_PUBLIC_USE_REAL_SOCKET=true`

## 7) Set frontend API locations

If your frontend is still on Vercel or Cloudflare, set:

- `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`
- `NEXT_PUBLIC_SOCKET_URL=https://<your-render-service>.onrender.com`

## 8) Deploy

Trigger deploy and wait for the build to finish.

Expected commands:

```powershell
npm install
npm run build --workspace=@gozipp/api
npm run start --workspace=@gozipp/api
```

## 9) Verify health

Open:

```text
https://<your-render-service>.onrender.com/api/v1/health
```

You should see a 200 response.

## 10) Verify auth flow

Test with a real Thai phone number:

- request OTP
- receive SMS
- verify OTP
- create or complete account
- set PIN
- log out
- log in again with PIN

## 11) Verify driver flow

- request driver OTP
- set driver PIN
- log in with PIN
- go online
- accept a trip
- complete a trip

## 12) Promotion rule

Do not point public users at this backend until:

- health check is stable
- SMS works in real network conditions
- no mock/bypass path is used in live registration
- both passenger and driver PIN login are stable
- database writes are confirmed real

