# ECS Task Execution Role — used by the ECS agent to pull images from ECR
# and push logs to CloudWatch. This is NOT the role your app code runs as.

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${local.name_prefix}-task-exec-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json

  tags = {
    Name = "${local.name_prefix}-task-exec-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role — the role your application container assumes at runtime.
# Add inline policies here if the app needs AWS API access (S3, SES, etc.)

resource "aws_iam_role" "ecs_task" {
  name               = "${local.name_prefix}-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json

  tags = {
    Name = "${local.name_prefix}-task-role"
  }
}

# GitHub Actions IAM User — least-privilege deploy credentials

resource "aws_iam_user" "github_actions" {
  name = "${local.name_prefix}-github-actions"

  tags = {
    Name = "${local.name_prefix}-github-actions"
  }
}

resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name
}

data "aws_iam_policy_document" "github_actions" {
  # ECR auth token — no resource restriction possible for this action
  statement {
    sid       = "ECRAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # ECR image push scoped to this repository only
  statement {
    sid = "ECRPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
    ]
    resources = [aws_ecr_repository.app.arn]
  }

  # ECS task definition management — RegisterTaskDefinition does not support
  # resource-level restrictions, so "*" is required here
  statement {
    sid = "ECSTaskDef"
    actions = [
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
    ]
    resources = ["*"]
  }

  # ECS service update scoped to this cluster and service
  statement {
    sid = "ECSService"
    actions = [
      "ecs:UpdateService",
      "ecs:DescribeServices",
    ]
    resources = [
      aws_ecs_cluster.main.arn,
      "arn:aws:ecs:${var.aws_region}:*:service/${local.name_prefix}-cluster/${local.name_prefix}-service",
    ]
  }

  # PassRole — required when ECS registers a new task definition revision
  statement {
    sid     = "IAMPassRole"
    actions = ["iam:PassRole"]
    resources = [
      aws_iam_role.ecs_task_execution.arn,
      aws_iam_role.ecs_task.arn,
    ]
  }
}

resource "aws_iam_user_policy" "github_actions" {
  name   = "${local.name_prefix}-github-actions-policy"
  user   = aws_iam_user.github_actions.name
  policy = data.aws_iam_policy_document.github_actions.json
}
