# GOZIPP Go-Live Master Checklist

Use this as the single operational checklist for Phase 1.

## A. Pre-deploy

- [ ] PostgreSQL migration applied
- [ ] Redis available and reachable
- [ ] ThaiBulkSMS account approved
- [ ] SMS sender name approved
- [ ] JWT secret replaced with a real 64+ character secret
- [ ] `ALLOW_TEST_OTP=false`
- [ ] `ALLOW_REGISTRATION_WITHOUT_OTP=false`
- [ ] `SEED_DEMO_DATA=false`
- [ ] `NEXT_PUBLIC_ALLOW_REGISTRATION_WITHOUT_OTP=false`
- [ ] `THAIBULKSMS_APP_KEY` set
- [ ] `THAIBULKSMS_APP_SECRET` set
- [ ] `ALLOWED_ORIGINS` set to the correct frontend domains
- [ ] `FRONTEND_URL` set correctly
- [ ] `NEXT_PUBLIC_API_URL` points to the backend staging URL
- [ ] `NEXT_PUBLIC_SOCKET_URL` points to the backend staging URL
- [ ] `NEXT_PUBLIC_APP_URL` points to the frontend URL
- [ ] `COOKIE_DOMAIN` set correctly for the target domain

## B. Render backend

- [ ] `render.yaml` uses repository root
- [ ] Service created on Render
- [ ] Database connected
- [ ] Redis connected
- [ ] Health check returns HTTP 200
- [ ] Backend build succeeds
- [ ] Backend starts successfully

## C. Frontend connection

- [ ] Passenger frontend points to staging backend
- [ ] Driver frontend points to staging backend
- [ ] Admin frontend points to staging backend
- [ ] No frontend still points to localhost

## D. Auth validation

- [ ] Passenger OTP request sends real SMS
- [ ] Passenger OTP verify works
- [ ] Passenger registration creates exactly one DB row
- [ ] Passenger PIN setup works
- [ ] Passenger PIN relogin works after refresh
- [ ] Driver OTP request sends real SMS
- [ ] Driver OTP verify works
- [ ] Driver registration creates exactly one DB row
- [ ] Driver PIN setup works
- [ ] Driver PIN relogin works after refresh

## E. Security validation

- [ ] Wrong OTP is rejected
- [ ] Expired OTP is rejected
- [ ] Reused OTP is rejected
- [ ] OTP attempt limit works
- [ ] Resend cooldown works
- [ ] Test OTP bypass is disabled
- [ ] Registration bypass is disabled
- [ ] Production boot fails if required env is missing

## F. Ride validation

- [ ] Passenger can request a ride
- [ ] Driver receives the ride request
- [ ] Driver can accept the ride
- [ ] Driver can arrive
- [ ] Driver can start the trip
- [ ] Driver can complete the trip
- [ ] Trip status persists in PostgreSQL

## G. Session validation

- [ ] Refresh token/session stored securely
- [ ] Logout revokes session
- [ ] Reopening app does not silently bypass auth

## H. Release decision

Go live only if all sections above are checked.

If any item fails, keep the release in staging.

