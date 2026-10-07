-- Gozipp read-only auditor role (compliance / municipal observers).
-- Apply as a superuser:  psql -d gozipp_db -f auditor-role.sql
-- The auditor can SELECT audit-relevant tables but cannot INSERT/UPDATE/DELETE.
-- Rotate AUDITOR_DEV_PASSWORD in production and store it in a vault.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gozipp_auditor') THEN
    CREATE ROLE gozipp_auditor WITH LOGIN PASSWORD 'auditor-dev-only-CHANGE-ME';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE gozipp_db TO gozipp_auditor;
GRANT USAGE ON SCHEMA public TO gozipp_auditor;

-- Read-only on the tables auditors are allowed to inspect.
GRANT SELECT ON audit_logs TO gozipp_auditor;
GRANT SELECT (id, phone, name, points_balance, total_rides, free_rides_remaining, created_at) ON passengers TO gozipp_auditor;
-- trips requires PostGIS (geometry columns); granted automatically where the table exists.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trips') THEN
    GRANT SELECT ON trips TO gozipp_auditor;
  END IF;
END
$$;

-- Keep future tables read-only for the auditor by default (run once per owning role).
ALTER DEFAULT PRIVILEGES FOR ROLE root IN SCHEMA public GRANT SELECT ON TABLES TO gozipp_auditor;

-- Safety: the auditor owns nothing and cannot write.
ALTER ROLE gozipp_auditor NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
