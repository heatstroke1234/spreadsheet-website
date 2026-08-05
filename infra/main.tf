terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
  }

  # S3 backend — commented out by default.
  # To enable:
  #   1. Create an S3 bucket and DynamoDB table:
  #        aws s3api create-bucket --bucket yourcompany-terraform-state --region us-east-1
  #        aws s3api put-bucket-versioning --bucket yourcompany-terraform-state \
  #          --versioning-configuration Status=Enabled
  #        aws s3api put-bucket-encryption --bucket yourcompany-terraform-state \
  #          --server-side-encryption-configuration \
  #          '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  #        aws dynamodb create-table --table-name terraform-locks \
  #          --attribute-definitions AttributeName=LockID,AttributeType=S \
  #          --key-schema AttributeName=LockID,KeyType=HASH \
  #          --billing-mode PAY_PER_REQUEST --region us-east-1
  #   2. Uncomment the block below and fill in the bucket name.
  #   3. Run `terraform init -reconfigure` to migrate local state to S3.
  #
  # backend "s3" {
  #   bucket         = "yourcompany-terraform-state"
  #   key            = "spreadsheet-website/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}
