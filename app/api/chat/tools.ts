import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { PeriodService } from "@/app/protected/transaction-manager/periodService";
import type { Period } from "@/app/protected/transaction-manager/types";
import { summaryRows } from "@/app/protected/transaction-manager/calculations";

// Per-card spend and utilization for a period — card totals aren't tracked directly, so
// this sums each card's "card"-method transactions by cardId and compares against its limit.
function cardBreakdown(period: Period) {
  const spendByCard = new Map<string, number>();
  for (const tx of period.transactions) {
    if (tx.method !== "card" || !tx.cardId) continue;
    spendByCard.set(tx.cardId, (spendByCard.get(tx.cardId) ?? 0) + tx.amount);
  }

  return period.cards.map((card) => {
    const spend = spendByCard.get(card.id) ?? 0;
    return {
      name: card.name,
      limit: card.limit,
      spend,
      remaining: card.limit - spend,
      utilizationPct: card.limit > 0 ? Math.round((spend / card.limit) * 1000) / 10 : 0,
    };
  });
}

export function buildChatTools(periodService: PeriodService) {
  const listPeriods = betaZodTool({
    name: "list_periods",
    description:
      "List all of the user's periods (id, name, createdAt), ordered most-recent first. " +
      "Call this first for any question that could span multiple periods, to resolve period names/dates to ids.",
    inputSchema: z.object({}),
    run: async () => {
      const summaries = await periodService.listPeriodSummaries();
      return JSON.stringify(summaries);
    },
  });

  const getPeriodSummary = betaZodTool({
    name: "get_period_summary",
    description:
      "Get aggregated totals for one period: bank total, savings, spend broken down by bank/debit/card and by " +
      "necessary/recreation category, transaction count, and per-card spend/limit/remaining/utilization. Use this " +
      "for any totals, aggregate, or card-utilization question (e.g. 'which card is closest to its limit') " +
      "rather than search_transactions.",
    inputSchema: z.object({
      period_id: z.string().describe("The period id, from list_periods."),
    }),
    run: async ({ period_id }) => {
      const period = await periodService.getPeriod(period_id);
      if (!period) {
        return JSON.stringify({ error: "Period not found." });
      }

      return JSON.stringify({
        id: period.id,
        name: period.name,
        createdAt: period.createdAt,
        bankTotal: period.bankTotal,
        totalSavings: period.totalSavings,
        transactionCount: period.transactions.length,
        summary: summaryRows(period.transactions, period.totalSavings),
        cards: cardBreakdown(period),
      });
    },
  });

  const searchTransactions = betaZodTool({
    name: "search_transactions",
    description:
      "Look up specific transaction line items, optionally filtered by method, category, or a text search. " +
      "Pass period_id to search within one period; omit it to search across ALL of the user's periods at once " +
      "(e.g. 'find every recreation purchase over $50, anywhere' — no need to call list_periods first for this). " +
      "Use get_period_summary instead when the user just wants totals.",
    inputSchema: z.object({
      period_id: z.string().optional().describe("The period id, from list_periods. Omit to search every period."),
      method: z.enum(["debit", "card", "bank"]).optional(),
      category: z.enum(["necessary", "recreation"]).optional(),
      search: z.string().optional().describe("Case-insensitive substring match against description/card name."),
      limit: z.number().int().min(1).max(200).optional().default(50),
    }),
    run: async ({ period_id, method, category, search, limit }) => {
      const query = search?.trim().toLowerCase();
      const matchesFilter = (tx: Period["transactions"][number]) => {
        if (method && tx.method !== method) return false;
        if (category && tx.category !== category) return false;
        if (query) {
          const haystack = `${tx.description} ${tx.cardName}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      };

      let periods: Period[];
      if (period_id) {
        const period = await periodService.getPeriod(period_id);
        if (!period) {
          return JSON.stringify({ error: "Period not found." });
        }
        periods = [period];
      } else {
        const summaries = await periodService.listPeriodSummaries();
        const fetched = await Promise.all(summaries.map((s) => periodService.getPeriod(s.id)));
        periods = fetched.filter((p): p is Period => p !== null);
      }

      const matches = periods.flatMap((period) =>
        period.transactions.filter(matchesFilter).map((tx) => ({
          periodId: period.id,
          periodName: period.name,
          amount: tx.amount,
          method: tx.method,
          category: tx.category,
          bankCategory: tx.bankCategory,
          cardName: tx.cardName,
          description: tx.description,
          createdAt: tx.createdAt,
        }))
      );

      matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const capped = matches.slice(0, limit);

      return JSON.stringify({
        totalMatches: matches.length,
        returned: capped.length,
        transactions: capped,
      });
    },
  });

  return [listPeriods, getPeriodSummary, searchTransactions];
}
