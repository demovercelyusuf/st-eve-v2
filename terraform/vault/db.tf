// Mounted at the default path on purpose. lib/vault/creds.ts requests /v1/database/creds/<role>,
// so a prettier mount path would cost an app change and invalidate the one thing
// scripts/check-vault.ts already proves.
resource "vault_mount" "database" {
  path        = "database"
  type        = "database"
  description = "Dynamic Postgres credentials for the account-activity warehouse"
}

resource "vault_database_secret_backend_connection" "warehouse" {
  backend       = vault_mount.database.path
  name          = "warehouse"
  allowed_roles = [local.reader_role]

  postgresql {
    // Templated from the start. Retrofitting {{username}}/{{password}} later means reconfiguring
    // the connection, and after root rotation the old password is gone, so there is no second
    // chance to get this shape right.
    connection_url = "postgresql://{{username}}:{{password}}@${local.warehouse_host}:${local.warehouse_port}/${local.warehouse_db}?sslmode=require"
    username       = "vault_admin"

    // Write-only. The value reaches Vault and is not persisted to state or to the plan file, which
    // is the actual protection. `sensitive` would only hide it from CLI output.
    password_wo         = var.vault_admin_password
    password_wo_version = 1

    password_authentication = "scram-sha-256"

    // Vault only opens connections to mint and revoke, so it needs very few. Left large this
    // competes with the app for a db.t4g.micro's ~112 connections.
    max_open_connections = 4
  }

  verify_connection = true
}

locals {
  reader_role = "warehouse-reader"
}

resource "vault_database_secret_backend_role" "warehouse_reader" {
  backend = vault_mount.database.path
  name    = local.reader_role
  db_name = vault_database_secret_backend_connection.warehouse.name

  // The privilege set lives on steve_reader, created once in bootstrap/01-vault-admin.sql, rather
  // than being restated here. One reviewable place for what the copilot may read, and re-granting
  // it after a reseed is a block in lib/warehouse/schema.sql.
  //
  // The GRANT is why vault_admin needs steve_reader WITH ADMIN OPTION: PostgreSQL 16 narrowed
  // CREATEROLE so a non-superuser can only grant roles it holds with admin option.
  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT steve_reader TO \"{{name}}\";",
  ]

  // Terminate the role's sessions before dropping it. Without the backend termination a revoke can
  // fail against a role that still holds an open connection, and a failed revoke leaves an orphaned
  // Postgres role behind for good.
  revocation_statements = [
    "REVOKE steve_reader FROM \"{{name}}\";",
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = '{{name}}';",
    "DROP ROLE IF EXISTS \"{{name}}\";",
  ]

  // Equal on purpose. See reader_ttl_seconds: the lease is non-renewable by construction and the
  // app rotates rather than renews.
  default_ttl = var.reader_ttl_seconds
  max_ttl     = var.reader_ttl_seconds
}
