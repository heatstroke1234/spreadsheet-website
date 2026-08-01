import { FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  isLoading?: boolean;
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
  isLoading = false,
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
            <Label htmlFor="txAmount">Amount</Label>
            <Input
              id="txAmount"
              type="number"
              min={0.01}
              step={0.01}
              value={txAmount}
              onChange={(e) => onTxAmountChange(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="txMethod">Method</Label>
            <Select
              value={txMethod}
              onValueChange={(value) => onTxMethodChange(value as "debit" | "card" | "bank")}
              disabled={isLoading}
            >
              <SelectTrigger id="txMethod" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="card">Credit Card</SelectItem>
                <SelectItem value="bank">Bank Deposit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {txMethod !== "bank" && (
            <div className="space-y-1">
              <Label htmlFor="txCategory">Category</Label>
              <Select
                value={txCategory}
                onValueChange={(value) => onTxCategoryChange(value as "necessary" | "recreation")}
                disabled={isLoading}
              >
                <SelectTrigger id="txCategory" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="necessary">Necessary</SelectItem>
                  <SelectItem value="recreation">Recreation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {txMethod === "bank" && (
            <div className="space-y-1">
              <Label htmlFor="txBankCategory">Deposit Type</Label>
              <Select
                value={txBankCategory}
                onValueChange={(value) => onTxBankCategoryChange(value as "transfer" | "salary")}
                disabled={isLoading}
              >
                <SelectTrigger id="txBankCategory" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {txMethod === "bank" && txBankCategory === "salary" && (
            <div className="space-y-1">
              <Label htmlFor="txSavingsPercent">Savings (%)</Label>
              <Input
                id="txSavingsPercent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={txSavingsPercent}
                onChange={(e) => onTxSavingsPercentChange(e.target.value)}
                placeholder="e.g. 20"
                disabled={isLoading}
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
              <Label htmlFor="txCardId">Select Card</Label>
              <Select value={txCardId} onValueChange={onTxCardIdChange} disabled={isLoading}>
                <SelectTrigger id="txCardId" className="w-full">
                  <SelectValue placeholder="Choose a card" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="txDescription">Description</Label>
            <Input
              id="txDescription"
              type="text"
              value={txDescription}
              onChange={(e) => onTxDescriptionChange(e.target.value)}
              placeholder="e.g. Grocery, utilities, refund"
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {editingTxId ? "Update Transaction" : "Save Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
