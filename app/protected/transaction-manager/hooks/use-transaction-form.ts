import { FormEvent, useState } from "react";
import { CreditCard, Period, Transaction } from "../types";

type UpdatePeriodData = (
  data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
) => void;

type CreateTransaction = (periodId: string, transaction: Transaction) => Promise<Transaction>;
type UpdateTransaction = (transactionId: string, transaction: Partial<Transaction>) => Promise<Transaction>;
type DeleteTransaction = (transactionId: string) => Promise<void>;
type UpdatePeriodTotals = (periodId: string, totals: { bankTotal?: number; totalSavings?: number }) => Promise<void>;

type UseTransactionFormParams = {
  cards: CreditCard[];
  transactions: Transaction[];
  bankTotal: number;
  totalSavings: number;
  setTransactions: (transactions: Transaction[]) => void;
  setBankTotal: (bankTotal: number) => void;
  setTotalSavings: (totalSavings: number) => void;
  updateCurrentPeriodData: UpdatePeriodData;
  periodId?: string;
  createTransaction?: CreateTransaction;
  updateTransaction?: UpdateTransaction;
  deleteTransaction?: DeleteTransaction;
  updatePeriodTotals?: UpdatePeriodTotals;
};

export function useTransactionForm({
  cards,
  transactions,
  bankTotal,
  totalSavings,
  setTransactions,
  setBankTotal,
  setTotalSavings,
  updateCurrentPeriodData,
  periodId,
  createTransaction,
  updateTransaction,
  deleteTransaction: deleteTransactionFn,
  updatePeriodTotals,
}: UseTransactionFormParams) {
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txMethod, setTxMethod] = useState<"debit" | "card" | "bank">("debit");
  const [txCategory, setTxCategory] = useState<"necessary" | "recreation">("necessary");
  const [txBankCategory, setTxBankCategory] = useState<"transfer" | "salary">("transfer");
  const [txSavingsPercent, setTxSavingsPercent] = useState("0");
  const [txCardId, setTxCardId] = useState<string>("");
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingTxIds, setDeletingTxIds] = useState<Set<string>>(new Set());

  const resetTransactionForm = () => {
    setEditingTxId("");
    setTxAmount("");
    setTxDescription("");
    setTxMethod("debit");
    setTxCategory("necessary");
    setTxCardId("");
    setTxBankCategory("transfer");
    setTxSavingsPercent("0");
  };

  const onTxDialogOpenChange = (open: boolean) => {
    setTxDialogOpen(open);
    if (!open) {
      resetTransactionForm();
    }
  };

  const addTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const amount = Number(txAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setIsLoading(false);
      return;
    }

    try {
      const card = cards.find((item) => item.id === txCardId);
      const cardNameForTx =
        txMethod === "debit" ? "Debit" : txMethod === "bank" ? "Bank Deposit" : card?.name || "Unknown card";

      const savingsAmountForTx =
        txMethod === "bank" && txBankCategory === "salary"
          ? amount * (Math.max(0, Math.min(100, Number(txSavingsPercent) || 0)) / 100)
          : 0;

      let updatedTransactions: Transaction[];
      let newBankTotal = bankTotal;
      let newTotalSavings = totalSavings;

      if (editingTxId) {
        const existingTx = transactions.find((tx) => tx.id === editingTxId);

        const updatedTx: Transaction = {
          ...existingTx!,
          amount,
          method: txMethod,
          category: txMethod === "bank" ? undefined : txCategory,
          bankCategory: txMethod === "bank" ? txBankCategory : undefined,
          savingsAmount: savingsAmountForTx > 0 ? savingsAmountForTx : undefined,
          cardId: txMethod === "card" ? txCardId : undefined,
          cardName: cardNameForTx,
          description: txDescription,
        };

        // Use granular update if available
        if (updateTransaction) {
          try {
            const result = await updateTransaction(editingTxId, {
              amount,
              method: txMethod,
              category: txMethod === "bank" ? undefined : txCategory,
              bankCategory: txMethod === "bank" ? txBankCategory : undefined,
              savingsAmount: savingsAmountForTx > 0 ? savingsAmountForTx : undefined,
              cardId: txMethod === "card" ? txCardId : undefined,
              cardName: cardNameForTx,
              description: txDescription,
            });
            updatedTransactions = transactions.map((tx) =>
              tx.id === editingTxId ? { ...tx, ...result } : tx
            );
          } catch (error) {
            console.error("Failed to update transaction:", error);
            updatedTransactions = transactions.map((tx) =>
              tx.id === editingTxId ? updatedTx : tx
            );
          }
        } else {
          updatedTransactions = transactions.map((tx) =>
            tx.id === editingTxId ? updatedTx : tx
          );
        }

        if (existingTx) {
          if (existingTx.method === "bank") {
            const oldSavings = existingTx.savingsAmount ?? 0;
            newBankTotal -= existingTx.amount - oldSavings;
            newTotalSavings -= oldSavings;
          } else if (existingTx.method === "debit") {
            newBankTotal += existingTx.amount;
          } else if (existingTx.method === "card") {
            newBankTotal += existingTx.amount;
          }

          if (txMethod === "bank") {
            newBankTotal += amount - savingsAmountForTx;
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

        // Use granular create if available
        if (createTransaction && periodId) {
          try {
            const created = await createTransaction(periodId, newTransaction);
            updatedTransactions = [created, ...transactions];
          } catch (error) {
            console.error("Failed to create transaction:", error);
            updatedTransactions = [newTransaction, ...transactions];
          }
        } else {
          updatedTransactions = [newTransaction, ...transactions];
        }

        if (txMethod === "debit") {
          newBankTotal -= amount;
        } else if (txMethod === "card") {
          newBankTotal -= amount;
        } else if (txMethod === "bank") {
          newBankTotal += amount - savingsAmountForTx;
          newTotalSavings += savingsAmountForTx;
        }
      }

      setTransactions(updatedTransactions);
      setBankTotal(newBankTotal);
      setTotalSavings(newTotalSavings);
      
      // Use granular totals update if available
      if (updatePeriodTotals && periodId) {
        try {
          await updatePeriodTotals(periodId, { bankTotal: newBankTotal, totalSavings: newTotalSavings });
        } catch (error) {
          console.error("Failed to update period totals:", error);
          updateCurrentPeriodData({
            transactions: updatedTransactions,
            bankTotal: newBankTotal,
            totalSavings: newTotalSavings,
          });
        }
      } else {
        updateCurrentPeriodData({
          transactions: updatedTransactions,
          bankTotal: newBankTotal,
          totalSavings: newTotalSavings,
        });
      }

      setTxAmount("");
      setTxDescription("");
      setTxCardId("");
      setTxMethod("debit");
      setTxCategory("necessary");
      setTxBankCategory("transfer");
      setTxSavingsPercent("0");
      setTxDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
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
      tx.savingsAmount && tx.amount > 0 ? String(Math.round((tx.savingsAmount / tx.amount) * 100)) : "0"
    );
    setTxDialogOpen(true);
  };

  // Expose delete function for use by parent component
  const deleteTransaction = async (txId: string) => {
    setDeletingTxIds((prev) => new Set(prev).add(txId));
    try {
      if (deleteTransactionFn) {
        try {
          await deleteTransactionFn(txId);
        } catch (error) {
          console.error("Failed to delete transaction:", error);
          // Fallback to local state
          const txToDelete = transactions.find((tx) => tx.id === txId);
          let newBankTotal = bankTotal;
          let newTotalSavings = totalSavings;

          if (txToDelete) {
            if (txToDelete.method === "bank") {
              newBankTotal += txToDelete.amount - (txToDelete.savingsAmount ?? 0);
              newTotalSavings -= txToDelete.savingsAmount ?? 0;
            } else if (txToDelete.method === "debit") {
              newBankTotal += txToDelete.amount;
            } else if (txToDelete.method === "card") {
              newBankTotal += txToDelete.amount;
            }
          }

          const updatedTransactions = transactions.filter((tx) => tx.id !== txId);
          setTransactions(updatedTransactions);
          setBankTotal(newBankTotal);
          setTotalSavings(newTotalSavings);
          updateCurrentPeriodData({
            transactions: updatedTransactions,
            bankTotal: newBankTotal,
            totalSavings: newTotalSavings,
          });
        }
      }
    } finally {
      setDeletingTxIds((prev) => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
    }
  };

  return {
    txAmount,
    setTxAmount,
    txDescription,
    setTxDescription,
    txMethod,
    setTxMethod,
    txCategory,
    setTxCategory,
    txBankCategory,
    setTxBankCategory,
    txSavingsPercent,
    setTxSavingsPercent,
    txCardId,
    setTxCardId,
    txDialogOpen,
    editingTxId,
    addTransaction,
    startEditTransaction,
    onTxDialogOpenChange,
    deleteTransaction,
    isLoading,
    deletingTxIds,
  };
}
