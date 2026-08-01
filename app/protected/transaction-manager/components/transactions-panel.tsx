import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, LoaderCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreditCard, Transaction } from "../types";
import { TxSortBy, TxSortOrder } from "../calculations";

type TransactionsPanelProps = {
  cards: CreditCard[];
  pagedTransactions: Transaction[];
  filteredTransactions: Transaction[];
  totalTx: number;
  pageStartIndex: number;
  pageEndIndex: number;
  totalPages: number;
  effectiveTxPage: number;
  visiblePageNumbers: number[];
  txSearch: string;
  totalFilteredAmount: number;
  showDebit: boolean;
  showBank: boolean;
  visibleCardIds: Record<string, boolean>;
  txSortBy: TxSortBy;
  txSortOrder: TxSortOrder;
  deletingTxIds?: Set<string>;
  onSetTxSearch: (value: string) => void;
  onSetTxPage: (value: number | ((prev: number) => number)) => void;
  onSetShowDebit: (value: boolean) => void;
  onSetShowBank: (value: boolean) => void;
  onSetVisibleCard: (cardId: string, value: boolean) => void;
  onSetSortBy: (value: TxSortBy) => void;
  onSetSortOrder: (value: TxSortOrder) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onDownloadCSV: () => void;
};

export function TransactionsPanel({
  cards,
  pagedTransactions,
  filteredTransactions,
  totalTx,
  pageStartIndex,
  pageEndIndex,
  totalPages,
  effectiveTxPage,
  visiblePageNumbers,
  txSearch,
  totalFilteredAmount,
  showDebit,
  showBank,
  visibleCardIds,
  txSortBy,
  txSortOrder,
  deletingTxIds = new Set(),
  onSetTxSearch,
  onSetTxPage,
  onSetShowDebit,
  onSetShowBank,
  onSetVisibleCard,
  onSetSortBy,
  onSetSortOrder,
  onEditTransaction,
  onDeleteTransaction,
  onDownloadCSV,
}: TransactionsPanelProps) {
  return (
    <section className="h-[73vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 lg:order-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Transactions</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing {totalTx === 0 ? 0 : pageStartIndex + 1}-{pageEndIndex} of {totalTx}
          </p>
          {txSearch.trim() && (
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Total for search: <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">${totalFilteredAmount.toFixed(2)}</span>
            </p>
          )}
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownloadCSV}
            disabled={filteredTransactions.length === 0}
            className="shrink-0"
          >
            CSV
          </Button>
          <Input
            id="txSearch"
            value={txSearch}
            onChange={(e) => {
              onSetTxSearch(e.target.value);
              onSetTxPage(1);
            }}
            placeholder="Search transactions"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="showDebit"
              checked={showDebit}
              onCheckedChange={(checked) => {
                onSetShowDebit(Boolean(checked));
                onSetTxPage(1);
              }}
            />
            <Label htmlFor="showDebit" className="font-normal text-zinc-700 dark:text-zinc-300">
              Debit
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="showBank"
              checked={showBank}
              onCheckedChange={(checked) => {
                onSetShowBank(Boolean(checked));
                onSetTxPage(1);
              }}
            />
            <Label htmlFor="showBank" className="font-normal text-zinc-700 dark:text-zinc-300">
              Bank
            </Label>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                Credit cards
                {cards.length > 0 &&
                  (() => {
                    const selectedCount = cards.filter((card) => visibleCardIds[card.id] ?? true).length;
                    return selectedCount < cards.length ? (
                      <Badge variant="secondary" className="px-1.5">
                        {selectedCount}/{cards.length}
                      </Badge>
                    ) : null;
                  })()}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {cards.length === 0 ? (
                <div className="px-2 py-1 text-xs text-zinc-500">No cards</div>
              ) : (
                cards.map((card) => (
                  <DropdownMenuCheckboxItem
                    key={card.id}
                    checked={visibleCardIds[card.id] ?? true}
                    onCheckedChange={(checked) => {
                      onSetVisibleCard(card.id, Boolean(checked));
                      onSetTxPage(1);
                    }}
                  >
                    {card.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="txSortBy" className="text-zinc-700 dark:text-zinc-300">
              Sort by
            </Label>
            <Select
              value={txSortBy}
              onValueChange={(value) => {
                onSetSortBy(value as TxSortBy);
                onSetTxPage(1);
              }}
            >
              <SelectTrigger id="txSortBy" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="method">Method</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={txSortOrder}
              onValueChange={(value) => {
                onSetSortOrder(value as TxSortOrder);
                onSetTxPage(1);
              }}
            >
              <SelectTrigger id="txSortOrder" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between sm:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={effectiveTxPage <= 1}
              onClick={() => { if (effectiveTxPage > 1) onSetTxPage((prev) => Math.max(1, prev - 1)); }}
            >
              ← Prev
            </Button>
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              Page {effectiveTxPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={effectiveTxPage >= totalPages}
              onClick={() => { if (effectiveTxPage < totalPages) onSetTxPage((prev) => Math.min(totalPages, prev + 1)); }}
            >
              Next →
            </Button>
          </div>

          <div className="hidden sm:block">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={effectiveTxPage <= 1}
                    className={effectiveTxPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      if (effectiveTxPage <= 1) return;
                      onSetTxPage((prev) => Math.max(1, prev - 1));
                    }}
                  />
                </PaginationItem>
                {visiblePageNumbers.map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink isActive={page === effectiveTxPage} onClick={() => onSetTxPage(page)}>
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={effectiveTxPage >= totalPages}
                    className={effectiveTxPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      if (effectiveTxPage >= totalPages) return;
                      onSetTxPage((prev) => Math.min(totalPages, prev + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      {totalTx === 0 ? (
        <Empty className="border border-dashed border-zinc-300 bg-zinc-50 py-10 dark:border-zinc-700 dark:bg-zinc-900/40">
          <EmptyHeader>
            <EmptyTitle className="text-zinc-800 dark:text-zinc-100">
              {txSearch.trim() ? "No Matching Transactions" : "No Transactions Yet"}
            </EmptyTitle>
            <EmptyDescription className="text-zinc-500 dark:text-zinc-400">
              {txSearch.trim()
                ? `No transactions match "${txSearch.trim()}". Try another search.`
                : "Click Add Transaction to begin."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {pagedTransactions.map((tx) => {
            const txCard = tx.method === "card" ? cards.find((card) => card.id === tx.cardId) : undefined;
            const txBorderColor = txCard?.color ?? "";
            const txCategoryLabel = tx.category === "recreation" ? "Recreation" : "Necessary";
            const isIncome = tx.method === "bank";
            const amountColorClass = isIncome
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-zinc-900 dark:text-zinc-100";
            const amountText = `${isIncome ? "+" : "-"}$${tx.amount.toFixed(2)}`;

            return (
              <li
                key={tx.id}
                className="rounded-lg border-2 border-zinc-200 p-3 dark:border-zinc-700"
                style={tx.method === "card" && txBorderColor ? { borderColor: txBorderColor } : undefined}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-zinc-800 dark:text-zinc-100">{tx.description || "Transaction"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {tx.method === "debit"
                          ? "Payment: Debit"
                          : tx.method === "bank"
                            ? `Bank Deposit${tx.bankCategory ? ` (${tx.bankCategory === "salary" ? "Salary" : "Transfer"})` : ""}`
                            : `Payment: Card (${tx.cardName})`}
                      </p>
                      {tx.method !== "bank" && tx.category && (
                        <Badge variant={tx.category === "recreation" ? "outline" : "secondary"}>
                          {txCategoryLabel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {tx.method === "bank" && tx.savingsAmount && tx.savingsAmount > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className={`cursor-default text-lg font-bold ${amountColorClass}`}>
                              {amountText}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            Savings: ${tx.savingsAmount.toFixed(2)} - To bank: ${(tx.amount - tx.savingsAmount).toFixed(2)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <p className={`text-lg font-bold ${amountColorClass}`}>{amountText}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        size="xs"
                        onClick={() => onEditTransaction(tx)}
                        className="bg-white text-zinc-900 hover:bg-zinc-100"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        onClick={() => onDeleteTransaction(tx.id)}
                        disabled={deletingTxIds.has(tx.id)}
                        className="bg-red-500 text-white hover:bg-red-600"
                      >
                        {deletingTxIds.has(tx.id) && <LoaderCircle className="h-3 w-3 animate-spin" />}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
