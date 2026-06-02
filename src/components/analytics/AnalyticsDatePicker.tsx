import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AnalyticsDatePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (start: Date, end: Date) => void;
}

const AnalyticsDatePicker = ({ startDate, endDate, onDateRangeChange }: AnalyticsDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState({ from: startDate, to: endDate });

  const presetRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'Last year', days: 365 },
  ];

  const handlePresetSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setSelectedRange({ from: start, to: end });
    onDateRangeChange(start, end);
    setIsOpen(false);
  };

  const handleCustomRangeSelect = (range: any) => {
    if (range?.from && (!range?.to || range.from.getTime() === range.to.getTime())) {
      // Single date clicked - update end date while preserving start date
      const clickedDate = range.from;
      const currentStart = selectedRange?.from;
      
      if (currentStart) {
        // If clicked date is before start date, swap them
        if (clickedDate < currentStart) {
          const newRange = { from: clickedDate, to: currentStart };
          setSelectedRange(newRange);
          onDateRangeChange(clickedDate, currentStart);
        } else {
          const newRange = { from: currentStart, to: clickedDate };
          setSelectedRange(newRange);
          onDateRangeChange(currentStart, clickedDate);
        }
      } else {
        // No start date yet, set both to clicked date
        const newRange = { from: clickedDate, to: clickedDate };
        setSelectedRange(newRange);
        onDateRangeChange(clickedDate, clickedDate);
      }
      setIsOpen(false);
    } else if (range?.from && range?.to) {
      // Normal range selection
      setSelectedRange(range);
      onDateRangeChange(range.from, range.to);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !selectedRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedRange?.from ? (
            selectedRange.to ? (
              <>
                {format(selectedRange.from, "LLL dd, y")} -{" "}
                {format(selectedRange.to, "LLL dd, y")}
              </>
            ) : (
              format(selectedRange.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Quick ranges</p>
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handlePresetSelect(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selectedRange?.from}
              selected={selectedRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AnalyticsDatePicker;