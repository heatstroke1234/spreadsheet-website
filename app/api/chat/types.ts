// Type-only — erased at build time, safe to import from client components.

import type { ChatModelId, ChatModelSelection } from "./models";

// The wire format — exactly what's sent to /api/chat and forwarded to the Anthropic API
// as `messages`. Keep this free of client-only fields (like which model answered) so
// nothing extra ever leaks into the actual API request.
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Client-side state only: an assistant message optionally tagged with which model
// actually answered it (only set when the selection was "auto"). Never sent to the server.
export type ChatDisplayMessage = ChatMessage & {
  modelUsed?: ChatModelId;
};

export type ChatRequestBody = {
  messages: ChatMessage[];
  currentPeriodId?: string;
  model?: ChatModelSelection;
};

export type ChatStreamEvent =
  | { type: "model_selected"; model: ChatModelId }
  | { type: "text_delta"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "turn_break" }
  | { type: "done" }
  | { type: "error"; message: string };
