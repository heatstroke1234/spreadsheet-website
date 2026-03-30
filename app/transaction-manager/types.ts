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

export type TransactionManagerProps = {
  onLogout: () => void;
  periods: Period[];
  currentPeriod?: Period;
  onCreatePeriod: (name: string) => void;
  onSwitchPeriod: (periodId: string) => void;
  onUpdatePeriodData: (
    periodId: string,
    data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
  ) => void;
  onDeletePeriod: (periodId: string) => void;
};