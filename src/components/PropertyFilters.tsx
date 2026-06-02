
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { sanitizeInput, validateNumericInput, validateLocationInput, validateZipcode } from '@/utils/inputValidation';

interface PropertyFiltersProps {
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

const PropertyFilters = ({ filters, onFiltersChange }: PropertyFiltersProps) => {
  const [isLocationOpen, setIsLocationOpen] = useState(true);
  const [isPropertyDetailsOpen, setIsPropertyDetailsOpen] = useState(true);

  const updateFilter = (key: string, value: string | string[]) => {
    let sanitizedValue = value;
    
    // Apply appropriate validation based on field type
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
  };

  const handleSearch = () => {
    onFiltersChange({ ...filters });
  };

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

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Properties
          </CardTitle>
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Search Section */}
        <div>
          <Label htmlFor="search" className="text-base font-medium mb-2 block">Search Properties</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search by address, city, state, or zip code..."
                className="pl-10 text-base h-12"
                maxLength={100}
              />
            </div>
            <Button onClick={handleSearch} size="lg" className="h-12 px-6">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Location Filters */}
        <Collapsible open={isLocationOpen} onOpenChange={setIsLocationOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-semibold">
              Location
              {isLocationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={filters.city}
                  onChange={(e) => updateFilter('city', e.target.value)}
                  placeholder="Springfield"
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={filters.state}
                  onChange={(e) => updateFilter('state', e.target.value)}
                  placeholder="Illinois"
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="zipcode">Zip Code</Label>
                <Input
                  id="zipcode"
                  value={filters.zipcode}
                  onChange={(e) => updateFilter('zipcode', e.target.value)}
                  placeholder="62701"
                  maxLength={20}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Property Details */}
        <Collapsible open={isPropertyDetailsOpen} onOpenChange={setIsPropertyDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-semibold">
              Property Details
              {isPropertyDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Price and Room Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="minRent">Min Rent</Label>
                <Input
                  id="minRent"
                  type="number"
                  value={filters.minRent}
                  onChange={(e) => updateFilter('minRent', e.target.value)}
                  placeholder="1000"
                  min="0"
                  max="1000000"
                />
              </div>
              <div>
                <Label htmlFor="maxRent">Max Rent</Label>
                <Input
                  id="maxRent"
                  type="number"
                  value={filters.maxRent}
                  onChange={(e) => updateFilter('maxRent', e.target.value)}
                  placeholder="2000"
                  min="0"
                  max="1000000"
                />
              </div>
              <div>
                <Label htmlFor="bedrooms">Min Bedrooms</Label>
                <Select
                  value={filters.bedrooms}
                  onValueChange={(value) => updateFilter('bedrooms', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bathrooms">Min Bathrooms</Label>
                <Select
                  value={filters.bathrooms}
                  onValueChange={(value) => updateFilter('bathrooms', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="1.5">1.5+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default PropertyFilters;
