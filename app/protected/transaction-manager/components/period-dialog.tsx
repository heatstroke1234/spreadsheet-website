import { FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PeriodDialogProps = {
  open: boolean;
  newPeriodName: string;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onNewPeriodNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PeriodDialog({
  open,
  newPeriodName,
  isLoading = false,
  onOpenChange,
  onNewPeriodNameChange,
  onSubmit,
}: PeriodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Period</DialogTitle>
          <DialogDescription>Enter a name for the new financial period.</DialogDescription>
        </DialogHeader>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newPeriodName">
              Period name
            </label>
            <input
              id="newPeriodName"
              value={newPeriodName}
              onChange={(e) => onNewPeriodNameChange(e.target.value)}
              className="w-full rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder={`e.g. January ${new Date().getFullYear()}, Q1 ${new Date().getFullYear()}`}
              required
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
              Create Period
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
