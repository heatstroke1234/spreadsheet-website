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
import { CreditCard } from "../types";

type CardDeleteDialogProps = {
  open: boolean;
  cardToDelete: CreditCard | null;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
};

export function CardDeleteDialog({
  open,
  cardToDelete,
  onOpenChange,
  onConfirmDelete,
}: CardDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Credit Card</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the credit card &quot;{cardToDelete?.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirmDelete}>
            Delete Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
