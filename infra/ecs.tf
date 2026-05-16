resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = 30

  tags = {
    Name = "${local.name_prefix}-logs"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${local.name_prefix}-cluster"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# Task Definition — placeholder image on first apply.
#
# IMPORTANT: lifecycle { ignore_changes = [container_definitions] } means
# Terraform will never overwrite the container image after the first apply.
# GitHub Actions owns all image updates via register-task-definition +
# update-service. Running `terraform apply` after the first deploy will NOT
# revert the running image to the placeholder below.

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name_prefix}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.task_cpu)
  memory                   = tostring(var.task_memory)
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = local.name_prefix
      image = "${aws_ecr_repository.app.repository_url}:latest"

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = []

      # NEXT_PUBLIC_* vars are baked into the JS bundle at docker build time
      # via --build-arg. They must NOT be set here as runtime env vars.
      secrets = []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true

      healthCheck = {
        command     = ["CMD-SHELL", "nc -z 127.0.0.1 ${var.container_port} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  lifecycle {
    ignore_changes = [container_definitions]
  }

  tags = {
    Name = "${local.name_prefix}-task"
  }
}

resource "aws_ecs_service" "app" {
  name            = "${local.name_prefix}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }

  network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.ecs_tasks.id]
    # Public IP required — tasks are in public subnets with no NAT gateway.
    # The task SG blocks all inbound except from the ALB SG.
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = local.name_prefix
    container_port   = var.container_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = [aws_lb_listener.https]

  lifecycle {
    # Prevent Terraform from resetting desired_count if auto-scaling is added later
    ignore_changes = [desired_count]
  }

  tags = {
    Name = "${local.name_prefix}-service"
  }
}
