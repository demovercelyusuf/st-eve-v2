// One path, one capability. The copilot may ask for a warehouse reader and may do nothing else:
// it cannot list roles, cannot read the connection configuration, cannot reach any other mount.
//
// Worth stating what is deliberately absent. There is no `sys/leases/renew`, because renewal
// extends the life of a single Postgres role and that is the property dynamic secrets exist to
// remove. The app rotates instead. Leaving renew out means it cannot quietly start renewing later.
resource "vault_policy" "warehouse_reader" {
  name = "steve-warehouse-reader"

  policy = <<-EOT
    path "database/creds/${local.reader_role}" {
      capabilities = ["read"]
    }
  EOT
}
