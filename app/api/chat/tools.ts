import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { PeriodService } from "@/app/protected/transaction-manager/periodService";
import { sortTransactions, summaryRows } from "@/app/protected/transaction-manager/calculations";

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
      "necessary/recreation category, transaction count, and the list of credit cards. Use this for any " +
      "totals/aggregate question rather than search_transactions.",
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
        cards: period.cards.map((card) => ({
          name: card.name,
          limit: card.limit,
        })),
      });
    },
  });

  const searchTransactions = betaZodTool({
    name: "search_transactions",
    description:
      "Look up specific transaction line items within one period, optionally filtered by method, category, " +
      "or a text search. Use get_period_summary instead when the user just wants totals.",
    inputSchema: z.object({
      period_id: z.string().describe("The period id, from list_periods."),
      method: z.enum(["debit", "card", "bank"]).optional(),
      category: z.enum(["necessary", "recreation"]).optional(),
      search: z.string().optional().describe("Case-insensitive substring match against description/card name."),
      limit: z.number().int().min(1).max(200).optional().default(50),
    }),
    run: async ({ period_id, method, category, search, limit }) => {
      const period = await periodService.getPeriod(period_id);
      if (!period) {
        return JSON.stringify({ error: "Period not found." });
      }

      const query = search?.trim().toLowerCase();
      const matches = period.transactions.filter((tx) => {
        if (method && tx.method !== method) return false;
        if (category && tx.category !== category) return false;
        if (query) {
          const haystack = `${tx.description} ${tx.cardName}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      });

      const sorted = sortTransactions(matches, "date", "desc");
      const capped = sorted.slice(0, limit);

      return JSON.stringify({
        totalMatches: matches.length,
        returned: capped.length,
        transactions: capped.map((tx) => ({
          amount: tx.amount,
          method: tx.method,
          category: tx.category,
          bankCategory: tx.bankCategory,
          cardName: tx.cardName,
          description: tx.description,
          createdAt: tx.createdAt,
        })),
      });
    },
  });

  return [listPeriods, getPeriodSummary, searchTransactions];
}
