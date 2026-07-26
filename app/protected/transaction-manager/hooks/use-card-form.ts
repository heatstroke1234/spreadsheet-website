import { FormEvent, useState } from "react";
import { CreditCard, Period } from "../types";

type UpdatePeriodData = (
  data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
) => Promise<void>;

type CreateCard = (periodId: string, card: CreditCard) => Promise<CreditCard>;
type UpdateCard = (cardId: string, card: Partial<CreditCard>) => Promise<CreditCard>;
type DeleteCard = (cardId: string) => Promise<void>;

type UseCardFormParams = {
  cards: CreditCard[];
  visibleCardIds: Record<string, boolean>;
  setCards: (cards: CreditCard[]) => void;
  setVisibleCardIds: (visibleCardIds: Record<string, boolean>) => void;
  updateCurrentPeriodData: UpdatePeriodData;
  periodId?: string;
  createCard?: CreateCard;
  updateCard?: UpdateCard;
  deleteCard?: DeleteCard;
};

export function useCardForm({
  cards,
  visibleCardIds,
  setCards,
  setVisibleCardIds,
  updateCurrentPeriodData,
  periodId,
  createCard,
  updateCard,
  deleteCard: deleteCardFn,
}: UseCardFormParams) {
  const [cardName, setCardName] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [cardColor, setCardColor] = useState("#0ea5e9");
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingCardIds, setDeletingCardIds] = useState<Set<string>>(new Set());

  const resetCardForm = () => {
    setCardName("");
    setCardLimit("");
    setCardColor("#0ea5e9");
    setEditingCardId("");
  };

  const onCardDialogOpenChange = (open: boolean) => {
    setCardDialogOpen(open);
    if (!open) {
      resetCardForm();
    }
  };

  const startEditCard = (card: CreditCard) => {
    setCardName(card.name);
    setCardLimit(String(card.limit));
    setCardColor(card.color);
    setEditingCardId(card.id);
    setCardDialogOpen(true);
  };

  const addCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const trimmedName = cardName.trim();
    const amount = Number(cardLimit);

    if (!trimmedName || Number.isNaN(amount) || amount <= 0) {
      setIsLoading(false);
      return;
    }

    try {
      if (editingCardId) {
        // Use granular update if available
        if (updateCard) {
          try {
            const updated = await updateCard(editingCardId, { name: trimmedName, limit: amount, color: cardColor });
            const updatedCards = cards.map((card) =>
              card.id === editingCardId ? { ...card, name: updated.name, limit: updated.limit, color: updated.color } : card
            );
            setCards(updatedCards);
          } catch (error) {
            console.error("Failed to update card:", error);
            // Fallback to local state
            const updatedCards = cards.map((card) =>
              card.id === editingCardId ? { ...card, name: trimmedName, limit: amount, color: cardColor } : card
            );
            setCards(updatedCards);
            await updateCurrentPeriodData({ cards: updatedCards });
          }
        } else {
          const updatedCards = cards.map((card) =>
            card.id === editingCardId ? { ...card, name: trimmedName, limit: amount, color: cardColor } : card
          );
          setCards(updatedCards);
          await updateCurrentPeriodData({ cards: updatedCards });
        }
        setEditingCardId("");
      } else {
        const newCard: CreditCard = {
          id: crypto.randomUUID(),
          name: trimmedName,
          limit: amount,
          color: cardColor,
        };

        // Use granular create if available
        if (createCard && periodId) {
          try {
            const created = await createCard(periodId, newCard);
            const updatedCards = [created, ...cards];
            setCards(updatedCards);
            const updatedVisibleCardIds = { ...visibleCardIds, [created.id]: true };
            setVisibleCardIds(updatedVisibleCardIds);
          } catch (error) {
            console.error("Failed to create card:", error);
            // Fallback to local state
            const updatedCards = [newCard, ...cards];
            setCards(updatedCards);
            const updatedVisibleCardIds = { ...visibleCardIds, [newCard.id]: true };
            setVisibleCardIds(updatedVisibleCardIds);
            await updateCurrentPeriodData({ cards: updatedCards, visibleCardIds: updatedVisibleCardIds });
          }
        } else {
          const updatedCards = [newCard, ...cards];
          setCards(updatedCards);
          const updatedVisibleCardIds = { ...visibleCardIds, [newCard.id]: true };
          setVisibleCardIds(updatedVisibleCardIds);
          await updateCurrentPeriodData({ cards: updatedCards, visibleCardIds: updatedVisibleCardIds });
        }
      }

      resetCardForm();
      setCardDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose delete function for use by parent component
  const deleteCard = async (cardId: string) => {
    setDeletingCardIds((prev) => new Set(prev).add(cardId));
    try {
      if (deleteCardFn) {
        try {
          await deleteCardFn(cardId);
        } catch (error) {
          console.error("Failed to delete card:", error);
          // Fallback to local state
          const updatedCards = cards.filter((card) => card.id !== cardId);
          const updatedVisibleCardIds = { ...visibleCardIds };
          delete updatedVisibleCardIds[cardId];
          setCards(updatedCards);
          setVisibleCardIds(updatedVisibleCardIds);
          await updateCurrentPeriodData({ cards: updatedCards, visibleCardIds: updatedVisibleCardIds });
        }
      }
    } finally {
      setDeletingCardIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  return {
    cardName,
    setCardName,
    cardLimit,
    setCardLimit,
    cardColor,
    setCardColor,
    cardDialogOpen,
    editingCardId,
    addCard,
    startEditCard,
    onCardDialogOpenChange,
    deleteCard,
    isLoading,
    deletingCardIds,
  };
}
