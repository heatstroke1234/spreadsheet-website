import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";
import type { Period, CreditCard, Transaction } from "./types";
import {
  listPeriods,
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
  listPeriods: () => Promise<Period[]>;
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

export function createPeriodService(client: DbClient): PeriodService {
  return {
    listPeriods: () => listPeriods(client),
    
    getPeriod: (periodId: string) => getPeriod(client, periodId),
    
    onCreatePeriod: async (name: string) => {
      return repoCreatePeriod(client, name);
    },
    
    onSwitchPeriod: async (periodId: string) => {
      return getPeriod(client, periodId);
    },
    
    onUpdatePeriodData: async (
      periodId: string,
      data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
    ) => {
      return repoUpdatePeriodData(client, periodId, data);
    },
    
    onDeletePeriod: async (periodId: string) => {
      return repoDeletePeriod(client, periodId);
    },
    
    // Granular Card Operations
    createCard: async (periodId: string, card: CreditCard) => {
      return createCard(client, periodId, card);
    },
    
    updateCard: async (cardId: string, card: Partial<CreditCard>) => {
      return updateCard(client, cardId, card);
    },
    
    deleteCard: async (cardId: string) => {
      return deleteCard(client, cardId);
    },
    
    // Granular Transaction Operations
    createTransaction: async (periodId: string, transaction: Transaction) => {
      return createTransaction(client, periodId, transaction);
    },
    
    updateTransaction: async (transactionId: string, transaction: Partial<Transaction>) => {
      return updateTransaction(client, transactionId, transaction);
    },
    
    deleteTransaction: async (transactionId: string) => {
      return deleteTransaction(client, transactionId);
    },
    
    // Period Totals
    updatePeriodTotals: async (periodId: string, totals: { bankTotal?: number; totalSavings?: number }) => {
      return updatePeriodTotals(client, periodId, totals);
    },
  };
}