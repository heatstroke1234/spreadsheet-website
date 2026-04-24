"use client";

import { useState, useEffect, useCallback } from "react";
import { TransactionManager } from "./transaction-manager";
import { createClient } from "@/lib/supabase/client";
import { createPeriodService } from "./transaction-manager/periodService";
import type { CreditCard, Transaction } from "./transaction-manager/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

export function PeriodManager() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriodId, setCurrentPeriodId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Create service lazily once
  const [periodService] = useState(() => createPeriodService(createClient()));

  // Period switching warning dialog state
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [pendingPeriodId, setPendingPeriodId] = useState<string>("");

  // Period deletion confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeletePeriodId, setPendingDeletePeriodId] = useState<string>("");

  // Load periods from Supabase on mount
  useEffect(() => {
    // Load periods from Supabase
    periodService.listPeriods().then((loadedPeriods) => {
      setPeriods(loadedPeriods);
      if (loadedPeriods.length > 0) {
        const mostRecent = loadedPeriods.reduce((latest, current) =>
          new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
        );
        setCurrentPeriodId(mostRecent.id);
      }
      setIsLoading(false);
    }).catch((error) => {
      console.error("Failed to load periods:", error);
      setIsLoading(false);
    });
  }, [periodService]);

  const createNewPeriod = useCallback(async (name: string) => {
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

    try {
      const newPeriod = await periodService.onCreatePeriod(name.trim());
      
      // If there are copied cards or rollover transactions, update the period data
      if (copiedCards.length > 0 || rolloverTransactions.length > 0) {
        const updatedPeriod = await periodService.onUpdatePeriodData(newPeriod.id, {
          cards: copiedCards,
          transactions: rolloverTransactions,
          bankTotal: initialBankTotal,
          totalSavings: 0,
          visibleCardIds,
        });
        
        setPeriods(prev => [...prev, updatedPeriod]);
        setCurrentPeriodId(updatedPeriod.id);
      } else {
        setPeriods(prev => [...prev, newPeriod]);
        setCurrentPeriodId(newPeriod.id);
      }
    } catch (error) {
      console.error("Failed to create period:", error);
    }
  }, [periodService, periods, currentPeriodId]);

  const switchPeriod = useCallback(async (periodId: string) => {
    const targetPeriod = periods.find(p => p.id === periodId);
    if (!targetPeriod) return;

    setPendingPeriodId(periodId);
    setSwitchDialogOpen(true);
  }, [periods]);

  const confirmSwitchPeriod = useCallback(async () => {
    if (!pendingPeriodId) {
      setSwitchDialogOpen(false);
      return;
    }

    try {
      const period = await periodService.onSwitchPeriod(pendingPeriodId);
      if (period) {
        setCurrentPeriodId(pendingPeriodId);
      }
    } catch (error) {
      console.error("Failed to switch period:", error);
    }

    setPendingPeriodId("");
    setSwitchDialogOpen(false);
  }, [periodService, pendingPeriodId]);

  const cancelSwitchPeriod = useCallback(() => {
    setPendingPeriodId("");
    setSwitchDialogOpen(false);
  }, []);

  const updatePeriodData = useCallback(async (
    periodId: string, 
    data: Partial<Pick<Period, 'cards' | 'transactions' | 'bankTotal' | 'totalSavings' | 'visibleCardIds'>>
  ) => {
    try {
      const updatedPeriod = await periodService.onUpdatePeriodData(periodId, data);
      setPeriods(prev => prev.map(period =>
        period.id === periodId
          ? updatedPeriod
          : period
      ));
    } catch (error) {
      console.error("Failed to update period data:", error);
    }
  }, [periodService]);

  const deletePeriod = useCallback((periodId: string) => {
    setPendingDeletePeriodId(periodId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeletePeriod = useCallback(async () => {
    if (!pendingDeletePeriodId) {
      setDeleteDialogOpen(false);
      return;
    }

    try {
      await periodService.onDeletePeriod(pendingDeletePeriodId);
      
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
    } catch (error) {
      console.error("Failed to delete period:", error);
    }

    setPendingDeletePeriodId("");
    setDeleteDialogOpen(false);
  }, [periodService, pendingDeletePeriodId, periods, currentPeriodId]);

  const cancelDeletePeriod = useCallback(() => {
    setPendingDeletePeriodId("");
    setDeleteDialogOpen(false);
  }, []);

  const currentPeriod = periods.find(p => p.id === currentPeriodId);
  const pendingPeriod = periods.find(p => p.id === pendingPeriodId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading periods...</p>
      </div>
    );
  }

  return (
    <>
      <TransactionManager
        periods={periods}
        currentPeriod={currentPeriod}
        onCreatePeriod={createNewPeriod}
        onSwitchPeriod={switchPeriod}
        onUpdatePeriodData={updatePeriodData}
        onDeletePeriod={deletePeriod}
        createCard={periodService ? ((periodId: string, card: CreditCard) => periodService.createCard(periodId, card)) : undefined}
        updateCard={periodService ? ((cardId: string, card: Partial<CreditCard>) => periodService.updateCard(cardId, card)) : undefined}
        deleteCard={periodService ? ((cardId: string) => periodService.deleteCard(cardId)) : undefined}
        createTransaction={periodService ? ((periodId: string, tx: Transaction) => periodService.createTransaction(periodId, tx)) : undefined}
        updateTransaction={periodService ? ((txId: string, tx: Partial<Transaction>) => periodService.updateTransaction(txId, tx)) : undefined}
        deleteTransaction={periodService ? ((txId: string) => periodService.deleteTransaction(txId)) : undefined}
        updatePeriodTotals={periodService ? ((periodId: string, totals: { bankTotal?: number; totalSavings?: number }) => periodService.updatePeriodTotals(periodId, totals)) : undefined}
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
