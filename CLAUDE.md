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
- `ANTHROPIC_API_KEY` — server-only (no `NEXT_PUBLIC_` prefix), used by the chat Route Handler (`app/api/chat/route.ts`) to call Claude

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

### AI chat assistant
A slide-out chat panel (`app/protected/chat/`) lets the user ask questions about their finances across *all* periods, not just the currently loaded one.

| File | Role |
|------|------|
| `app/api/chat/route.ts` | POST-only Route Handler; authenticates via `getClaims()`, builds a `periodService` bound to the authenticated user, runs Claude's Tool Runner, streams NDJSON events back |
| `app/api/chat/tools.ts` | `betaZodTool` definitions (`list_periods`, `get_period_summary`, `search_transactions`) — thin wrappers around `periodService`, so ownership checks in `periodRepository.ts` are inherited automatically |
| `app/api/chat/prompt.ts` | System prompt builder |
| `app/api/chat/types.ts` | Shared request/stream-event types (type-only) |
| `app/protected/chat/use-chat.ts` | Client hook: message state, streaming fetch/NDJSON parsing |
| `app/protected/chat/chat-panel.tsx` | The `Sheet`-based UI, rendered as a sibling of `TransactionManager` in `period-manager.tsx` |
| `app/protected/chat/chat-markdown.tsx` | Renders assistant messages as markdown (tables, lists, code, etc. via `react-markdown` + `remark-gfm`); user messages render as plain text |

Model: `claude-opus-5` via `@anthropic-ai/sdk` (new deps: `@anthropic-ai/sdk`, `zod`, `react-markdown`, `remark-gfm`). The system prompt (`prompt.ts`) scopes the assistant to this app's financial data and tells it to redirect rather than answer unrelated questions. The chatbot never receives raw transaction arrays for aggregate questions — tools return pre-aggregated summaries (via the existing `summaryRows`/`calculations.ts`) to keep token usage down; `search_transactions` is the only tool that returns line items, capped at a `limit`.

**Multi-turn streaming gotcha:** the tool runner makes one API call per turn (commentary → tool call → tool result → next turn), and `route.ts` emits a `turn_break` event between turns so the client (`use-chat.ts`) knows to insert a paragraph break rather than concatenating two turns' text with no space. That break-insertion logic **must stay outside** any `setMessages(prev => ...)` updater — React Strict Mode (on by default in this app's dev mode) invokes updater functions twice to check purity, and mutating a ref *inside* the updater causes the second (committed) call to see the ref already cleared by the first. Read/clear the ref before calling `setMessages`, not inside it.

## Docker

A `Dockerfile` exists for local or self-hosted production runs. It uses the Next.js standalone output, so `output: 'standalone'` must be present in `next.config.ts` when building the image. Remove it again before pushing to `main` — Amplify does not use the standalone bundle and it breaks routing.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  -t spreadsheet-website .

docker run -p 3000:3000 -e ANTHROPIC_API_KEY=... spreadsheet-website
```

`NEXT_PUBLIC_*` vars are `--build-arg`s because they get inlined into the client bundle at build time. `ANTHROPIC_API_KEY` is server-only and read at request time by the chat Route Handler, so it's passed to `docker run` instead — never bake it into the image as a build arg.

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
export TF_VAR_anthropic_api_key="sk-ant-..."
terraform apply
```

### CI/CD
Pushing to `main` triggers Amplify's built-in webhook — no GitHub Actions workflow needed. Amplify reads `amplify.yml` from the repo root and injects the environment variables set in `infra/amplify.tf` at build time.
