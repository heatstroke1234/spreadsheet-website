import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SummaryRow = {
  label: string;
  value: number;
};

type BankSummaryDialogProps = {
  open: boolean;
  summaryRows: SummaryRow[];
  onOpenChange: (open: boolean) => void;
};

export function BankSummaryDialog({ open, summaryRows, onOpenChange }: BankSummaryDialogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  };

  useEffect(() => {
    if (!open) return;
    // Content renders after this effect fires, so measure on the next frame.
    const id = requestAnimationFrame(updateScrollState);
    return () => cancelAnimationFrame(id);
  }, [open, summaryRows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Transaction Summary</DialogTitle>
          <DialogDescription>Overview of deposits and spending by category for this period.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-2"
          >
            {summaryRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                No summary values to show yet.
              </div>
            ) : (
              summaryRows.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">${item.value.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
          {canScrollDown && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
