import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, endOfMonth, endOfQuarter, endOfYear, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface AsOfDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

const presetDates = [
  {
    label: 'Monthly',
    getValue: () => endOfMonth(new Date())
  },
  {
    label: '3 Month',
    getValue: () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return endOfMonth(threeMonthsAgo);
    }
  },
  {
    label: '6 Month',
    getValue: () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return endOfMonth(sixMonthsAgo);
    }
  },
  {
    label: 'Year to Date',
    getValue: () => new Date()
  },
  {
    label: 'Year',
    getValue: () => endOfYear(new Date())
  },
  {
    label: '5 Year',
    getValue: () => {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      return endOfYear(fiveYearsAgo);
    }
  },
  {
    label: 'All Time',
    getValue: () => {
      const allTime = new Date();
      allTime.setFullYear(2000, 0, 1); // January 1, 2000
      return allTime;
    }
  }
];

export function AsOfDatePicker({ value, onChange, className }: AsOfDatePickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Date Display and Custom Button Row */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className={cn(
            "w-56 justify-start text-left font-normal h-10",
            !value && "text-muted-foreground"
          )}
          disabled
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MMM dd, y") : <span>Pick a date</span>}
        </Button>
        
        {/* Custom Date Picker Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 text-xs"
            >
              Custom
              <CalendarIcon className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="single"
              selected={value}
              onSelect={(date) => date && onChange(date)}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Preset Buttons Row */}
      <div className="flex gap-1">
        {presetDates.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onChange(preset.getValue())}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}