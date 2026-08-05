import Anthropic from "@anthropic-ai/sdk";
import { oidcFederationProvider } from "@anthropic-ai/sdk/lib/credentials/oidc-federation";
import { TokenCache } from "@anthropic-ai/sdk/lib/credentials/token-cache";
import type { AccessToken } from "@anthropic-ai/sdk/lib/credentials/types";
import { STSClient, GetWebIdentityTokenCommand } from "@aws-sdk/client-sts";

// Matches infra/variables.tf's aws_region default — GetWebIdentityToken is only
// available on regional STS endpoints, so this must be a real region, not "aws-global".
const STS_REGION = "us-east-1";

let sts: STSClient | undefined;
let tokenCache: TokenCache | undefined;

async function getStsWebIdentityToken(): Promise<string> {
  sts ??= new STSClient({ region: STS_REGION });

  const { WebIdentityToken } = await sts.send(
    new GetWebIdentityTokenCommand({
      Audience: ["https://api.anthropic.com"],
      SigningAlgorithm: "RS256",
      DurationSeconds: 900,
    })
  );

  if (!WebIdentityToken) {
    throw new Error("AWS STS did not return a WebIdentityToken");
  }
  return WebIdentityToken;
}

/**
 * Bridges TokenCache's Promise<string> interface to the AccessTokenProvider shape
 * (Promise<AccessToken>) the client's `credentials` option expects. The real expiry
 * tracking already happened inside TokenCache — expiresAt: null here just means "this
 * wrapper call doesn't need re-checking on its own terms", not "cache forever" at the
 * client level, since we still delegate to TokenCache on every invocation.
 */
function federationAccessTokenProvider(opts?: { forceRefresh?: boolean }): Promise<AccessToken> {
  tokenCache ??= new TokenCache(
    oidcFederationProvider({
      identityTokenProvider: getStsWebIdentityToken,
      federationRuleId: process.env.ANTHROPIC_FEDERATION_RULE_ID!,
      organizationId: process.env.ANTHROPIC_ORGANIZATION_ID!,
      serviceAccountId: process.env.ANTHROPIC_SERVICE_ACCOUNT_ID,
      workspaceId: process.env.ANTHROPIC_WORKSPACE_ID,
      baseURL: "https://api.anthropic.com",
      fetch,
    })
  );

  if (opts?.forceRefresh) {
    tokenCache.invalidate();
  }

  return tokenCache.getToken().then((token) => ({ token, expiresAt: null }));
}

/**
 * Uses Workload Identity Federation (AWS STS -> Anthropic OAuth exchange) when the
 * federation env vars are present — i.e. in the deployed Amplify environment, once
 * ANTHROPIC_API_KEY has been unset there. Falls back to plain API-key auth otherwise,
 * which is how local development authenticates (ANTHROPIC_API_KEY in .env.local).
 *
 * sts/tokenCache are module-scoped so a warm Lambda invocation reuses the cached
 * federation token instead of re-exchanging on every chat message. See CLAUDE.md for
 * the full WIF setup (AWS IAM role, Anthropic Console federation rule).
 */
export function createAnthropicClient(): Anthropic {
  const hasFederationConfig =
    !!process.env.ANTHROPIC_FEDERATION_RULE_ID &&
    !!process.env.ANTHROPIC_ORGANIZATION_ID &&
    !!process.env.ANTHROPIC_SERVICE_ACCOUNT_ID;

  console.log(`[chat] Anthropic auth path: ${hasFederationConfig ? "WIF" : "API key"}`);

  if (hasFederationConfig) {
    // Explicit apiKey: null, not just omitted — the SDK silently backfills apiKey from
    // ANTHROPIC_API_KEY when the constructor arg is left undefined, and apiKey/authToken
    // being non-null takes priority over `credentials` (see node_modules/@anthropic-ai/sdk
    // /src/client.ts: "apiKey/authToken win over credentials/config/profile"). Without this,
    // an ambient ANTHROPIC_API_KEY silently wins and `credentials` is never even consulted —
    // confirmed live: this masked a real WIF misconfiguration for an entire deploy.
    return new Anthropic({ apiKey: null, credentials: federationAccessTokenProvider });
  }

  return new Anthropic();
}
