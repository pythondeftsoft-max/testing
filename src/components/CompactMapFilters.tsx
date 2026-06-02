import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { sanitizeInput, validateNumericInput, validateLocationInput, validateZipcode } from '@/utils/inputValidation';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';
import { useCallback, useRef, useEffect } from 'react';
import { LocationAutocompleteInput } from '@/components/forms/LocationAutocompleteInput';

interface CompactMapFiltersProps {
  filters: {
    search: string;
    zipcode: string;
    city: string;
    state: string;
    minRent: string;
    maxRent: string;
    bedrooms: string;
    bathrooms: string;
    propertyType: string[];
    minSquareFeet: string;
    maxSquareFeet: string;
    yearBuilt: string;
    parkingType: string[];
    petPolicy: string[];
    furnished: string;
    laundryType: string[];
    airConditioning: string;
    utilitiesIncluded: string[];
    appliancesIncluded: string[];
    moveInDate: string;
    additionalFeatures: string[];
    securityFeatures: string[];
    communityAmenities: string[];
  };
  onFiltersChange: (filters: any) => void;
}

const CompactMapFilters = ({ filters, onFiltersChange }: CompactMapFiltersProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate: logEvent } = useMarketplaceEvents();
  const searchTimeoutRef = useRef<number | null>(null);

  const debouncedLogSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = window.setTimeout(() => {
      logEvent({ 
        eventType: 'search_performed',
        metadata: { 
          trigger: 'filter_change',
          hasSearch: !!filters.search,
          hasLocation: !!(filters.city || filters.state || filters.zipcode),
          hasPriceRange: !!(filters.minRent || filters.maxRent),
          hasRoomFilters: !!(filters.bedrooms || filters.bathrooms)
        }
      });
    }, 500);
  }, [logEvent, filters]);

  const updateFilter = (key: string, value: string | string[]) => {
    try {
      setError(null);
      let sanitizedValue = value;
      
      if (typeof value === 'string') {
        switch (key) {
          case 'search':
          case 'city':
          case 'state':
            sanitizedValue = validateLocationInput(value);
            break;
          case 'zipcode':
            sanitizedValue = validateZipcode(value);
            break;
          case 'minRent':
          case 'maxRent':
            const numValue = validateNumericInput(value);
            sanitizedValue = numValue !== null ? numValue.toString() : '';
            break;
          default:
            sanitizedValue = sanitizeInput(value);
        }
      }
      
      onFiltersChange({ ...filters, [key]: sanitizedValue });
      
      // Log search event with debouncing for filter changes
      debouncedLogSearch();
    } catch (err) {
      console.error('Error updating filter:', err);
      setError('An error occurred while updating filters');
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const clearAllFilters = () => {
    const clearedFilters = {
      search: '',
      zipcode: '',
      city: '',
      state: '',
      minRent: '',
      maxRent: '',
      bedrooms: '',
      bathrooms: '',
      propertyType: [],
      minSquareFeet: '',
      maxSquareFeet: '',
      yearBuilt: '',
      parkingType: [],
      petPolicy: [],
      furnished: '',
      laundryType: [],
      airConditioning: '',
      utilitiesIncluded: [],
      appliancesIncluded: [],
      moveInDate: '',
      additionalFeatures: [],
      securityFeatures: [],
      communityAmenities: [],
    };
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    const activeFilters = Object.entries(filters).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== '';
    });
    return activeFilters.length;
  };

  const formatLocationValue = () => {
    const parts = [filters.city, filters.state, filters.zipcode].filter(Boolean);
    return parts.join(', ') || '';
  };

  const formatPriceRange = () => {
    if (filters.minRent && filters.maxRent) {
      return `$${filters.minRent} - $${filters.maxRent}`;
    } else if (filters.minRent) {
      return `$${filters.minRent}+`;
    } else if (filters.maxRent) {
      return `Up to $${filters.maxRent}`;
    }
    return '';
  };

  const formatRoomInfo = () => {
    const parts = [];
    if (filters.bedrooms && filters.bedrooms !== 'any') {
      parts.push(`${filters.bedrooms}+ bed`);
    }
    if (filters.bathrooms && filters.bathrooms !== 'any') {
      parts.push(`${filters.bathrooms}+ bath`);
    }
    return parts.join(', ');
  };

  return (
    <div className="bg-background border rounded-lg p-3 space-y-3">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-2 rounded">
          {error}
        </div>
      )}
      {/* Top Row - Essential Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search by address, city, or zip..."
            className="pl-10 h-9"
          />
        </div>

        {/* Location Input with Autocomplete */}
        <LocationAutocompleteInput
          value={formatLocationValue()}
          onLocationSelect={(location) => {
            updateFilter('city', location.city);
            updateFilter('state', location.state);
            updateFilter('zipcode', location.zipcode);
          }}
          placeholder="City, State Zip"
          className="w-[180px] h-9"
        />

        {/* Price Range */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={filters.minRent}
            onChange={(e) => updateFilter('minRent', e.target.value)}
            placeholder="Min $"
            className="w-[80px] h-9"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            value={filters.maxRent}
            onChange={(e) => updateFilter('maxRent', e.target.value)}
            placeholder="Max $"
            className="w-[80px] h-9"
          />
        </div>

        {/* Bedrooms */}
        <Select value={filters.bedrooms} onValueChange={(value) => updateFilter('bedrooms', value)}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue placeholder="Beds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="1">1+ bed</SelectItem>
            <SelectItem value="2">2+ bed</SelectItem>
            <SelectItem value="3">3+ bed</SelectItem>
            <SelectItem value="4">4+ bed</SelectItem>
          </SelectContent>
        </Select>

        {/* Bathrooms */}
        <Select value={filters.bathrooms} onValueChange={(value) => updateFilter('bathrooms', value)}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue placeholder="Baths" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="1">1+ bath</SelectItem>
            <SelectItem value="1.5">1.5+ bath</SelectItem>
            <SelectItem value="2">2+ bath</SelectItem>
            <SelectItem value="3">3+ bath</SelectItem>
          </SelectContent>
        </Select>

        {/* More Filters */}
        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              More
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Advanced Filters</h4>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Min Sq Ft</label>
                  <Input
                    type="number"
                    value={filters.minSquareFeet}
                    onChange={(e) => updateFilter('minSquareFeet', e.target.value)}
                    placeholder="500"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Sq Ft</label>
                  <Input
                    type="number"
                    value={filters.maxSquareFeet}
                    onChange={(e) => updateFilter('maxSquareFeet', e.target.value)}
                    placeholder="2000"
                    className="h-8"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Year Built</label>
                <Input
                  type="number"
                  value={filters.yearBuilt}
                  onChange={(e) => updateFilter('yearBuilt', e.target.value)}
                  placeholder="2000"
                  className="h-8"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {getActiveFiltersCount() > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Badges */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.search && (
            <Badge variant="secondary" className="text-xs">
              Search: {filters.search}
              <button
                onClick={() => updateFilter('search', '')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {formatLocationValue() && (
            <Badge variant="secondary" className="text-xs">
              Location: {formatLocationValue()}
              <button
                onClick={() => {
                  updateFilter('city', '');
                  updateFilter('state', '');
                  updateFilter('zipcode', '');
                }}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {formatPriceRange() && (
            <Badge variant="secondary" className="text-xs">
              Price: {formatPriceRange()}
              <button
                onClick={() => {
                  updateFilter('minRent', '');
                  updateFilter('maxRent', '');
                }}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {formatRoomInfo() && (
            <Badge variant="secondary" className="text-xs">
              {formatRoomInfo()}
              <button
                onClick={() => {
                  updateFilter('bedrooms', '');
                  updateFilter('bathrooms', '');
                }}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default CompactMapFilters;