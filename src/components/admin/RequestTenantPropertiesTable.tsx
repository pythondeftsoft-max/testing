import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, DollarSign, Building, Send, Calendar, Filter, Eye, FileText } from 'lucide-react';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { formatDistanceToNow, format } from 'date-fns';
import PropertyPushModal from './PropertyPushModal';
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';
import { ViewContractModal } from './ViewContractModal';

interface PropertyListing {
  id: string;
  listing_request_id: string;
  property_id: string;
  unit_id: string | null;
  address: string;
  unit_number: string | null;
  display_address: string;
  street_address: string;
  city: string;
  state: string;
  zipcode: string;
  monthly_rent: number;
  status: string;
  bedrooms: number;
  bathrooms: number;
  unit_count: number;
  description: string;
  owner_name: string;
  owner_id: string;
  company_name: string;
  created_at: string;
  on_market: boolean;
  listed_at: string | null;
  delisted_at: string | null;
  days_on_market: number;
  property_type: string;
  desired_rent: number;
  amenities: string[];
  photos: string[];
  listing_event_type: string | null;
}

const RequestTenantPropertiesTable = () => {
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [marketStatusFilter, setMarketStatusFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState<PropertyListing | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedContractProperty, setSelectedContractProperty] = useState<PropertyListing | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      console.log('🏘️ Fetching listing history from property_tenant_requests...');
      
      // Fetch single-unit property listing events
      const { data: singleUnitData, error: singleError } = await supabase
        .from('property_tenant_requests')
        .select(`
          id,
          property_id,
          status,
          listing_event_type,
          created_at,
          delisted_at,
          properties (
            id,
            address,
            street_address,
            city,
            state,
            zipcode,
            monthly_rent,
            desired_rent,
            bedrooms,
            bathrooms,
            unit_count,
            description,
            property_type,
            amenities,
            photos,
            on_market,
            owner_id,
            profiles!properties_owner_id_fkey (
              first_name,
              last_name,
              company_name
            )
          )
        `)
        .is('unit_id', null)
        .is('properties.deleted_at', null)
        .order('created_at', { ascending: false });

      if (singleError) throw singleError;

      // Fetch multi-unit property listing events
      const { data: multiUnitData, error: multiError } = await supabase
        .from('property_tenant_requests')
        .select(`
          id,
          property_id,
          unit_id,
          status,
          listing_event_type,
          created_at,
          delisted_at,
          property_units (
            id,
            unit_number,
            unit_name,
            monthly_rent,
            bedrooms,
            bathrooms,
            on_market,
            properties (
              id,
              address,
              street_address,
              city,
              state,
              zipcode,
              unit_count,
              description,
              property_type,
              amenities,
              photos,
              owner_id,
              profiles!properties_owner_id_fkey (
                first_name,
                last_name,
                company_name
              )
            )
          )
        `)
        .not('unit_id', 'is', null)
        .order('created_at', { ascending: false });

      if (multiError) throw multiError;

      // Transform single-unit listing events
      const singleUnitListings: PropertyListing[] = (singleUnitData || []).map(listingEvent => {
        const property = listingEvent.properties;
        const daysOnMarket = listingEvent.created_at
          ? Math.floor((
              (listingEvent.delisted_at ? new Date(listingEvent.delisted_at) : new Date()).getTime() 
              - new Date(listingEvent.created_at).getTime()
            ) / (1000 * 60 * 60 * 24))
          : 0;

        const isActive = listingEvent.status === 'active';

        return {
          id: listingEvent.id,
          listing_request_id: listingEvent.id,
          property_id: property.id,
          unit_id: null,
          address: property.address || 'Address not provided',
          unit_number: null,
          display_address: property.address || 'Address not provided',
          street_address: property.street_address || '',
          city: property.city || '',
          state: property.state || '',
          zipcode: property.zipcode || '',
          monthly_rent: property.desired_rent || 0,
          status: listingEvent.status,
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          unit_count: property.unit_count || 1,
          description: property.description || '',
          owner_name: `${property.profiles?.first_name || ''} ${property.profiles?.last_name || ''}`.trim() || 'N/A',
          owner_id: property.owner_id || '',
          company_name: property.profiles?.company_name || '',
          created_at: listingEvent.created_at,
          on_market: isActive,
          listed_at: listingEvent.created_at,
          delisted_at: listingEvent.delisted_at,
          days_on_market: daysOnMarket,
          property_type: property.property_type || 'residential',
          desired_rent: property.desired_rent || 0,
          amenities: property.amenities || [],
          photos: property.photos || [],
          listing_event_type: listingEvent.listing_event_type,
        };
      });

      // Transform multi-unit listing events
      const multiUnitListings: PropertyListing[] = (multiUnitData || []).map(listingEvent => {
        const unit = listingEvent.property_units;
        const property = unit?.properties;
        const unitIdentifier = unit?.unit_number || unit?.unit_name || 'Unit';
        const daysOnMarket = listingEvent.created_at
          ? Math.floor((
              (listingEvent.delisted_at ? new Date(listingEvent.delisted_at) : new Date()).getTime() 
              - new Date(listingEvent.created_at).getTime()
            ) / (1000 * 60 * 60 * 24))
          : 0;

        const isActive = listingEvent.status === 'active';

        return {
          id: listingEvent.id,
          listing_request_id: listingEvent.id,
          property_id: property.id,
          unit_id: listingEvent.unit_id,
          address: property.address || 'Address not provided',
          unit_number: unitIdentifier,
          display_address: `${property.address || 'Address not provided'} - Unit ${unitIdentifier}`,
          street_address: property.street_address || '',
          city: property.city || '',
          state: property.state || '',
          zipcode: property.zipcode || '',
          monthly_rent: unit?.monthly_rent || 0,
          status: listingEvent.status,
          bedrooms: unit?.bedrooms || 0,
          bathrooms: unit?.bathrooms || 0,
          unit_count: property.unit_count || 1,
          description: property.description || '',
          owner_name: `${property.profiles?.first_name || ''} ${property.profiles?.last_name || ''}`.trim() || 'N/A',
          owner_id: property.owner_id || '',
          company_name: property.profiles?.company_name || '',
          created_at: listingEvent.created_at,
          on_market: isActive,
          listed_at: listingEvent.created_at,
          delisted_at: listingEvent.delisted_at,
          days_on_market: daysOnMarket,
          property_type: property.property_type || 'residential',
          desired_rent: 0,
          amenities: property.amenities || [],
          photos: property.photos || [],
          listing_event_type: listingEvent.listing_event_type,
        };
      });

      const allListings = [...singleUnitListings, ...multiUnitListings];
      console.log(`✅ Found ${allListings.length} listing events (${singleUnitListings.length} single-unit, ${multiUnitListings.length} multi-unit)`);
      setProperties(allListings);
    } catch (error) {
      console.error('❌ Error fetching listing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
      property.display_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.company_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    
    const matchesMarketStatus = 
      marketStatusFilter === 'all' ||
      (marketStatusFilter === 'active' && property.on_market) ||
      (marketStatusFilter === 'delisted' && !property.on_market);

    const matchesPrice = (() => {
      const rent = property.monthly_rent || property.desired_rent || 0;
      switch (priceFilter) {
        case 'under_1000': return rent < 1000;
        case '1000_2000': return rent >= 1000 && rent < 2000;
        case '2000_3000': return rent >= 2000 && rent < 3000;
        case 'over_3000': return rent >= 3000;
        default: return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesMarketStatus && matchesPrice;
  });

  // Pagination calculations
  const totalItems = filteredProperties.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, marketStatusFilter, priceFilter]);

  const handlePushToTenants = (property: PropertyListing) => {
    console.log('📤 Pushing property to tenants:', property.id);
    setSelectedProperty(property);
    setShowPushModal(true);
  };

  const handleViewDetails = (property: PropertyListing) => {
    console.log('👁️ Opening property details:', property.id);
    setSelectedPropertyForDetails(property);
    setShowDetailsModal(true);
  };

  const handleViewContract = (property: PropertyListing) => {
    console.log('📄 Opening contract for property:', property.id);
    setSelectedContractProperty(property);
    setShowContractModal(true);
  };

  const getStatusBadge = (onMarket: boolean) => {
    if (onMarket) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Delisted</Badge>;
  };

  const getTimeOnMarket = (listedAt: string | null, delistedAt: string | null, onMarket: boolean): string => {
    if (!listedAt) return 'N/A';
    
    const endDate = onMarket ? new Date() : (delistedAt ? new Date(delistedAt) : new Date());
    const startDate = new Date(listedAt);
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (onMarket) {
      return `${days} days`;
    } else {
      return `${days} days (ended ${format(new Date(delistedAt || endDate), 'MMM d, yyyy')})`;
    }
  };

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading listings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Listing History</h2>
          <p className="text-sm text-muted-foreground">Complete listing history - every listing event with its contract</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-800">
          <Building className="h-3 w-3 mr-1" />
          {totalItems > 0 
            ? `${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}`
            : '0'
          } Listings
        </Badge>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search properties, owners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={marketStatusFilter} onValueChange={setMarketStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Market status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="delisted">Delisted</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="vacant">Vacant</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="under_1000">Under $1,000</SelectItem>
            <SelectItem value="1000_2000">$1,000 - $2,000</SelectItem>
            <SelectItem value="2000_3000">$2,000 - $3,000</SelectItem>
            <SelectItem value="over_3000">Over $3,000</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          {filteredProperties.length} of {properties.length}
        </div>
      </div>

      {/* Pagination Controls - Top */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between py-3 border-y">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} listings
            </span>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {getPageNumbers().map((pageNum, idx) => (
                <PaginationItem key={idx}>
                  {pageNum === '...' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum as number)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property Details</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Rent & Details</TableHead>
              <TableHead>Listing Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time on Market</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProperties.map((property) => (
              <TableRow key={property.id} className={!property.on_market ? 'bg-muted/30' : ''}>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{property.display_address}</div>
                      {property.description && (
                        <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                          {property.description}
                        </div>
                      )}
                      <div className="text-xs text-blue-600 mt-1 capitalize">
                        {property.property_type}
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div>
                    <div className="font-medium">{property.owner_name}</div>
                    {property.company_name && (
                      <div className="text-sm text-muted-foreground">{property.company_name}</div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="font-medium">
                        ${(property.monthly_rent || property.desired_rent).toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {property.bedrooms && property.bathrooms ? (
                        <span>{property.bedrooms}br, {property.bathrooms}ba</span>
                      ) : (
                        <span>{property.unit_count} unit(s)</span>
                      )}
                    </div>
                    {property.amenities.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {property.amenities.slice(0, 2).join(', ')}
                        {property.amenities.length > 2 && '...'}
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm">
                    {property.listing_event_type === 'initial_listing' ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Initial Listing
                      </Badge>
                    ) : property.listing_event_type === 're_listing' ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Re-listing
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Unknown
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {getStatusBadge(property.on_market)}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{getTimeOnMarket(property.listed_at, property.delisted_at, property.on_market)}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleViewContract(property)}
                      size="sm"
                      variant="outline"
                      className="border-border hover:bg-muted"
                      title="View Housing Service Agreement"
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleViewDetails(property)}
                      size="sm"
                      variant="outline"
                      className="border-border hover:bg-muted"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {property.on_market && (
                      <Button
                        onClick={() => handlePushToTenants(property)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Push to Tenants
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredProperties.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || marketStatusFilter !== 'active' || priceFilter !== 'all' 
              ? 'No listings found matching your filters.' 
              : 'No listings available.'
            }
          </div>
        )}
      </div>

      {/* Pagination Controls - Bottom */}
      {totalItems > 0 && totalPages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {getPageNumbers().map((pageNum, idx) => (
                <PaginationItem key={idx}>
                  {pageNum === '...' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum as number)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {selectedProperty && (
        <PropertyPushModal
          isOpen={showPushModal}
          onClose={() => {
            setShowPushModal(false);
            setSelectedProperty(null);
          }}
          property={selectedProperty}
        />
      )}

      {selectedPropertyForDetails && (
        <PropertyDetailsModalEnhanced
          property={selectedPropertyForDetails as any}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPropertyForDetails(null);
          }}
          onInterestClick={() => {}}
          isSubmittingInterest={false}
          hasApplied={false}
        />
      )}

      {selectedContractProperty && (
        <ViewContractModal
          isOpen={showContractModal}
          onClose={() => {
            setShowContractModal(false);
            setSelectedContractProperty(null);
          }}
          propertyId={selectedContractProperty.property_id}
          unitId={selectedContractProperty.unit_id}
          propertyAddress={selectedContractProperty.display_address}
        />
      )}
    </div>
  );
};

export default RequestTenantPropertiesTable;
