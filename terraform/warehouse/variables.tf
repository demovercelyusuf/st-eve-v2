variable "region" {
  description = "AWS region holding the account-activity warehouse."
  type        = string
  default     = "us-east-1"
}

variable "db_instance_id" {
  description = "Identifier of the existing RDS instance backing the warehouse."
  type        = string
  default     = "vantage-warehouse"
}

variable "db_security_group_id" {
  description = "Security group attached to the warehouse instance."
  type        = string
  default     = "sg-0578d1d8d044038c5"
}

variable "vpc_id" {
  description = "VPC the warehouse instance sits in. The account default, adopted rather than built."
  type        = string
  default     = "vpc-0a55e062f54d42303"
}

variable "kms_key_arn" {
  description = "KMS key encrypting the warehouse storage. AWS-managed RDS default."
  type        = string
  default     = "arn:aws:kms:us-east-1:916880623194:key/b93d51b0-968f-4e74-8a7b-9cebca76babd"
}
