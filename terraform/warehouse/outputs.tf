// Consumed by the vault workspace through a tfe_outputs data source. The split is deliberate: the
// workspace that can change RDS and the workspace that can change credential policy are different
// blast radiuses, and a mistake in the Vault configuration should not be able to plan a change
// against the database it mints for.

output "warehouse_address" {
  description = "Hostname of the warehouse instance. The Vault database connection points here."
  value       = aws_db_instance.warehouse.address
}

output "warehouse_port" {
  description = "Postgres port on the warehouse instance."
  value       = aws_db_instance.warehouse.port
}

output "warehouse_db_name" {
  description = "Database Vault mints roles against."
  value       = aws_db_instance.warehouse.db_name
}

output "warehouse_master_username" {
  description = "Master user Vault uses to create and revoke dynamic roles, until rotate-root."
  value       = aws_db_instance.warehouse.username
}

output "warehouse_master_secret_arn" {
  description = <<-EOT
    Secrets Manager ARN holding the master password. This is a pointer, not a value: the password
    itself is never read into Terraform state. The vault workspace resolves it ephemerally at apply
    time to bootstrap the database secrets engine, and Vault rotates it immediately afterwards.
  EOT
  value       = try(aws_db_instance.warehouse.master_user_secret[0].secret_arn, null)
}

output "warehouse_security_group_id" {
  description = "Security group governing reachability of the warehouse instance."
  value       = aws_security_group.warehouse.id
}
