"use client";

import { useEffect, useRef } from "react";
import { MessageCircle, LoaderCircle, Search, Globe, Trash2, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "./use-chat";
import { ChatMarkdown } from "./chat-markdown";
import { CHAT_MODELS, type ChatModelSelection } from "@/app/api/chat/models";

const MODEL_OPTIONS: { id: ChatModelSelection; label: string; description: string }[] = [
  { id: "auto", label: "Auto", description: "Automatically picks the best model for your question" },
  ...CHAT_MODELS,
];

function toolStatusLabel(tool: string): string {
  if (tool === "web_search") return "Searching the web";
  return `Looking up ${tool.replace(/_/g, " ")}`;
}

type ChatPanelProps = {
  currentPeriodId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChatPanel({ currentPeriodId, open, onOpenChange }: ChatPanelProps) {
  const {
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
  } = useChat(currentPeriodId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentOption = MODEL_OPTIONS.find((m) => m.id === modelSelection)!;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, activeTool]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) cancel();
      }}
    >
      <SheetTrigger asChild>
        <Button
          size="icon-lg"
          className="fixed right-6 bottom-6 z-40 hidden size-14 rounded-full shadow-lg lg:inline-flex"
          aria-label="Open finance assistant"
        >
          <MessageCircle className="size-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>Finance Assistant</SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearChat}
              disabled={messages.length === 0}
              aria-label="Clear chat"
            >
              <Trash2 />
            </Button>
          </div>
          <SheetDescription>
            Ask about your spending, cards, and savings, or general finance questions.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4">
          {messages.length === 0 && (
            <div className="space-y-2 pt-8 text-center text-sm text-muted-foreground">
              <p>Try asking:</p>
              <ul className="space-y-1">
                <li>&quot;How much did I spend on recreation this period?&quot;</li>
                <li>&quot;Which card is closest to its limit?&quot;</li>
                <li>&quot;Find every Amazon purchase, anywhere.&quot;</li>
                <li>&quot;What&apos;s a typical emergency fund size?&quot;</li>
              </ul>
            </div>
          )}

          {messages.map((message, i) => (
            <div
              key={i}
              className={message.role === "user" ? "flex justify-end" : "flex flex-col items-start"}
            >
              {message.role === "assistant" && message.modelUsed && (
                <span className="mb-1 pl-3 text-[11px] text-muted-foreground">
                  Answered by {CHAT_MODELS.find((m) => m.id === message.modelUsed)?.label}
                </span>
              )}
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "min-w-0 max-w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
                }
              >
                {message.role === "assistant" ? (
                  <ChatMarkdown content={message.content} />
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}

          {isStreaming && !activeTool && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2.5">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}

          {activeTool &&
            (() => {
              const ToolIcon = activeTool === "web_search" ? Globe : Search;
              return (
                <div className="mt-2 mb-1 flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                  <ToolIcon className="size-3.5 animate-pulse" />
                  {toolStatusLabel(activeTool)}…
                </div>
              );
            })()}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mr-auto text-xs text-muted-foreground"
                disabled={isStreaming}
              >
                {currentOption.label}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={modelSelection}
                onValueChange={(value) => setModelSelection(value as ChatModelSelection)}
              >
                {MODEL_OPTIONS.map((m) => (
                  <DropdownMenuRadioItem key={m.id} value={m.id}>
                    <div className="flex flex-col py-0.5">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <form
            className="flex w-full items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances..."
              disabled={isStreaming}
              autoComplete="off"
            />
            <Button type="submit" disabled={isStreaming || !input.trim()}>
              {isStreaming && <LoaderCircle className="animate-spin" />}
              Send
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
