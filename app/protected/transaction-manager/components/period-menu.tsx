import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Period } from "../types";

type PeriodMenuProps = {
  periods: Period[];
  currentPeriod?: Period;
  onSwitchPeriod: (periodId: string) => void;
  onCreatePeriod: () => void;
  onDeleteCurrentPeriod: () => void;
};

export function PeriodMenu({
  periods,
  currentPeriod,
  onSwitchPeriod,
  onCreatePeriod,
  onDeleteCurrentPeriod,
}: PeriodMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Periods {periods.length > 0 && `(${periods.length})`}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {periods.length === 0 ? (
          <div className="px-2 py-1 text-xs text-zinc-500">No periods yet</div>
        ) : (
          <>
            {periods
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((period) => (
                <DropdownMenuItem
                  key={period.id}
                  onClick={() => onSwitchPeriod(period.id)}
                  className={period.id === currentPeriod?.id ? "bg-zinc-100 dark:bg-zinc-800" : ""}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="truncate">{period.name}</span>
                    {period.id === currentPeriod?.id && (
                      <span className="ml-2 text-xs text-zinc-500">current</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
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
  );
}
