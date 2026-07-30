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

variable "github_token" {
  description = "GitHub fine-grained PAT with Contents read + Webhooks write for this repo"
  type        = string
  sensitive   = true
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

variable "anthropic_api_key" {
  description = "Anthropic API key (ANTHROPIC_API_KEY) — server-only, used by the chat Route Handler"
  type        = string
  sensitive   = true
}

locals {
  fqdn        = "${var.subdomain}.${var.domain}"
  name_prefix = var.app_name
}
