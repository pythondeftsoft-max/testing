import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Building2, MapPin, Home, DollarSign, ChevronLeft, ChevronRight, Filter, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FinderProperty {
  id: string;
  unit_id: string;
  property_id: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  status: string;
  on_market: boolean;
  photos: string[] | null;
  owner_id: string;
  owner_name: string;
  client_name: string;
}

interface PropertyFinderListProps {
  properties: FinderProperty[];
  selectedProperty: FinderProperty | null;
  onSelectProperty: (property: FinderProperty) => void;
  isLoading: boolean;
}

const ITEMS_PER_PAGE = 10;

export const PropertyFinderList: React.FC<PropertyFinderListProps> = ({
  properties,
  selectedProperty,
  onSelectProperty,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [bedroomFilter, setBedroomFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Compute unique filter options from data
  const filterOptions = useMemo(() => {
    const clients = new Map<string, string>();
    const bedrooms = new Set<number>();
    const statuses = new Set<string>();
    const cities = new Set<string>();

    properties.forEach(p => {
      if (p.client_name && p.client_name !== 'Unknown') clients.set(p.client_name, p.client_name);
      bedrooms.add(p.bedrooms);
      if (p.status) statuses.add(p.status);
      if (p.city) cities.add(p.city);
    });

    return {
      clients: Array.from(clients.values()).sort(),
      bedrooms: Array.from(bedrooms).sort((a, b) => a - b),
      statuses: Array.from(statuses).sort(),
      cities: Array.from(cities).sort(),
    };
  }, [properties]);

  const hasActiveFilters = ownerFilter !== 'all' || bedroomFilter !== 'all' || statusFilter !== 'all' || cityFilter !== 'all';

  const clearFilters = () => {
    setOwnerFilter('all');
    setBedroomFilter('all');
    setStatusFilter('all');
    setCityFilter('all');
    setCurrentPage(1);
  };

  const filteredProperties = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return properties.filter(p => {
      // Text search
      if (query && !(
        p.address.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.zipcode.includes(query) ||
        p.unit_number.toLowerCase().includes(query) ||
        p.client_name.toLowerCase().includes(query)
      )) return false;

      // Filters
      if (ownerFilter !== 'all' && p.client_name !== ownerFilter) return false;
      if (bedroomFilter !== 'all' && p.bedrooms !== Number(bedroomFilter)) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (cityFilter !== 'all' && p.city !== cityFilter) return false;

      return true;
    });
  }, [properties, searchQuery, ownerFilter, bedroomFilter, statusFilter, cityFilter]);

  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const PaginationControls = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className={cn(
      "px-3 py-2 flex items-center justify-between",
      position === 'top' ? 'border-b' : 'border-t'
    )}>
      <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1">
        <ChevronLeft className="w-4 h-4" /> Previous
      </Button>
      <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
      <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gap-1">
        Next <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search properties..." value={searchQuery} onChange={handleSearchChange} className="pl-10" />
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Active
                  </Badge>
                )}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Select value={ownerFilter} onValueChange={(v) => { setOwnerFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {filterOptions.clients.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={bedroomFilter} onValueChange={(v) => { setBedroomFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Beds</SelectItem>
                  {filterOptions.bedrooms.map(b => (
                    <SelectItem key={b} value={String(b)}>{b} BR</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {filterOptions.statuses.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {filterOptions.cities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" /> Clear all filters
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>

        <p className="text-xs text-muted-foreground">
          {filteredProperties.length} propert{filteredProperties.length !== 1 ? 'ies' : 'y'} found
          {filteredProperties.length > ITEMS_PER_PAGE && (
            <span> · Showing {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)}</span>
          )}
        </p>
      </div>

      {totalPages > 1 && <PaginationControls position="top" />}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {paginatedProperties.map((property) => (
            <div
              key={property.unit_id}
              onClick={() => onSelectProperty(property)}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                selectedProperty?.unit_id === property.unit_id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{property.address}</p>
                    {property.unit_number && (
                      <p className="text-xs text-muted-foreground">Unit {property.unit_number}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{property.status}</Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{property.city}, {property.state} {property.zipcode}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Home className="w-3 h-3" />
                  <span>{property.bedrooms} BR / {property.bathrooms} BA</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  <span>${property.monthly_rent.toLocaleString()}/mo</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{property.client_name}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredProperties.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No properties found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {totalPages > 1 && <PaginationControls position="bottom" />}
    </div>
  );
};
