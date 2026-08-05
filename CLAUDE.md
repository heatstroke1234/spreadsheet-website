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

Optional, for logging into the running app during UI work (e.g. screenshotting `/protected` with Playwright): `TEST_EMAIL` / `TEST_PASSWORD` in `.env.local`, a dedicated Supabase test account (not the user's real financial data). Not read by the app itself — only meant to be sourced manually when a throwaway authenticated session is needed. Clean up any periods/cards/transactions created against this account when done.

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
| `app/api/chat/tools.ts` | `betaZodTool` definitions (`list_periods`, `get_period_summary`, `search_transactions`) — thin wrappers around `periodService`, so ownership checks in `periodRepository.ts` are inherited automatically. `search_transactions`'s `period_id` is optional — omitted, it fetches every period via `Promise.all` and searches/sorts/caps across all of them in one call (tagging each result with `periodId`/`periodName`), so the model doesn't need to enumerate periods just to search "anywhere" |
| `app/api/chat/prompt.ts` | System prompt builder |
| `app/api/chat/models.ts` | Allow-listed model picker (`CHAT_MODELS`, `ChatModelId`/`ChatModelSelection`, `isChatModelSelection`) plus the `"auto"` routing heuristic (`classifyModel`) — shared runtime data between `route.ts` (validates the client's selection, resolves "auto") and `chat-panel.tsx` (renders the picker) |
| `app/api/chat/types.ts` | Shared request/stream-event types (type-only) |
| `app/protected/chat/use-chat.ts` | Client hook: message state, streaming fetch/NDJSON parsing |
| `app/protected/chat/chat-panel.tsx` | The `Sheet`-based UI, rendered as a sibling of `TransactionManager` in `period-manager.tsx` |
| `app/protected/chat/chat-markdown.tsx` | Renders assistant messages as markdown (tables, lists, code, etc. via `react-markdown` + `remark-gfm`); user messages render as plain text |

Model: user-selectable per message via a dropdown in the chat panel footer — `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5`, or `"auto"` (the default, `DEFAULT_CHAT_MODEL_SELECTION` in `models.ts`). The client's selection is only a suggestion: `route.ts` validates it via `isChatModelSelection()` and falls back to `"auto"` rather than passing an arbitrary string to the Anthropic API. When the selection is `"auto"`, `classifyModel()` (also in `models.ts`) picks a real model with a zero-latency keyword heuristic on the latest user message — no extra API call. The server always emits a `model_selected` stream event as the first thing sent (even when the selection wasn't "auto"), and the client tags the resulting assistant message with `modelUsed` **only** when the request was sent as "auto" (`chat-panel.tsx` renders "Answered by X" above that bubble) — an explicit user pick isn't re-announced since it's already visible in the dropdown. Haiku 4.5 doesn't support adaptive thinking / `output_config.effort` (sending either 400s), so those params are only attached when `modelConfig.supportsAdaptiveThinking` is true — check `models.ts` before adding a new model to the list. New deps: `@anthropic-ai/sdk`, `zod`, `react-markdown`, `remark-gfm`. The system prompt (`prompt.ts`) scopes the assistant to this app's financial data and tells it to redirect rather than answer unrelated questions. The chatbot never receives raw transaction arrays for aggregate questions — tools return pre-aggregated summaries (via the existing `summaryRows`/`calculations.ts`) to keep token usage down; `search_transactions` is the only tool that returns line items, capped at a `limit`.

**`classifyModel()`'s core principle: bias conservative, not clever.** A wrong answer from Haiku 4.5 is worse than a slightly pricier one from Sonnet/Opus — every fix below tightens Haiku's eligibility rather than loosening it. Every time a tool gains the ability to return more/broader data, or a new capability is added, re-check whether the existing signals still correctly gate Haiku away from what it now has to synthesize; this has happened three times so far, each surfaced by real testing, not by inspection:

- **Round one** (comparison/multi-card questions): "which card is closest to its limit" was misrouted to Haiku 4.5 purely because it contains "limit" (a Haiku signal) and didn't match any of the period-comparison phrases in `OPUS_SIGNALS` — Haiku then hallucinated trying to compare across cards. Fix: broadened `OPUS_SIGNALS` with card-comparison language ("which card", "closest", "utilization", "maxed out"...), plus a standing guard that routes any question containing "which" to at least Sonnet 5, since "which X" almost always means picking one out of several regardless of which specific phrase matched.
- **Round two** (after adding `search_transactions`'s all-periods mode): the old `HAIKU_SIGNALS` let phrasing alone ("how much...") qualify a question for Haiku, but "how much did I spend on coffee?" has no pre-aggregated field to relay — it can only be answered via line items the model has to sum itself, and that's riskier now the tool can silently span every period. Fix: split into `HAIKU_TRIGGER_PHRASES` + `HAIKU_SAFE_TOPICS`, both now required — a free-text/vendor term like "coffee" or "Target" falls through to Sonnet regardless of how simple the phrasing sounds. Related fix in `prompt.ts`: any model can under-report a truncated `search_transactions` result (`totalMatches > returned`) by silently summing only what came back — the prompt now requires re-calling with a higher `limit` or caveating the answer as partial.
- **Round three** (after adding the web_search tool): a `HAIKU_SAFE_TOPICS` word is ambiguous between "what's my total savings" (safe, a stored number) and "what's a good savings rate to aim for" (needs web_search + real synthesis) — the second phrasing matched a trigger phrase and a safe topic and got routed to Haiku even though it has nothing to do with the user's own data. Fix: two more required conditions — `GENERAL_ADVICE_SIGNALS` ("good", "recommend", "should", "typical"...) is an exclusion that fires regardless of other signals, and `PERSONAL_REFERENCE_SIGNALS` ("my ", " i ", "this period"...) is a requirement, since a safe-topic question with *no* personal framing at all ("what's the current interest rate on a HYSA?") isn't about anything this app has stored either. The two are complementary: advice-signals catch generically-worded advice questions that incidentally include "my"; personal-reference catches non-personal market/rate questions that don't happen to use an advice word.

**Web search** — `route.ts` appends Anthropic's server-side web_search tool (capped at `max_uses: 3`) to the tools array, alongside our own custom tools. Version is picked per-model, mirroring the `supportsAdaptiveThinking` pattern: `modelConfig.supportsDynamicWebSearch` (true for Opus 5/Sonnet 5, false for Haiku 4.5) selects `web_search_20260318` (dynamic filtering — better result accuracy/token efficiency) vs. the basic `web_search_20250305`. **This isn't just an optimization — confirmed live that `web_search_20260318` genuinely 400s on Haiku 4.5** ("does not support programmatic tool calling... set `allowed_callers=[\"direct\"]`"), so the branch is load-bearing, not cosmetic; don't collapse it back to one shared tool type without re-checking Haiku's error. `prompt.ts` scopes web_search narrowly: only for *general* personal-finance knowledge (savings rates, budgeting rules of thumb, current rate context) that helps interpret the user's data, never to look anything up about the user, and it doesn't reopen the door to fully off-topic questions. Server-side tool invocations arrive as a `server_tool_use` content block (not `tool_use`, which is only for our own client-executed tools) — `route.ts` checks for both so the "Looking up..." indicator covers web searches too; `chat-panel.tsx` gives it a friendlier label ("Searching the web…") via `toolStatusLabel()`.

**Claude authentication** — `app/api/chat/anthropic-client.ts`'s `createAnthropicClient()` picks between two auth paths, checked at request time (not build time), so a redeploy is enough to switch between them with no code change:
- **Workload Identity Federation (WIF)**, used in production — if `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`, and `ANTHROPIC_SERVICE_ACCOUNT_ID` are all present, the client authenticates via a `credentials` provider that exchanges an AWS STS-issued OIDC token (`sts:GetWebIdentityToken`, requires "Outbound web identity federation" enabled at the AWS account level) for a short-lived `sk-ant-oat01-...` token via Anthropic's `/v1/oauth/token` federation endpoint — no long-lived API key ever touches the deployed environment. `oidcFederationProvider()` (from `@anthropic-ai/sdk/lib/credentials/oidc-federation`) performs a fresh token exchange on every call by design (federation grants don't return a refresh token) — it's wrapped in a `TokenCache` (`@anthropic-ai/sdk/lib/credentials/token-cache`) so a warm Lambda reuses the cached token instead of re-exchanging on every chat message; `sts`/`tokenCache` are module-scoped for the same reason. `ANTHROPIC_WORKSPACE_ID` is optional (only needed if the federation rule spans multiple workspaces); the Terraform variable defaults to `""`, which the SDK correctly treats as omitted rather than as a literal empty workspace id. The IAM role that Amplify's SSR Lambda assumes (`aws_iam_role.amplify_compute` in `infra/amplify.tf`, wired via `compute_role_arn` on `aws_amplify_app.main`) needs only `sts:GetWebIdentityToken` — nothing else.
- **Static API key**, local/Docker only — falls back to plain `new Anthropic()` (reads `ANTHROPIC_API_KEY` from the environment) whenever the federation vars aren't all present, which is how `.env.local` and Docker runs keep working unchanged (neither has an Amplify compute role to federate through). As of 2026-08-05, production is confirmed running on WIF exclusively (verified via a `console.log` of which branch ran in `createAnthropicClient()`, matched against real chat requests in CloudWatch — the auth-path line read `WIF` on both actual Claude round-trips) — `ANTHROPIC_API_KEY` was removed from `infra/amplify.tf`/`variables.tf` accordingly. The old key should also be revoked in the Anthropic Console once it's confirmed nothing else references it, since Terraform can't do that part.

**Multi-turn streaming gotcha:** the tool runner makes one API call per turn (commentary → tool call → tool result → next turn), and `route.ts` emits a `turn_break` event between turns so the client (`use-chat.ts`) knows to insert a paragraph break rather than concatenating two turns' text with no space. That break-insertion logic **must stay outside** any `setMessages(prev => ...)` updater — React Strict Mode (on by default in this app's dev mode) invokes updater functions twice to check purity, and mutating a ref *inside* the updater causes the second (committed) call to see the ref already cleared by the first. Read/clear the ref before calling `setMessages`, not inside it.

⚠️ **Streaming doesn't work on Amplify production, by design of the platform.** `route.ts` genuinely streams its `ReadableStream` response, and this works correctly locally (`next dev`) — but AWS Amplify Hosting's `WEB_COMPUTE` platform explicitly lists "Next.js streaming" under [unsupported features](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html); its Lambda-based compute buffers the entire response before returning it. In production, the chat panel's bouncing-dots/tool-indicator UI still covers the wait correctly (see the `isStreaming && !activeTool && ...` condition in `chat-panel.tsx`), but the user sees the full answer appear at once rather than token-by-token. There's no config fix for this — only options are accepting it, faking a client-side reveal, or moving off Amplify's compute (Vercel, or self-hosting the existing `Dockerfile` on a persistent-process host).

## Docker

A `Dockerfile` exists for local or self-hosted production runs. It uses the Next.js standalone output, so `output: 'standalone'` must be present in `next.config.ts` when building the image. Remove it again before pushing to `main` — Amplify does not use the standalone bundle and it breaks routing.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  -t spreadsheet-website .

docker run -p 3000:3000 -e ANTHROPIC_API_KEY=... spreadsheet-website
```

`NEXT_PUBLIC_*` vars are `--build-arg`s because they get inlined into the client bundle at build time. `ANTHROPIC_API_KEY` is server-only and read at request time by the chat Route Handler, so it's passed to `docker run` instead — never bake it into the image as a build arg. WIF is not wired up for Docker runs — outside Amplify's SSR Lambda there's no `sts:GetWebIdentityToken`-capable role to assume, so `ANTHROPIC_API_KEY` is required here regardless of production's auth path.

## Infrastructure & Deployment

### AWS infrastructure (`infra/`)
Terraform (>= 1.6, AWS provider ~> 5.0) provisions:
- **Amplify** — SSR hosting app (`WEB_COMPUTE` platform), `main` branch with auto-build on push, custom domain `finance.nikhilv.net`
- **IAM** — Amplify service role (build/CI, trust policy includes both `amplify.amazonaws.com` and `amplify.us-east-1.amazonaws.com`), plus a separate SSR compute role (`aws_iam_role.amplify_compute`, assumed by the actual SSR Lambda via `compute_role_arn` on `aws_amplify_app.main`) scoped to just `sts:GetWebIdentityToken` — this is what lets the chat route authenticate to Claude via Workload Identity Federation instead of a static key, see the "Claude authentication" note under AI chat assistant above
- **Route 53** — CNAME records for the Amplify CloudFront distribution and ACM cert verification (uses existing `nikhilv.net` hosted zone; Amplify manages the ACM cert itself)

The GitHub repo connection itself (`repository` on `aws_amplify_app.main`) is authorized via the AWS Amplify GitHub App, connected through the Console's reconnect flow — not a stored PAT. Terraform intentionally passes no `oauth_token`/`access_token`, so there's no GitHub credential to rotate or leak from this config; re-authorizing the connection (if it's ever revoked) has to happen in the Console, not via `terraform apply`.

Apply:
```bash
cd infra
terraform init
export TF_VAR_supabase_url="https://..."
export TF_VAR_supabase_publishable_key="sb_publishable_..."
export TF_VAR_anthropic_federation_rule_id="fdrl_..."     # from the Claude Console's Connect Workload wizard
export TF_VAR_anthropic_organization_id="..."             # Claude Console > Settings > Organization
export TF_VAR_anthropic_service_account_id="svac_..."     # from the Connect Workload wizard
export TF_VAR_anthropic_federation_workspace_id="wrkspc_..." # optional — omit (or leave unset) if the rule covers one workspace
terraform apply
```

### CI/CD
Pushing to `main` triggers Amplify's built-in webhook — no GitHub Actions workflow needed. Amplify reads `amplify.yml` from the repo root and injects the environment variables set in `infra/amplify.tf` at build time.

⚠️ **Amplify only exposes App-level environment variables to the build process, not to the SSR runtime** — a Next.js Route Handler reading `process.env.SOMETHING` at request time will see it as `undefined` even though it's correctly set in `infra/amplify.tf`/the console, unless it's also written into `.env.production` during the build (`amplify.yml`'s `build.commands`) — see [AWS's docs on this](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html). This is already done for the four WIF vars in `amplify.yml`; **any new server-only env var added in the future needs the same treatment** or it'll silently fail in production with an error like "Could not resolve authentication method" while working fine locally. (This doesn't affect `NEXT_PUBLIC_*` vars, which are already inlined into the client bundle at build time, or Docker deployments, where `docker run -e` sets a real OS-level env var with no such gotcha.)

Note: writing a secret into `.env.production` means it ends up in Amplify's build artifacts, readable by anyone with deploy-artifact access — acceptable here since this is a single-user personal app, but worth knowing before doing the same for a more sensitive credential.
