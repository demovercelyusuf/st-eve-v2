terraform {
  required_version = ">= 1.5"

  // State lives in HCP Terraform rather than on a laptop or in this repo. That matters more for the
  // vault workspace than for this one, since a database secrets engine puts a credential through
  // state on its way to Vault, but keeping both in the same place means there is one answer to
  // "where is state" instead of two.
  //
  // Execution is local for now. Moving to remote is what puts plans on the pull request, and it
  // needs AWS credentials in the workspace to do it. Those should be dynamic provider credentials
  // over OIDC rather than a static access key, which is its own piece of work.
  cloud {
    organization = "demo-vercel-yusuf"

    workspaces {
      name = "steve-warehouse"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}
