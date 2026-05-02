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

type CardDialogProps = {
  open: boolean;
  editingCardId: string;
  cardName: string;
  cardLimit: string;
  cardColor: string;
  hasCurrentPeriod: boolean;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCardNameChange: (value: string) => void;
  onCardLimitChange: (value: string) => void;
  onCardColorChange: (value: string) => void;
};

export function CardDialog({
  open,
  editingCardId,
  cardName,
  cardLimit,
  cardColor,
  hasCurrentPeriod,
  isLoading = false,
  onOpenChange,
  onSubmit,
  onCardNameChange,
  onCardLimitChange,
  onCardColorChange,
}: CardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={!hasCurrentPeriod} title={!hasCurrentPeriod ? "Create a period first" : undefined}>
          {editingCardId ? "Edit Card" : "Add Card"}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCardId ? "Edit Credit Card" : "Add New Credit Card"}</DialogTitle>
          <DialogDescription>Enter the card name, limit, and color.</DialogDescription>
        </DialogHeader>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newCardName">
              Card name
            </label>
            <input
              id="newCardName"
              value={cardName}
              onChange={(e) => onCardNameChange(e.target.value)}
              className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newCardLimit">
              Limit
            </label>
            <input
              id="newCardLimit"
              type="number"
              min={1}
              value={cardLimit}
              onChange={(e) => onCardLimitChange(e.target.value)}
              className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newCardColor">
              Color
            </label>
            <input
              id="newCardColor"
              type="color"
              value={cardColor}
              onChange={(e) => onCardColorChange(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border-0 p-0"
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
              {editingCardId ? "Update Card" : "Save Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
