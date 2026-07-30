// Shared between the server (route.ts, for validating the incoming request) and the
// client (chat-panel.tsx, for rendering the picker) — runtime data, not type-only.

export const CHAT_MODELS = [
  {
    id: "claude-opus-5",
    label: "Opus 5",
    description: "Most capable — best for complex or multi-period analysis",
    supportsAdaptiveThinking: true,
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    description: "Faster and cheaper, nearly as capable",
    supportsAdaptiveThinking: true,
  },
  {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    description: "Fastest and cheapest — best for quick lookups",
    supportsAdaptiveThinking: false,
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

// Question patterns that call for real reasoning across multiple periods/tool
// results — worth Opus 5's extra capability.
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
  "pattern",
  "correlat",
];

// Short, single-fact lookups that don't need much reasoning — Haiku 4.5 is fast and
// cheap enough that it's not worth escalating these to a bigger model.
const HAIKU_SIGNALS = ["how much", "what is", "what's", "total", "balance", "left on", "remaining", "limit"];

const HAIKU_MAX_WORDS = 12;

/**
 * Lightweight, zero-latency heuristic used when the client requests "auto": no extra
 * API call, just pattern-matching on the question text. Comparisons/trends/multi-period
 * language routes to Opus 5; short single-value lookups route to Haiku 4.5; everything
 * else falls back to Sonnet 5 as the balanced default.
 */
export function classifyModel(question: string): ChatModelId {
  const q = question.toLowerCase();

  if (OPUS_SIGNALS.some((signal) => q.includes(signal))) {
    return "claude-opus-5";
  }

  const wordCount = q.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount <= HAIKU_MAX_WORDS && HAIKU_SIGNALS.some((signal) => q.includes(signal))) {
    return "claude-haiku-4-5";
  }

  return "claude-sonnet-5";
}
