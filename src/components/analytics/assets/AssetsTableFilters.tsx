import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AssetsTableFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedSectors: string[];
  onSectorsChange: (sectors: string[]) => void;
  performanceFilter: 'all' | 'gainers' | 'losers' | 'ytd-gainers' | 'ytd-losers';
  onPerformanceFilterChange: (filter: 'all' | 'gainers' | 'losers' | 'ytd-gainers' | 'ytd-losers') => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const SECTORS = [
  'Cryptocurrency',
  'Stocks & Equities',
  'Real Estate',
  'Bonds & Fixed Income',
  'Commodities',
  'Cash & Equivalents',
  'Alternative Investments',
  'Private Equity & Business',
  'Vehicles & Equipment',
];

export const AssetsTableFilters = ({
  searchQuery,
  onSearchChange,
  selectedSectors,
  onSectorsChange,
  performanceFilter,
  onPerformanceFilterChange,
  onClearFilters,
  hasActiveFilters,
}: AssetsTableFiltersProps) => {
  const handleSectorToggle = (sector: string) => {
    if (selectedSectors.includes(sector)) {
      onSectorsChange(selectedSectors.filter(s => s !== sector));
    } else {
      onSectorsChange([...selectedSectors, sector]);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, symbol, or sector..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Performance Filter */}
      <Select value={performanceFilter} onValueChange={onPerformanceFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="all">All Assets</SelectItem>
          <SelectItem value="gainers">24h Gainers</SelectItem>
          <SelectItem value="losers">24h Losers</SelectItem>
          <SelectItem value="ytd-gainers">YTD Gainers</SelectItem>
          <SelectItem value="ytd-losers">YTD Losers</SelectItem>
        </SelectContent>
      </Select>

      {/* Sector Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Sectors
            {selectedSectors.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                {selectedSectors.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-popover z-50" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filter by Sector</h4>
              {selectedSectors.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSectorsChange([])}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {SECTORS.map((sector) => (
                <div key={sector} className="flex items-center space-x-2">
                  <Checkbox
                    id={sector}
                    checked={selectedSectors.includes(sector)}
                    onCheckedChange={() => handleSectorToggle(sector)}
                  />
                  <Label
                    htmlFor={sector}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {sector}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="w-full sm:w-auto"
        >
          <X className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      )}
    </div>
  );
};