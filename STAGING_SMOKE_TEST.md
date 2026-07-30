# Staging Smoke Test for Phase 1

Run this after deploying the backend to Render and connecting the frontend.

## Goal

Confirm that Phase 1 works with real services and real database writes, without any mock or bypass path.

## Test data

- One real Thai mobile number for passenger
- One real Thai mobile number for driver
- One real SMS sender-approved account
- One real staging database
- One real Redis instance

## Pass criteria

All tests below must pass before you open the system to broader testing.

## 1. Health check

- Open `GET /api/v1/health`
- Expect HTTP 200
- Expect a healthy JSON payload

Pass if:
- The backend is reachable from the public URL
- Render shows the service as healthy

## 2. Passenger OTP request

- Go to passenger registration
- Enter a real Thai phone number
- Request OTP

Pass if:
- SMS is delivered
- OTP is not shown in the frontend
- Backend stores OTP only temporarily
- Resend cooldown is enforced

## 3. Passenger OTP verify

- Enter the correct OTP
- Continue registration

Pass if:
- Wrong OTP is rejected
- Correct OTP succeeds once only
- OTP cannot be reused
- Passenger row is created exactly once in PostgreSQL

## 4. Passenger PIN setup

- Set a 6-digit PIN

Pass if:
- PIN is stored as hash only
- Plain PIN is never stored
- User is logged in after setup

## 5. Passenger relogin with PIN

- Log out
- Refresh browser
- Reopen app
- Log in with PIN only

Pass if:
- Session restores correctly
- PIN login works without asking for OTP again

## 6. Forgot PIN

- From passenger login, trigger forgot PIN
- Approve via trusted device or fallback flow you have enabled

Pass if:
- A reset request is created
- Approval path works
- New PIN replaces old PIN safely

## 7. Driver OTP request

- Go to driver registration
- Enter a real Thai phone number
- Request OTP

Pass if:
- SMS is delivered
- Same cooldown and limit rules apply

## 8. Driver OTP verify and PIN setup

- Verify OTP
- Finish driver registration
- Set PIN

Pass if:
- Driver account is created in PostgreSQL
- PIN is hashed
- Driver can re-login with PIN

## 9. Driver online/offline

- Log in as driver
- Go online
- Then go offline

Pass if:
- Status is persisted
- Reconnect keeps the correct status

## 10. Ride request

- Passenger creates a ride request

Pass if:
- A trip record is created in PostgreSQL
- Status becomes `SEARCHING`
- Driver queue/matching receives it

## 11. Ride accept

- Driver accepts the ride

Pass if:
- Status changes to `ACCEPTED`
- Driver is assigned
- Passenger sees the updated state

## 12. Ride lifecycle

- Driver arrives
- Trip starts
- Trip completes

Pass if:
- Each state transition is persisted
- Final status becomes `COMPLETED`
- Driver becomes available again

## 13. Logout and session revoke

- Log out from passenger
- Log out from driver

Pass if:
- Refresh token/session is revoked
- Reopening the app does not log the user back in automatically

## 14. Failure tests

These must fail correctly:

- wrong OTP
- expired OTP
- reusing OTP
- exceeding OTP attempts
- missing PIN
- using production with test bypass flags

## 15. Go/no-go decision

Go live only if all of these are true:

- health check is stable
- SMS delivery works in real network conditions
- passenger and driver can register and re-login with PIN
- ride request/accept/complete works against real data
- no mock or bypass path is required in staging

