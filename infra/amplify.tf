resource "aws_iam_role" "amplify_service" {
  name = "${local.name_prefix}-amplify-service"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = ["amplify.amazonaws.com", "amplify.us-east-1.amazonaws.com"] }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "amplify_service" {
  role       = aws_iam_role.amplify_service.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess-Amplify"
}

resource "aws_amplify_app" "main" {
  iam_service_role_arn = aws_iam_role.amplify_service.arn
  name        = local.name_prefix
  repository  = "https://github.com/heatstroke1234/spreadsheet-website"
  oauth_token = var.github_token

  # WEB_COMPUTE enables SSR — required for Next.js server components and middleware.
  # Using "WEB" (static) would silently 404 all server-rendered routes.
  platform = "WEB_COMPUTE"

  # Amplify reads amplify.yml from the repo root automatically; no inline build_spec needed.

  environment_variables = {
    NEXT_PUBLIC_SUPABASE_URL             = var.supabase_url
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = var.supabase_publishable_key
    ANTHROPIC_API_KEY                    = var.anthropic_api_key
  }

  enable_branch_auto_build    = false
  enable_branch_auto_deletion = true
  enable_basic_auth           = false

  tags = { Name = local.name_prefix }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = "main"

  enable_auto_build = true
  stage             = "PRODUCTION"

  tags = { Name = "${local.name_prefix}-main" }
}

resource "aws_amplify_domain_association" "main" {
  app_id      = aws_amplify_app.main.id
  domain_name = var.domain

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = var.subdomain
  }

  wait_for_verification = false

  depends_on = [aws_amplify_branch.main]
}
