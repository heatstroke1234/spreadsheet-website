import { useEffect, useState, SetStateAction } from "react";
import { Period, Transaction, CreditCard } from "../types";

type UsePeriodDataParams = {
  currentPeriod?: Period;
  onUpdatePeriodData: (
    periodId: string,
    data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
  ) => void;
};

export function usePeriodData({ currentPeriod, onUpdatePeriodData }: UsePeriodDataParams) {
  const [periodState, setPeriodState] = useState({
    transactions: currentPeriod?.transactions || ([] as Transaction[]),
    visibleCardIds: currentPeriod?.visibleCardIds || ({} as Record<string, boolean>),
    bankTotal: currentPeriod?.bankTotal || 0,
    totalSavings: currentPeriod?.totalSavings || 0,
    cards: currentPeriod?.cards || ([] as CreditCard[]),
  });

  useEffect(() => {
    if (currentPeriod) {
      queueMicrotask(() => {
        setPeriodState({
          transactions: currentPeriod.transactions,
          visibleCardIds: currentPeriod.visibleCardIds,
          bankTotal: currentPeriod.bankTotal,
          totalSavings: currentPeriod.totalSavings || 0,
          cards: currentPeriod.cards,
        });
      });
    }
  }, [currentPeriod]);

  const setTransactions = (transactions: SetStateAction<Transaction[]>) => {
    setPeriodState((prev) => ({
      ...prev,
      transactions: typeof transactions === "function" ? transactions(prev.transactions) : transactions,
    }));
  };

  const setVisibleCardIds = (visibleCardIds: SetStateAction<Record<string, boolean>>) => {
    setPeriodState((prev) => ({
      ...prev,
      visibleCardIds:
        typeof visibleCardIds === "function" ? visibleCardIds(prev.visibleCardIds) : visibleCardIds,
    }));
  };

  const setBankTotal = (bankTotal: SetStateAction<number>) => {
    setPeriodState((prev) => ({
      ...prev,
      bankTotal: typeof bankTotal === "function" ? bankTotal(prev.bankTotal) : bankTotal,
    }));
  };

  const setTotalSavings = (totalSavings: SetStateAction<number>) => {
    setPeriodState((prev) => ({
      ...prev,
      totalSavings: typeof totalSavings === "function" ? totalSavings(prev.totalSavings) : totalSavings,
    }));
  };

  const setCards = (cards: SetStateAction<CreditCard[]>) => {
    setPeriodState((prev) => ({
      ...prev,
      cards: typeof cards === "function" ? cards(prev.cards) : cards,
    }));
  };

  const updateCurrentPeriodData = (
    data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
  ) => {
    if (currentPeriod) {
      onUpdatePeriodData(currentPeriod.id, data);
    }
  };

  return {
    transactions: periodState.transactions,
    setTransactions,
    visibleCardIds: periodState.visibleCardIds,
    setVisibleCardIds,
    bankTotal: periodState.bankTotal,
    setBankTotal,
    totalSavings: periodState.totalSavings,
    setTotalSavings,
    cards: periodState.cards,
    setCards,
    updateCurrentPeriodData,
  };
}
