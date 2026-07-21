terraform {
  required_version = ">= 1.11"

  cloud {
    organization = "demo-vercel-yusuf"

    workspaces {
      name = "steve-vault"
    }
  }

  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = ">= 5.0"
    }
    tfe = {
      source  = "hashicorp/tfe"
      version = ">= 0.60"
    }
  }
}

// Deliberately empty. Address, token and namespace come from VAULT_ADDR, VAULT_TOKEN and
// VAULT_NAMESPACE in the run environment.
//
// This is not laziness, it is the only shape that works. A provider block cannot take its
// configuration from a computed resource attribute, because providers are not nodes in the plan
// graph, so "create the cluster and configure it in one apply" is not expressible. HashiCorp's own
// tutorial pays the same cost. The cluster is stood up out of band and this workspace configures
// what is inside it.
provider "vault" {}
