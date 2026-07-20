// The account-activity warehouse: Postgres in the customer's own AWS account holding Gong call
// transcripts and weekly product-usage rollups, landed by their existing Fivetran and dbt pipeline.
// Steve only ever reads from it, and never with a standing password. The Vault database secrets
// engine in terraform/vault mints a short-lived read-only role against this instance.
//
// This instance predates the configuration, which is why it arrived here through an import block
// rather than being created fresh. That is also the real engagement shape: you adopt a customer's
// warehouse, you do not rebuild it.

resource "aws_db_instance" "warehouse" {
  identifier     = var.db_instance_id
  engine         = "postgres"
  engine_version = "18.3"
  instance_class = "db.t4g.micro"

  db_name  = "warehouse"
  username = "vantageadmin"

  // The master password is deliberately absent from this configuration. RDS manages it and stores
  // it in Secrets Manager, which is why master_user_secret is populated in state while password is
  // null. Stating the flag explicitly matters: the provider does not read it back during refresh,
  // so leaving it unset means every future plan proposes turning RDS-managed passwords off.
  manage_master_user_password = true

  allocated_storage     = 20
  max_allocated_storage = 0
  storage_type          = "gp3"
  storage_throughput    = 125
  iops                  = 3000
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  availability_zone      = "us-east-1b"
  multi_az               = false
  db_subnet_group_name   = "default"
  vpc_security_group_ids = [aws_security_group.warehouse.id]
  port                   = 5432
  network_type           = "IPV4"

  // See the note in security.tf. Public reachability is a demo tradeoff forced by Vercel egress
  // and by Vault living in another region, not an accident.
  publicly_accessible = true

  backup_retention_period  = 1
  backup_window            = "05:53-06:23"
  backup_target            = "region"
  maintenance_window       = "sat:08:18-sat:08:48"
  delete_automated_backups = true
  copy_tags_to_snapshot    = false

  // Demo instance. The seed is scripted and reproducible, so a final snapshot would protect
  // nothing that `pnpm exec tsx scripts/seed-warehouse.ts` cannot rebuild.
  skip_final_snapshot = true

  auto_minor_version_upgrade = true
  engine_lifecycle_support   = "open-source-rds-extended-support"
  ca_cert_identifier         = "rds-ca-rsa2048-g1"
  license_model              = "postgresql-license"
  option_group_name          = "default:postgres-18"
  parameter_group_name       = "default.postgres18"

  database_insights_mode                = "standard"
  performance_insights_enabled          = false
  performance_insights_retention_period = 0
  monitoring_interval                   = 0
  iam_database_authentication_enabled   = false
  dedicated_log_volume                  = false
  customer_owned_ip_enabled             = false

  // Both guards are deliberate and they do different jobs. deletion_protection is enforced by RDS
  // itself and survives someone bypassing Terraform entirely. prevent_destroy is enforced by
  // Terraform and turns a bad plan into a refusal rather than an outage. The live demo runs on
  // this instance, so a mistake here is not recoverable in the time an interview allows.
  deletion_protection = true

  lifecycle {
    prevent_destroy = true
  }
}
