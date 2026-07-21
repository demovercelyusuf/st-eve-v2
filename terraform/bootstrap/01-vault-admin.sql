-- Run once, by a human, as the RDS master user. This is the only step in the credential design that
-- opens a Postgres connection from an operator's machine, and it exists because no Terraform runner
-- should ever hold one: CREATE ROLE and ALTER DEFAULT PRIVILEGES need a live session against the
-- database, and giving the IaC pipeline that session would hand it the standing privilege this whole
-- design exists to remove.
--
--   psql -h <warehouse-host> -U vantageadmin -d warehouse \
--     -v vault_admin_password="$(openssl rand -base64 24)" -f 01-vault-admin.sql
--
-- Idempotent. Postgres has no CREATE ROLE IF NOT EXISTS, hence the DO blocks.

-- Vault's provisioning identity. Deliberately not vantageadmin: Vault rotates the credential it
-- connects with, and rotating the RDS master would break the seeder and anything else holding it.
-- A separate role means the blast radius of that rotation is Vault and nothing else.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vault_admin') THEN
    CREATE ROLE vault_admin LOGIN CREATEROLE;
  END IF;
END
$$;

ALTER ROLE vault_admin WITH PASSWORD :'vault_admin_password';

-- The parent role every dynamic reader inherits. Vault's creation statement grants this to each
-- short-lived role it mints, so the privilege set lives here in one reviewable place rather than
-- being restated in HCL for every role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'steve_reader') THEN
    CREATE ROLE steve_reader NOLOGIN;
  END IF;
END
$$;

-- Both schemas, not just activity. lib/salesforce/adapter.ts reads the sfdc schema through the same
-- pool, so a reader granted only on activity passes scripts/check-vault.ts, which reads activity,
-- and then fails every Salesforce read in the actual product. The "separate system of record" claim
-- is an architectural seam, not a credential seam.
GRANT USAGE ON SCHEMA activity, sfdc TO steve_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA activity, sfdc TO steve_reader;

-- GRANT SELECT ON ALL TABLES is a snapshot of the tables that exist right now. Without this, any
-- table created later is invisible to every reader minted after it.
ALTER DEFAULT PRIVILEGES IN SCHEMA activity, sfdc GRANT SELECT ON TABLES TO steve_reader;

-- Load-bearing on PostgreSQL 16 and later, which is what this instance runs. CREATEROLE was
-- narrowed: a non-superuser can now only grant roles it holds WITH ADMIN OPTION. Without this line
-- vault_admin can create a role and then fail to grant steve_reader to it, and the failure surfaces
-- at mint time as an opaque permission error rather than anywhere near this file.
GRANT steve_reader TO vault_admin WITH ADMIN OPTION;
