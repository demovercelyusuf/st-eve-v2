# Infrastructure

Two configurations and one manual step. Apply in this order; each depends on the one before it.

State lives in HCP Terraform, organization `demo-vercel-yusuf`, workspaces `steve-warehouse` and
`steve-vault`. Execution is local for now, so a plan runs from a laptop against remote state. Moving
execution remote is what puts plans on a pull request, and it wants dynamic provider credentials
rather than a static AWS key.

## 1. `bootstrap/01-vault-admin.sql`, once, by a human

```bash
psql -h <warehouse-host> -U vantageadmin -d warehouse \
  -v vault_admin_password="$(openssl rand -base64 24)" \
  -f bootstrap/01-vault-admin.sql
```

Creates the Postgres role Vault provisions with, and the read-only parent role every dynamic
credential inherits.

This step is deliberately not automated, and the reason is the point rather than an omission.
`CREATE ROLE` needs a live Postgres session, and giving a Terraform runner one would hand the
infrastructure pipeline standing database privilege, which is the thing the rest of this design exists
to remove. No Terraform runner here ever opens a database connection.

## 2. `warehouse/`

```bash
cd warehouse && terraform init && terraform plan
```

The RDS instance and its security group, adopted into state by import rather than created, because the
warehouse predates this configuration. That is also the real engagement shape: you take over a
customer's database, you do not rebuild it.

Carries two guards that do different jobs. `deletion_protection` is enforced by RDS and survives
someone bypassing Terraform; `prevent_destroy` is enforced by Terraform and turns a bad plan into a
refusal. The live demo runs on this instance.

`security.tf` explains why Postgres is open to `0.0.0.0/0`. Read it before narrowing the rule: two
callers need it and neither has a stable CIDR.

## 3. `vault/`

```bash
cd vault
export VAULT_ADDR=https://<cluster>.hashicorp.cloud:8200
export VAULT_NAMESPACE=admin
export VAULT_TOKEN=<console-issued admin token, 6h>
export TF_VAR_vault_admin_password=<the password from step 1>
terraform init && terraform plan
```

The database secrets mount, the connection to RDS, the `warehouse-reader` role, the JWT auth backend
pointed at Vercel's OIDC issuer, and the two claim-bound roles for production and preview.

The admin token comes from the HCP console and is used for exactly this one apply. Deliberately not
the `hcp_vault_cluster_admin_token` resource, which persists a root-equivalent token into state and
does not invalidate it on destroy.

The provider block is empty on purpose. A provider cannot take its configuration from a computed
resource attribute, so "create the cluster and configure it in one apply" is not expressible. The
cluster is stood up out of band and this workspace configures what is inside it.

`auth.tf` carries the binding that matters: Vercel signs every tenant's OIDC token with the same key,
so a role bound on the issuer alone would accept any Vercel customer's token. The roles bind on
`owner_id` and `project_id`, which are immutable, rather than the `owner` and `project` slugs, which
Vercel rewrites on rename.

## Verifying

```bash
pnpm exec tsx scripts/check-vault.ts   # mints a lease from a laptop and reads with it
curl https://st-eve-v2.vercel.app/health/vault
```

The endpoint reports which credential path the running deployment is on, and names the lease that
actually served the read rather than minting a second one to describe the first.
