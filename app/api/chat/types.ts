// Type-only — erased at build time, safe to import from client components.

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequestBody = {
  messages: ChatMessage[];
  currentPeriodId?: string;
};

export type ChatStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "turn_break" }
  | { type: "done" }
  | { type: "error"; message: string };
