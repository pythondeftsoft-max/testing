import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  value: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onChange: (value: { from: Date | undefined; to: Date | undefined }) => void;
  className?: string;
}

const presetRanges = [
  {
    label: 'Monthly',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date()
    })
  },
  {
    label: '3 Month',
    getValue: () => ({
      from: subDays(new Date(), 90),
      to: new Date()
    })
  },
  {
    label: '6 Monthly',
    getValue: () => ({
      from: subDays(new Date(), 180),
      to: new Date()
    })
  },
  {
    label: 'Year to Date',
    getValue: () => ({
      from: startOfYear(new Date()),
      to: new Date()
    })
  },
  {
    label: 'Year',
    getValue: () => ({
      from: subDays(new Date(), 365),
      to: new Date()
    })
  },
  {
    label: '5 Year',
    getValue: () => ({
      from: subDays(new Date(), 1825),
      to: new Date()
    })
  },
  {
    label: 'All Time',
    getValue: () => ({
      from: new Date(2020, 0, 1),
      to: new Date()
    })
  }
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {/* Date Range Display and Custom Button Row */}
      <div className="flex gap-1 w-[482px]">
        {/* Date Range Display */}
        <Button
          variant="outline"
          className={cn(
            "w-[413px] justify-start text-left font-normal h-9",
            !value && "text-muted-foreground"
          )}
          disabled
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "MMM dd, y")} - {format(value.to, "MMM dd, y")}
              </>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
        
        {/* Custom Date Picker Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3"
            >
              Custom
              <CalendarIcon className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={(range) => {
                if (range?.from && (!range?.to || range.from.getTime() === range.to.getTime())) {
                  // Single date clicked - update end date while preserving start date
                  const clickedDate = range.from;
                  const currentStart = value?.from;
                  
                  if (currentStart) {
                    // If clicked date is before start date, swap them
                    if (clickedDate < currentStart) {
                      onChange({ from: clickedDate, to: currentStart });
                    } else {
                      onChange({ from: currentStart, to: clickedDate });
                    }
                  } else {
                    // No start date yet, set both to clicked date
                    onChange({ from: clickedDate, to: clickedDate });
                  }
                } else {
                  // Normal range selection
                  onChange({
                    from: range?.from,
                    to: range?.to
                  });
                }
              }}
              numberOfMonths={1}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Preset Buttons Row */}
      <div className="flex gap-1 w-[482px]">
        {presetRanges.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="h-8 px-1 text-xs flex-1"
            onClick={() => onChange(preset.getValue())}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}