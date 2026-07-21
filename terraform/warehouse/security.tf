resource "aws_security_group" "warehouse" {
  name        = "vantage-warehouse-sg"
  description = "Vantage warehouse RDS demo access"
  vpc_id      = var.vpc_id

  egress = [{
    cidr_blocks      = ["0.0.0.0/0"]
    description      = ""
    from_port        = 0
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "-1"
    security_groups  = []
    self             = false
    to_port          = 0
  }]

  // Postgres is open to the internet, and that deserves an explanation rather than being left to
  // read as carelessness. Two callers have to reach this instance and neither can be written as a
  // stable CIDR. Vercel functions egress from shared addresses on this plan, and the Vault cluster
  // is HCP-managed in us-west-2 with no peering into this VPC. Narrowing the rule breaks both, so
  // the honest thing is to leave it open, say so here, and say so in the submission.
  //
  // The production shape is Vercel Secure Compute for a dedicated egress range plus an HVN peering
  // for Vault. That turns this into two narrow rules and lets publicly_accessible go to false.
  ingress = [{
    cidr_blocks      = ["0.0.0.0/0"]
    description      = ""
    from_port        = 5432
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "tcp"
    security_groups  = []
    self             = false
    to_port          = 5432
  }]

  tags = {}
}
