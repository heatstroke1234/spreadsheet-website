output "ecr_repository_url" {
  description = "ECR repository URL — use as the image base in docker build/push"
  value       = aws_ecr_repository.app.repository_url
}

output "alb_dns_name" {
  description = "ALB DNS name (useful before Route 53 alias propagates)"
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "Public HTTPS URL of the application"
  value       = "https://${local.fqdn}"
}

output "ecs_cluster_name" {
  description = "ECS cluster name — required by the GitHub Actions deploy step"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name — required by the GitHub Actions deploy step"
  value       = aws_ecs_service.app.name
}

output "ecs_task_definition_family" {
  description = "ECS task definition family — required by the GitHub Actions deploy step"
  value       = aws_ecs_task_definition.app.family
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "github_actions_access_key_id" {
  description = "AWS Access Key ID for GitHub Actions — add to repo secrets as AWS_ACCESS_KEY_ID"
  value       = aws_iam_access_key.github_actions.id
  sensitive   = true
}

output "github_actions_secret_access_key" {
  description = "AWS Secret Access Key for GitHub Actions — add to repo secrets as AWS_SECRET_ACCESS_KEY"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}

# Retrieve sensitive outputs after apply:
#   terraform output -raw github_actions_access_key_id
#   terraform output -raw github_actions_secret_access_key
