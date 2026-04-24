import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreditCard, Period, Transaction } from "./types";
import type { Database, Inserts, Tables, Updates } from "./supabase.types";

type DbClient = SupabaseClient<Database>;

type PeriodRow = Tables<"periods">;
type CreditCardRow = Tables<"credit_cards">;
type TransactionRow = Tables<"transactions">;
type VisibleCardRow = Tables<"period_visible_cards">;

type PeriodRecord = PeriodRow & {
  credit_cards?: CreditCardRow[] | null;
  transactions?: TransactionRow[] | null;
  period_visible_cards?: VisibleCardRow[] | null;
};

export type UpdatePeriodDataInput = Partial<
  Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">
>;

// ============ Granular Card Operations ============

export async function createCard(
  client: DbClient,
  periodId: string,
  card: CreditCard,
): Promise<CreditCard> {
  const { data, error } = await client
    .from("credit_cards")
    .insert(buildCardInsert(periodId, card))
    .select()
    .single();

  assertNoError(error, "Failed to create credit card");
  return mapCard(data as CreditCardRow);
}

export async function updateCard(
  client: DbClient,
  cardId: string,
  card: Partial<CreditCard>,
): Promise<CreditCard> {
  const patch: Partial<Inserts<"credit_cards">> = {};
  
  if (card.name !== undefined) patch.name = card.name;
  if (card.limit !== undefined) patch.credit_limit = card.limit;
  if (card.color !== undefined) patch.color = card.color;

  const { data, error } = await client
    .from("credit_cards")
    .update(patch)
    .eq("id", cardId)
    .select()
    .single();

  assertNoError(error, "Failed to update credit card");
  return mapCard(data as CreditCardRow);
}

export async function deleteCard(client: DbClient, cardId: string): Promise<void> {
  const { error } = await client.from("credit_cards").delete().eq("id", cardId);
  assertNoError(error, "Failed to delete credit card");
}

// ============ Granular Transaction Operations ============

export async function createTransaction(
  client: DbClient,
  periodId: string,
  transaction: Transaction,
): Promise<Transaction> {
  const { data, error } = await client
    .from("transactions")
    .insert(buildTransactionInsert(periodId, transaction))
    .select()
    .single();

  assertNoError(error, "Failed to create transaction");
  return mapTransaction(data as TransactionRow);
}

export async function updateTransaction(
  client: DbClient,
  transactionId: string,
  transaction: Partial<Transaction>,
): Promise<Transaction> {
  const patch: Partial<Inserts<"transactions">> = {};
  
  if (transaction.amount !== undefined) patch.amount = transaction.amount;
  if (transaction.method !== undefined) patch.method = transaction.method;
  if (transaction.category !== undefined) patch.category = transaction.category ?? null;
  if (transaction.bankCategory !== undefined) patch.bank_category = transaction.bankCategory ?? null;
  if (transaction.savingsAmount !== undefined) patch.savings_amount = transaction.savingsAmount ?? null;
  if (transaction.cardId !== undefined) patch.card_id = transaction.cardId ?? null;
  if (transaction.cardName !== undefined) patch.card_name_snapshot = transaction.cardName;
  if (transaction.description !== undefined) patch.description = transaction.description;

  const { data, error } = await client
    .from("transactions")
    .update(patch)
    .eq("id", transactionId)
    .select()
    .single();

  assertNoError(error, "Failed to update transaction");
  return mapTransaction(data as TransactionRow);
}

export async function deleteTransaction(client: DbClient, transactionId: string): Promise<void> {
  const { error } = await client.from("transactions").delete().eq("id", transactionId);
  assertNoError(error, "Failed to delete transaction");
}

// ============ Period Totals ============

export async function updatePeriodTotals(
  client: DbClient,
  periodId: string,
  totals: { bankTotal?: number; totalSavings?: number },
): Promise<void> {
  const periodPatch: Updates<"periods"> = {};

  if (totals.bankTotal !== undefined) {
    periodPatch.bank_total = totals.bankTotal;
  }

  if (totals.totalSavings !== undefined) {
    periodPatch.total_savings = totals.totalSavings;
  }

  if (Object.keys(periodPatch).length > 0) {
    const { error } = await client.from("periods").update(periodPatch).eq("id", periodId);
    assertNoError(error, "Failed to update period totals");
  }
}

const PERIOD_SELECT = `
  id,
  name,
  created_at,
  bank_total,
  total_savings,
  credit_cards (
    id,
    name,
    credit_limit,
    color,
    created_at,
    updated_at
  ),
  transactions (
    id,
    amount,
    method,
    category,
    bank_category,
    savings_amount,
    card_id,
    card_name_snapshot,
    description,
    created_at,
    updated_at
  ),
  period_visible_cards (
    card_id,
    is_visible,
    created_at,
    updated_at
  )
`;

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function escapePostgrestInValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toPostgrestInList(values: string[]): string {
  return `(${values.map(escapePostgrestInValue).join(",")})`;
}

function mapCard(row: CreditCardRow): CreditCard {
  return {
    id: row.id,
    name: row.name,
    limit: toNumber(row.credit_limit),
    color: row.color,
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    amount: toNumber(row.amount),
    method: row.method,
    category: row.category ?? undefined,
    bankCategory: row.bank_category ?? undefined,
    savingsAmount: row.savings_amount == null ? undefined : toNumber(row.savings_amount),
    cardId: row.card_id ?? undefined,
    cardName: row.card_name_snapshot,
    description: row.description,
    createdAt: row.created_at,
  };
}

function mapVisibleCardIds(rows: VisibleCardRow[] | null | undefined): Record<string, boolean> {
  return Object.fromEntries((rows ?? []).map((row) => [row.card_id, row.is_visible]));
}

function mapPeriod(record: PeriodRecord): Period {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.created_at,
    cards: (record.credit_cards ?? []).map(mapCard),
    transactions: (record.transactions ?? []).map(mapTransaction),
    bankTotal: toNumber(record.bank_total),
    totalSavings: toNumber(record.total_savings),
    visibleCardIds: mapVisibleCardIds(record.period_visible_cards),
  };
}

function buildCardInsert(periodId: string, card: CreditCard): Inserts<"credit_cards"> {
  return {
    id: card.id,
    period_id: periodId,
    name: card.name,
    credit_limit: card.limit,
    color: card.color,
  };
}

function buildTransactionInsert(periodId: string, transaction: Transaction): Inserts<"transactions"> {
  return {
    id: transaction.id,
    period_id: periodId,
    amount: transaction.amount,
    method: transaction.method,
    category: transaction.category ?? null,
    bank_category: transaction.bankCategory ?? null,
    savings_amount: transaction.savingsAmount ?? null,
    card_id: transaction.cardId ?? null,
    card_name_snapshot: transaction.cardName,
    description: transaction.description,
    created_at: transaction.createdAt,
  };
}

async function replaceCards(client: DbClient, periodId: string, cards: CreditCard[]): Promise<void> {
  if (cards.length > 0) {
    const { error: upsertError } = await client
      .from("credit_cards")
      .upsert(cards.map((card) => buildCardInsert(periodId, card)), { onConflict: "id" });

    assertNoError(upsertError, "Failed to upsert credit cards");

    const ids = cards.map((card) => card.id);
    const { error: deleteMissingError } = await client
      .from("credit_cards")
      .delete()
      .eq("period_id", periodId)
      .not("id", "in", toPostgrestInList(ids));

    assertNoError(deleteMissingError, "Failed to delete removed credit cards");
    return;
  }

  const { error } = await client.from("credit_cards").delete().eq("period_id", periodId);
  assertNoError(error, "Failed to clear credit cards");
}

async function replaceTransactions(
  client: DbClient,
  periodId: string,
  transactions: Transaction[],
): Promise<void> {
  const { error: deleteError } = await client
    .from("transactions")
    .delete()
    .eq("period_id", periodId);

  assertNoError(deleteError, "Failed to clear transactions");

  if (transactions.length === 0) return;

  const { error: insertError } = await client
    .from("transactions")
    .insert(transactions.map((transaction) => buildTransactionInsert(periodId, transaction)));

  assertNoError(insertError, "Failed to insert transactions");
}

async function replaceVisibleCards(
  client: DbClient,
  periodId: string,
  visibleCardIds: Record<string, boolean>,
): Promise<void> {
  const { error: deleteError } = await client
    .from("period_visible_cards")
    .delete()
    .eq("period_id", periodId);

  assertNoError(deleteError, "Failed to clear visible card rows");

  const entries = Object.entries(visibleCardIds);
  if (entries.length === 0) return;

  const { error: insertError } = await client.from("period_visible_cards").insert(
    entries.map(([cardId, isVisible]) => ({
      period_id: periodId,
      card_id: cardId,
      is_visible: isVisible,
    })),
  );

  assertNoError(insertError, "Failed to insert visible card rows");
}

export async function listPeriods(client: DbClient): Promise<Period[]> {
  const { data, error } = await client
    .from("periods")
    .select(PERIOD_SELECT)
    .order("created_at", { ascending: false });

  assertNoError(error, "Failed to fetch periods");
  return ((data ?? []) as PeriodRecord[]).map(mapPeriod);
}

export async function getPeriod(client: DbClient, periodId: string): Promise<Period | null> {
  const { data, error } = await client
    .from("periods")
    .select(PERIOD_SELECT)
    .eq("id", periodId)
    .single();

  if (error && "code" in error && error.code === "PGRST116") {
    return null;
  }

  assertNoError(error, "Failed to fetch period");
  return mapPeriod(data as PeriodRecord);
}

export async function createPeriod(client: DbClient, name: string): Promise<Period> {
  const { data, error } = await client
    .from("periods")
    .insert({ name })
    .select(PERIOD_SELECT)
    .single();

  assertNoError(error, "Failed to create period");
  return mapPeriod(data as PeriodRecord);
}

export async function deletePeriod(client: DbClient, periodId: string): Promise<void> {
  const { error } = await client.from("periods").delete().eq("id", periodId);
  assertNoError(error, "Failed to delete period");
}

export async function updatePeriodData(
  client: DbClient,
  periodId: string,
  data: UpdatePeriodDataInput,
): Promise<Period> {
  const periodPatch: Updates<"periods"> = {};

  if (data.bankTotal !== undefined) {
    periodPatch.bank_total = data.bankTotal;
  }

  if (data.totalSavings !== undefined) {
    periodPatch.total_savings = data.totalSavings;
  }

  if (Object.keys(periodPatch).length > 0) {
    const { error } = await client.from("periods").update(periodPatch).eq("id", periodId);
    assertNoError(error, "Failed to update period totals");
  }

  // Replacement semantics:
  // - if cards is present, the full cards array is replaced for the period
  // - if transactions is present, the full transactions array is replaced for the period
  // - if visibleCardIds is present, the full visibility map is replaced for the period
  if (data.cards !== undefined) {
    await replaceCards(client, periodId, data.cards);
  }

  if (data.transactions !== undefined) {
    await replaceTransactions(client, periodId, data.transactions);
  }

  if (data.visibleCardIds !== undefined) {
    await replaceVisibleCards(client, periodId, data.visibleCardIds);
  }

  const updated = await getPeriod(client, periodId);
  if (!updated) {
    throw new Error(`Period ${periodId} was not found after update`);
  }

  return updated;
}
