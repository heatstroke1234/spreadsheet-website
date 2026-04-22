import { Transaction } from "./types";

export type TxSortBy = "date" | "amount" | "method";
export type TxSortOrder = "asc" | "desc";

type FilterOptions = {
  showDebit: boolean;
  showBank: boolean;
  visibleCardIds: Record<string, boolean>;
  txSearch: string;
};

export function sortTransactions(
  transactions: Transaction[],
  txSortBy: TxSortBy,
  txSortOrder: TxSortOrder
) {
  const direction = txSortOrder === "asc" ? 1 : -1;

  return [...transactions].sort((a, b) => {
    if (txSortBy === "amount") {
      return direction * (a.amount - b.amount);
    }

    if (txSortBy === "method") {
      const methodCompare = a.method.localeCompare(b.method);
      if (methodCompare !== 0) {
        return direction * methodCompare;
      }

      if (a.method === "card" && b.method === "card") {
        return direction * a.cardName.localeCompare(b.cardName);
      }

      return 0;
    }

    return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });
}

export function filterTransactions(transactions: Transaction[], options: FilterOptions) {
  const { showDebit, showBank, visibleCardIds, txSearch } = options;

  return transactions.filter((tx) => {
    if (tx.method === "debit" && !showDebit) return false;

    if (tx.method === "card") {
      if (!(tx.cardId ? visibleCardIds[tx.cardId] ?? true : true)) {
        return false;
      }
    }

    if (tx.method === "bank" && !showBank) return false;

    if (!txSearch.trim()) {
      return true;
    }

    const query = txSearch.trim().toLowerCase();
    const description = tx.description.toLowerCase();
    const cardName = tx.cardName.toLowerCase();
    const method = tx.method.toLowerCase();
    const category = tx.category?.toLowerCase() ?? "";
    const amount = tx.amount.toString();
    const date = new Date(tx.createdAt).toLocaleDateString().toLowerCase();

    return (
      description.includes(query) ||
      cardName.includes(query) ||
      method.includes(query) ||
      category.includes(query) ||
      amount.includes(query) ||
      date.includes(query)
    );
  });
}

export function paginateTransactions(transactions: Transaction[], txPage: number, txPageSize: number) {
  const totalTx = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalTx / txPageSize));
  const effectiveTxPage = Math.min(txPage, totalPages);

  const visiblePageStart = Math.max(1, Math.min(effectiveTxPage - 1, totalPages - 2));
  const visiblePageEnd = Math.min(totalPages, visiblePageStart + 2);
  const visiblePageNumbers = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, i) => visiblePageStart + i
  );

  const pageStartIndex = (effectiveTxPage - 1) * txPageSize;
  const pageEndIndex = Math.min(totalTx, pageStartIndex + txPageSize);
  const pagedTransactions = transactions.slice(pageStartIndex, pageEndIndex);

  return {
    totalTx,
    totalPages,
    effectiveTxPage,
    visiblePageNumbers,
    pageStartIndex,
    pageEndIndex,
    pagedTransactions,
  };
}

export function totalAmount(transactions: Transaction[]) {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

export function summaryRows(transactions: Transaction[], totalSavings: number) {
  const totalBankDeposits = transactions
    .filter((tx) => tx.method === "bank")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalDebitTransactions = transactions
    .filter((tx) => tx.method === "debit")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalCardTransactions = transactions
    .filter((tx) => tx.method === "card")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalNecessaryTransactions = transactions
    .filter((tx) => tx.category === "necessary")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalRecreationTransactions = transactions
    .filter((tx) => tx.category === "recreation")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return [
    { label: "Total Bank Deposits", value: totalBankDeposits },
    { label: "Total Savings", value: totalSavings },
    { label: "Total Debit Transactions", value: totalDebitTransactions },
    { label: "Total Card Transactions", value: totalCardTransactions },
    { label: "Total Necessary Transactions", value: totalNecessaryTransactions },
    { label: "Total Recreation Transactions", value: totalRecreationTransactions },
  ].filter((item) => item.value > 0);
}