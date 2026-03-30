import { FormEvent, useState } from "react";

type UsePeriodManagementParams = {
  onCreatePeriod: (name: string) => void;
  onSwitchPeriod: (periodId: string) => void;
  onDeletePeriod: (periodId: string) => void;
  setTxPage: (page: number) => void;
};

export function usePeriodManagement({
  onCreatePeriod,
  onSwitchPeriod,
  onDeletePeriod,
  setTxPage,
}: UsePeriodManagementParams) {
  const [newPeriodName, setNewPeriodName] = useState("");
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);

  const handleCreatePeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPeriodName.trim()) {
      onCreatePeriod(newPeriodName.trim());
      setNewPeriodName("");
      setPeriodDialogOpen(false);
    }
  };

  const handleSwitchPeriod = (periodId: string) => {
    onSwitchPeriod(periodId);
    setTxPage(1);
  };

  const handleDeletePeriod = (periodId: string) => {
    onDeletePeriod(periodId);
  };

  return {
    newPeriodName,
    setNewPeriodName,
    periodDialogOpen,
    setPeriodDialogOpen,
    handleCreatePeriod,
    handleSwitchPeriod,
    handleDeletePeriod,
  };
}
