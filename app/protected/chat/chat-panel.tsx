"use client";

import { useEffect, useRef } from "react";
import { MessageCircle, LoaderCircle, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "./use-chat";
import { ChatMarkdown } from "./chat-markdown";

type ChatPanelProps = {
  currentPeriodId?: string;
};

export function ChatPanel({ currentPeriodId }: ChatPanelProps) {
  const { messages, input, setInput, isStreaming, activeTool, error, sendMessage, cancel } =
    useChat(currentPeriodId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, activeTool]);

  return (
    <Sheet onOpenChange={(open) => !open && cancel()}>
      <SheetTrigger asChild>
        <Button
          size="icon-lg"
          className="fixed right-6 bottom-6 z-40 size-14 rounded-full shadow-lg"
          aria-label="Open finance assistant"
        >
          <MessageCircle className="size-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Finance Assistant</SheetTitle>
          <SheetDescription>
            Ask about your spending, savings, or trends across any period.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4">
          {messages.length === 0 && (
            <p className="pt-8 text-center text-sm text-muted-foreground">
              Try asking &quot;How much did I spend on recreation this period?&quot; or &quot;Compare my
              card spend across all periods.&quot;
            </p>
          )}

          {messages.map((message, i) => (
            <div
              key={i}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
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

          {activeTool && (
            <div className="mt-2 mb-1 flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
              <Search className="size-3.5 animate-pulse" />
              Looking up {activeTool.replace(/_/g, " ")}…
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
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
