// The copilot authenticates as itself: no secret, just the OIDC assertion Vercel signs for the
// running deployment. Mounted at the default `jwt` path because lib/vault/creds.ts posts to
// /v1/auth/jwt/login.
resource "vault_jwt_auth_backend" "vercel" {
  path               = "jwt"
  type               = "jwt"
  description        = "Vercel workload identity for the Steve deployment"
  oidc_discovery_url = local.oidc_issuer
  bound_issuer       = local.oidc_issuer
}

// This is the tenancy boundary, and it is the reason this file exists rather than a few clicks in a
// UI. It should be reviewable in a diff.
//
// Bound on owner_id AND project_id, both immutable ids. Two separate traps here, both measured
// rather than assumed:
//
//   1. Vercel signs every tenant's token with the same key. An identical `kid` appears across the
//      global issuer and every team issuer, so a valid signature proves only "issued by Vercel to
//      somebody". A role bound on issuer alone would accept any Vercel customer's token anywhere.
//   2. The `owner` and `project` claims carry slugs, which Vercel rewrites on rename. Binding those
//      gives you a rule that silently stops matching one day, which is worse than one that never
//      matched at all.
//
// The environment claim is what separates preview from production. Note what it cannot do: the
// token carries no deployment or branch claim, so every preview across every branch presents an
// identical claim set. Preview is one security principal by construction, and per-branch
// authorisation is structurally impossible here rather than merely unimplemented.
resource "vault_jwt_auth_backend_role" "copilot_production" {
  backend         = vault_jwt_auth_backend.vercel.path
  role_name       = "steve-copilot"
  role_type       = "jwt"
  user_claim      = "sub"
  bound_audiences = [local.oidc_audience]

  bound_claims = {
    owner_id    = var.vercel_owner_id
    project_id  = var.vercel_project_id
    environment = "production"
  }

  token_policies = [vault_policy.warehouse_reader.name]

  // Short. This token's only job is to read one credential path immediately after login, so it has
  // no reason to outlive that round trip by much.
  token_ttl     = 900
  token_max_ttl = 900
}

// Preview gets its own role and a shorter TTL. Worth being precise about what this does and does
// not buy: it is a real difference, but preview and production read the same RDS instance, so this
// separates credentials rather than data.
resource "vault_jwt_auth_backend_role" "copilot_preview" {
  backend         = vault_jwt_auth_backend.vercel.path
  role_name       = "steve-copilot-preview"
  role_type       = "jwt"
  user_claim      = "sub"
  bound_audiences = [local.oidc_audience]

  bound_claims = {
    owner_id    = var.vercel_owner_id
    project_id  = var.vercel_project_id
    environment = "preview"
  }

  token_policies = [vault_policy.warehouse_reader.name]

  token_ttl     = 300
  token_max_ttl = 300
}
