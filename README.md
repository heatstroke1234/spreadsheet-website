# Financials Management

A personal finance tracking app for managing transactions across billing periods. Track debit spending, credit card usage, and bank deposits — with per-period summaries, savings tracking, and an AI assistant to help you make sense of it all.

## Features

- **Periods** — organize finances into time-boxed periods (e.g. monthly). Creating a new period copies your credit cards forward and rolls over the current bank balance automatically.
- **Transactions** — log debit, credit card, and bank transactions with categories (necessary / recreation) and descriptions.
- **Credit cards** — manage multiple cards per period with custom names, limits, and colors.
- **Bank summary** — track deposits, transfers, salary, and savings within each period.
- **Filtering & search** — filter by method, search across description/amount/date, and paginate results.
- **AI chat assistant** — a slide-out chat panel, powered by Claude, that answers questions about your finances:
  - Spending, savings, and trends across *all* periods, not just the one you're viewing.
  - Per-card spend, remaining balance, and utilization (e.g. "which card is closest to its limit?").
  - Line-item search either within one period or across every period at once (e.g. "find every Amazon purchase, anywhere").
  - General personal-finance knowledge via web search (savings rate benchmarks, budgeting rules of thumb, current rate context) alongside your own numbers.
  - A model picker — choose Opus 5, Sonnet 5, or Haiku 4.5, or leave it on **Auto** to have each question routed to whichever fits it best.
  - Clear the conversation anytime with the trash icon in the panel header.

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) — auth + Postgres database
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Claude API](https://platform.claude.com) via `@anthropic-ai/sdk` — powers the chat assistant (tool-calling, web search, streaming)
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

### Production

Two supported paths — see `CLAUDE.md` for deployment internals:

- **Docker (local/self-hosted):** builds a standalone image via the included `Dockerfile`.
  ```bash
  docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... -t financials-management .
  docker run -p 3000:3000 -e ANTHROPIC_API_KEY=... financials-management
  ```
- **AWS Amplify (automated):** pushes to `main` deploy automatically to `finance.nikhilv.net`. Infrastructure (Amplify app, IAM, Route 53) is managed with Terraform in `infra/`:
  ```bash
  cd infra
  terraform init
  export TF_VAR_supabase_url="https://..."
  export TF_VAR_supabase_publishable_key="sb_publishable_..."
  terraform apply
  ```
