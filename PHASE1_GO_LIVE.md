# Phase 1 Go-Live Scope

Phase 1 for GOZIPP is the smallest production-ready slice that can accept real users, authenticate them safely, and complete a basic ride lifecycle without relying on mock-only shortcuts.

## What Phase 1 must do

### Passenger

- First-time registration with real OTP verification
- PIN setup after successful OTP verification
- Future logins with PIN only
- Forgot PIN flow via trusted-device approval or OTP fallback
- Session restore and logout
- Basic ride request, ride tracking, history, profile, and wallet shell

### Driver

- First-time registration with real OTP verification
- PIN setup after successful OTP verification
- Future logins with PIN only
- Forgot PIN flow via trusted-device approval or OTP fallback
- Session restore and logout
- Online/offline availability
- Receive and accept ride requests
- Trip lifecycle: accepted, arriving, in progress, completed, cancelled

### Backend

- PostgreSQL as the source of truth
- Redis for OTP and short-lived security state
- Real SMS integration for first-time OTP
- Production-safe environment validation
- Health check endpoint for deployment and monitoring
- Secure session management for refresh/login flow

### Deployment

- Frontend can run on Vercel for prototype or UI hosting
- Backend must run on a real cloud service for production/staging
- Render is the default low-cost staging target for Phase 1

## What is already in place

- Passenger OTP and PIN flow exists
- Driver OTP and PIN flow exists
- Trusted-device PIN reset flow exists
- Real SMS provider wiring exists in the backend
- Production env validation exists
- Health endpoint exists for deployment checks
- Render service config exists
- PWA-style standalone app behavior exists on both frontends

## What still needs hardening before calling Phase 1 complete

- Remove any remaining mock or bypass paths from active user journeys
- Keep legacy prototype components out of the live route map
- Verify real SMS delivery in staging with an approved sender name
- Verify first-time registration creates exactly one real database record
- Verify PIN login works after refresh and app reopen
- Verify trusted-device PIN reset flow end to end
- Verify ride request to accept to completion works with real backend state
- Verify driver availability and passenger ride history are persisted correctly

## Launch rule

Phase 1 is only considered ready when:

1. Real OTP works in staging
2. PIN-only re-login works after app restart
3. Passenger and driver flows both work against real PostgreSQL and Redis
4. The backend is deployed and reachable from the frontend
5. No active user journey depends on mock-only bypass logic

## Recommended rollout order

1. Lock down auth and session flow
2. Deploy backend staging on Render
3. Connect frontend to staging backend
4. Test passenger registration and PIN login end to end
5. Test driver registration and PIN login end to end
6. Test one complete ride lifecycle
7. Remove remaining prototype-only screens from active routes

## Phase 2 after Phase 1

- Payment provider integration
- Wallet top-up and withdrawal
- Promotions and referral mechanics
- Notification center
- More advanced admin analytics
- Fleet/dispatch optimization

