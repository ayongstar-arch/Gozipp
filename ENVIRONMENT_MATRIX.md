# Environment Variable Matrix

Use this as the single source of truth when moving GOZIPP from local dev to staging and production.

## Backend API

| Variable | Local Dev | Render Staging | Production | Notes |
|---|---:|---:|---:|---|
| `NODE_ENV` | `development` | `production` | `production` | Must be `production` outside local dev |
| `PORT` | `3000` | `10000` or Render-assigned | Render-assigned | Render injects the runtime port |
| `DB_HOST` | local Postgres | staging Postgres | prod Postgres | Source of truth for all writes |
| `DB_PORT` | `5432` | managed DB port | managed DB port |  |
| `DB_USER` | local user | staging user | prod user |  |
| `DB_PASSWORD` | local password | staging password | prod password |  |
| `DB_NAME` | local DB | staging DB | prod DB |  |
| `REDIS_URL` | local Redis | staging Redis | prod Redis | Used for OTP/session state |
| `JWT_SECRET` | dev secret | long random secret | long random secret | Never use placeholder |
| `WALLET_SECRET` | dev secret | long random secret | long random secret | Keep separate from JWT |
| `ALLOWED_ORIGINS` | localhost origins | staging frontend origins | prod frontend origins | Comma-separated |
| `COOKIE_DOMAIN` | empty | staging domain | prod domain | Empty is fine for localhost |
| `FRONTEND_URL` | localhost frontend | staging frontend | prod frontend | Used in redirects and links |
| `THAIBULKSMS_APP_KEY` | test key | real staging key | real prod key | Real SMS provider credentials |
| `THAIBULKSMS_APP_SECRET` | test secret | real staging secret | real prod secret |  |
| `SMS_API_URL` | provider endpoint | provider endpoint | provider endpoint | Usually same URL |
| `SMS_SENDER_ID` | test sender | approved staging sender | approved prod sender | Must match provider approval |
| `SEED_DEMO_DATA` | `true` if needed | `false` | `false` | Keep off for real validation |
| `ALLOW_TEST_OTP` | `true` only in local dev | `false` | `false` | Must never be enabled in production |
| `ALLOW_REGISTRATION_WITHOUT_OTP` | `false` | `false` | `false` | Should stay false for Phase 1 |
| `LINE_CHANNEL_ID` | optional | if used | if used | Only if LINE auth is active |
| `LINE_CHANNEL_SECRET` | optional | if used | if used |  |
| `LINE_CALLBACK_URL` | local callback | staging callback | prod callback | Must match provider config |
| `GOOGLE_CLIENT_ID` | optional | if used | if used |  |
| `GOOGLE_CLIENT_SECRET` | optional | if used | if used |  |
| `GOOGLE_CALLBACK_URL` | local callback | staging callback | prod callback |  |
| `LOCAL_AI_URL` | local Ollama | optional | optional | Not required for Phase 1 go-live |
| `AWS_*` | local test only | optional | optional | Needed later for uploads |
| `GOOGLE_MAPS_API_KEY` | optional | if used | if used |  |

## Passenger frontend

| Variable | Local Dev | Render Staging | Production | Notes |
|---|---:|---:|---:|---|
| `NEXT_PUBLIC_API_URL` | localhost API | Render API URL | prod API URL | Must point to backend staging/prod |
| `NEXT_PUBLIC_SOCKET_URL` | localhost API | Render API URL | prod API URL | Keep aligned with backend |
| `NEXT_PUBLIC_APP_URL` | localhost frontend | staging frontend | prod frontend | Used in metadata and links |
| `NEXT_PUBLIC_USE_REAL_SOCKET` | `true` or `false` | `true` | `true` | For Phase 1, keep real socket |
| `NEXT_PUBLIC_ALLOW_REGISTRATION_WITHOUT_OTP` | `false` | `false` | `false` | Do not enable for go live |
| `NEXT_PUBLIC_SUPABASE_URL` | local or staging | staging | prod | Required if client uses Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local or staging | staging | prod | Required if client uses Supabase |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | optional | if used | if used |  |

## Driver frontend

| Variable | Local Dev | Render Staging | Production | Notes |
|---|---:|---:|---:|---|
| `NEXT_PUBLIC_API_URL` | localhost API | Render API URL | prod API URL | Must match backend |
| `NEXT_PUBLIC_SOCKET_URL` | localhost API | Render API URL | prod API URL | Must match backend |
| `NEXT_PUBLIC_APP_URL` | localhost frontend | staging frontend | prod frontend |  |
| `NEXT_PUBLIC_USE_REAL_SOCKET` | `true` or `false` | `true` | `true` | Keep real socket on in staging/prod |
| `NEXT_PUBLIC_SUPABASE_URL` | local or staging | staging | prod | Required if client uses Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local or staging | staging | prod | Required if client uses Supabase |

## Admin frontend

| Variable | Local Dev | Render Staging | Production | Notes |
|---|---:|---:|---:|---|
| `NEXT_PUBLIC_API_URL` | localhost API | Render API URL | prod API URL |  |
| `NEXT_PUBLIC_SOCKET_URL` | localhost API | Render API URL | prod API URL |  |
| `NEXT_PUBLIC_ALLOW_REGISTRATION_WITHOUT_OTP` | `false` | `false` | `false` | Keep off |
| `ALLOW_TEST_OTP` | `true` only in dev | `false` | `false` | Keep off outside dev |

## Rules

- Any variable named `ALLOW_*` should default to `false` outside local development.
- Any credential placeholder must be replaced before staging.
- If a variable is required by production boot checks, do not deploy without it.
- Phase 1 should never depend on mock OTP or registration bypass in staging or production.

