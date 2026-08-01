"use client";

import { useState, useEffect, useCallback } from "react";
import { LoaderCircle } from "lucide-react";
import { TransactionManager } from "./transaction-manager";
import { ChatPanel } from "./chat/chat-panel";
import { createClient } from "@/lib/supabase/client";
import { createPeriodService } from "./transaction-manager/periodService";
import type { CreditCard, Period, PeriodSummary, Transaction } from "./transaction-manager/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function mostRecent<T extends { createdAt: string }>(items: T[]): T {
  return items.reduce((latest, current) =>
    new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
  );
}

export function PeriodManager() {
  // Lightweight metadata for every period, used only to populate the period
  // switcher. Full data (cards/transactions/totals) is loaded on demand for
  // just the currently active period below.
  const [periodSummaries, setPeriodSummaries] = useState<PeriodSummary[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [isSwitchingPeriod, setIsSwitchingPeriod] = useState(false);
  const [periodService, setPeriodService] = useState<ReturnType<typeof createPeriodService> | null>(null);

  // Period switching warning dialog state
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [pendingPeriodId, setPendingPeriodId] = useState<string>("");

  // Period deletion confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeletePeriodId, setPendingDeletePeriodId] = useState<string>("");
  const [isDeletingPeriod, setIsDeletingPeriod] = useState(false);

  // Load period summaries from Supabase on mount, then hydrate only the
  // most recent period with its full data.
  useEffect(() => {
    const client = createClient();

    client.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        console.error("No authenticated user found");
        setIsLoading(false);
        return;
      }

      const service = createPeriodService(client, session.user.id);
      setPeriodService(service);

      service.listPeriodSummaries().then(async (summaries) => {
        setPeriodSummaries(summaries);
        if (summaries.length > 0) {
          const fullPeriod = await service.getPeriod(mostRecent(summaries).id);
          setCurrentPeriod(fullPeriod);
        }
        setIsLoading(false);
      }).catch((error) => {
        console.error("Failed to load periods:", error);
        setIsLoading(false);
      });
    }).catch((error) => {
      console.error("Failed to get session:", error);
      setIsLoading(false);
    });
  }, []);

  const createNewPeriod = useCallback(async (name: string) => {
    if (!periodService) return;

    const copiedCards = currentPeriod
      ? currentPeriod.cards.map(card => ({ ...card, id: crypto.randomUUID() }))
      : [];

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

      const finalPeriod = copiedCards.length > 0 || rolloverTransactions.length > 0
        ? await periodService.onUpdatePeriodData(newPeriod.id, {
            cards: copiedCards,
            transactions: rolloverTransactions,
            bankTotal: initialBankTotal,
            totalSavings: 0,
            visibleCardIds,
          })
        : newPeriod;

      setPeriodSummaries(prev => [
        { id: finalPeriod.id, name: finalPeriod.name, createdAt: finalPeriod.createdAt },
        ...prev,
      ]);
      setCurrentPeriod(finalPeriod);
    } catch (error) {
      console.error("Failed to create period:", error);
    }
  }, [periodService, currentPeriod]);

  const switchPeriod = useCallback((periodId: string) => {
    const targetPeriod = periodSummaries.find(p => p.id === periodId);
    if (!targetPeriod) return;

    setPendingPeriodId(periodId);
    setSwitchDialogOpen(true);
  }, [periodSummaries]);

  const confirmSwitchPeriod = useCallback(async () => {
    if (!periodService || !pendingPeriodId) {
      setSwitchDialogOpen(false);
      return;
    }

    setIsSwitchingPeriod(true);
    try {
      const period = await periodService.onSwitchPeriod(pendingPeriodId);
      if (period) {
        setCurrentPeriod(period);
      }
    } catch (error) {
      console.error("Failed to switch period:", error);
    }

    setIsSwitchingPeriod(false);
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
    if (!periodService) return;

    try {
      const updatedPeriod = await periodService.onUpdatePeriodData(periodId, data);
      setCurrentPeriod(prev => (prev && prev.id === periodId ? updatedPeriod : prev));
    } catch (error) {
      console.error("Failed to update period data:", error);
    }
  }, [periodService]);

  const deletePeriod = useCallback((periodId: string) => {
    setPendingDeletePeriodId(periodId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeletePeriod = useCallback(async () => {
    if (!periodService || !pendingDeletePeriodId) {
      setDeleteDialogOpen(false);
      return;
    }

    setIsDeletingPeriod(true);
    try {
      await periodService.onDeletePeriod(pendingDeletePeriodId);

      const remaining = periodSummaries.filter(p => p.id !== pendingDeletePeriodId);
      setPeriodSummaries(remaining);

      if (currentPeriod?.id === pendingDeletePeriodId) {
        if (remaining.length > 0) {
          const fullPeriod = await periodService.getPeriod(mostRecent(remaining).id);
          setCurrentPeriod(fullPeriod);
        } else {
          setCurrentPeriod(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete period:", error);
    }

    setIsDeletingPeriod(false);
    setPendingDeletePeriodId("");
    setDeleteDialogOpen(false);
  }, [periodService, pendingDeletePeriodId, periodSummaries, currentPeriod]);

  const cancelDeletePeriod = useCallback(() => {
    setPendingDeletePeriodId("");
    setDeleteDialogOpen(false);
  }, []);

  const updatePeriodTotals = useCallback(async (
    periodId: string,
    totals: { bankTotal?: number; totalSavings?: number }
  ) => {
    if (!periodService) return;
    await periodService.updatePeriodTotals(periodId, totals);
    setCurrentPeriod(prev => (prev && prev.id === periodId ? { ...prev, ...totals } : prev));
  }, [periodService]);

  const createCard = useCallback(async (periodId: string, card: CreditCard): Promise<CreditCard> => {
    if (!periodService) throw new Error("No period service");
    const created = await periodService.createCard(periodId, card);
    setCurrentPeriod(prev =>
      prev && prev.id === periodId ? { ...prev, cards: [created, ...prev.cards] } : prev
    );
    return created;
  }, [periodService]);

  const updateCard = useCallback(async (cardId: string, card: Partial<CreditCard>): Promise<CreditCard> => {
    if (!periodService) throw new Error("No period service");
    const updated = await periodService.updateCard(cardId, card);
    setCurrentPeriod(prev =>
      prev ? { ...prev, cards: prev.cards.map(c => c.id === cardId ? { ...c, ...updated } : c) } : prev
    );
    return updated;
  }, [periodService]);

  const deleteCard = useCallback(async (cardId: string): Promise<void> => {
    if (!periodService) throw new Error("No period service");
    await periodService.deleteCard(cardId);
    setCurrentPeriod(prev =>
      prev ? { ...prev, cards: prev.cards.filter(c => c.id !== cardId) } : prev
    );
  }, [periodService]);

  const createTransaction = useCallback(async (periodId: string, tx: Transaction): Promise<Transaction> => {
    if (!periodService) throw new Error("No period service");
    const created = await periodService.createTransaction(periodId, tx);
    setCurrentPeriod(prev =>
      prev && prev.id === periodId ? { ...prev, transactions: [created, ...prev.transactions] } : prev
    );
    return created;
  }, [periodService]);

  const updateTransaction = useCallback(async (txId: string, tx: Partial<Transaction>): Promise<Transaction> => {
    if (!periodService) throw new Error("No period service");
    const updated = await periodService.updateTransaction(txId, tx);
    setCurrentPeriod(prev =>
      prev
        ? { ...prev, transactions: prev.transactions.map(t => t.id === txId ? { ...t, ...updated } : t) }
        : prev
    );
    return updated;
  }, [periodService]);

  const deleteTransaction = useCallback(async (txId: string): Promise<void> => {
    if (!periodService) throw new Error("No period service");
    await periodService.deleteTransaction(txId);
    setCurrentPeriod(prev =>
      prev ? { ...prev, transactions: prev.transactions.filter(t => t.id !== txId) } : prev
    );
  }, [periodService]);

  const pendingPeriod = periodSummaries.find(p => p.id === pendingPeriodId);
  const pendingDeletePeriod = periodSummaries.find(p => p.id === pendingDeletePeriodId);

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center gap-2">
        <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading periods...</p>
      </div>
    );
  }

  return (
    <>
      <TransactionManager
        periods={periodSummaries}
        currentPeriod={currentPeriod ?? undefined}
        onCreatePeriod={createNewPeriod}
        onSwitchPeriod={switchPeriod}
        onUpdatePeriodData={updatePeriodData}
        onDeletePeriod={deletePeriod}
        createCard={periodService ? createCard : undefined}
        updateCard={periodService ? updateCard : undefined}
        deleteCard={periodService ? deleteCard : undefined}
        createTransaction={periodService ? createTransaction : undefined}
        updateTransaction={periodService ? updateTransaction : undefined}
        deleteTransaction={periodService ? deleteTransaction : undefined}
        updatePeriodTotals={periodService ? updatePeriodTotals : undefined}
        onOpenChat={() => setChatOpen(true)}
      />

      <ChatPanel currentPeriodId={currentPeriod?.id} open={chatOpen} onOpenChange={setChatOpen} />

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
            <Button variant="outline" onClick={cancelSwitchPeriod} disabled={isSwitchingPeriod}>
              Cancel
            </Button>
            <Button onClick={confirmSwitchPeriod} disabled={isSwitchingPeriod}>
              {isSwitchingPeriod && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
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
              Are you sure you want to delete the &quot;{pendingDeletePeriod?.name}&quot; period?
              <br />
              <br />
              This action cannot be undone. All transactions and data for this period will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeletePeriod} disabled={isDeletingPeriod}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeletePeriod} disabled={isDeletingPeriod}>
              {isDeletingPeriod && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Delete Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
