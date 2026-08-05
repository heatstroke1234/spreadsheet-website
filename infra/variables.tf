variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Short name used to prefix all resources (lowercase, no spaces)"
  type        = string
  default     = "spreadsheet-website"
}

variable "domain" {
  description = "Root domain — the Route 53 hosted zone must already exist for this"
  type        = string
  default     = "nikhilv.net"
}

variable "subdomain" {
  description = "Subdomain to create (prepended to var.domain)"
  type        = string
  default     = "finance"
}

variable "supabase_url" {
  description = "Supabase project URL (NEXT_PUBLIC_SUPABASE_URL)"
  type        = string
  sensitive   = true
}

variable "supabase_publishable_key" {
  description = "Supabase publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
  type        = string
  sensitive   = true
}

# Workload Identity Federation — lets the chat Route Handler authenticate to the Claude
# API via AWS STS-issued tokens instead of the static API key above. These four are not
# secrets (just identifiers naming the federation rule/service account/org/workspace in
# the Anthropic Console), so unlike the vars above they aren't marked sensitive. See
# CLAUDE.md for the full setup (AWS compute role, Anthropic Console federation rule).
variable "anthropic_federation_rule_id" {
  description = "Anthropic federation rule ID (ANTHROPIC_FEDERATION_RULE_ID, fdrl_...) from the Claude Console's Connect Workload wizard"
  type        = string
}

variable "anthropic_organization_id" {
  description = "Anthropic organization ID (ANTHROPIC_ORGANIZATION_ID) — Claude Console under Settings > Organization"
  type        = string
}

variable "anthropic_service_account_id" {
  description = "Anthropic service account ID (ANTHROPIC_SERVICE_ACCOUNT_ID, svac_...) created by the Connect Workload wizard"
  type        = string
}

variable "anthropic_federation_workspace_id" {
  description = "Anthropic workspace ID (ANTHROPIC_WORKSPACE_ID, wrkspc_... or \"default\") to scope the federated token to. Optional when the federation rule covers a single workspace — an empty string is treated as omitted."
  type        = string
  default     = ""
}

locals {
  fqdn        = "${var.subdomain}.${var.domain}"
  name_prefix = var.app_name
}
