import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Download, FileText, Filter, List, Grid3X3, Eye, Edit, MapIcon, Building2, Bed, Bath, Banknote, Receipt, CreditCard, Activity, Settings, Home, Clock, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, Users, UserCheck, Trash2, Plus, Upload } from 'lucide-react';
import { usePmMode } from '@/hooks/usePmMode';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { useToast } from '@/hooks/use-toast';
import PortfolioExportFilters from './PortfolioExportFilters';
import PropertyFilters from './PropertyFilters';
import PropertyCardWithUnits from './PropertyCardWithUnits';
import LandlordPropertyDetailsModal from './LandlordPropertyDetailsModal';
import GoogleMapsEmbed from './GoogleMapsEmbed';
import { AddPropertyModal } from './AddPropertyModal';
import { MultiStepEditPropertyForm } from './MultiStepEditPropertyForm';
import { ForSaleCheckbox } from '@/components/property/ForSaleCheckbox';
import { TenantQuickActions } from '@/components/property/TenantQuickActions';
import { OnMarketToggle } from '@/components/property/OnMarketToggle';
import { generateCSV, generatePDF } from '@/utils/portfolioExportUtils';
import { usePortfolioExport } from '@/hooks/usePortfolioExport';
import { InviteTenantButton } from '@/components/InviteTenantButton';
import { UnitRemoveTenantButton } from '@/components/property/UnitRemoveTenantButton';
import { EditUnitModal } from './EditUnitModal';
import UnitOnMarketToggle from '@/components/property/UnitOnMarketToggle';
import CompactMapFilters from './CompactMapFilters';
import { PropertyFilterValues, filterProperties } from '@/utils/propertyFiltering';
import { useAreaGeocoding } from '@/hooks/useAreaGeocoding';
import { DeletedPropertiesModal } from './DeletedPropertiesModal';

interface PortfolioProperty {
  id: string;
  address: string;
  unit_count: number;
  bedrooms: number | null;
  bathrooms: number | null;
  monthly_rent: number;
  status: string;
  occupancy_status?: string;
  lease_start_date: string | null;
  lease_end_date: string | null;
  city: string;
  state: string;
  zipcode: string;
  amenities: string[];
  owner_id: string;
  latitude?: number;
  longitude?: number;
  // Required fields to match LandlordPropertyDetailsModal expectations
  desired_rent: number;
  street_address: string;
  photos: string[];
  tenant_request_count: number;
  created_at: string;
  updated_at: string;
  description: string;
  insurance_cost: number;
  mortgage_cost: number;
  management_fee: number;
  repair_costs: number;
  // For sale fields
  for_sale_status?: string;
  marketing_price?: number;
  // Tenant fields for actions
  tenant_id?: string;
  default_tenant_type?: string;
  on_market?: boolean;
  // Portfolio fields
  portfolio_id?: string;
  portfolio_name?: string;
}

interface RentSplit {
  property_id: string;
  total_rent: number;
  pha_portion: number;
  tenant_portion: number;
}

interface ExportData {
  propertyId: string;
  propertyAddress: string;
  unitIdentifier: string;
  occupancy: string;
  occupancyStatus: string;
  bedrooms: number | null;
  bathrooms: number | null;
  totalRent: number;
  voucherPayment: number;
  tenantPayment: number;
  leaseStartDate: string;
  leaseEndDate: string;
  status: string;
  forSaleStatus: string;
  marketingPrice: number | null;
}

interface PortfolioExportProps {
  userId: string;
  portfolioId?: string;
}

const PortfolioExport = ({ userId, portfolioId }: PortfolioExportProps) => {
  // Use shared export hook
  const { 
    properties,
    setProperties,
    exportData, 
    loading, 
    exportCSV, 
    exportPDF,
    refetch 
  } = usePortfolioExport(userId, portfolioId);
  
  const [filteredData, setFilteredData] = useState<ExportData[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'map'>('cards');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof ExportData>('propertyAddress');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedProperty, setSelectedProperty] = useState<PortfolioProperty | null>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PortfolioProperty | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [selectedUnitProperty, setSelectedUnitProperty] = useState<PortfolioProperty | null>(null);
  const [showDeletedProperties, setShowDeletedProperties] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const navigate = useNavigate();
  const { pmEnabled } = usePmMode();

  // Map view filter state
  const [mapFilters, setMapFilters] = useState<PropertyFilterValues>({
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
  });

  // Area geocoding for map fitting
  const { geocodeArea } = useAreaGeocoding();
  const [areaBounds, setAreaBounds] = useState<[number, number, number, number] | null>(null);
  const [areaLabel, setAreaLabel] = useState<string>('');
  const [areaPolygon, setAreaPolygon] = useState<any | null>(null);

  useEffect(() => {
    let timeout: number | null = null;
    let cancelled = false;

    const applyResult = (res: any, fallbackLabel: string) => {
      if (res?.success && res.bbox) {
        setAreaBounds(res.bbox);
        setAreaLabel(res.display_name || fallbackLabel);
        setAreaPolygon(res.geometry || null);
        return true;
      }
      return false;
    };

    const geocodeFromSearch = async (search: string) => {
      const trimmed = search.trim();
      if (!trimmed) return false;

      // ZIP code: 5 digits or ZIP+4
      const zipMatch = /^\d{5}(-\d{4})?$/.test(trimmed);
      if (zipMatch) {
        const res = await geocodeArea({ zipcode: trimmed, country: 'us' });
        return applyResult(res, trimmed);
      }

      // City, ST or "City ST"
      const cityStateRegex = /^([^,]+)[,\s]+([A-Za-z]{2})$/;
      const m = trimmed.match(cityStateRegex);
      if (m) {
        const city = m[1].trim();
        const state = m[2].toUpperCase();
        const res = await geocodeArea({ city, state, country: 'us' });
        return applyResult(res, `${city}, ${state}`);
      }
      return false;
    };

    const run = async () => {
      const zip = mapFilters.zipcode?.trim();
      const city = mapFilters.city?.trim();
      const state = mapFilters.state?.trim();
      const search = mapFilters.search?.trim();

      // Priority: explicit zipcode/city/state inputs
      if (zip) {
        const res = await geocodeArea({ zipcode: zip, country: 'us' });
        if (applyResult(res, zip)) return;
      }
      if (city) {
        const res = await geocodeArea({ city, state, country: 'us' });
        if (applyResult(res, [city, state].filter(Boolean).join(', '))) return;
      }

      // Fallback: infer from main search with debounce
      if (search) {
        timeout = window.setTimeout(async () => {
          if (cancelled) return;
          const ok = await geocodeFromSearch(search);
          if (!ok) {
            setAreaBounds(null);
            setAreaLabel('');
            setAreaPolygon(null);
          }
        }, 300);
        return;
      }

      // Clear when nothing to geocode
      setAreaBounds(null);
      setAreaLabel('');
      setAreaPolygon(null);
    };

    run();

    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [mapFilters.zipcode, mapFilters.city, mapFilters.state, mapFilters.search, geocodeArea]);

  const itemsPerPage = 12;

  // Update filtered data when export data changes
  useEffect(() => {
    setFilteredData(exportData);
  }, [exportData]);

  const handleSort = (field: keyof ExportData) => {
    const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);
    
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    setFilteredData(sorted);
    setCurrentPage(1);
  };

  // Export handlers for filtered data
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const timestamp = new Date().toISOString();
      
      // Calculate summary from filtered data
      const summary = {
        totalProperties: filteredData.length,
        totalRent: filteredData.reduce((sum, item) => sum + item.totalRent, 0),
        totalVoucherPayments: filteredData.reduce((sum, item) => sum + item.voucherPayment, 0),
        totalTenantPayments: filteredData.reduce((sum, item) => sum + item.tenantPayment, 0),
        activeLeases: filteredData.filter(item => 
          item.status === 'occupied' && item.leaseEndDate && new Date(item.leaseEndDate) > new Date()
        ).length,
      };
      
      if (format === 'csv') {
        generateCSV(filteredData, summary, timestamp);
      } else {
        await generatePDF(filteredData, summary, timestamp);
      }
      
      toast({
        title: "Export Complete",
        description: `Portfolio exported as ${format.toUpperCase()} successfully.`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export portfolio data",
        variant: "destructive"
      });
    }
  };

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Paginated cards for card view
  const cardsData = useMemo(() => {
    return showFilters 
      ? filteredData.map(item => properties.find(p => p.id === item.propertyId)).filter(Boolean) as PortfolioProperty[]
      : properties;
  }, [filteredData, properties, showFilters]);

  const paginatedCards = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return cardsData.slice(startIndex, startIndex + itemsPerPage);
  }, [cardsData, currentPage]);

  const cardsTotalPages = Math.ceil(cardsData.length / itemsPerPage);

  // Reset page when view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  const handleViewDetails = (property: PortfolioProperty) => {
    setSelectedProperty(property);
    setShowPropertyModal(true);
  };

  const handleEditProperty = (property: PortfolioProperty) => {
    setEditingProperty(property);
    setShowEditModal(true);
  };

  const handleDeleteProperty = async (property: PortfolioProperty) => {
    console.log('🗑️ DELETE STARTED:', property.id, property.address);
    console.log('🌐 URL BEFORE DELETE:', window.location.href);
    console.log('📑 TAB BEFORE DELETE:', new URLSearchParams(window.location.search).get('tab'));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save current scroll position
      const scrollPosition = window.scrollY;
      console.log('📜 Saved scroll position:', scrollPosition);

      // OPTIMISTIC UPDATE: Remove property from local state immediately
      setProperties(prevProperties => {
        const filtered = prevProperties.filter(p => p.id !== property.id);
        console.log('✨ Optimistic update: Removed property from local state. Remaining:', filtered.length);
        return filtered;
      });

      console.log('💾 Starting database soft-delete for property:', property.id);

      // Soft delete by setting deleted_at timestamp
      const { error } = await supabase
        .from('properties')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', property.id)
        .eq('owner_id', user.id); // Ensure user owns the property

      if (error) {
        console.error('💥 Database delete failed:', error);
        // Revert optimistic update on failure
        await refetch();
        throw error;
      }

      console.log('✅ Database soft-delete successful');

      // Restore scroll position
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
        console.log('📜 Restored scroll position:', scrollPosition);
      }, 0);

      toast({
        title: "Property Deleted",
        description: `${property.address} has been successfully deleted.`,
      });

      console.log('🏁 DELETE COMPLETED SUCCESSFULLY');
      console.log('🌐 URL AFTER DELETE:', window.location.href);
      console.log('📑 TAB AFTER DELETE:', new URLSearchParams(window.location.search).get('tab'));
    } catch (error) {
      console.error('💥 DELETE FAILED:', error);
      toast({
        title: "Error",
        description: "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewApplications = (property: any) => {
    // Placeholder for viewing applications
    console.log('View applications for:', property);
  };

  const handleViewMessages = (property: any) => {
    // Placeholder for viewing messages
    console.log('View messages for:', property);
  };

  const handleCloseModal = () => {
    setShowPropertyModal(false);
    setSelectedProperty(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingProperty(null);
  };

  const handlePropertyUpdated = () => {
    refetch(); // Refresh the data
    handleCloseEditModal();
  };

  const handleViewUnit = (unit: any, property: PortfolioProperty) => {
    setSelectedUnit(unit);
    setSelectedUnitProperty(property);
  };

  const handleEditUnit = (unit: any, property: PortfolioProperty) => {
    setSelectedUnit(unit);
    setSelectedUnitProperty(property);
  };

  const handleCloseUnitModal = () => {
    setSelectedUnit(null);
    setSelectedUnitProperty(null);
  };

  const handleUnitUpdated = () => {
    refetch();
    handleCloseUnitModal();
  };

  const handleUnitMarketChanged = () => {
    console.log('[PortfolioExport] Unit market status changed, consider refreshing data if needed.');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading portfolio data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle with Background Check Center Design */}
      <Card className="border-openkey-blue/20 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="overflow-x-auto">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as 'cards' | 'list' | 'map')}
                className="flex w-max md:w-auto border border-openkey-blue/20 rounded-lg p-1 bg-background"
              >
              <ToggleGroupItem 
                value="cards" 
                aria-label="Card view"
                className="data-[state=on]:bg-openkey-blue data-[state=on]:text-white hover:bg-openkey-blue/10 transition-all duration-200"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Cards
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="list" 
                aria-label="List view"
                className="data-[state=on]:bg-openkey-blue data-[state=on]:text-white hover:bg-openkey-blue/10 transition-all duration-200"
              >
                <List className="h-4 w-4 mr-2" />
                List
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="map" 
                aria-label="Map view"
                className="data-[state=on]:bg-openkey-blue data-[state=on]:text-white hover:bg-openkey-blue/10 transition-all duration-200"
              >
                <MapIcon className="h-4 w-4 mr-2" />
                Map View
              </ToggleGroupItem>
              </ToggleGroup>
            </div>

          {(viewMode === 'cards' || viewMode === 'list') && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                className="h-8"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDeletedProperties(true)}
                className="h-8"
                title="View deleted properties"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddProperty(true)}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/property-import${portfolioId ? `?portfolioId=${portfolioId}` : ''}`)}
                className="h-8"
                title="Bulk import properties from CSV"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
                
                {viewMode === 'list' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('csv')}
                      className="h-8"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('pdf')}
                      className="h-8"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </>
                )}
              </div>
            )}

            {viewMode === 'map' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                className="h-8"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>

          {showFilters && (viewMode === 'cards' || viewMode === 'list') && (
            <div className="mt-4">
              <PortfolioExportFilters
                data={exportData}
                onFilterChange={setFilteredData}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Area */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          {/* Top Pagination Controls */}
          {cardsTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, cardsData.length)} of {cardsData.length} properties
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {cardsTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(prev => Math.min(cardsTotalPages, prev + 1))}
                  disabled={currentPage === cardsTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Card Grid - 12 per page */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCards.map((property) => (
              <div key={property.id} className="relative">
                <PropertyCardWithUnits
                  property={property}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEditProperty}
                  onDelete={handleDeleteProperty}
                />
              </div>
            ))}
          </div>

          {/* Bottom Pagination Controls */}
          {cardsTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, cardsData.length)} of {cardsData.length} properties
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {cardsTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(prev => Math.min(cardsTotalPages, prev + 1))}
                  disabled={currentPage === cardsTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          {/* Compact Map Filters */}
          <CompactMapFilters
            filters={mapFilters}
            onFiltersChange={setMapFilters}
          />
           {(() => {
             const mapProperties = properties.filter(p => p.latitude && p.longitude);
             const filteredMapProperties = filterProperties(mapProperties, mapFilters);
             
             return (
               <GoogleMapsEmbed
                 properties={filteredMapProperties}
                 onPropertyClick={handleViewDetails}
                 viewMode="map"
                 className="h-[calc(100vh-200px)] w-full min-h-[700px]"
                 selectedProperty={selectedProperty}
                 areaBounds={areaBounds || undefined}
                 areaLabel={areaLabel || undefined}
                 areaPolygon={areaPolygon || undefined}
               />
             );
           })()}
        </div>
      ) : (
        (() => {
          // Calculate portfolio totals for the summary row
          let totalUnits = 0;
          let occupiedUnits = 0;
          let totalBedrooms = 0;
          let totalBathrooms = 0;

          properties.forEach(property => {
            if (property.unit_count > 1 && (property as any).property_units && (property as any).property_units.length > 0) {
              // Multi-unit property - count actual units
              const units = (property as any).property_units;
              totalUnits += units.length;
              occupiedUnits += units.filter((u: any) => u.status === 'occupied').length;
              
              // Sum bed/bath from units
              units.forEach((unit: any) => {
                totalBedrooms += Number(unit.bedrooms) || 0;
                totalBathrooms += Number(unit.bathrooms) || 0;
              });
            } else {
              // Single-unit property (or multi-unit without units data)
              totalUnits += 1;
              if (property.occupancy_status === 'occupied') {
                occupiedUnits += 1;
              }
              
              // Use property-level bed/bath
              totalBedrooms += Number(property.bedrooms) || 0;
              totalBathrooms += Number(property.bathrooms) || 0;
            }
          });

          const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
          const totalRent = filteredData.reduce((sum, item) => sum + (item.totalRent || 0), 0);
          const totalVoucher = filteredData.reduce((sum, item) => sum + (item.voucherPayment || 0), 0);
          const totalTenant = filteredData.reduce((sum, item) => sum + (item.tenantPayment || 0), 0);
          
          const summary = {
            totalUnits,
            occupiedUnits,
            occupancyRate,
            totalBedrooms,
            totalBathrooms,
            totalRent,
            totalVoucher,
            totalTenant
          };
          
          return (
            <CardEnhanced variant="elevated">
              <CardEnhancedContent className="p-0">
                <div className="border rounded-lg">
                  <Table>
                <TableHeader className="bg-openkey-blue/5">
                  <TableRow className="border-openkey-blue/20">
                    <TableHead 
                      className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                      onClick={() => handleSort('propertyAddress')}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Property Address
                        {sortField === 'propertyAddress' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                      onClick={() => handleSort('unitIdentifier')}
                    >
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Units
                        {sortField === 'unitIdentifier' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                     </TableHead>
                     {pmEnabled && (
                       <TableHead 
                         className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                         onClick={() => handleSort('occupancy')}
                       >
                         <div className="flex items-center gap-2">
                           <UserCheck className="h-4 w-4" />
                           Occupancy
                           {sortField === 'occupancy' && (
                             sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                           )}
                         </div>
                       </TableHead>
                     )}
                     <TableHead 
                       className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                       onClick={() => handleSort('bedrooms')}
                     >
                       <div className="flex items-center gap-2">
                         <Bed className="h-4 w-4" />
                         Bed
                         {sortField === 'bedrooms' && (
                           sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                         )}
                       </div>
                     </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                      onClick={() => handleSort('bathrooms')}
                    >
                      <div className="flex items-center gap-2">
                        <Bath className="h-4 w-4" />
                        Bath
                        {sortField === 'bathrooms' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                      onClick={() => handleSort('totalRent')}
                    >
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        {pmEnabled ? 'Total Rent' : 'Rent'}
                        {sortField === 'totalRent' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    {pmEnabled && (
                      <TableHead 
                        className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                        onClick={() => handleSort('voucherPayment')}
                      >
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Voucher
                          {sortField === 'voucherPayment' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                    )}
                    {pmEnabled && (
                      <TableHead 
                        className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                        onClick={() => handleSort('tenantPayment')}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Tenant
                          {sortField === 'tenantPayment' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                    )}
                     {pmEnabled && (
                       <TableHead 
                         className="cursor-pointer hover:bg-openkey-blue/10 text-openkey-blue font-semibold transition-all duration-200"
                         onClick={() => handleSort('forSaleStatus')}
                       >
                         <div className="flex items-center gap-2">
                           <Building2 className="h-4 w-4" />
                           For Sale
                           {sortField === 'forSaleStatus' && (
                             sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                           )}
                         </div>
                       </TableHead>
                     )}
                      <TableHead className="text-openkey-blue font-semibold">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {pmEnabled ? 'Tenant Actions' : 'Listing'}
                        </div>
                      </TableHead>
                      <TableHead className="text-openkey-blue font-semibold">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Actions
                        </div>
                      </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Portfolio Totals Row */}
                  <TableRow className="sticky top-0 z-10 bg-openkey-blue/10 border-l-4 border-l-openkey-gold font-bold shadow-md hover:bg-openkey-blue/15 transition-all duration-200">
                    <TableCell className="font-bold text-foreground">
                      Portfolio Totals
                    </TableCell>
                    <TableCell className="font-bold text-center">
                      {summary.totalUnits} {summary.totalUnits === 1 ? 'Unit' : 'Units'}
                    </TableCell>
                    {pmEnabled && (
                      <TableCell className="font-bold text-center">
                        {summary.occupiedUnits}/{summary.totalUnits} ({summary.occupancyRate.toFixed(0)}%)
                      </TableCell>
                    )}
                    <TableCell className="text-center font-bold">
                      {summary.totalBedrooms}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {summary.totalBathrooms}
                    </TableCell>
                    <TableCell className="font-bold text-right">
                      ${summary.totalRent.toLocaleString()}
                    </TableCell>
                    {pmEnabled && (
                      <TableCell className="font-bold text-center">
                        ${summary.totalVoucher.toLocaleString()}
                      </TableCell>
                    )}
                    {pmEnabled && (
                      <TableCell className="font-bold text-left">
                        ${summary.totalTenant.toLocaleString()}
                      </TableCell>
                    )}
                    {pmEnabled && (
                      <TableCell className="text-center">-</TableCell>
                    )}
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                  </TableRow>
                  
                  {paginatedData.map((item, index) => {
                    const property = properties.find(p => p.address === item.propertyAddress);

                    return (
                       <React.Fragment key={index}>
                         <TableRow className="hover:bg-openkey-gold/20 hover:border-l-4 hover:border-l-openkey-gold hover:shadow-lg transition-all duration-200 cursor-pointer">
                           <TableCell className="font-medium text-foreground">
                             <div className="flex items-center gap-2">
                               {property && property.unit_count > 1 && (
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   className="h-6 w-6 p-0"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setExpanded(prev => ({ ...prev, [property.id]: !prev[property.id] }));
                                   }}
                                   aria-label={property && expanded[property.id] ? 'Collapse units' : 'Expand units'}
                                 >
                                   {property && expanded[property.id] ? (
                                     <ChevronDown className="h-4 w-4" />
                                   ) : (
                                     <ChevronRight className="h-4 w-4" />
                                   )}
                                 </Button>
                               )}
                               <span>{item.propertyAddress}</span>
                             </div>
                           </TableCell>
                           <TableCell className="text-muted-foreground">{item.unitIdentifier}</TableCell>
                           {pmEnabled && (
                             <TableCell className="text-muted-foreground font-medium">{item.occupancy}</TableCell>
                           )}
                           <TableCell className="text-muted-foreground">{item.bedrooms || '-'}</TableCell>
                           <TableCell className="text-muted-foreground">{item.bathrooms || '-'}</TableCell>
                           <TableCell className="font-semibold text-foreground">${(item.totalRent || 0).toLocaleString()}</TableCell>
                           {pmEnabled && (
                             <TableCell className="text-muted-foreground">${(item.voucherPayment || 0).toLocaleString()}</TableCell>
                           )}
                           {pmEnabled && (
                             <TableCell className="text-muted-foreground">${(item.tenantPayment || 0).toLocaleString()}</TableCell>
                           )}
                           {pmEnabled && (
                             <TableCell>
                               <ForSaleCheckbox 
                                 property={{
                                   id: property?.id || '',
                                   address: property?.address || '',
                                   city: property?.city || '',
                                   state: property?.state || '',
                                   monthly_rent: property?.monthly_rent || 0,
                                   bedrooms: property?.bedrooms || 0,
                                   bathrooms: property?.bathrooms || 0,
                                 }}
                                  onStatusChange={() => refetch()}
                               />
                             </TableCell>
                           )}
                           <TableCell>
                             {property && property.unit_count === 1 && (
                               <div className="flex items-center gap-2">
                                 {pmEnabled && (
                                   <TenantQuickActions
                                     propertyId={property.id}
                                     propertyAddress={property.address}
                                     hasTenant={property.occupancy_status === 'occupied'}
                                     onStatusChange={() => refetch()}
                                   />
                                 )}

                                 {property.unit_count <= 1 ? (
                                   <OnMarketToggle
                                     propertyId={property.id}
                                     currentOnMarket={property.on_market || false}
                                     propertyData={property}
                                     onStatusChange={() => refetch()}
                                   />
                                 ) : (
                                   <span className="text-sm text-muted-foreground">See units</span>
                                 )}
                               </div>
                             )}
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-2">
                               {property && (
                                 <>
                                   <Button
                                     variant="outline"
                                     size="icon"
                                     className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                                     onClick={() => handleViewDetails(property)}
                                     aria-label="View property details"
                                   >
                                     <Eye className="h-4 w-4" />
                                   </Button>
                                   <Button
                                     variant="outline"
                                     size="icon"
                                     className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                                     onClick={() => handleEditProperty(property)}
                                     aria-label="Edit property"
                                   >
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                 </>
                               )}
                             </div>
                           </TableCell>
                         </TableRow>

                         {property && expanded[property.id] && property.unit_count > 1 && (
                           <TableRow>
                              <TableCell colSpan={pmEnabled ? 11 : 7} className="bg-muted/30 p-0">
                                <Table className="w-full">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[16%] text-left">Unit</TableHead>
                                      <TableHead className="w-[7%] text-center">Units</TableHead>
                                      {pmEnabled && (
                                        <TableHead className="w-[12%] text-center">Occupancy</TableHead>
                                      )}
                                      <TableHead className="w-[6%] text-center">Bed</TableHead>
                                      <TableHead className="w-[6%] text-center">Bath</TableHead>
                                      <TableHead className="w-[12%] text-right">{pmEnabled ? 'Total Rent' : 'Rent'}</TableHead>
                                      {pmEnabled && (
                                        <TableHead className="w-[8%] text-center">Voucher</TableHead>
                                      )}
                                      {pmEnabled && (
                                        <TableHead className="w-[12%] text-left">Tenant</TableHead>
                                      )}
                                      {pmEnabled && (
                                        <TableHead className="w-[7%] text-center">For Sale</TableHead>
                                      )}
                                      <TableHead className="w-[8%] text-center">{pmEnabled ? 'Tenant Actions' : 'Listing'}</TableHead>
                                      <TableHead className="w-[6%] text-center">Actions</TableHead>
                                    </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                     {(((property as any).property_units) || []).map((unit: any) => (
                                       <TableRow key={unit.id}>
                                         <TableCell className="w-[16%] text-left">{unit.unit_name || (unit.unit_number ? `Unit ${unit.unit_number}` : 'Unit')}</TableCell>
                                         <TableCell className="w-[7%] text-center">-</TableCell>
                                          {pmEnabled && (
                                            <TableCell className="w-[12%] text-center">{unit.status === 'occupied' ? '1/1 (100%)' : '0/1 (0%)'}</TableCell>
                                          )}
                                         <TableCell className="w-[6%] text-center">{unit.bedrooms ?? '-'}</TableCell>
                                         <TableCell className="w-[6%] text-center">{unit.bathrooms ?? '-'}</TableCell>
                                          <TableCell className="w-[12%] text-right">
                                            {unit.status === 'occupied' 
                                              ? `$${Number(unit.monthly_rent || 0).toLocaleString()}` 
                                              : '$0'}
                                          </TableCell>
                                           {pmEnabled && (
                                             <TableCell className="w-[8%] text-center">
                                               {unit.status === 'occupied' && unit.pha_portion && Number(unit.pha_portion) > 0 
                                                 ? `$${Number(unit.pha_portion).toLocaleString()}` 
                                                 : '-'}
                                             </TableCell>
                                           )}
                                           {pmEnabled && (
                                             <TableCell className="w-[12%] text-left">
                                               {unit.status === 'occupied' && unit.tenant_portion && Number(unit.tenant_portion) > 0 
                                                 ? `$${Number(unit.tenant_portion).toLocaleString()}` 
                                                 : '-'}
                                             </TableCell>
                                           )}
                                          {pmEnabled && (
                                            <TableCell className="w-[7%] text-center">-</TableCell>
                                          )}
                                         <TableCell className="w-[8%] text-center">
                                           <div className="flex items-center gap-2 justify-center">
                                             {unit.status === 'occupied' ? (
                                               <UnitRemoveTenantButton
                                                 propertyId={property.id}
                                                 unitId={unit.id}
                                                 unitLabel={unit.unit_name || (unit.unit_number ? `Unit ${unit.unit_number}` : 'Unit')}
                                                 tenantId={unit.tenant_id}
                                                 onTenantRemoved={() => refetch()}
                                                 size="icon"
                                                 variant="outline"
                                                 iconOnly
                                               />
                                             ) : (
                                               <InviteTenantButton
                                                 propertyId={property.id}
                                                 unitId={unit.id}
                                                 propertyStatus={property.status}
                                                 tenantId={unit.tenant_id}
                                                 defaultTenantType={property.default_tenant_type || 'voucher'}
                                                 propertyAddress={property.address}
                                                 landlordId={userId}
                                                 occupancyStatus={unit.status}
                                                 size="icon"
                                                 variant="outline"
                                                 iconOnly
                                               />
                                             )}
                                              <UnitOnMarketToggle
                                                propertyId={property.id}
                                                unitId={unit.id}
                                                initialOnMarket={Boolean((unit as any).on_market)}
                                                unitLabel={unit.unit_number || unit.unit_name || unit.name}
                                                propertyAddress={property.address}
                                                unitData={unit}
                                                onRefresh={refetch}
                                                onStatusChange={handleUnitMarketChanged}
                                              />
                                           </div>
                                         </TableCell>
                                         <TableCell className="w-[6%] text-center">
                                           <div className="flex items-center gap-2 justify-center">
                                             <Button
                                               variant="outline"
                                               size="icon"
                                               className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                                               onClick={() => handleViewUnit(unit, property)}
                                               aria-label="View unit"
                                             >
                                               <Eye className="h-4 w-4" />
                                             </Button>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                                                onClick={() => handleEditUnit(unit, property)}
                                                aria-label="Edit unit"
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                           </div>
                                         </TableCell>
                                       </TableRow>
                                     ))}
                                   </TableBody>
                                 </Table>
                               </TableCell>
                             </TableRow>
                         )}
                       </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination for List View */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 p-4 border-t border-openkey-blue/20">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} properties
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardEnhancedContent>
        </CardEnhanced>
        );
      })()
      )}

      {/* Property Details Modal */}
      <LandlordPropertyDetailsModal
        property={selectedProperty}
        isOpen={showPropertyModal}
        onClose={handleCloseModal}
        onEdit={handleEditProperty}
        onViewApplications={handleViewApplications}
        onViewMessages={handleViewMessages}
      />

      {/* Edit Property Modal */}
      <MultiStepEditPropertyForm
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handlePropertyUpdated}
        editingProperty={editingProperty}
        userId={userId}
        portfolioId={portfolioId}
      />

      {/* Unit Details Modal */}
      {selectedUnit && selectedUnitProperty && (
        <EditUnitModal
          isOpen={true}
          propertyId={selectedUnitProperty.id}
          unit={selectedUnit}
          onClose={handleCloseUnitModal}
          onUnitUpdated={handleUnitUpdated}
        />
      )}

      {/* Deleted Properties Modal */}
      <DeletedPropertiesModal
        open={showDeletedProperties}
        onOpenChange={setShowDeletedProperties}
        userId={userId}
        portfolioId={portfolioId}
        onPropertiesRestored={refetch}
      />

      <AddPropertyModal
        isOpen={showAddProperty}
        onClose={() => setShowAddProperty(false)}
        userId={userId}
        portfolioId={portfolioId}
        onPropertyAdded={() => refetch()}
      />
    </div>
  );
};

export default PortfolioExport;
