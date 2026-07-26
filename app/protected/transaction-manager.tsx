"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { PeriodMenu } from "./transaction-manager/components/period-menu";
import { TransactionsPanel } from "./transaction-manager/components/transactions-panel";
import { BankCardsPanel } from "./transaction-manager/components/bank-cards-panel";
import { CardDialog } from "./transaction-manager/components/card-dialog";
import { TransactionDialog } from "./transaction-manager/components/transaction-dialog";
import { PeriodDialog } from "./transaction-manager/components/period-dialog";
import { BankSummaryDialog } from "./transaction-manager/components/bank-summary-dialog";
import { CardDeleteDialog } from "./transaction-manager/components/card-delete-dialog";
import { useCardForm } from "./transaction-manager/hooks/use-card-form";
import { useTransactionForm } from "./transaction-manager/hooks/use-transaction-form";
import { usePeriodData } from "./transaction-manager/hooks/use-period-data";
import { usePeriodManagement } from "./transaction-manager/hooks/use-period-management";
import { TransactionManagerProps, CreditCard, Transaction } from "./transaction-manager/types";
import {
  filterTransactions,
  paginateTransactions,
  sortTransactions,
  summaryRows,
  totalAmount,
  TxSortBy,
  TxSortOrder,
} from "./transaction-manager/calculations";
import { LogoutButton } from '@/components/logout-button'

function generateCSV(transactions: Transaction[], cards: { id: string; name: string }[]): string {
  const headers = [
    "Date",
    "Description",
    "Amount",
    "Method",
    "Category",
    "Bank Category",
    "Savings Amount",
    "Card Name",
  ];
  
  const rows = transactions.map((tx) => {
    const card = cards.find((c) => c.id === tx.cardId);
    return [
      new Date(tx.createdAt).toISOString(),
      `"${(tx.description || "").replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.method,
      tx.category || "",
      tx.bankCategory || "",
      tx.savingsAmount?.toFixed(2) || "",
      tx.cardName || "",
    ].join(",");
  });
  
  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV(transactions: Transaction[], cards: { id: string; name: string }[], periodName: string): void {
  const csv = generateCSV(transactions, cards);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${periodName.replace(/[^a-z0-9]/gi, "_")}_transactions.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function TransactionManager({ 
  periods, 
  currentPeriod, 
  onCreatePeriod, 
  onSwitchPeriod, 
  onUpdatePeriodData,
  onDeletePeriod,
  createCard,
  updateCard,
  deleteCard: deleteCardFn,
  createTransaction,
  updateTransaction,
  deleteTransaction: deleteTransactionFn,
  updatePeriodTotals,
}: Omit<TransactionManagerProps, 'onLogout'>) {
  const [showDebit, setShowDebit] = useState(true);
  const [showBank, setShowBank] = useState(true);

  const [txPage, setTxPage] = useState(1);
  const [txSortBy, setTxSortBy] = useState<TxSortBy>("date");
  const [txSortOrder, setTxSortOrder] = useState<TxSortOrder>("desc");
  const [txSearch, setTxSearch] = useState("");
  const txPageSize = 4;

  // Card deletion confirmation state
  const [cardDeleteDialogOpen, setCardDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  // Bank summary dialog state
  const [bankSummaryDialogOpen, setBankSummaryDialogOpen] = useState(false);

  const {
    transactions,
    setTransactions,
    visibleCardIds,
    setVisibleCardIds,
    bankTotal,
    setBankTotal,
    totalSavings,
    setTotalSavings,
    cards,
    setCards,
    updateCurrentPeriodData,
  } = usePeriodData({
    currentPeriod,
    onUpdatePeriodData,
  });

  const {
    newPeriodName,
    setNewPeriodName,
    periodDialogOpen,
    setPeriodDialogOpen,
    handleCreatePeriod,
    handleSwitchPeriod,
    handleDeletePeriod,
    isLoading: periodIsLoading,
  } = usePeriodManagement({
    onCreatePeriod,
    onSwitchPeriod,
    onDeletePeriod,
    setTxPage,
  });

  const sortedTransactions = sortTransactions(transactions, txSortBy, txSortOrder);

  const filteredTransactions = filterTransactions(sortedTransactions, {
    showDebit,
    showBank,
    visibleCardIds,
    txSearch,
  });

  const {
    totalTx,
    totalPages,
    effectiveTxPage,
    visiblePageNumbers,
    pageStartIndex,
    pageEndIndex,
    pagedTransactions,
  } = paginateTransactions(filteredTransactions, txPage, txPageSize);

  const totalFilteredAmount = totalAmount(filteredTransactions);
  const summaryRowsData = summaryRows(transactions, totalSavings);

  const {
    cardName,
    setCardName,
    cardLimit,
    setCardLimit,
    cardColor,
    setCardColor,
    cardDialogOpen,
    editingCardId,
    addCard,
    startEditCard,
    onCardDialogOpenChange,
    deleteCard,
    isLoading: cardIsLoading,
    deletingCardIds,
  } = useCardForm({
    cards,
    visibleCardIds,
    setCards,
    setVisibleCardIds,
    updateCurrentPeriodData,
    periodId: currentPeriod?.id,
    createCard,
    updateCard,
    deleteCard: deleteCardFn,
  });

  const {
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
    isLoading: txIsLoading,
    deletingTxIds,
    deleteTransaction: deleteTransactionFromHook,
  } = useTransactionForm({
    cards,
    transactions,
    bankTotal,
    totalSavings,
    setTransactions,
    setBankTotal,
    setTotalSavings,
    updateCurrentPeriodData,
    periodId: currentPeriod?.id,
    createTransaction,
    updateTransaction,
    deleteTransaction: deleteTransactionFn,
    updatePeriodTotals,
  });

  const deleteTransaction = async (txId: string) => {
    // Use the hook's delete function which handles loading state and fallback
    await deleteTransactionFromHook(txId);
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
            <PeriodMenu
              periods={periods}
              currentPeriod={currentPeriod}
              onSwitchPeriod={handleSwitchPeriod}
              onCreatePeriod={() => setPeriodDialogOpen(true)}
              onDeleteCurrentPeriod={() => {
                if (currentPeriod) {
                  handleDeletePeriod(currentPeriod.id);
                }
              }}
            />
            <CardDialog
              open={cardDialogOpen}
              editingCardId={editingCardId}
              cardName={cardName}
              cardLimit={cardLimit}
              cardColor={cardColor}
              hasCurrentPeriod={Boolean(currentPeriod)}
              isLoading={cardIsLoading}
              onOpenChange={onCardDialogOpenChange}
              onSubmit={addCard}
              onCardNameChange={setCardName}
              onCardLimitChange={setCardLimit}
              onCardColorChange={setCardColor}
            />

            <TransactionDialog
              open={txDialogOpen}
              editingTxId={editingTxId}
              txAmount={txAmount}
              txDescription={txDescription}
              txMethod={txMethod}
              txCategory={txCategory}
              txBankCategory={txBankCategory}
              txSavingsPercent={txSavingsPercent}
              txCardId={txCardId}
              cards={cards}
              hasCurrentPeriod={Boolean(currentPeriod)}
              isLoading={txIsLoading}
              onOpenChange={onTxDialogOpenChange}
              onSubmit={addTransaction}
              onTxAmountChange={setTxAmount}
              onTxDescriptionChange={setTxDescription}
              onTxMethodChange={setTxMethod}
              onTxCategoryChange={setTxCategory}
              onTxBankCategoryChange={setTxBankCategory}
              onTxSavingsPercentChange={setTxSavingsPercent}
              onTxCardIdChange={setTxCardId}
            />

            <LogoutButton />
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
            <TransactionsPanel
              cards={cards}
              pagedTransactions={pagedTransactions}
              filteredTransactions={filteredTransactions}
              totalTx={totalTx}
              pageStartIndex={pageStartIndex}
              pageEndIndex={pageEndIndex}
              totalPages={totalPages}
              effectiveTxPage={effectiveTxPage}
              visiblePageNumbers={visiblePageNumbers}
              txSearch={txSearch}
              totalFilteredAmount={totalFilteredAmount}
              showDebit={showDebit}
              showBank={showBank}
              visibleCardIds={visibleCardIds}
              txSortBy={txSortBy}
              txSortOrder={txSortOrder}
              deletingTxIds={deletingTxIds}
              onSetTxSearch={setTxSearch}
              onSetTxPage={setTxPage}
              onSetShowDebit={setShowDebit}
              onSetShowBank={setShowBank}
              onSetVisibleCard={(cardId, value) =>
                setVisibleCardIds((prev) => ({
                  ...prev,
                  [cardId]: value,
                }))
              }
              onSetSortBy={setTxSortBy}
              onSetSortOrder={setTxSortOrder}
              onEditTransaction={startEditTransaction}
              onDeleteTransaction={deleteTransaction}
              onDownloadCSV={() => downloadCSV(filteredTransactions, cards, currentPeriod?.name || "transactions")}
            />

            <BankCardsPanel
              bankTotal={bankTotal}
              cards={cards}
              transactions={transactions}
              deletingCardIds={deletingCardIds}
              onOpenSummary={() => setBankSummaryDialogOpen(true)}
              onEditCard={startEditCard}
              onRequestDeleteCard={(card) => {
                setCardToDelete(card);
                setCardDeleteDialogOpen(true);
              }}
            />
        </div>
        )}
      </div>

      {/* Period Creation Dialog - available even when no periods exist */}
      <PeriodDialog
        open={periodDialogOpen}
        newPeriodName={newPeriodName}
        isLoading={periodIsLoading}
        onOpenChange={setPeriodDialogOpen}
        onNewPeriodNameChange={setNewPeriodName}
        onSubmit={handleCreatePeriod}
      />

      {/* Bank Summary Dialog */}
      <BankSummaryDialog
        open={bankSummaryDialogOpen}
        summaryRows={summaryRowsData}
        onOpenChange={setBankSummaryDialogOpen}
      />

      {/* Card Delete Confirmation Dialog */}
      <CardDeleteDialog
        open={cardDeleteDialogOpen}
        cardToDelete={cardToDelete}
        isLoading={cardToDelete ? deletingCardIds.has(cardToDelete.id) : false}
        onOpenChange={setCardDeleteDialogOpen}
        onConfirmDelete={async () => {
          if (cardToDelete) {
            await deleteCard(cardToDelete.id);
          }
          setCardDeleteDialogOpen(false);
          setCardToDelete(null);
        }}
      />
    </div>
  );
}