"use client";

import { useState, useEffect } from "react";
import { TransactionManager } from "./transaction-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PERIODS_STORAGE_KEY = "finance-periods";

type Period = {
  id: string;
  name: string;
  createdAt: string;
  cards: {
    id: string;
    name: string;
    limit: number;
    color: string;
  }[];
  transactions: {
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
  }[];
  bankTotal: number;
  totalSavings: number;
  visibleCardIds: Record<string, boolean>;
};

export function PeriodManager({ onLogout }: { onLogout: () => void }) {
  const [periods, setPeriods] = useState<Period[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(PERIODS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Failed to parse stored periods:", error);
        return [];
      }
    }
    return [];
  });

  const [currentPeriodId, setCurrentPeriodId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const stored = window.localStorage.getItem(PERIODS_STORAGE_KEY);
    if (stored) {
      try {
        const parsedPeriods: Period[] = JSON.parse(stored);
        if (parsedPeriods.length > 0) {
          const mostRecent = parsedPeriods.reduce((latest, current) =>
            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
          );
          return mostRecent.id;
        }
      } catch (error) {
        console.error("Failed to parse stored periods:", error);
      }
    }
    return "";
  });

  // Period switching warning dialog state
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [pendingPeriodId, setPendingPeriodId] = useState<string>("");

  // Period deletion confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeletePeriodId, setPendingDeletePeriodId] = useState<string>("");

  // Save periods to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && periods.length > 0) {
      window.localStorage.setItem(PERIODS_STORAGE_KEY, JSON.stringify(periods));
    }
  }, [periods]);

  const createNewPeriod = (name: string) => {
    const currentPeriod = periods.find(p => p.id === currentPeriodId);

    const copiedCards = currentPeriod ? [...currentPeriod.cards] : [];

    const rolloverTransactions: Period['transactions'] = [];
    let initialBankTotal = 0;

    if (currentPeriod && currentPeriod.bankTotal > 0) {
      const rolloverTransaction = {
        id: crypto.randomUUID(),
        amount: currentPeriod.bankTotal,
        method: "bank" as const,
        cardName: "Bank Deposit",
        description: `Rollover from ${currentPeriod.name}`,
        createdAt: new Date().toISOString(),
      };
      rolloverTransactions.push(rolloverTransaction);
      initialBankTotal = currentPeriod.bankTotal;
    }

    const visibleCardIds: Record<string, boolean> = {};
    copiedCards.forEach(card => {
      visibleCardIds[card.id] = true;
    });

    const newPeriod: Period = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      cards: copiedCards,
      transactions: rolloverTransactions,
      bankTotal: initialBankTotal,
      totalSavings: 0,
      visibleCardIds,
    };

    setPeriods(prev => [...prev, newPeriod]);
    setCurrentPeriodId(newPeriod.id);
  };

  const switchPeriod = (periodId: string) => {
    const targetPeriod = periods.find(p => p.id === periodId);
    if (!targetPeriod) return;

    setPendingPeriodId(periodId);
    setSwitchDialogOpen(true);
  };

  const confirmSwitchPeriod = () => {
    if (pendingPeriodId) {
      setCurrentPeriodId(pendingPeriodId);
      setPendingPeriodId("");
      setSwitchDialogOpen(false);
    }
  };

  const cancelSwitchPeriod = () => {
    setPendingPeriodId("");
    setSwitchDialogOpen(false);
  };

  const updatePeriodData = (periodId: string, data: Partial<Pick<Period, 'cards' | 'transactions' | 'bankTotal' | 'totalSavings' | 'visibleCardIds'>>) => {
    setPeriods(prev => prev.map(period =>
      period.id === periodId
        ? { ...period, ...data }
        : period
    ));
  };

  const deletePeriod = (periodId: string) => {
    setPendingDeletePeriodId(periodId);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePeriod = () => {
    if (pendingDeletePeriodId) {
      setPeriods(prev => prev.filter(p => p.id !== pendingDeletePeriodId));
      if (currentPeriodId === pendingDeletePeriodId) {
        const remaining = periods.filter(p => p.id !== pendingDeletePeriodId);
        if (remaining.length > 0) {
          const mostRecent = remaining.reduce((latest, current) =>
            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
          );
          setCurrentPeriodId(mostRecent.id);
        } else {
          setCurrentPeriodId("");
        }
      }
      setPendingDeletePeriodId("");
      setDeleteDialogOpen(false);
    }
  };

  const cancelDeletePeriod = () => {
    setPendingDeletePeriodId("");
    setDeleteDialogOpen(false);
  };

  const currentPeriod = periods.find(p => p.id === currentPeriodId);
  const pendingPeriod = periods.find(p => p.id === pendingPeriodId);

  return (
    <>
      <TransactionManager
        onLogout={onLogout}
        periods={periods}
        currentPeriod={currentPeriod}
        onCreatePeriod={createNewPeriod}
        onSwitchPeriod={switchPeriod}
        onUpdatePeriodData={updatePeriodData}
        onDeletePeriod={deletePeriod}
      />

      <Dialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Period</DialogTitle>
            <DialogDescription>
              Are you sure you want to switch to the &quot;{pendingPeriod?.name}&quot; period?
              <br />
              <br />
              This will load all transactions and data for that period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelSwitchPeriod}>
              Cancel
            </Button>
            <Button onClick={confirmSwitchPeriod}>
              Switch Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Period</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the &quot;{periods.find(p => p.id === pendingDeletePeriodId)?.name}&quot; period?
              <br />
              <br />
              This action cannot be undone. All transactions and data for this period will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeletePeriod}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeletePeriod}>
              Delete Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
