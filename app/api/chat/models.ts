// Shared between the server (route.ts, for validating the incoming request) and the
// client (chat-panel.tsx, for rendering the picker) — runtime data, not type-only.

export const CHAT_MODELS = [
  {
    id: "claude-opus-5",
    label: "Opus 5",
    description: "Most capable — best for complex or multi-period analysis",
    supportsAdaptiveThinking: true,
    supportsDynamicWebSearch: true,
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    description: "Faster and cheaper, nearly as capable",
    supportsAdaptiveThinking: true,
    supportsDynamicWebSearch: true,
  },
  {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    description: "Fastest and cheapest — best for quick lookups",
    supportsAdaptiveThinking: false,
    supportsDynamicWebSearch: false,
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export function isChatModelId(value: unknown): value is ChatModelId {
  return typeof value === "string" && CHAT_MODELS.some((m) => m.id === value);
}

// What the client can request: a specific model, or "auto" to let the server pick one
// per-message via classifyModel() below.
export type ChatModelSelection = ChatModelId | "auto";

export const DEFAULT_CHAT_MODEL_SELECTION: ChatModelSelection = "auto";

export function isChatModelSelection(value: unknown): value is ChatModelSelection {
  return value === "auto" || isChatModelId(value);
}

// Question patterns that call for real reasoning/synthesis across multiple periods,
// cards, or tool results — worth Opus 5's extra capability. Covers both period-level
// comparisons ("which period had the highest spend") and card-level ones ("which card
// is closest to its limit") — anything that requires reading several items and picking
// one out, not just relaying a single number.
const OPUS_SIGNALS = [
  "compare",
  "comparison",
  "trend",
  "across all",
  "all periods",
  "average",
  "over time",
  "history",
  "historical",
  "versus",
  " vs ",
  "highest",
  "lowest",
  "biggest",
  "smallest",
  "increase",
  "decrease",
  "change over",
  "growth",
  "each period",
  "every period",
  "which period",
  "which card",
  "which one",
  "closest",
  "furthest",
  "nearest",
  "utilization",
  "most",
  "least",
  "rank",
  "maxed out",
  "over budget",
  "under budget",
  "pattern",
  "correlat",
];

// Phrasing that suggests the user just wants a single number read back to them.
const HAIKU_TRIGGER_PHRASES = ["how much", "what is", "what's", "total", "balance", "left on", "remaining"];

// Subjects that map onto a number the tools already pre-compute (summaryRows'
// bank/debit/card/necessary/recreation totals, bankTotal/totalSavings, or a card's
// limit/spend/remaining from cardBreakdown) — answerable by relaying one value, no
// arithmetic required. A Haiku-eligible question must be about one of these, not just
// phrased simply, or it falls through to Sonnet.
const HAIKU_SAFE_TOPICS = [
  "recreation",
  "necessary",
  "debit",
  "card",
  "bank",
  "saving",
  "balance",
  "limit",
  "remaining",
  "deposit",
];

const HAIKU_MAX_WORDS = 12;

// Advice/general-knowledge phrasing — a safe-topic word like "saving" or "balance" is
// ambiguous between "what's my total savings" (safe — a stored number) and "what's a
// good savings rate to aim for" (needs web_search + real synthesis of results, not a
// relayed number) — even when the second phrasing incidentally includes "my". Any of
// these always route away from Haiku, regardless of other signals.
const GENERAL_ADVICE_SIGNALS = [
  "good",
  "recommend",
  "typical",
  "should",
  "reasonable",
  "ideal",
  "rule of thumb",
  "advice",
  "healthy",
  "current interest rate",
  "current rate",
];

// Words that indicate the question is actually about the user's own stored data, not
// something general. Closes the other half of the same gap: a question with a safe
// topic word but no personal reference at all ("what's the current interest rate on a
// HYSA?") isn't asking about anything this app has stored, even without matching one of
// the advice signals above.
const PERSONAL_REFERENCE_SIGNALS = ["my ", "mine", " i ", " i'", "i've", "this period", "current period", " me "];

/**
 * Lightweight, zero-latency heuristic used when the client requests "auto": no extra
 * API call, just pattern-matching on the question text. Comparisons/trends/multi-period
 * or multi-card language routes to Opus 5; short single-value lookups about a known
 * pre-aggregated field *of the user's own data* route to Haiku 4.5; everything else
 * (free-text/vendor searches like "how much did I spend on coffee", and general
 * finance-knowledge questions that need web_search) falls back to Sonnet 5, since those
 * need real synthesis rather than relaying one already-computed number.
 */
export function classifyModel(question: string): ChatModelId {
  // Pad so boundary-sensitive signals (e.g. " i ") match consistently even when the
  // relevant word is the very first or last one in the sentence.
  const q = ` ${question.toLowerCase()} `;

  if (OPUS_SIGNALS.some((signal) => q.includes(signal))) {
    return "claude-opus-5";
  }

  // "which" almost always means picking the best/closest among several items — a
  // comparison task — even when it doesn't match one of the explicit phrases above.
  // Never let a comparison question fall through to Haiku on the strength of an
  // unrelated word like "limit" or "balance" appearing elsewhere in the sentence.
  if (q.includes("which")) {
    return "claude-sonnet-5";
  }

  if (GENERAL_ADVICE_SIGNALS.some((signal) => q.includes(signal))) {
    return "claude-sonnet-5";
  }

  const wordCount = q.trim().split(/\s+/).filter(Boolean).length;
  const isSimplePhrasing = wordCount <= HAIKU_MAX_WORDS && HAIKU_TRIGGER_PHRASES.some((s) => q.includes(s));
  const isKnownSafeTopic = HAIKU_SAFE_TOPICS.some((s) => q.includes(s));
  const referencesOwnData = PERSONAL_REFERENCE_SIGNALS.some((s) => q.includes(s));
  if (isSimplePhrasing && isKnownSafeTopic && referencesOwnData) {
    return "claude-haiku-4-5";
  }

  return "claude-sonnet-5";
}
