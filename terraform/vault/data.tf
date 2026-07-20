// The warehouse workspace owns the database; this one owns the credential policy that reaches it.
// Reading its outputs rather than restating the hostname keeps a single source of truth, and
// tfe_outputs is the narrow way to do it: terraform_remote_state would hand this workspace the
// other one's entire state snapshot, which defeats the blast-radius split the two workspaces exist
// to create.
data "tfe_outputs" "warehouse" {
  organization = "demo-vercel-yusuf"
  workspace    = "steve-warehouse"
}

locals {
  warehouse_host = nonsensitive(data.tfe_outputs.warehouse.values.warehouse_address)
  warehouse_port = nonsensitive(data.tfe_outputs.warehouse.values.warehouse_port)
  warehouse_db   = nonsensitive(data.tfe_outputs.warehouse.values.warehouse_db_name)

  oidc_issuer   = "https://oidc.vercel.com/${var.vercel_team_slug}"
  oidc_audience = "https://vercel.com/${var.vercel_team_slug}"
}
