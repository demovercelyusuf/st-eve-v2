variable "vault_admin_password" {
  description = <<-EOT
    Password for the vault_admin Postgres role created by bootstrap/01-vault-admin.sql. Supplied at
    apply time and never written to a tfvars file in this repo.

    It feeds a write-only argument, so it is not persisted in state or in the plan file. Marking a
    variable sensitive would only redact it from CLI output, which is a display concern and not a
    storage one, and is the mistake worth naming out loud.

    Once Vault has rotated root this value stops working for anybody, including whoever typed it.
  EOT
  type        = string
  sensitive   = true
}

variable "vercel_team_slug" {
  description = "Vercel team slug. Forms the OIDC issuer and audience for the JWT auth backend."
  type        = string
  default     = "yusuf-demo-vercel"
}

variable "vercel_owner_id" {
  description = <<-EOT
    Vercel team id, bound as a claim. The immutable id and not the `owner` slug: Vercel rewrites
    slugs on rename, and a binding that silently stops matching is worse than one that never worked.
  EOT
  type        = string
  default     = "team_Y2XuSZ0CRuwe1Wnou4A5nT2C"
}

variable "vercel_project_id" {
  description = "Vercel project id, bound as a claim. Immutable id, same reasoning as owner."
  type        = string
  default     = "prj_3HVeNvGlaVvclXqn52Doiiha4tyk"
}

variable "reader_ttl_seconds" {
  description = <<-EOT
    Lease lifetime for a minted warehouse reader. default and max are set equal on purpose.

    Be precise about what that does: Vault still reports the lease as renewable, and a renew call
    still succeeds. It just cannot extend the lease past max_ttl, which is the same hour it already
    had, so renewal buys nothing and the role dies on schedule regardless. That is the property
    worth having, because extending the life of one Postgres role is exactly what dynamic secrets
    exist to prevent.

    The app rotates rather than renews: it builds a new pool at 80 percent of TTL and drains the old
    one. The policy in policies.tf grants no lease-renew capability, so it cannot quietly change its
    mind about that later.
  EOT
  type        = number
  default     = 3600
}
