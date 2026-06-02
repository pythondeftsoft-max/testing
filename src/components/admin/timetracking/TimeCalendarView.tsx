import React from 'react';
import { WorkerTimeEntry } from '@/hooks/useWorkerTimeEntries';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';

interface TimeCalendarViewProps {
  entries: WorkerTimeEntry[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

function getHoursForDay(entries: WorkerTimeEntry[], day: Date): number {
  return entries
    .filter(e => isSameDay(new Date(e.clock_in), day))
    .reduce((sum, e) => {
      if (!e.clock_out) return sum;
      const diff = (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3600000;
      return sum + diff;
    }, 0);
}

function getColorClass(hours: number): string {
  if (hours === 0) return '';
  if (hours < 4) return 'bg-primary/20 text-primary';
  if (hours < 8) return 'bg-primary/40 text-primary-foreground';
  return 'bg-primary/70 text-primary-foreground';
}

export function TimeCalendarView({ entries, currentMonth, onMonthChange }: TimeCalendarViewProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const prevMonth = () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="font-medium py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day, i) => {
          const hours = getHoursForDay(entries, day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={i}
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors',
                !inMonth && 'opacity-30',
                today && 'ring-2 ring-primary',
                getColorClass(hours)
              )}
            >
              <span className="font-medium">{format(day, 'd')}</span>
              {hours > 0 && <span className="text-[10px] leading-none mt-0.5">{hours.toFixed(1)}h</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/20" /> &lt;4h</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/40" /> 4-8h</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/70" /> 8h+</div>
      </div>
    </div>
  );
}
