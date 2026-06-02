import * as React from "react";
import { ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface SimpleDropdownSelectProps {
  options?: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  allLabel?: string; // New prop for "All" option label
  searchPlaceholder?: string; // New prop for search input placeholder
  showSearch?: boolean; // New prop to control search visibility
  noOptionsMessage?: string; // New prop for custom no options message
}

export function SimpleDropdownSelect({
  options = [],
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  allLabel,
  searchPlaceholder = "Search items...",
  showSearch = true,
  noOptionsMessage,
}: SimpleDropdownSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  
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

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!showSearch || !searchTerm.trim()) return safeOptions;
    return safeOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [safeOptions, searchTerm, showSearch]);

  const handleUnselect = (item: string) => {
    onChange(safeSelected.filter((i) => i !== item));
  };

  const handleSelectAll = () => {
    if (safeSelected.length === safeOptions.length) {
      onChange([]);
    } else {
      onChange(safeOptions.map((option) => option.value));
    }
  };

  const handleAllOptionToggle = () => {
    if (safeSelected.length === safeOptions.length) {
      onChange([]);
    } else {
      onChange(safeOptions.map((option) => option.value));
    }
  };

  const handleItemSelect = (optionValue: string) => {
    onChange(
      safeSelected.includes(optionValue)
        ? safeSelected.filter((item) => item !== optionValue)
        : [...safeSelected, optionValue]
    );
  };

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearchTerm(""); // Clear search when closing
      }
    }}>
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
            {safeSelected.length === safeOptions.length && safeOptions.length > 0 && (
              <span>{allLabel || `All ${safeOptions.length} selected`}</span>
            )}
            {safeSelected.length > 0 && safeSelected.length < safeOptions.length && (
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
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-3 space-y-2">
          {/* Search Input */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          
          {/* Scrollable Options */}
          <ScrollArea className="max-h-80">
            <div className="space-y-1">
              {/* All Items Option */}
              {allLabel && safeOptions.length > 0 && (
                <>
                  <div
                    className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground font-medium"
                    onClick={handleAllOptionToggle}
                  >
                    <Checkbox
                      checked={safeSelected.length === safeOptions.length}
                      className="mr-2"
                    />
                    {allLabel}
                  </div>
                  <div className="border-t border-border my-1"></div>
                </>
              )}
              
              {/* Select All Option (for filtered results) */}
              {filteredOptions.length > 0 && !allLabel && (
                <div
                  className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={handleSelectAll}
                >
                  <Checkbox
                    checked={safeSelected.length === filteredOptions.length && filteredOptions.length > 0}
                    className="mr-2"
                  />
                  Select All ({filteredOptions.length})
                </div>
              )}
              
              {/* Individual Options */}
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleItemSelect(option.value)}
                >
                  <Checkbox
                    checked={safeSelected.includes(option.value)}
                    className="mr-2"
                  />
                  <span className="truncate">{option.label}</span>
                </div>
              ))}
              
              {/* No Results Message */}
              {filteredOptions.length === 0 && searchTerm && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  No items found matching "{searchTerm}"
                </div>
              )}
              
              {/* No Options Message */}
              {safeOptions.length === 0 && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  {noOptionsMessage || "No items available"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}