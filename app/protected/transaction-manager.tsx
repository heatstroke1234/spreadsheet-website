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

export function TransactionManager({ 
  periods, 
  currentPeriod, 
  onCreatePeriod, 
  onSwitchPeriod, 
  onUpdatePeriodData,
  onDeletePeriod 
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
  } = useCardForm({
    cards,
    visibleCardIds,
    setCards,
    setVisibleCardIds,
    updateCurrentPeriodData,
  });

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
  } = useTransactionForm({
    cards,
    transactions,
    bankTotal,
    totalSavings,
    setTransactions,
    setBankTotal,
    setTotalSavings,
    updateCurrentPeriodData,
  });

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
            />

            <BankCardsPanel
              bankTotal={bankTotal}
              cards={cards}
              transactions={transactions}
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
        onOpenChange={setCardDeleteDialogOpen}
        onConfirmDelete={() => {
          if (cardToDelete) {
            deleteCard(cardToDelete.id);
          }
          setCardDeleteDialogOpen(false);
          setCardToDelete(null);
        }}
      />
    </div>
  );
}