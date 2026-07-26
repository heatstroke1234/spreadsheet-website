import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";
import type { Period, PeriodSummary, CreditCard, Transaction } from "./types";
import {
  listPeriodSummaries,
  getPeriod,
  createPeriod as repoCreatePeriod,
  deletePeriod as repoDeletePeriod,
  updatePeriodData as repoUpdatePeriodData,
  createCard,
  updateCard,
  deleteCard,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  updatePeriodTotals,
} from "./periodRepository";

type DbClient = SupabaseClient<Database>;

export type PeriodService = {
  // Period CRUD
  listPeriodSummaries: () => Promise<PeriodSummary[]>;
  getPeriod: (periodId: string) => Promise<Period | null>;
  onCreatePeriod: (name: string) => Promise<Period>;
  onSwitchPeriod: (periodId: string) => Promise<Period | null>;
  onUpdatePeriodData: (
    periodId: string,
    data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
  ) => Promise<Period>;
  onDeletePeriod: (periodId: string) => Promise<void>;
  
  // Granular Card Operations
  createCard: (periodId: string, card: CreditCard) => Promise<CreditCard>;
  updateCard: (cardId: string, card: Partial<CreditCard>) => Promise<CreditCard>;
  deleteCard: (cardId: string) => Promise<void>;
  
  // Granular Transaction Operations
  createTransaction: (periodId: string, transaction: Transaction) => Promise<Transaction>;
  updateTransaction: (transactionId: string, transaction: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  
  // Period Totals
  updatePeriodTotals: (periodId: string, totals: { bankTotal?: number; totalSavings?: number }) => Promise<void>;
};

export function createPeriodService(client: DbClient, userId: string): PeriodService {
  return {
    listPeriodSummaries: () => listPeriodSummaries(client, userId),

    getPeriod: (periodId: string) => getPeriod(client, periodId, userId),
    
    onCreatePeriod: async (name: string) => {
      return repoCreatePeriod(client, name, userId);
    },
    
    onSwitchPeriod: async (periodId: string) => {
      return getPeriod(client, periodId, userId);
    },
    
    onUpdatePeriodData: async (
      periodId: string,
      data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
    ) => {
      return repoUpdatePeriodData(client, periodId, userId, data);
    },
    
    onDeletePeriod: async (periodId: string) => {
      return repoDeletePeriod(client, periodId, userId);
    },
    
    // Granular Card Operations
    createCard: async (periodId: string, card: CreditCard) => {
      return createCard(client, periodId, userId, card);
    },
    
    updateCard: async (cardId: string, card: Partial<CreditCard>) => {
      return updateCard(client, cardId, userId, card);
    },
    
    deleteCard: async (cardId: string) => {
      return deleteCard(client, cardId, userId);
    },
    
    // Granular Transaction Operations
    createTransaction: async (periodId: string, transaction: Transaction) => {
      return createTransaction(client, periodId, userId, transaction);
    },
    
    updateTransaction: async (transactionId: string, transaction: Partial<Transaction>) => {
      return updateTransaction(client, transactionId, userId, transaction);
    },
    
    deleteTransaction: async (transactionId: string) => {
      return deleteTransaction(client, transactionId, userId);
    },
    
    // Period Totals
    updatePeriodTotals: async (periodId: string, totals: { bankTotal?: number; totalSavings?: number }) => {
      return updatePeriodTotals(client, periodId, userId, totals);
    },
  };
}