import { FormEvent, useState } from "react";
import { CreditCard, Period } from "../types";

type UpdatePeriodData = (
  data: Partial<Pick<Period, "cards" | "transactions" | "bankTotal" | "totalSavings" | "visibleCardIds">>
) => void;

type UseCardFormParams = {
  cards: CreditCard[];
  visibleCardIds: Record<string, boolean>;
  setCards: (cards: CreditCard[]) => void;
  setVisibleCardIds: (visibleCardIds: Record<string, boolean>) => void;
  updateCurrentPeriodData: UpdatePeriodData;
};

export function useCardForm({
  cards,
  visibleCardIds,
  setCards,
  setVisibleCardIds,
  updateCurrentPeriodData,
}: UseCardFormParams) {
  const [cardName, setCardName] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [cardColor, setCardColor] = useState("#0ea5e9");
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string>("");

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

  const addCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = cardName.trim();
    const amount = Number(cardLimit);

    if (!trimmedName || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    if (editingCardId) {
      const updatedCards = cards.map((card) =>
        card.id === editingCardId ? { ...card, name: trimmedName, limit: amount, color: cardColor } : card
      );
      setCards(updatedCards);
      updateCurrentPeriodData({ cards: updatedCards });
      setEditingCardId("");
    } else {
      const newCard: CreditCard = {
        id: crypto.randomUUID(),
        name: trimmedName,
        limit: amount,
        color: cardColor,
      };
      const updatedCards = [newCard, ...cards];
      setCards(updatedCards);
      const updatedVisibleCardIds = { ...visibleCardIds, [newCard.id]: true };
      setVisibleCardIds(updatedVisibleCardIds);
      updateCurrentPeriodData({ cards: updatedCards, visibleCardIds: updatedVisibleCardIds });
    }

    resetCardForm();
    setCardDialogOpen(false);
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
  };
}
