import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { CreditCard, Transaction } from "../types";

type BankCardsPanelProps = {
  bankTotal: number;
  cards: CreditCard[];
  transactions: Transaction[];
  deletingCardIds?: Set<string>;
  onOpenSummary: () => void;
  onEditCard: (card: CreditCard) => void;
  onRequestDeleteCard: (card: CreditCard) => void;
};

export function BankCardsPanel({
  bankTotal,
  cards,
  transactions,
  deletingCardIds = new Set(),
  onOpenSummary,
  onEditCard,
  onRequestDeleteCard,
}: BankCardsPanelProps) {
  return (
    <aside className="flex h-[73vh] flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800 lg:order-1">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Bank Account</h2>
        <Button variant="outline" size="sm" onClick={onOpenSummary}>
          Summary
        </Button>
      </div>

      <div
        className="mb-4 rounded-lg border bg-white p-3 dark:bg-zinc-700"
        style={{
          borderColor: bankTotal < 0 ? "#ef4444" : "#d4d4d8",
          borderWidth: bankTotal < 0 ? "2px" : "1px",
        }}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Total Balance</p>
        <p className={`text-2xl font-bold ${bankTotal < 0 ? "text-red-500" : "text-zinc-900 dark:text-zinc-100"}`}>
          ${bankTotal.toFixed(2)}
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-700">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Total Expenses</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          ${transactions
            .filter((tx) => tx.method === "debit" || tx.method === "card")
            .reduce((sum, tx) => sum + tx.amount, 0)
            .toFixed(2)}
        </p>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-100">Cards</h2>
      {cards.length === 0 ? (
        <Empty className="border border-dashed border-zinc-300 bg-zinc-50 py-10 dark:border-zinc-700 dark:bg-zinc-900/40">
          <EmptyHeader>
            <EmptyTitle className="text-zinc-800 dark:text-zinc-100">No Cards Yet</EmptyTitle>
            <EmptyDescription className="text-zinc-500 dark:text-zinc-400">Click Add Card to begin.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {cards.map((card) => {
            const charged = transactions
              .filter((tx) => tx.method === "card" && tx.cardId === card.id)
              .reduce((sum, tx) => sum + tx.amount, 0);

            const hasTransactions = transactions.some((tx) => tx.cardId === card.id);

            return (
              <div
                key={card.id}
                className="rounded-lg border border-zinc-300 p-3"
                style={{ backgroundColor: card.color, color: "white" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">{card.name}</h3>
                    <p className="text-sm opacity-95">Limit: ${card.limit.toLocaleString()}</p>
                    <p className="text-sm opacity-90">Spent: ${charged.toFixed(2)}</p>
                    <p className="text-sm opacity-90">
                      Utilization: {(card.limit > 0 ? Math.min(100, (charged / card.limit) * 100).toFixed(2) : "0")}%
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditCard(card)}
                      disabled={deletingCardIds.has(card.id)}
                      className="rounded bg-white px-2 py-1 text-xs font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteCard(card)}
                      disabled={hasTransactions || deletingCardIds.has(card.id)}
                      className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1"
                      title={hasTransactions ? "Cannot delete card with existing transactions" : ""}
                    >
                      {deletingCardIds.has(card.id) && <LoaderCircle className="h-3 w-3 animate-spin" />}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
