
import React from 'react';
import { Search, MapPin, DollarSign, SlidersHorizontal, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CountrySelector } from '@/components/ui/country-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { useUserInternationalContext } from '@/hooks/useUserInternationalContext';
import { getSupportedCurrencies } from '@/lib/currencyUtils';
import type { SupportedCurrency } from '@/lib/currencyUtils';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';

interface PropertyFilters {
  location?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: SupportedCurrency;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
}

interface InternationalPropertySearchProps {
  onSearch: (filters: PropertyFilters) => void;
  initialFilters?: PropertyFilters;
  className?: string;
}

const InternationalPropertySearch: React.FC<InternationalPropertySearchProps> = ({
  onSearch,
  initialFilters = {},
  className = ''
}) => {
  const { internationalContext } = useUserInternationalContext();
  const [filters, setFilters] = React.useState<PropertyFilters>(initialFilters);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const marketplaceEvents = useMarketplaceEvents();

  const supportedCurrencies = getSupportedCurrencies();

  // Initialize with user's preferred context
  React.useEffect(() => {
    if (internationalContext && !filters.country && !filters.currency) {
      setFilters(prev => ({
        ...prev,
        country: internationalContext.countryCode,
        currency: internationalContext.currency,
      }));
    }
  }, [internationalContext, filters.country, filters.currency]);

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleSearch = () => {
    marketplaceEvents.mutate({
      eventType: 'search_performed',
      metadata: { 
        searchFilters: filters,
        hasLocation: !!filters.location,
        hasCountry: !!filters.country,
        hasPriceRange: !!(filters.minPrice || filters.maxPrice)
      }
    });
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters: PropertyFilters = {
      country: internationalContext?.countryCode,
      currency: internationalContext?.currency,
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by city, address, or property name..."
            value={filters.location || ''}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} className="shrink-0">
          Search
        </Button>
      </div>

      {/* International Context Display */}
      {internationalContext && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span>
            Searching in {internationalContext.countryCode} with prices in {internationalContext.currency}
          </span>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="flex items-center gap-2">
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <h4 className="font-medium">Search Filters</h4>

              {/* Country Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Country/Region</label>
                <CountrySelector
                  value={filters.country || ''}
                  onValueChange={(value) => handleFilterChange('country', value)}
                  placeholder="Any country..."
                />
              </div>

              {/* Currency for Price Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Currency</label>
                <Select 
                  value={filters.currency || 'USD'} 
                  onValueChange={(value: SupportedCurrency) => handleFilterChange('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedCurrencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{currency.code}</span>
                          <span>{currency.symbol}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Price</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice || ''}
                    onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value) || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Price</label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={filters.maxPrice || ''}
                    onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value) || undefined)}
                  />
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bedrooms</label>
                  <Select 
                    value={filters.bedrooms?.toString() || ''} 
                    onValueChange={(value) => handleFilterChange('bedrooms', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      {[1, 2, 3, 4, 5].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}+</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bathrooms</label>
                  <Select 
                    value={filters.bathrooms?.toString() || ''} 
                    onValueChange={(value) => handleFilterChange('bathrooms', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      {[1, 2, 3, 4].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}+</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSearch} size="sm" className="flex-1">
                  Apply Filters
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  Reset
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 text-sm">
            {filters.country && (
              <Badge variant="secondary">
                <MapPin className="w-3 h-3 mr-1" />
                {filters.country}
              </Badge>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <Badge variant="secondary">
                <DollarSign className="w-3 h-3 mr-1" />
                {filters.minPrice && (
                  <CurrencyDisplay 
                    amount={filters.minPrice} 
                    currency={filters.currency}
                    variant="compact"
                  />
                )}
                {filters.minPrice && filters.maxPrice && ' - '}
                {filters.maxPrice && (
                  <CurrencyDisplay 
                    amount={filters.maxPrice} 
                    currency={filters.currency}
                    variant="compact"
                  />
                )}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternationalPropertySearch;
