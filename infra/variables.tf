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

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

variable "task_cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Fargate task memory in MiB"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 1
}

locals {
  fqdn        = "${var.subdomain}.${var.domain}"
  name_prefix = var.app_name
}
