import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MultiSelectProps {
  options?: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  showSearch?: boolean;
}

export function MultiSelect({
  options = [],
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  showSearch = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  
  // Ensure options is always an array
  const safeOptions = React.useMemo(() => {
    return Array.isArray(options) ? options : [];
  }, [options]);

  // Ensure selected is always an array
  const safeSelected = React.useMemo(() => {
    return Array.isArray(selected) ? selected : [];
  }, [selected]);

  // Don't render if data isn't ready
  if (!Array.isArray(options) || !Array.isArray(selected)) {
    return (
      <Button
        variant="outline"
        className={cn("w-full justify-between min-h-10", className)}
        disabled
      >
        <span className="text-muted-foreground">Loading...</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  const handleUnselect = (item: string) => {
    onChange(safeSelected.filter((i) => i !== item));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between min-h-10 overflow-hidden", className)}
        >
          <div className="flex gap-1 flex-wrap flex-1 overflow-hidden pr-2">
            {safeSelected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {safeSelected.length === safeOptions.length && safeOptions.length > 1 && (
              <span>All Properties Selected</span>
            )}
            {safeSelected.length > 0 && (safeSelected.length < safeOptions.length || safeOptions.length === 1) && (
              <TooltipProvider>
                <>
                  {safeSelected.slice(0, 2).map((item) => {
                    const option = safeOptions.find((o) => o.value === item);
                    const label = option?.label || '';
                    const isTruncated = label.length > 20;
                    
                    return (
                      <Tooltip key={item}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="mr-1 mb-1 max-w-[150px] flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnselect(item);
                            }}
                          >
                            <span className="truncate flex-1 min-w-0">
                              {label}
                            </span>
                            <button
                              className="ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-shrink-0"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleUnselect(item);
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnselect(item);
                              }}
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </Badge>
                        </TooltipTrigger>
                        {isTruncated && (
                          <TooltipContent>
                            <p>{label}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                  {safeSelected.length > 2 && (
                    <Badge variant="secondary" className="mr-1 mb-1">
                      +{safeSelected.length - 2} more
                    </Badge>
                  )}
                </>
              </TooltipProvider>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-full p-0 z-[70] bg-background border shadow-lg" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command>
          {showSearch && <CommandInput placeholder="Search properties..." />}
          <CommandEmpty>No properties found.</CommandEmpty>
          <CommandList>
            <CommandGroup className="max-h-64 overflow-auto">
              {safeOptions.length > 1 && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    if (safeSelected.length === safeOptions.length) {
                      onChange([]);
                    } else {
                      onChange(safeOptions.map((option) => option.value));
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      safeSelected.length === safeOptions.length && safeOptions.length > 1 ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Select All
                </CommandItem>
              )}
              {safeOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(
                      safeSelected.includes(option.value)
                        ? safeSelected.filter((item) => item !== option.value)
                        : [...safeSelected, option.value]
                    );
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      safeSelected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}