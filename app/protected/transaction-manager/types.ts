export type CreditCard = {
  id: string;
  name: string;
  limit: number;
  color: string;
};

export type Transaction = {
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
};

export type Period = {
  id: string;
  name: string;
  createdAt: string;
  cards: CreditCard[];
  transactions: Transaction[];
  bankTotal: number;
  totalSavings: number;
  visibleCardIds: Record<string, boolean>;
};

// Lightweight metadata for periods other than the currently loaded one —
// enough to populate the period switcher without pulling in every period's
// cards/transactions.
export type PeriodSummary = {
  id: string;
  name: string;
  createdAt: string;
};

export type TransactionManagerProps = {
  periods: PeriodSummary[];
  currentPeriod?: Period;
  onCreatePeriod: (name: string) => Promise<void>;
  onSwitchPeriod: (periodId: string) => void;
  onUpdatePeriodData: (
    periodId: string,
    data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
  ) => Promise<void>;
  onDeletePeriod: (periodId: string) => void;
  // Granular operations for efficient DB updates
  createCard?: (periodId: string, card: CreditCard) => Promise<CreditCard>;
  updateCard?: (cardId: string, card: Partial<CreditCard>) => Promise<CreditCard>;
  deleteCard?: (cardId: string) => Promise<void>;
  createTransaction?: (periodId: string, transaction: Transaction) => Promise<Transaction>;
  updateTransaction?: (transactionId: string, transaction: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction?: (transactionId: string) => Promise<void>;
  updatePeriodTotals?: (periodId: string, totals: { bankTotal?: number; totalSavings?: number }) => Promise<void>;
  onOpenChat: () => void;
};