"use client";

import { useState, FormEvent } from "react";
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
} from "@/components/ui/dropdown-menu";

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
  cardId?: string;
  cardName: string;
  description: string;
  createdAt: string;
};

type TransactionManagerProps = {
  onLogout: () => void;
};

export function TransactionManager({ onLogout }: TransactionManagerProps) {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardName, setCardName] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [cardColor, setCardColor] = useState("#0ea5e9");
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string>("");

  const [bankTotal, setBankTotal] = useState(0);
  const [bankAmount, setBankAmount] = useState("");
  const [bankDescription, setBankDescription] = useState("");
  const [bankDialogOpen, setBankDialogOpen] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txMethod, setTxMethod] = useState<"debit" | "card" | "bank">("debit");
  const [txCardId, setTxCardId] = useState<string>("");
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string>("");

  const [showDebit, setShowDebit] = useState(true);
  const [showBank, setShowBank] = useState(true);
  const [visibleCardIds, setVisibleCardIds] = useState<Record<string, boolean>>({});

  const [txPage, setTxPage] = useState(1);
  const [txSortBy, setTxSortBy] = useState<"date" | "amount" | "method">("date");
  const [txSortOrder, setTxSortOrder] = useState<"asc" | "desc">("desc");
  const txPageSize = 5;

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
    if (tx.method === "debit") return showDebit;
    if (tx.method === "card") {
      return tx.cardId ? visibleCardIds[tx.cardId] ?? true : true;
    }
    if (tx.method === "bank") return showBank;
    return false;
  });

  const totalTx = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalTx / txPageSize));
  const effectiveTxPage = Math.min(txPage, totalPages);

  const pageStartIndex = (effectiveTxPage - 1) * txPageSize;
  const pageEndIndex = Math.min(totalTx, pageStartIndex + txPageSize);
  const pagedTransactions = filteredTransactions.slice(pageStartIndex, pageEndIndex);

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
      setCards((prev) =>
        prev.map((card) =>
          card.id === editingCardId
            ? { ...card, name: trimmedName, limit: amount, color: cardColor }
            : card
        )
      );
      setEditingCardId("");
    } else {
      const newCard: CreditCard = {
        id: crypto.randomUUID(),
        name: trimmedName,
        limit: amount,
        color: cardColor,
      };
      setCards((prev) => [newCard, ...prev]);
      setVisibleCardIds((prev) => ({ ...prev, [newCard.id]: true }));
    }

    resetCardForm();
    setCardDialogOpen(false);
  };

  const deleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((card) => card.id !== cardId));
    setTransactions((prev) => prev.filter((tx) => tx.cardId !== cardId));
    setVisibleCardIds((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const startEditCard = (card: CreditCard) => {
    setCardName(card.name);
    setCardLimit(String(card.limit));
    setCardColor(card.color);
    setEditingCardId(card.id);
    setCardDialogOpen(true);
  };

  const updateBankTotal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(bankAmount);
    if (!Number.isNaN(amount)) {
      setBankTotal(prev => prev + amount);
      
      // Add bank deposit transaction to the transactions list
      const newBankTransaction: Transaction = {
        id: crypto.randomUUID(),
        amount,
        method: "bank",
        cardName: "Bank Deposit",
        description: bankDescription || "Bank deposit",
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newBankTransaction, ...prev]);
      
      setBankAmount("");
      setBankDescription("");
      setBankDialogOpen(false);
    }
  };

  const addTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(txAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const card = cards.find((card) => card.id === txCardId);
    const cardNameForTx = txMethod === "debit" ? "Debit" : txMethod === "bank" ? "Bank Deposit" : card?.name || "Unknown card";

    if (editingTxId) {
      // Find the existing transaction to calculate balance changes
      const existingTx = transactions.find(tx => tx.id === editingTxId);
      
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === editingTxId
            ? {
                ...tx,
                amount,
                method: txMethod,
                cardId: txMethod === "card" ? txCardId : undefined,
                cardName: cardNameForTx,
                description: txDescription,
              }
            : tx
        )
      );

      // Update bank balance based on transaction changes
      if (existingTx) {
        // Reverse the effect of the old transaction
        if (existingTx.method === "bank") {
          setBankTotal(prev => prev - existingTx.amount);
        } else if (existingTx.method === "debit") {
          setBankTotal(prev => prev + existingTx.amount);
        } else if (existingTx.method === "card") {
          setBankTotal(prev => prev + existingTx.amount);
        }

        // Apply the effect of the new transaction
        if (txMethod === "bank") {
          setBankTotal(prev => prev + amount);
        } else if (txMethod === "debit") {
          setBankTotal(prev => prev - amount);
        } else if (txMethod === "card") {
          setBankTotal(prev => prev - amount);
        }
      }

      setEditingTxId("");
    } else {
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        amount,
        method: txMethod,
        cardId: txMethod === "card" ? txCardId : undefined,
        cardName: cardNameForTx,
        description: txDescription,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTransaction, ...prev]);

      // Update bank balance for new transactions
      if (txMethod === "debit") {
        setBankTotal(prev => prev - amount);
      } else if (txMethod === "card") {
        setBankTotal(prev => prev - amount);
      } else if (txMethod === "bank") {
        setBankTotal(prev => prev + amount);
      }
    }

    setTxAmount("");
    setTxDescription("");
    setTxCardId("");
    setTxMethod("debit");
    setTxDialogOpen(false);
  };

  const deleteTransaction = (txId: string) => {
    const txToDelete = transactions.find(tx => tx.id === txId);
    setTransactions((prev) => prev.filter((tx) => tx.id !== txId));

    // Update bank balance when deleting transactions
    if (txToDelete) {
      if (txToDelete.method === "bank") {
        setBankTotal(prev => prev - txToDelete.amount);
      } else if (txToDelete.method === "debit") {
        setBankTotal(prev => prev + txToDelete.amount);
      } else if (txToDelete.method === "card") {
        setBankTotal(prev => prev + txToDelete.amount);
      }
    }
  };

  const startEditTransaction = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setTxAmount(String(tx.amount));
    setTxDescription(tx.description);
    setTxMethod(tx.method);
    setTxCardId(tx.cardId ?? "");
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Dialog
              open={cardDialogOpen}
              onOpenChange={(open) => {
                setCardDialogOpen(open);
                if (!open) resetCardForm();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="secondary">{editingCardId ? "Edit Card" : "Add Card"}</Button>
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
                  setTxCardId("");
                  setBankAmount("");
                  setBankDescription("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="secondary">{editingTxId ? "Edit Transaction" : "Add Transaction"}</Button>
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

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Bank Account</h2>
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
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No cards yet. Add one from the top-left button.</p>
            ) : (
              <div className="max-h-[32vh] overflow-y-auto space-y-3">
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
                            onClick={() => deleteCard(card.id)}
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

          <section className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 max-h-[64vh] overflow-y-auto">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Transactions</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Showing {totalTx === 0 ? 0 : pageStartIndex + 1}–{pageEndIndex} of {totalTx}
                </p>
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
              </div>
            </div>

            {totalTx === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No transactions yet. Click Add Transaction to begin.</p>
            ) : (
              <>
                <ul className="space-y-3">
                {pagedTransactions.map((tx) => {
                  const txCard = tx.method === "card" ? cards.find((card) => card.id === tx.cardId) : undefined;
                  const txBorderColor = txCard?.color ?? "";

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
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {tx.method === "debit" ? "Payment: Debit" : tx.method === "bank" ? "Bank Deposit" : `Payment: Card (${tx.cardName})`}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">${tx.amount.toFixed(2)}</p>
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

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Page {effectiveTxPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTxPage((prev) => Math.max(1, prev - 1))}
                      disabled={effectiveTxPage <= 1}
                      className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-700"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={effectiveTxPage >= totalPages}
                      className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}