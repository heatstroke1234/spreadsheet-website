# Financials Management

A personal finance tracking app for managing transactions across billing periods. Track debit spending, credit card usage, and bank deposits — with per-period summaries and savings tracking.

## Features

- **Periods** — organise finances into time-boxed periods (e.g. monthly). Creating a new period copies your credit cards forward and rolls over the current bank balance automatically.
- **Transactions** — log debit, credit card, and bank transactions with categories (necessary / recreation) and descriptions.
- **Credit cards** — manage multiple cards per period with custom names, limits, and colours.
- **Bank summary** — track deposits, transfers, salary, and savings within each period.
- **Filtering & search** — filter by method, search across description/amount/date, and paginate results.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, standalone output)
- [Supabase](https://supabase.com) — auth + Postgres database
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- React 19, TypeScript

## Getting Started

### Prerequisites

Create a Supabase project and add the following to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page if unauthenticated.

### Production (Docker)

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  -t financials-management .

docker run -p 3000:3000 financials-management
```

### Production (AWS — automated)

Pushes to `main` trigger a GitHub Actions workflow that builds the Docker image, pushes it to ECR, and does a rolling deploy to ECS Fargate. The app is served over HTTPS at `finance.nikhilv.net`.

The AWS infrastructure (VPC, ECS, ALB, ACM, Route 53, ECR, IAM) is managed with Terraform in `infra/`. To provision from scratch:

```bash
cd infra
terraform init
terraform apply
# then add the output credentials to GitHub repo secrets
terraform output -raw github_actions_access_key_id
terraform output -raw github_actions_secret_access_key
```
