import { createClient } from "@/lib/supabase/server";
import { createPeriodService } from "@/app/protected/transaction-manager/periodService";
import { buildChatTools } from "./tools";
import { buildSystemPrompt } from "./prompt";
import { createAnthropicClient } from "./anthropic-client";
import { CHAT_MODELS, DEFAULT_CHAT_MODEL_SELECTION, classifyModel, isChatModelSelection } from "./models";
import type { ChatRequestBody, ChatStreamEvent } from "./types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Never trust the client's model string directly — validate against the allow-list so
  // an arbitrary/unsupported model id (or selection) can't be smuggled into the request.
  const selection = isChatModelSelection(body.model) ? body.model : DEFAULT_CHAT_MODEL_SELECTION;
  const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user");
  const model = selection === "auto" ? classifyModel(lastUserMessage?.content ?? "") : selection;
  const modelConfig = CHAT_MODELS.find((m) => m.id === model)!;

  const periodService = createPeriodService(supabase, userId);
  const tools = buildChatTools(periodService);
  const system = buildSystemPrompt(body.currentPeriodId);

  const client = createAnthropicClient();
  const runner = client.beta.messages.toolRunner({
    model,
    max_tokens: 8000,
    // Haiku 4.5 doesn't support adaptive thinking / output_config.effort — sending
    // either would 400. Only attach them for models known to support them.
    ...(modelConfig.supportsAdaptiveThinking
      ? { thinking: { type: "adaptive" as const }, output_config: { effort: "medium" as const } }
      : {}),
    system,
    // Dynamic filtering (web_search_20260318) improves result accuracy/token efficiency
    // but isn't documented as supported on Haiku 4.5 — fall back to the basic
    // web_search_20250305 variant there. Anthropic runs the search server-side either
    // way; capped at 3 uses per message to bound cost/latency for a single question.
    tools: [
      ...tools,
      {
        type: modelConfig.supportsDynamicWebSearch ? ("web_search_20260318" as const) : ("web_search_20250305" as const),
        name: "web_search" as const,
        max_uses: 3,
      },
    ],
    messages: body.messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        send({ type: "model_selected", model });

        let firstTurn = true;
        for await (const messageStream of runner) {
          // Each iteration is a separate API turn (the tool runner re-calls Claude after
          // sending tool results back). Text in a later turn is a fresh reply, not a
          // continuation of the previous turn's sentence — flag the boundary so the
          // client can insert a paragraph break instead of gluing them together.
          if (!firstTurn) {
            send({ type: "turn_break" });
          }
          firstTurn = false;

          for await (const event of messageStream) {
            if (
              event.type === "content_block_start" &&
              (event.content_block.type === "tool_use" || event.content_block.type === "server_tool_use")
            ) {
              // server_tool_use covers Anthropic-hosted tools like web_search, which run
              // server-side rather than through our own tool-runner dispatch.
              send({ type: "tool_start", name: event.content_block.name });
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              send({ type: "text_delta", text: event.delta.text });
            }
          }
        }
        send({ type: "done" });
      } catch (error) {
        console.error("Chat route error:", error);
        send({ type: "error", message: "Something went wrong. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
