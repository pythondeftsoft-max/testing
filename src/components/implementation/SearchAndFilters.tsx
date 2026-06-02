import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategories: string[];
  selectedPriorities: string[];
  selectedStatuses: string[];
  onCategoryToggle: (category: string) => void;
  onPriorityToggle: (priority: string) => void;
  onStatusToggle: (status: string) => void;
  onClearFilters: () => void;
  categories: string[];
  priorities: string[];
  statuses: string[];
  showCompleted: 'all' | 'hide' | 'only';
  onShowCompletedChange: (value: 'all' | 'hide' | 'only') => void;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategories,
  selectedPriorities,
  selectedStatuses,
  onCategoryToggle,
  onPriorityToggle,
  onStatusToggle,
  onClearFilters,
  categories,
  priorities,
  statuses,
  showCompleted,
  onShowCompletedChange,
}) => {
  const activeFilterCount =
    selectedCategories.length + selectedPriorities.length + selectedStatuses.length +
    (showCompleted !== 'all' ? 1 : 0);

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="h-8 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium mb-2 block">Category</Label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center gap-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => onCategoryToggle(category)}
                      />
                      <label
                        htmlFor={`category-${category}`}
                        className="text-sm cursor-pointer"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Priority</Label>
                <div className="space-y-2">
                  {priorities.map((priority) => (
                    <div key={priority} className="flex items-center gap-2">
                      <Checkbox
                        id={`priority-${priority}`}
                        checked={selectedPriorities.includes(priority)}
                        onCheckedChange={() => onPriorityToggle(priority)}
                      />
                      <label
                        htmlFor={`priority-${priority}`}
                        className="text-sm cursor-pointer"
                      >
                        {priority}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <div className="space-y-2">
                  {statuses.map((status) => (
                    <div key={status} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={selectedStatuses.includes(status)}
                        onCheckedChange={() => onStatusToggle(status)}
                      />
                      <label
                        htmlFor={`status-${status}`}
                        className="text-sm cursor-pointer"
                      >
                        {status}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Completed Tasks</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-all"
                      checked={showCompleted === 'all'}
                      onCheckedChange={() => onShowCompletedChange('all')}
                    />
                    <label htmlFor="show-all" className="text-sm cursor-pointer">
                      Show All
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hide-completed"
                      checked={showCompleted === 'hide'}
                      onCheckedChange={() => onShowCompletedChange('hide')}
                    />
                    <label htmlFor="hide-completed" className="text-sm cursor-pointer">
                      Hide Completed
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="only-completed"
                      checked={showCompleted === 'only'}
                      onCheckedChange={() => onShowCompletedChange('only')}
                    />
                    <label htmlFor="only-completed" className="text-sm cursor-pointer">
                      Only Completed
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSearchChange('')}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Clear search
        </Button>
      )}
    </div>
  );
};
