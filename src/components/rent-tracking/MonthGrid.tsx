import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthGridProps {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  trackedMonths: Set<string>;
  selectedMonths: Set<string>;
  onToggle: (key: string) => void;
  onSelectAllUntracked: () => void;
}

/** Generate "YYYY-MM" keys from start to end inclusive */
function generateMonthKeys(startMonth: number, startYear: number, endMonth: number, endYear: number) {
  const keys: string[] = [];
  let y = startYear;
  let m = startMonth;
  const endVal = endYear * 12 + endMonth;
  while (y * 12 + m <= endVal) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return keys;
}

const MonthGrid = ({
  startMonth, startYear, endMonth, endYear,
  trackedMonths, selectedMonths, onToggle, onSelectAllUntracked,
}: MonthGridProps) => {
  const keys = generateMonthKeys(startMonth, startYear, endMonth, endYear);
  const untrackedCount = keys.filter(k => !trackedMonths.has(k)).length;
  const allUntrackedSelected = untrackedCount > 0 && keys.every(k => trackedMonths.has(k) || selectedMonths.has(k));

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-foreground">Select months this proof covers:</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {keys.map(key => {
          const [yearStr, monthStr] = key.split('-');
          const label = `${MONTH_LABELS[parseInt(monthStr, 10) - 1]} ${yearStr}`;
          const isTracked = trackedMonths.has(key);
          const isSelected = selectedMonths.has(key);

          return (
            <button
              key={key}
              type="button"
              disabled={isTracked}
              onClick={() => onToggle(key)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors',
                isTracked
                  ? 'border-border bg-muted/50 text-muted-foreground cursor-not-allowed'
                  : isSelected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
              )}
            >
              {isTracked ? (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <Checkbox
                  checked={isSelected}
                  tabIndex={-1}
                  className="pointer-events-none h-3.5 w-3.5"
                />
              )}
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
      {untrackedCount > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSelectAllUntracked}
          className="w-full"
        >
          {allUntrackedSelected ? 'Deselect All' : `Select All Untracked (${untrackedCount})`}
        </Button>
      )}
    </div>
  );
};

export default MonthGrid;
