"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatDisplayMessage, ChatMessage, ChatStreamEvent } from "@/app/api/chat/types";
import { DEFAULT_CHAT_MODEL_SELECTION, type ChatModelId, type ChatModelSelection } from "@/app/api/chat/models";

export function useChat(currentPeriodId?: string) {
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelSelection, setModelSelection] = useState<ChatModelSelection>(DEFAULT_CHAT_MODEL_SELECTION);
  const abortRef = useRef<AbortController | null>(null);
  // Set when the server reports a new Claude turn (e.g. after tool results come back).
  // The next text_delta uses this to insert a paragraph break instead of gluing the new
  // turn's text onto whatever the previous turn already wrote.
  const pendingBreakRef = useRef(false);
  // Set from the server's "model_selected" event, consumed when the next assistant
  // bubble is created. Only actually attached to the message when the request was sent
  // with "auto" — if the user explicitly picked a model, showing it back is redundant.
  const pendingModelRef = useRef<ChatModelId | null>(null);
  const wasAutoRef = useRef(false);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const nextMessages: ChatDisplayMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setActiveTool(null);
    pendingBreakRef.current = false;
    pendingModelRef.current = null;
    wasAutoRef.current = modelSelection === "auto";
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Wire format only — strip the client-only `modelUsed` tag before sending.
    const wireMessages: ChatMessage[] = nextMessages.map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: wireMessages, currentPeriodId, model: modelSelection }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event: ChatStreamEvent = JSON.parse(line);
          applyEvent(event, setMessages, setActiveTool, setError, pendingBreakRef, pendingModelRef, wasAutoRef);
        }
      }

      if (buffer.trim()) {
        const event: ChatStreamEvent = JSON.parse(buffer);
        applyEvent(event, setMessages, setActiveTool, setError, pendingBreakRef, pendingModelRef, wasAutoRef);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setIsStreaming(false);
      setActiveTool(null);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, currentPeriodId, modelSelection]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    pendingBreakRef.current = false;
    pendingModelRef.current = null;
    setMessages([]);
    setError(null);
    setActiveTool(null);
    setIsStreaming(false);
  }, []);

  return {
    messages,
    input,
    setInput,
    isStreaming,
    activeTool,
    error,
    sendMessage,
    cancel,
    clearChat,
    modelSelection,
    setModelSelection,
  };
}

function applyEvent(
  event: ChatStreamEvent,
  setMessages: React.Dispatch<React.SetStateAction<ChatDisplayMessage[]>>,
  setActiveTool: React.Dispatch<React.SetStateAction<string | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  pendingBreakRef: React.MutableRefObject<boolean>,
  pendingModelRef: React.MutableRefObject<ChatModelId | null>,
  wasAutoRef: React.MutableRefObject<boolean>
) {
  switch (event.type) {
    case "model_selected":
      pendingModelRef.current = event.model;
      break;
    case "tool_start":
      setActiveTool(event.name);
      break;
    case "turn_break":
      pendingBreakRef.current = true;
      break;
    case "text_delta": {
      setActiveTool(null);
      // Read and clear refs *before* calling setMessages, not inside its updater.
      // React (Strict Mode, dev only) invokes state updater functions twice to check
      // they're pure — mutating a ref inside the updater made the first (discarded)
      // call consume the pending value, so the second call always saw it already
      // cleared and silently dropped it.
      const isNewTurn = pendingBreakRef.current;
      pendingBreakRef.current = false;
      const modelUsed = wasAutoRef.current ? (pendingModelRef.current ?? undefined) : undefined;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        // First chunk of this turn's answer — start a new assistant bubble rather than
        // reusing a pre-created empty one, so the "looking up..." indicator (rendered
        // after the message list) never overlaps the same slot as the answer bubble.
        if (!last || last.role !== "assistant") {
          return [...prev, { role: "assistant", content: event.text, modelUsed }];
        }
        // Only insert a break if a later turn actually has text to separate from —
        // a turn that was pure tool-calling (no commentary) shouldn't leave a blank line.
        const needsBreak = isNewTurn && last.content.trim().length > 0;
        const next = [...prev];
        next[next.length - 1] = {
          ...last,
          content: last.content + (needsBreak ? "\n\n" : "") + event.text,
        };
        return next;
      });
      break;
    }
    case "error":
      setError(event.message);
      break;
    case "done":
      break;
  }
}
