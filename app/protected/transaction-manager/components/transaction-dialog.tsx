import { FormEvent } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard } from "../types";

type TransactionDialogProps = {
  open: boolean;
  editingTxId: string;
  txAmount: string;
  txDescription: string;
  txMethod: "debit" | "card" | "bank";
  txCategory: "necessary" | "recreation";
  txBankCategory: "transfer" | "salary";
  txSavingsPercent: string;
  txCardId: string;
  cards: CreditCard[];
  hasCurrentPeriod: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTxAmountChange: (value: string) => void;
  onTxDescriptionChange: (value: string) => void;
  onTxMethodChange: (value: "debit" | "card" | "bank") => void;
  onTxCategoryChange: (value: "necessary" | "recreation") => void;
  onTxBankCategoryChange: (value: "transfer" | "salary") => void;
  onTxSavingsPercentChange: (value: string) => void;
  onTxCardIdChange: (value: string) => void;
};

export function TransactionDialog({
  open,
  editingTxId,
  txAmount,
  txDescription,
  txMethod,
  txCategory,
  txBankCategory,
  txSavingsPercent,
  txCardId,
  cards,
  hasCurrentPeriod,
  onOpenChange,
  onSubmit,
  onTxAmountChange,
  onTxDescriptionChange,
  onTxMethodChange,
  onTxCategoryChange,
  onTxBankCategoryChange,
  onTxSavingsPercentChange,
  onTxCardIdChange,
}: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={!hasCurrentPeriod} title={!hasCurrentPeriod ? "Create a period first" : undefined}>
          {editingTxId ? "Edit Transaction" : "Add Transaction"}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTxId ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          <DialogDescription>
            Record amount and whether this is a debit transaction, card purchase, or bank deposit.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txAmount">
              Amount
            </label>
            <input
              id="txAmount"
              type="number"
              min={0.01}
              step={0.01}
              value={txAmount}
              onChange={(e) => onTxAmountChange(e.target.value)}
              className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txMethod">
              Method
            </label>
            <select
              id="txMethod"
              value={txMethod}
              onChange={(e) => onTxMethodChange(e.target.value as "debit" | "card" | "bank")}
              className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="debit">Debit</option>
              <option value="card">Credit Card</option>
              <option value="bank">Bank Deposit</option>
            </select>
          </div>

          {txMethod !== "bank" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txCategory">
                Category
              </label>
              <select
                id="txCategory"
                value={txCategory}
                onChange={(e) => onTxCategoryChange(e.target.value as "necessary" | "recreation")}
                className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="necessary">Necessary</option>
                <option value="recreation">Recreation</option>
              </select>
            </div>
          )}

          {txMethod === "bank" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txBankCategory">
                Deposit Type
              </label>
              <select
                id="txBankCategory"
                value={txBankCategory}
                onChange={(e) => onTxBankCategoryChange(e.target.value as "transfer" | "salary")}
                className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="transfer">Transfer</option>
                <option value="salary">Salary</option>
              </select>
            </div>
          )}

          {txMethod === "bank" && txBankCategory === "salary" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txSavingsPercent">
                Savings (%)
              </label>
              <input
                id="txSavingsPercent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={txSavingsPercent}
                onChange={(e) => onTxSavingsPercentChange(e.target.value)}
                className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="e.g. 20"
              />
              {txAmount && Number(txAmount) > 0 && Number(txSavingsPercent) > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Savings: ${(Number(txAmount) * Math.min(100, Number(txSavingsPercent)) / 100).toFixed(2)}
                  {" "}- To bank: ${(Number(txAmount) * (1 - Math.min(100, Number(txSavingsPercent)) / 100)).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {txMethod === "card" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txCardId">
                Select Card
              </label>
              <select
                id="txCardId"
                value={txCardId}
                onChange={(e) => onTxCardIdChange(e.target.value)}
                className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                required
              >
                <option value="">Choose a card</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="txDescription">
              Description
            </label>
            <input
              id="txDescription"
              type="text"
              value={txDescription}
              onChange={(e) => onTxDescriptionChange(e.target.value)}
              className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. Grocery, utilities, refund"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">{editingTxId ? "Update Transaction" : "Save Transaction"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
