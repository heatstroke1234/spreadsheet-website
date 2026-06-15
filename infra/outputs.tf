output "amplify_app_id" {
  description = "Amplify app ID"
  value       = aws_amplify_app.main.id
}

output "amplify_default_domain" {
  description = "Default Amplify domain — use to test the app before DNS cutover"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.main.default_domain}"
}

output "app_url" {
  description = "Public HTTPS URL of the application (custom domain)"
  value       = "https://${local.fqdn}"
}
