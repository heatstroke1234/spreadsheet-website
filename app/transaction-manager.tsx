"use client";

import React, { useState, FormEvent } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CreditCard = {
  id: string;
  name: string;
  limit: number;
  color: string;
};

type Transaction = {
  id: string;
  amount: number;
  method: "debit" | "card" | "bank";
  category?: "necessary" | "recreation";
  bankCategory?: "transfer" | "salary";
  savingsAmount?: number;
  cardId?: string;
  cardName: string;
  description: string;
  createdAt: string;
};

type Period = {
  id: string;
  name: string;
  createdAt: string;
  cards: CreditCard[];
  transactions: Transaction[];
  bankTotal: number;
  totalSavings: number;
  visibleCardIds: Record<string, boolean>;
};

type TransactionManagerProps = {
  onLogout: () => void;
  periods: Period[];
  currentPeriod?: Period;
  onCreatePeriod: (name: string) => void;
  onSwitchPeriod: (periodId: string) => void;
  onUpdatePeriodData: (periodId: string, data: Partial<Pick<Period, 'cards' | 'transactions' | 'bankTotal' | 'totalSavings' | 'visibleCardIds'>>) => void;
  onDeletePeriod: (periodId: string) => void;
};

export function TransactionManager({ 
  onLogout, 
  periods, 
  currentPeriod, 
  onCreatePeriod, 
  onSwitchPeriod, 
  onUpdatePeriodData,
  onDeletePeriod 
}: TransactionManagerProps) {
  // Local UI state (not persisted)
  const [cardName, setCardName] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [cardColor, setCardColor] = useState("#0ea5e9");
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string>("");

  const [transactions, setTransactions] = useState<Transaction[]>(currentPeriod?.transactions || []);
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txMethod, setTxMethod] = useState<"debit" | "card" | "bank">("debit");
  const [txCategory, setTxCategory] = useState<"necessary" | "recreation">("necessary");
  const [txBankCategory, setTxBankCategory] = useState<"transfer" | "salary">("transfer");
  const [txSavingsPercent, setTxSavingsPercent] = useState("0");
  const [txCardId, setTxCardId] = useState<string>("");
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string>("");

  const [showDebit, setShowDebit] = useState(true);
  const [showBank, setShowBank] = useState(true);
  const [visibleCardIds, setVisibleCardIds] = useState<Record<string, boolean>>(currentPeriod?.visibleCardIds || {});
  const [bankTotal, setBankTotal] = useState(currentPeriod?.bankTotal || 0);
  const [totalSavings, setTotalSavings] = useState(currentPeriod?.totalSavings || 0);
  const [cards, setCards] = useState<CreditCard[]>(currentPeriod?.cards || []);

  const [txPage, setTxPage] = useState(1);
  const [txSortBy, setTxSortBy] = useState<"date" | "amount" | "method">("date");
  const [txSortOrder, setTxSortOrder] = useState<"asc" | "desc">("desc");
  const [txSearch, setTxSearch] = useState("");
  const txPageSize = 4;

  // Period management state
  const [newPeriodName, setNewPeriodName] = useState("");
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);

  // Card deletion confirmation state
  const [cardDeleteDialogOpen, setCardDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  // Bank summary dialog state
  const [bankSummaryDialogOpen, setBankSummaryDialogOpen] = useState(false);

  // Update local state when currentPeriod changes
  React.useEffect(() => {
    if (currentPeriod) {
      setTransactions(currentPeriod.transactions);
      setVisibleCardIds(currentPeriod.visibleCardIds);
      setBankTotal(currentPeriod.bankTotal);
      setTotalSavings(currentPeriod.totalSavings || 0);
      setCards(currentPeriod.cards);
    }
  }, [currentPeriod]);

  // Helper function to update period data
  const updateCurrentPeriodData = (data: Partial<Pick<Period, 'cards' | 'transactions' | 'bankTotal' | 'totalSavings' | 'visibleCardIds'>>) => {
    if (currentPeriod) {
      onUpdatePeriodData(currentPeriod.id, data);
    }
  };

  // Period management functions
  const handleCreatePeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPeriodName.trim()) {
      onCreatePeriod(newPeriodName.trim());
      setNewPeriodName("");
      setPeriodDialogOpen(false);
    }
  };

  const handleSwitchPeriod = (periodId: string) => {
    onSwitchPeriod(periodId);
    // Reset pagination when switching periods
    setTxPage(1);
  };

  const handleDeletePeriod = (periodId: string) => {
    onDeletePeriod(periodId);
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    const direction = txSortOrder === "asc" ? 1 : -1;

    if (txSortBy === "amount") {
      return direction * (a.amount - b.amount);
    }

    if (txSortBy === "method") {
      const methodCompare = a.method.localeCompare(b.method);
      if (methodCompare !== 0) {
        return direction * methodCompare;
      }

      // for card transactions, stay within the same card (by cardName)
      if (a.method === "card" && b.method === "card") {
        return direction * a.cardName.localeCompare(b.cardName);
      }

      // debit/debit stable ordering
      return 0;
    }

    // date
    return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  const filteredTransactions = sortedTransactions.filter((tx) => {
    if (tx.method === "debit" && !showDebit) return false;
    if (tx.method === "card") {
      if (!(tx.cardId ? visibleCardIds[tx.cardId] ?? true : true)) {
        return false;
      }
    }
    if (tx.method === "bank" && !showBank) return false;

    if (!txSearch.trim()) {
      return true;
    }

    const query = txSearch.trim().toLowerCase();
    const description = tx.description.toLowerCase();
    const cardName = tx.cardName.toLowerCase();
    const method = tx.method.toLowerCase();
    const category = tx.category?.toLowerCase() ?? "";
    const amount = tx.amount.toString();
    const date = new Date(tx.createdAt).toLocaleDateString().toLowerCase();

    return (
      description.includes(query) ||
      cardName.includes(query) ||
      method.includes(query) ||
      category.includes(query) ||
      amount.includes(query) ||
      date.includes(query)
    );
  });

  const totalTx = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalTx / txPageSize));
  const effectiveTxPage = Math.min(txPage, totalPages);

  const visiblePageStart = Math.max(1, Math.min(effectiveTxPage - 1, totalPages - 2));
  const visiblePageEnd = Math.min(totalPages, visiblePageStart + 2);
  const visiblePageNumbers = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, i) => visiblePageStart + i
  );

  const pageStartIndex = (effectiveTxPage - 1) * txPageSize;
  const pageEndIndex = Math.min(totalTx, pageStartIndex + txPageSize);
  const pagedTransactions = filteredTransactions.slice(pageStartIndex, pageEndIndex);

  const totalBankDeposits = transactions
    .filter((tx) => tx.method === "bank")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalDebitTransactions = transactions
    .filter((tx) => tx.method === "debit")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalCardTransactions = transactions
    .filter((tx) => tx.method === "card")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalNecessaryTransactions = transactions
    .filter((tx) => tx.category === "necessary")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalRecreationTransactions = transactions
    .filter((tx) => tx.category === "recreation")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const summaryRows = [
    { label: "Total Bank Deposits", value: totalBankDeposits },
    { label: "Total Savings", value: totalSavings },
    { label: "Total Debit Transactions", value: totalDebitTransactions },
    { label: "Total Card Transactions", value: totalCardTransactions },
    { label: "Total Necessary Transactions", value: totalNecessaryTransactions },
    { label: "Total Recreation Transactions", value: totalRecreationTransactions },
  ].filter((item) => item.value > 0);

  const resetCardForm = () => {
    setCardName("");
    setCardLimit("");
    setCardColor("#0ea5e9");
    setEditingCardId("");
  };

  const addCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = cardName.trim();
    const amount = Number(cardLimit);

    if (!trimmedName || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    if (editingCardId) {
      const updatedCards = cards.map((card) =>
        card.id === editingCardId
          ? { ...card, name: trimmedName, limit: amount, color: cardColor }
          : card
      );
      setCards(updatedCards);
      updateCurrentPeriodData({ cards: updatedCards });
      setEditingCardId("");
    } else {
      const newCard: CreditCard = {
        id: crypto.randomUUID(),
        name: trimmedName,
        limit: amount,
        color: cardColor,
      };
      const updatedCards = [newCard, ...cards];
      setCards(updatedCards);
      const updatedVisibleCardIds = { ...visibleCardIds, [newCard.id]: true };
      setVisibleCardIds(updatedVisibleCardIds);
      updateCurrentPeriodData({ cards: updatedCards, visibleCardIds: updatedVisibleCardIds });
    }

    resetCardForm();
    setCardDialogOpen(false);
  };

  const deleteCard = (cardId: string) => {
    const updatedCards = cards.filter((card) => card.id !== cardId);
    const updatedTransactions = transactions.filter((tx) => tx.cardId !== cardId);
    const updatedVisibleCardIds = { ...visibleCardIds };
    delete updatedVisibleCardIds[cardId];
    
    setCards(updatedCards);
    setTransactions(updatedTransactions);
    setVisibleCardIds(updatedVisibleCardIds);
    updateCurrentPeriodData({ 
      cards: updatedCards, 
      transactions: updatedTransactions, 
      visibleCardIds: updatedVisibleCardIds 
    });
  };

  const startEditCard = (card: CreditCard) => {
    setCardName(card.name);
    setCardLimit(String(card.limit));
    setCardColor(card.color);
    setEditingCardId(card.id);
    setCardDialogOpen(true);
  };

  const addTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(txAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const card = cards.find((card) => card.id === txCardId);
    const cardNameForTx = txMethod === "debit" ? "Debit" : txMethod === "bank" ? "Bank Deposit" : card?.name || "Unknown card";

    // Compute savings for salary deposits
    const savingsAmountForTx =
      txMethod === "bank" && txBankCategory === "salary"
        ? amount * (Math.max(0, Math.min(100, Number(txSavingsPercent) || 0)) / 100)
        : 0;

    let updatedTransactions: Transaction[];
    let newBankTotal = bankTotal;
    let newTotalSavings = totalSavings;

    if (editingTxId) {
      // Find the existing transaction to calculate balance changes
      const existingTx = transactions.find(tx => tx.id === editingTxId);
      
      updatedTransactions = transactions.map((tx) =>
        tx.id === editingTxId
          ? {
              ...tx,
              amount,
              method: txMethod,
              category: txMethod === "bank" ? undefined : txCategory,
              bankCategory: txMethod === "bank" ? txBankCategory : undefined,
              savingsAmount: savingsAmountForTx > 0 ? savingsAmountForTx : undefined,
              cardId: txMethod === "card" ? txCardId : undefined,
              cardName: cardNameForTx,
              description: txDescription,
            }
          : tx
      );

      // Update bank balance based on transaction changes
      if (existingTx) {
        // Reverse the effect of the old transaction
        if (existingTx.method === "bank") {
          const oldSavings = existingTx.savingsAmount ?? 0;
          newBankTotal -= (existingTx.amount - oldSavings);
          newTotalSavings -= oldSavings;
        } else if (existingTx.method === "debit") {
          newBankTotal += existingTx.amount;
        } else if (existingTx.method === "card") {
          newBankTotal += existingTx.amount;
        }

        // Apply the effect of the new transaction
        if (txMethod === "bank") {
          newBankTotal += (amount - savingsAmountForTx);
          newTotalSavings += savingsAmountForTx;
        } else if (txMethod === "debit") {
          newBankTotal -= amount;
        } else if (txMethod === "card") {
          newBankTotal -= amount;
        }
      }

      setEditingTxId("");
    } else {
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        amount,
        method: txMethod,
        category: txMethod === "bank" ? undefined : txCategory,
        bankCategory: txMethod === "bank" ? txBankCategory : undefined,
        savingsAmount: savingsAmountForTx > 0 ? savingsAmountForTx : undefined,
        cardId: txMethod === "card" ? txCardId : undefined,
        cardName: cardNameForTx,
        description: txDescription,
        createdAt: new Date().toISOString(),
      };
      updatedTransactions = [newTransaction, ...transactions];

      // Update bank balance for new transactions
      if (txMethod === "debit") {
        newBankTotal -= amount;
      } else if (txMethod === "card") {
        newBankTotal -= amount;
      } else if (txMethod === "bank") {
        newBankTotal += (amount - savingsAmountForTx);
        newTotalSavings += savingsAmountForTx;
      }
    }

    setTransactions(updatedTransactions);
    setBankTotal(newBankTotal);
    setTotalSavings(newTotalSavings);
    updateCurrentPeriodData({ transactions: updatedTransactions, bankTotal: newBankTotal, totalSavings: newTotalSavings });

    setTxAmount("");
    setTxDescription("");
    setTxCardId("");
    setTxMethod("debit");
    setTxCategory("necessary");
    setTxBankCategory("transfer");
    setTxSavingsPercent("0");
    setTxDialogOpen(false);
  };

  const deleteTransaction = (txId: string) => {
    const txToDelete = transactions.find(tx => tx.id === txId);
    const updatedTransactions = transactions.filter((tx) => tx.id !== txId);
    setTransactions(updatedTransactions);

    // Update bank balance when deleting transactions
    let newBankTotal = bankTotal;
    let newTotalSavings = totalSavings;
    if (txToDelete) {
      if (txToDelete.method === "bank") {
        const savings = txToDelete.savingsAmount ?? 0;
        newBankTotal -= (txToDelete.amount - savings);
        newTotalSavings -= savings;
      } else if (txToDelete.method === "debit") {
        newBankTotal += txToDelete.amount;
      } else if (txToDelete.method === "card") {
        newBankTotal += txToDelete.amount;
      }
    }
    setBankTotal(newBankTotal);
    setTotalSavings(newTotalSavings);
    updateCurrentPeriodData({ transactions: updatedTransactions, bankTotal: newBankTotal, totalSavings: newTotalSavings });
  };

  const startEditTransaction = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setTxAmount(String(tx.amount));
    setTxDescription(tx.description);
    setTxMethod(tx.method);
    setTxCategory(tx.category ?? "necessary");
    setTxCardId(tx.cardId ?? "");
    setTxBankCategory(tx.bankCategory ?? "transfer");
    setTxSavingsPercent(
      tx.savingsAmount && tx.amount > 0
        ? String(Math.round((tx.savingsAmount / tx.amount) * 100))
        : "0"
    );
    setTxDialogOpen(true);
  };


  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Finance Manager</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
              Add credit cards and record transactions (card or debit).
            </p>
            {currentPeriod && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Current Period: <span className="font-medium">{currentPeriod.name}</span>
                <span className="ml-2 text-xs">({new Date(currentPeriod.createdAt).toLocaleDateString()})</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Management */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Periods {periods.length > 0 && `(${periods.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {periods.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-zinc-500">No periods yet</div>
                ) : (
                  <>
                    {periods
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((period) => (
                        <DropdownMenuItem
                          key={period.id}
                          onClick={() => handleSwitchPeriod(period.id)}
                          className={period.id === currentPeriod?.id ? "bg-zinc-100 dark:bg-zinc-800" : ""}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">{period.name}</span>
                            {period.id === currentPeriod?.id && (
                              <span className="text-xs text-zinc-500 ml-2">current</span>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPeriodDialogOpen(true)}>
                      Create New Period
                    </DropdownMenuItem>
                    {currentPeriod && periods.length > 1 && (
                      <DropdownMenuItem 
                        onClick={() => handleDeletePeriod(currentPeriod.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        Delete Current Period
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog
              open={cardDialogOpen}
              onOpenChange={(open) => {
                setCardDialogOpen(open);
                if (!open) resetCardForm();
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  disabled={!currentPeriod}
                  title={!currentPeriod ? "Create a period first" : undefined}
                >
                  {editingCardId ? "Edit Card" : "Add Card"}
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCardId ? "Edit Credit Card" : "Add New Credit Card"}</DialogTitle>
                  <DialogDescription>Enter the card name, limit, and color.</DialogDescription>
                </DialogHeader>

                <form className="mt-4 space-y-4" onSubmit={addCard}>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newCardName">
                      Card name
                    </label>
                    <input
                      id="newCardName"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newCardLimit">
                      Limit
                    </label>
                    <input
                      id="newCardLimit"
                      type="number"
                      min={1}
                      value={cardLimit}
                      onChange={(e) => setCardLimit(e.target.value)}
                      className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newCardColor">
                      Color
                    </label>
                    <input
                      id="newCardColor"
                      type="color"
                      value={cardColor}
                      onChange={(e) => setCardColor(e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded border-0 p-0"
                    />
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">{editingCardId ? "Update Card" : "Save Card"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={txDialogOpen}
              onOpenChange={(open) => {
                setTxDialogOpen(open);
                if (!open) {
                  setEditingTxId("");
                  setTxAmount("");
                  setTxDescription("");
                  setTxMethod("debit");
                  setTxCategory("necessary");
                  setTxCardId("");
                  setTxBankCategory("transfer");
                  setTxSavingsPercent("0");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  disabled={!currentPeriod}
                  title={!currentPeriod ? "Create a period first" : undefined}
                >
                  {editingTxId ? "Edit Transaction" : "Add Transaction"}
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTxId ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
                  <DialogDescription>
                    Record amount and whether this is a debit transaction, card purchase, or bank deposit.
                  </DialogDescription>
                </DialogHeader>

                <form className="mt-4 space-y-4" onSubmit={addTransaction}>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txAmount">
                      Amount
                    </label>
                    <input
                      id="txAmount"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txMethod">
                      Method
                    </label>
                    <select
                      id="txMethod"
                      value={txMethod}
                      onChange={(e) => setTxMethod(e.target.value as "debit" | "card" | "bank")}
                      className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="debit">Debit</option>
                      <option value="card">Credit Card</option>
                      <option value="bank">Bank Deposit</option>
                    </select>
                  </div>

                  {txMethod !== "bank" && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txCategory">
                        Category
                      </label>
                      <select
                        id="txCategory"
                        value={txCategory}
                        onChange={(e) => setTxCategory(e.target.value as "necessary" | "recreation")}
                        className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="necessary">Necessary</option>
                        <option value="recreation">Recreation</option>
                      </select>
                    </div>
                  )}

                  {txMethod === "bank" && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txBankCategory">
                        Deposit Type
                      </label>
                      <select
                        id="txBankCategory"
                        value={txBankCategory}
                        onChange={(e) => setTxBankCategory(e.target.value as "transfer" | "salary")}
                        className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="transfer">Transfer</option>
                        <option value="salary">Salary</option>
                      </select>
                    </div>
                  )}

                  {txMethod === "bank" && txBankCategory === "salary" && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txSavingsPercent">
                        Savings (%)
                      </label>
                      <input
                        id="txSavingsPercent"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={txSavingsPercent}
                        onChange={(e) => setTxSavingsPercent(e.target.value)}
                        className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        placeholder="e.g. 20"
                      />
                      {txAmount && Number(txAmount) > 0 && Number(txSavingsPercent) > 0 && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Savings: ${(Number(txAmount) * Math.min(100, Number(txSavingsPercent)) / 100).toFixed(2)} · To bank: ${(Number(txAmount) * (1 - Math.min(100, Number(txSavingsPercent)) / 100)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

                  {txMethod === "card" && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txCardId">
                        Select Card
                      </label>
                      <select
                        id="txCardId"
                        value={txCardId}
                        onChange={(e) => setTxCardId(e.target.value)}
                        className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        required
                      >
                        <option value="">Choose a card</option>
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txDescription">
                      Description
                    </label>
                    <input
                      id="txDescription"
                      type="text"
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                      className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="e.g. Grocery, utilities, refund"
                    />
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">{editingTxId ? "Update Transaction" : "Save Transaction"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button onClick={onLogout} variant="destructive">
              Log out
            </Button>
          </div>
        </div>

        {!currentPeriod ? (
          <Empty className="mt-8 border border-dashed border-zinc-300 bg-zinc-50 py-12 dark:border-zinc-700 dark:bg-zinc-900/40">
            <EmptyHeader>
              <EmptyTitle className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                Welcome to Finance Manager
              </EmptyTitle>
              <EmptyDescription className="text-zinc-500 dark:text-zinc-400">
                Create your first financial period to start tracking transactions.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setPeriodDialogOpen(true)} size="lg">
                Create Your First Period
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="lg:order-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 h-[73vh] overflow-y-auto">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Transactions</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Showing {totalTx === 0 ? 0 : pageStartIndex + 1}–{pageEndIndex} of {totalTx}
                </p>
              </div>
              <div className="w-full md:w-auto">
                <input
                  id="txSearch"
                  value={txSearch}
                  onChange={(e) => {
                    setTxSearch(e.target.value);
                    setTxPage(1);
                  }}
                  placeholder="Search transactions"
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={showDebit}
                    onCheckedChange={(checked) => {
                      setShowDebit(Boolean(checked));
                      setTxPage(1);
                    }}
                  />
                  <label className="text-sm text-zinc-700 dark:text-zinc-300">Debit</label>
                </div>
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={showBank}
                    onCheckedChange={(checked) => {
                      setShowBank(Boolean(checked));
                      setTxPage(1);
                    }}
                  />
                  <label className="text-sm text-zinc-700 dark:text-zinc-300">Bank</label>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                      Credit cards
                    </button>
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
                            setVisibleCardIds((prev) => ({
                              ...prev,
                              [card.id]: Boolean(checked),
                            }));
                            setTxPage(1);
                          }}
                        >
                          {card.name}
                        </DropdownMenuCheckboxItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="txSortBy" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Sort by</label>
                <select
                  id="txSortBy"
                  value={txSortBy}
                  onChange={(e) => {
                    setTxSortBy(e.target.value as "date" | "amount" | "method");
                    setTxPage(1);
                  }}
                  className="rounded border p-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="method">Method</option>
                </select>
                <select
                  id="txSortOrder"
                  value={txSortOrder}
                  onChange={(e) => {
                    setTxSortOrder(e.target.value as "asc" | "desc");
                    setTxPage(1);
                  }}
                  className="rounded border p-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>

                <div className="sm:hidden">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          aria-disabled={effectiveTxPage <= 1}
                          className={effectiveTxPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            if (effectiveTxPage <= 1) return;
                            setTxPage((prev) => Math.max(1, prev - 1));
                          }}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="px-2 text-sm text-zinc-600 dark:text-zinc-300">
                          {effectiveTxPage} / {totalPages}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          aria-disabled={effectiveTxPage >= totalPages}
                          className={effectiveTxPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            if (effectiveTxPage >= totalPages) return;
                            setTxPage((prev) => Math.min(totalPages, prev + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
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
                            setTxPage((prev) => Math.max(1, prev - 1));
                          }}
                        />
                      </PaginationItem>
                      {visiblePageNumbers.map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={page === effectiveTxPage}
                            onClick={() => setTxPage(page)}
                          >
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
                            setTxPage((prev) => Math.min(totalPages, prev + 1));
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
              <>
                <ul className="space-y-3">
                {pagedTransactions.map((tx) => {
                  const txCard = tx.method === "card" ? cards.find((card) => card.id === tx.cardId) : undefined;
                  const txBorderColor = txCard?.color ?? "";
                  const txCategoryLabel = tx.category === "recreation" ? "Recreation" : "Necessary";

                  return (
                    <li
                      key={tx.id}
                      className="rounded-lg border-2 border-zinc-200 p-3 dark:border-zinc-700"
                      style={tx.method === "card" && txBorderColor ? { borderColor: txBorderColor } : undefined}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-zinc-800 dark:text-zinc-100">
                            {tx.description || "Transaction"}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {tx.method === "debit" ? "Payment: Debit" : tx.method === "bank" ? `Bank Deposit${tx.bankCategory ? ` (${tx.bankCategory === "salary" ? "Salary" : "Transfer"})` : ""}` : `Payment: Card (${tx.cardName})`}
                            </p>
                            {tx.method !== "bank" && tx.category && (
                              <Badge variant={tx.category === "recreation" ? "outline" : "secondary"}>
                                {txCategoryLabel}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {new Date(tx.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {tx.method === "bank" && tx.savingsAmount && tx.savingsAmount > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="cursor-default text-lg font-bold text-zinc-900 dark:text-zinc-100">${tx.amount.toFixed(2)}</p>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  Savings: ${tx.savingsAmount.toFixed(2)} · To bank: ${(tx.amount - tx.savingsAmount).toFixed(2)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">${tx.amount.toFixed(2)}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditTransaction(tx)}
                              className="rounded bg-white px-2 py-1 text-xs font-medium text-zinc-900"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTransaction(tx.id)}
                              className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>


              </>
            )}
          </section>

          <aside className="lg:order-1 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800 h-[73vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Bank Account</h2>
              <Button variant="outline" size="sm" onClick={() => setBankSummaryDialogOpen(true)}>
                Summary
              </Button>
            </div>
            <div
              className="mb-4 rounded-lg border  bg-white p-3 dark:bg-zinc-700"
              style={{
                borderColor: bankTotal < 0 ? "#ef4444" : "#d4d4d8",
                borderWidth: bankTotal < 0 ? "2px" : "1px",
              }}
            >
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Total Balance</p>
              <p className={`text-2xl font-bold ${ bankTotal < 0 ? "text-red-500" : "text-zinc-900 dark:text-zinc-100"}`}>${bankTotal.toFixed(2)}</p>
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
                  <EmptyDescription className="text-zinc-500 dark:text-zinc-400">
                    Click Add Card to begin.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                {cards.map((card) => {
                  const charged = transactions
                    .filter((tx) => tx.method === "card" && tx.cardId === card.id)
                    .reduce((sum, tx) => sum + tx.amount, 0);

                  return (
                    <div key={card.id} className="rounded-lg border border-zinc-300 p-3" style={{ backgroundColor: card.color, color: "white" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold">{card.name}</h3>
                          <p className="text-sm opacity-95">Limit: ${card.limit.toLocaleString()}</p>
                          <p className="text-sm opacity-90">Spent: ${charged.toFixed(2)}</p>
                          <p className="text-sm opacity-90">Utilization: {(card.limit > 0 ? Math.min(100, (charged / card.limit) * 100).toFixed(1) : "0")}%</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEditCard(card)}
                            className="rounded bg-white px-2 py-1 text-xs font-medium text-zinc-900"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCardToDelete(card);
                              setCardDeleteDialogOpen(true);
                            }}
                            disabled={transactions.some((tx) => tx.cardId === card.id)}
                            className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            title={transactions.some((tx) => tx.cardId === card.id) ? "Cannot delete card with existing transactions" : ""}
                          >
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
        </div>
        )}
      </div>

      {/* Period Creation Dialog - available even when no periods exist */}
      <Dialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Period</DialogTitle>
            <DialogDescription>Enter a name for the new financial period.</DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleCreatePeriod}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newPeriodName">
                Period name
              </label>
              <input
                id="newPeriodName"
                value={newPeriodName}
                onChange={(e) => setNewPeriodName(e.target.value)}
                className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder={`e.g. January ${new Date().getFullYear()}, Q1 ${new Date().getFullYear()}`}
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Create Period</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Summary Dialog */}
      <Dialog open={bankSummaryDialogOpen} onOpenChange={setBankSummaryDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Transaction Summary</DialogTitle>
            <DialogDescription>Overview of deposits and spending by category for this period.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-2">
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Delete Confirmation Dialog */}
      <Dialog
        open={cardDeleteDialogOpen}
        onOpenChange={setCardDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Credit Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the credit card &quot;{cardToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (cardToDelete) {
                  deleteCard(cardToDelete.id);
                }
                setCardDeleteDialogOpen(false);
                setCardToDelete(null);
              }}
            >
              Delete Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}