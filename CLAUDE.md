# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — note: this project uses "publishable key", not the typical "anon key" name

## Architecture

This is a **financial transaction management app** — a single-page app behind Supabase auth. The root (`/`) redirects authenticated users to `/protected`, others to `/auth/login`.

### Key versions (non-standard)
- **Next.js 16** — read `node_modules/next/dist/docs/` before writing Next.js code; APIs may differ from training data
- **React 19**
- **Tailwind CSS v4** — configured via `@tailwindcss/postcss`, no `tailwind.config.js`
- **Supabase SSR** — uses `supabase.auth.getClaims()` (not `getUser()`)

### Data flow in `/protected`

```
page.tsx
  └─ PeriodManager (period-manager.tsx) — "use client", owns all state
        ├─ fetches via createPeriodService(supabaseClient, userId)
        └─ TransactionManager (transaction-manager.tsx) — pure UI, receives props + callbacks
```

`PeriodManager` is the single source of truth. It initializes `periodService` after auth and passes granular DB operation callbacks (createCard, updateTransaction, etc.) down to `TransactionManager`.

### Backend layer (`app/protected/transaction-manager/`)

| File | Role |
|------|------|
| `types.ts` | Domain types: `Period`, `CreditCard`, `Transaction` |
| `supabase.types.ts` | Auto-generated DB types — do not edit manually |
| `periodRepository.ts` | Raw Supabase queries; all operations verify `user_id` ownership before mutating |
| `periodService.ts` | Thin service wrapping repository; binds `userId` so callers don't repeat it |
| `calculations.ts` | Pure functions: `sortTransactions`, `filterTransactions`, `paginateTransactions`, `summaryRows` |

`updatePeriodData` in the repository uses **replacement semantics**: passing `cards`, `transactions`, or `visibleCardIds` replaces the full set for that period (upsert + delete-missing). Granular operations (`createCard`, `updateTransaction`, etc.) are preferred for single-item changes.

### Supabase DB tables
`periods`, `credit_cards`, `transactions`, `period_visible_cards` — all scoped by `user_id` on `periods`.

### Supabase clients
- `lib/supabase/client.ts` — browser client (for Client Components)
- `lib/supabase/server.ts` — server client using `next/headers` cookies (for Server Components / Route Handlers)
- `lib/supabase/middleware.ts` — session refresh via `updateSession()`; unauthenticated requests are redirected to `/auth/login`

### UI
- `components/ui/` — shadcn/radix-ui primitives (button, dialog, input, etc.)
- `components/` root — auth forms (login, sign-up, forgot-password, update-password, logout)
- `app/protected/transaction-manager/components/` — feature-specific UI panels and dialogs

### Period lifecycle
Creating a new period copies cards from the current period and auto-generates a rollover bank transaction if `bankTotal > 0`.

## Docker

A `Dockerfile` exists for local or self-hosted production runs. It uses the Next.js standalone output, so `output: 'standalone'` must be present in `next.config.ts` when building the image. Remove it again before pushing to `main` — Amplify does not use the standalone bundle and it breaks routing.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  -t spreadsheet-website .

docker run -p 3000:3000 spreadsheet-website
```

## Infrastructure & Deployment

### AWS infrastructure (`infra/`)
Terraform (>= 1.6, AWS provider ~> 5.0) provisions:
- **Amplify** — SSR hosting app (`WEB_COMPUTE` platform), `main` branch with auto-build on push, custom domain `finance.nikhilv.net`
- **IAM** — Amplify service role (trust policy includes both `amplify.amazonaws.com` and `amplify.us-east-1.amazonaws.com`)
- **Route 53** — CNAME records for the Amplify CloudFront distribution and ACM cert verification (uses existing `nikhilv.net` hosted zone; Amplify manages the ACM cert itself)

Apply:
```bash
cd infra
terraform init
export TF_VAR_github_token="ghp_..."                    # classic GitHub PAT — fine-grained PATs do NOT work with Amplify oauth_token
export TF_VAR_supabase_url="https://..."
export TF_VAR_supabase_publishable_key="sb_publishable_..."
terraform apply
```

### CI/CD
Pushing to `main` triggers Amplify's built-in webhook — no GitHub Actions workflow needed. Amplify reads `amplify.yml` from the repo root and injects the environment variables set in `infra/amplify.tf` at build time.
