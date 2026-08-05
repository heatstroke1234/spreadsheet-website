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

# SSR Compute role — distinct from amplify_service above, which is Amplify's build/CI
# role. This one is assumed by the SSR runtime itself (the Lambda that actually serves
# requests), so it's what Workload Identity Federation for the Claude API needs to call
# sts:GetWebIdentityToken from. Trust policy matches AWS's documented requirement:
# https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html
resource "aws_iam_role" "amplify_compute" {
  name = "${local.name_prefix}-amplify-compute"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = ["amplify.amazonaws.com"] }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Least-privilege: only the one STS action needed to mint a WIF identity token for the
# Anthropic exchange — nothing else. See infra/variables.tf and CLAUDE.md for how this
# fits into the chat Route Handler's authentication.
resource "aws_iam_role_policy" "amplify_compute_wif" {
  name = "${local.name_prefix}-amplify-compute-wif"
  role = aws_iam_role.amplify_compute.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sts:GetWebIdentityToken"]
      Resource = "*"
    }]
  })
}

# IAM roles are eventually consistent — a freshly-created role's trust policy isn't
# always visible to Amplify's control plane the instant Terraform finishes creating it,
# which surfaces as "The compute role provided cannot be assumed by Amplify" on the very
# next apply. This buys IAM a fixed window to propagate before aws_amplify_app.main
# references the role's ARN. See https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_general.html#troubleshoot_general_eventual-consistency
resource "time_sleep" "wait_for_amplify_compute_role" {
  depends_on      = [aws_iam_role.amplify_compute, aws_iam_role_policy.amplify_compute_wif]
  create_duration = "30s"
}

resource "aws_amplify_app" "main" {
  depends_on = [time_sleep.wait_for_amplify_compute_role]

  iam_service_role_arn = aws_iam_role.amplify_service.arn
  compute_role_arn     = aws_iam_role.amplify_compute.arn
  name                 = local.name_prefix
  repository           = "https://github.com/heatstroke1234/spreadsheet-website"

  # No oauth_token/access_token here — the repo is connected via the AWS Amplify GitHub
  # App (set up through the Console's reconnect flow), not a classic PAT. That connection
  # is managed outside Terraform; Amplify's UpdateApp API leaves it alone when neither
  # field is present in the request, so this resource just doesn't try to manage it.

  # WEB_COMPUTE enables SSR — required for Next.js server components and middleware.
  # Using "WEB" (static) would silently 404 all server-rendered routes.
  platform = "WEB_COMPUTE"

  # Amplify reads amplify.yml from the repo root automatically; no inline build_spec needed.

  environment_variables = {
    NEXT_PUBLIC_SUPABASE_URL             = var.supabase_url
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = var.supabase_publishable_key
    # Fallback auth for the chat route — kept until the WIF path below is confirmed
    # working in production, then removed from here and the Anthropic Console.
    ANTHROPIC_API_KEY = var.anthropic_api_key
    # Workload Identity Federation — app/api/chat/anthropic-client.ts prefers this path
    # automatically whenever all three required vars are present, no code change needed
    # to cut over. ANTHROPIC_WORKSPACE_ID is optional; "" is treated as omitted.
    ANTHROPIC_FEDERATION_RULE_ID = var.anthropic_federation_rule_id
    ANTHROPIC_ORGANIZATION_ID    = var.anthropic_organization_id
    ANTHROPIC_SERVICE_ACCOUNT_ID = var.anthropic_service_account_id
    ANTHROPIC_WORKSPACE_ID       = var.anthropic_federation_workspace_id
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
