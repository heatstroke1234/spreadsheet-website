import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Period, PeriodSummary } from "../types";

const RECENT_PERIODS_LIMIT = 8;

type PeriodMenuProps = {
  periods: PeriodSummary[];
  currentPeriod?: Period;
  onSwitchPeriod: (periodId: string) => void;
  onCreatePeriod: () => void;
  onDeleteCurrentPeriod: () => void;
};

function PeriodListItem({
  period,
  isCurrent,
  onSelect,
}: {
  period: PeriodSummary;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={isCurrent ? "bg-zinc-100 dark:bg-zinc-800" : ""}
    >
      <div className="flex w-full items-center justify-between">
        <span className="truncate">{period.name}</span>
        {isCurrent && <span className="ml-2 text-xs text-zinc-500">current</span>}
      </div>
    </DropdownMenuItem>
  );
}

export function PeriodMenu({
  periods,
  currentPeriod,
  onSwitchPeriod,
  onCreatePeriod,
  onDeleteCurrentPeriod,
}: PeriodMenuProps) {
  const [allPeriodsOpen, setAllPeriodsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const sortedPeriods = useMemo(
    () =>
      [...periods].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [periods]
  );

  const recentPeriods = sortedPeriods.slice(0, RECENT_PERIODS_LIMIT);
  const hasMorePeriods = sortedPeriods.length > RECENT_PERIODS_LIMIT;

  const filteredPeriods = useMemo(() => {
    if (!search.trim()) return sortedPeriods;
    const query = search.trim().toLowerCase();
    return sortedPeriods.filter((period) => period.name.toLowerCase().includes(query));
  }, [sortedPeriods, search]);

  const handleSwitchFromDialog = (periodId: string) => {
    onSwitchPeriod(periodId);
    setAllPeriodsOpen(false);
    setSearch("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Periods {periods.length > 0 && `(${periods.length})`}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {periods.length === 0 ? (
            <div className="px-2 py-1 text-xs text-zinc-500">No periods yet</div>
          ) : (
            <>
              {recentPeriods.map((period) => (
                <PeriodListItem
                  key={period.id}
                  period={period}
                  isCurrent={period.id === currentPeriod?.id}
                  onSelect={() => onSwitchPeriod(period.id)}
                />
              ))}
              {hasMorePeriods && (
                <DropdownMenuItem onClick={() => setAllPeriodsOpen(true)}>
                  All periods…
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCreatePeriod}>Create New Period</DropdownMenuItem>
              {currentPeriod && periods.length > 1 && (
                <DropdownMenuItem
                  onClick={onDeleteCurrentPeriod}
                  className="text-red-600 dark:text-red-400"
                >
                  Delete Current Period
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={allPeriodsOpen}
        onOpenChange={(open) => {
          setAllPeriodsOpen(open);
          if (!open) setSearch("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>All Periods</DialogTitle>
            <DialogDescription>Search and switch to any period.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Search periods…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {filteredPeriods.length === 0 ? (
              <div className="px-2 py-1 text-xs text-zinc-500">No periods match your search</div>
            ) : (
              filteredPeriods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => handleSwitchFromDialog(period.id)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    period.id === currentPeriod?.id ? "bg-zinc-100 dark:bg-zinc-800" : ""
                  }`}
                >
                  <span className="truncate">{period.name}</span>
                  {period.id === currentPeriod?.id && (
                    <span className="ml-2 text-xs text-zinc-500">current</span>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
