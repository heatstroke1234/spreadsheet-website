# Financials Management

A personal finance tracking app for managing transactions across billing periods. Track debit spending, credit card usage, and bank deposits — with per-period summaries and savings tracking.

## Features

- **Periods** — organise finances into time-boxed periods (e.g. monthly). Creating a new period copies your credit cards forward and rolls over the current bank balance automatically.
- **Transactions** — log debit, credit card, and bank transactions with categories (necessary / recreation) and descriptions.
- **Credit cards** — manage multiple cards per period with custom names, limits, and colours.
- **Bank summary** — track deposits, transfers, salary, and savings within each period.
- **Filtering & search** — filter by method, search across description/amount/date, and paginate results.
- **AI chat assistant** — a slide-out chat panel that answers questions about your spending, savings, and trends across *all* periods (not just the one you're viewing), backed by Claude with tool-calling over your real transaction data.

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) — auth + Postgres database
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Claude API](https://platform.claude.com) via `@anthropic-ai/sdk` — powers the chat assistant (tool-calling, streaming)
- React 19, TypeScript

## Getting Started

### Prerequisites

Create a Supabase project, and get an [Anthropic API key](https://console.anthropic.com) for the chat assistant. Add the following to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page if unauthenticated.

### Production (Docker — local/self-hosted)

The `Dockerfile` builds a standalone image using Node 20 Alpine. It requires `output: 'standalone'` in `next.config.ts` (remove it when deploying to Amplify — Amplify doesn't use the standalone bundle).

```bash
# Add output: 'standalone' to next.config.ts first
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  -t financials-management .

docker run -p 3000:3000 -e ANTHROPIC_API_KEY=... financials-management
```

`NEXT_PUBLIC_*` vars must be build args (they're inlined into the client bundle at build time). `ANTHROPIC_API_KEY` is server-only and only read at request time, so it's passed at `docker run` instead.

### Production (AWS Amplify — automated)

Pushes to `main` automatically trigger an Amplify build and deploy. The app is served over HTTPS at `finance.nikhilv.net` via Amplify's CloudFront distribution.

The AWS infrastructure (Amplify app + branch, IAM service role, Route 53 records) is managed with Terraform in `infra/`. To provision from scratch:

```bash
cd infra
terraform init
export TF_VAR_github_token="ghp_..."                    # classic GitHub PAT (repo scope)
export TF_VAR_supabase_url="https://..."
export TF_VAR_supabase_publishable_key="sb_publishable_..."
export TF_VAR_anthropic_api_key="sk-ant-..."
terraform apply
```

Amplify reads `amplify.yml` from the repo root for the build spec and the environment variables set in `infra/amplify.tf` are injected at build time.

⚠️ Amplify only exposes environment variables to the *build* process by default — Next.js server code (Route Handlers) won't see them at runtime unless they're also written into `.env.production` during the build. `amplify.yml` already does this for `ANTHROPIC_API_KEY`; any new server-only env var needs the same line added, or it'll work locally but fail silently in production. See `CLAUDE.md` for details.
