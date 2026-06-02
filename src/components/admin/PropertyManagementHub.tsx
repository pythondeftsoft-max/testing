
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, MapPin, DollarSign, Users, Calendar, Wrench, AlertTriangle, ChevronDown, Copy, RefreshCcw, Bug, RotateCcw, LayoutGrid, List, Clock, Edit, Home } from 'lucide-react';
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';
import { useAuth } from '@/hooks/useAuth';
import { PermissionDebugPanel } from '@/components/debug/PermissionDebugPanel';
import PropertiesDirectoryFilters, { PropertyFilters } from './PropertiesDirectoryFilters';
import { useEnhancedPropertyFilters } from '@/hooks/useEnhancedPropertyFilters';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';
import { OnMarketToggle } from '@/components/property/OnMarketToggle';
import { TenantQuickActions } from '@/components/property/TenantQuickActions';
import { AdminUnitsManagerDialog } from './AdminUnitsManagerDialog';
import { BulkPropertyActions } from './BulkPropertyActions';
import { AddPropertyModal } from './AddPropertyModal';
import { RestorePropertiesModal } from './RestorePropertiesModal';
import { useEnhancedAdminActions } from '@/hooks/useEnhancedAdminActions';
import { PropertyTableView } from './PropertyTableView';
import { usePropertyTenants } from '@/hooks/usePropertyTenants';
import ErrorBoundary from '@/components/ErrorBoundary';
import { MultiStepTenantRequestForm } from '@/components/MultiStepTenantRequestForm';

// Timeout wrapper to prevent indefinite loading
const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallbackValue?: T): Promise<T> => {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout - using fallback')), ms)
  );
  try {
    return await Promise.race([promise, timeout]);
  } catch (err) {
    if (fallbackValue !== undefined) return fallbackValue;
    throw err;
  }
};

const QUERY_TIMEOUT = 8000; // 8 seconds max for any query

interface Property {
  id: string;
  street_1?: string;
  street_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  monthly_rent?: number;
  status: string;
  property_type?: string;
  commercial_type?: string;
  commercial_subtype?: string;
  bedrooms?: number;
  bathrooms?: number;
  unit_count?: number;
  created_at: string;
  owner_id: string;
  portfolio_id?: string;
  portfolio_client_email?: string | null;
  tenant_request_count?: number;
  deleted_at?: string;
  lease_end_date?: string;
  maintenance_requests_count?: number;
  on_market?: boolean;
  tenant_id?: string;
  supports_tenant_management?: boolean;
  occupancy_status?: string;
}

interface Portfolio {
  id: string;
  client_name: string;
  client_email?: string | null;
}

const PropertyManagementHub = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<PropertyFilters>({
    status: 'all',
    propertyType: 'all',
    portfolio: 'all',
    owner: 'all',
    dateAdded: 'all',
    rentRange: 'all',
    location: 'all',
    marketStatus: 'all',
    tenantStatus: 'all'
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState('overview');
  const [unitsDialogProperty, setUnitsDialogProperty] = useState<Property | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [editListingPropertyId, setEditListingPropertyId] = useState<string | null>(null);
  const [editListingAddress, setEditListingAddress] = useState<string>('');
  const [editListingUnitId, setEditListingUnitId] = useState<string | null>(null);
  
  // Listing preview state
  const [listingPreviewProperty, setListingPreviewProperty] = useState<any>(null);
  const [showListingPreview, setShowListingPreview] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState<string | null>(null);
  
  // View mode state - persisted to localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('property-view-mode');
    return (saved === 'list' || saved === 'grid') ? saved : 'grid';
  });

  // Update localStorage when view mode changes
  React.useEffect(() => {
    localStorage.setItem('property-view-mode', viewMode);
  }, [viewMode]);
  
  // Debug state
  const [debugOpen, setDebugOpen] = useState(false);
  const [rpcError, setRpcError] = useState<any>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  
  // Check if debug mode is enabled
  const isDebugMode = new URLSearchParams(window.location.search).has('debug') || 
                      localStorage.getItem('openkey-debug') === 'true';

  // Fetch properties with enhanced debugging, fallback, and timeout
  const { data: properties = [], isLoading: propertiesLoading, refetch: refetchProperties, error: queryError } = useQuery({
    queryKey: ['admin-properties-overview', useFallback],
    staleTime: 2 * 60 * 1000,  // Data stays fresh for 2 minutes
    gcTime: 10 * 60 * 1000,    // Keep in cache for 10 minutes
    refetchOnMount: false,      // Don't refetch every time component mounts
    retry: false,               // Don't retry to avoid masking errors
    queryFn: async (): Promise<Property[]> => {
      const requestId = Math.random().toString(36).substring(7);
      const startTime = performance.now();
      
      if (isDebugMode) {
        console.groupCollapsed(`🔍 Admin Property Load [${requestId}]`);
        console.log('Start Time:', new Date().toISOString());
        console.log('User ID:', user?.id);
        console.log('Use Fallback:', useFallback);
      }

      try {
        if (useFallback) {
          // Fallback: Direct query to properties table with timeout
          const fetchFallback = async () => {
            const { data, error } = await supabase
            .from('properties')
            .select(`
              id,
              address,
              city,
              state,
              zipcode,
              monthly_rent,
              status,
              property_type,
              commercial_type,
              commercial_subtype,
              bedrooms,
              bathrooms,
              unit_count,
              created_at,
              owner_id,
              portfolio_id,
              on_market,
              deleted_at
            `)
              .is('deleted_at', null)
              .not('acquisition_source', 'eq', 'scout_agent')
              .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
          };

          const data = await withTimeout(fetchFallback(), QUERY_TIMEOUT, []);

          const endTime = performance.now();
          const fallbackData = {
            requestId,
            method: 'fallback_query',
            duration: endTime - startTime,
            rows: data?.length || 0,
            error: null
          };

          setDebugData(fallbackData);
          setRpcError(null);

          if (isDebugMode) {
            console.log('✅ Fallback Query Success:', fallbackData);
            console.groupEnd();
          }

          return (data || []).map(property => ({
            id: property.id,
            street_1: property.address, // Map address to street_1 for interface compatibility
            street_2: '',
            city: property.city,
            state: property.state,
            zipcode: property.zipcode,
            monthly_rent: property.monthly_rent,
            status: property.status,
            property_type: property.property_type,
            commercial_type: property.commercial_type,
            commercial_subtype: property.commercial_subtype,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            unit_count: property.unit_count || 1,
            created_at: property.created_at,
            owner_id: property.owner_id,
            portfolio_id: property.portfolio_id,
            on_market: property.on_market,
            deleted_at: property.deleted_at,
            tenant_id: null,
            supports_tenant_management: true,
            occupancy_status: 'unknown',
            tenant_info: null,
            maintenance_requests_count: 0,
            lease_end_date: null,
            tenant_request_count: 0
          }));
        }

        // Try RPC first with timeout
        const fetchRpc = async () => {
          const { data, error: rpcErr } = await supabase.rpc('admin_get_properties_overview');
          if (rpcErr) throw rpcErr;
          return data;
        };
        
        const data = await withTimeout(fetchRpc(), QUERY_TIMEOUT);

        const endTime = performance.now();
        const successData = {
          requestId,
          method: 'rpc_admin_get_properties_overview',
          duration: endTime - startTime,
          rows: data?.length || 0,
          error: null
        };

        setDebugData(successData);
        setRpcError(null);

        if (isDebugMode) {
          console.log('✅ RPC Success:', successData);
          console.log('Raw Data Sample:', data?.slice(0, 2));
          console.groupEnd();
        }

        // Map RPC result to component interface
        return (data || []).map((property: any) => ({
          id: property.id,
          street_1: property.address,
          street_2: '',
          city: property.city || '',
          state: property.state || '',
          zipcode: property.zipcode || '',
          monthly_rent: property.monthly_rent,
          status: property.status,
          property_type: property.property_type || '',
          commercial_type: '',
          commercial_subtype: '',
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          unit_count: property.unit_count || 1,
          created_at: property.created_at,
          owner_id: property.owner_id,
          portfolio_id: property.portfolio_id || '',
          tenant_request_count: 0,
          deleted_at: null,
          lease_end_date: property.lease_end_date,
          maintenance_requests_count: 0,
          on_market: property.on_market ?? true,
          tenant_id: property.tenant_count > 0 ? 'has-tenant' : null,
          supports_tenant_management: true,
          occupancy_status: property.tenant_count > 0 ? 'occupied' : 'vacant',
          tenant_info: null
        }));
      } catch (fetchError: any) {
        const endTime = performance.now();
        const errorData = {
          requestId,
          method: useFallback ? 'fallback_query' : 'rpc_admin_get_properties_overview',
          duration: endTime - startTime,
          error: {
            code: fetchError?.code,
            message: fetchError?.message,
            details: fetchError?.details,
            hint: fetchError?.hint
          }
        };

        setRpcError(fetchError);
        setDebugData(errorData);

        if (isDebugMode) {
          console.error('❌ Query Error:', errorData);
          console.groupEnd();
        }
        
        // On timeout, return empty array instead of throwing to prevent infinite loading
        if (fetchError?.message?.includes('timeout')) {
          console.warn('Query timed out, returning empty results');
          return [];
        }

        throw fetchError;
      }
    },
  });

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery({
    queryKey: ['property-management-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, client_name, client_email')
        .order('client_name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch owners
  const { data: owners = [] } = useQuery({
    queryKey: ['property-management-owners'],
    queryFn: async () => {
      const ownerIds = [...new Set(properties.map(p => p.owner_id))];
      
      if (ownerIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, company_name')
        .in('id', ownerIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: properties.length > 0
  });

  // Use enhanced filtering hook
  const {
    filterCounts,
    getDynamicFilterCounts,
    filterProperties,
    owners: processedOwners,
    locations
  } = useEnhancedPropertyFilters(properties, portfolios, owners);

  // Apply filters
  const filteredProperties = filterProperties(filters);
  
  // Get dynamic counts for cascading filters
  const dynamicCounts = getDynamicFilterCounts(filters);

  // Fetch tenant info for table view
  const { data: tenantInfo } = usePropertyTenants(
    filteredProperties.map(p => p.id),
    viewMode === 'list'
  );

  const handleFilterChange = (newFilters: PropertyFilters) => {
    // Auto-reset invalid selections based on dynamic counts
    const updatedFilters = { ...newFilters };
    const newDynamicCounts = getDynamicFilterCounts(newFilters);
    
    // Reset portfolio if selected one has no properties
    if (updatedFilters.portfolio !== 'all' && 
        !updatedFilters.portfolio.includes('portfolios') && 
        updatedFilters.portfolio !== 'independent' &&
        (!newDynamicCounts.portfolio.portfolios[updatedFilters.portfolio] || 
         newDynamicCounts.portfolio.portfolios[updatedFilters.portfolio] === 0)) {
      updatedFilters.portfolio = 'all';
    }
    
    // Reset owner if selected one has no properties
    if (updatedFilters.owner !== 'all' && 
        (!newDynamicCounts.owner.owners[updatedFilters.owner] || 
         newDynamicCounts.owner.owners[updatedFilters.owner] === 0)) {
      updatedFilters.owner = 'all';
    }
    
    // Reset location if selected one has no properties
    if (updatedFilters.location !== 'all' && 
        (!newDynamicCounts.location.locations[updatedFilters.location] || 
         newDynamicCounts.location.locations[updatedFilters.location] === 0)) {
      updatedFilters.location = 'all';
    }
    
    setFilters(updatedFilters);
  };

  // Helper function to format address
  const formatAddress = (property: Property) => {
    const parts = [property.street_1, property.street_2].filter(Boolean);
    return parts.join(' ') || 'No Address';
  };

  // Helper function for status badge variants
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'occupied':
        return 'secondary';
      case 'vacant':
        return 'outline';
      case 'for_sale':
        return 'default';
      case 'under_contract':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Helper function to handle property status changes
  const handlePropertyStatusChange = () => {
    // Refresh the properties data
    refetchProperties();
  };

  // Fetch full property data for listing preview
  const fetchFullPropertyForPreview = async (propertyId: string) => {
    setIsLoadingPreview(propertyId);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_units (
            id,
            unit_number,
            unit_name,
            bedrooms,
            bathrooms,
            monthly_rent,
            status,
            square_feet,
            description,
            unit_amenities,
            on_market,
            photos
          )
        `)
        .eq('id', propertyId)
        .single();
        
      if (error) throw error;
      
      // Transform to match PropertyDetailsModalEnhanced expected format
      // Include property_units array so modal can access photos for any selected unit
    const transformedProperty = {
      ...data,
      street_address: data.address,
      address: `${data.address || ''}${data.city ? ', ' + data.city : ''}${data.state ? ', ' + data.state : ''}${data.zipcode ? ' ' + data.zipcode : ''}`.trim(),
      city: data.city,
      state: data.state,
      zipcode: data.zipcode,
      desiredRent: data.monthly_rent || data.property_units?.[0]?.monthly_rent,
      desired_rent: data.monthly_rent || data.property_units?.[0]?.monthly_rent,
      monthly_rent: data.monthly_rent || data.property_units?.[0]?.monthly_rent,
      // Pass all units so modal can display correct photos for selected unit
      photos: data.property_units?.[0]?.photos || [],
      property_units: data.property_units,
      description: data.property_units?.[0]?.description || '',
    };
      
      setListingPreviewProperty(transformedProperty);
      setShowListingPreview(true);
    } catch (error) {
      console.error('Error fetching property for preview:', error);
    } finally {
      setIsLoadingPreview(null);
    }
  };

  // Track if loading is taking too long
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  useEffect(() => {
    if (propertiesLoading) {
      const timer = setTimeout(() => setLoadingTooLong(true), 5000);
      return () => {
        clearTimeout(timer);
        setLoadingTooLong(false);
      };
    }
    setLoadingTooLong(false);
  }, [propertiesLoading]);

  if (propertiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading properties...</p>
          {loadingTooLong && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" />
                Taking longer than expected...
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setUseFallback(true)}
              >
                Use Fallback Query
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Helper functions for debugging
  const copyDiagnostics = async () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      user: { id: user?.id, email: user?.email },
      filters,
      debugData,
      rpcError,
      propertiesCount: properties.length,
      filteredCount: filteredProperties.length,
      queryError: queryError?.message
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      console.log('📋 Diagnostics copied to clipboard');
    } catch (err) {
      console.error('Failed to copy diagnostics:', err);
    }
  };

  const retryRpc = () => {
    setUseFallback(false);
    setRpcError(null);
    refetchProperties();
  };

  return (
    <div className="space-y-6">
      {/* Debug Alert Banner */}
      {(rpcError || queryError) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Admin RPC Error:</strong> {rpcError?.message || queryError?.message}
              {rpcError?.hint && <div className="text-sm mt-1">💡 {rpcError.hint}</div>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={retryRpc}>
                <RefreshCcw className="w-3 h-3 mr-1" />
                Retry RPC
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUseFallback(true)}>
                Use Fallback
              </Button>
              <Button size="sm" variant="outline" onClick={copyDiagnostics}>
                <Copy className="w-3 h-3 mr-1" />
                Copy Debug
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Mode Indicator */}
      {isDebugMode && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md text-sm">
          <Bug className="w-4 h-4" />
          Debug Mode Active • {useFallback ? 'Using Fallback Query' : 'Using RPC'}
        </div>
      )}

      {/* Enhanced Filters */}
      <PropertiesDirectoryFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        filterCounts={filterCounts}
        dynamicCounts={dynamicCounts}
        portfolios={portfolios}
        owners={processedOwners}
        locations={locations}
        showCounts={false}
      />

      {/* Bulk Actions Component */}
      <BulkPropertyActions
        properties={filteredProperties}
        selectedProperties={selectedProperties}
        onSelectionChange={setSelectedProperties}
      />

      {/* Results Summary & Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          Property Management
          <span className="text-muted-foreground ml-2">({filteredProperties.length})</span>
        </h2>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
          <Button variant="outline">
            Export Data
          </Button>
          <Button onClick={() => setShowAddPropertyModal(true)}>
            Add Property
          </Button>
          <Button variant="outline" onClick={() => setShowRestoreModal(true)}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restore Deleted
          </Button>
        </div>
      </div>

      {/* Property Management View */}
      {viewMode === 'list' ? (
        <PropertyTableView
          properties={filteredProperties.map(p => ({
            ...p,
            portfolio_client_email: portfolios.find(port => port.id === p.portfolio_id)?.client_email || null
          }))}
          tenantInfo={tenantInfo}
          selectedProperties={selectedProperties}
          onSelectionChange={setSelectedProperties}
          onPropertyClick={(property) => {
            setSelectedProperty(property);
            setModalInitialTab('overview');
          }}
          owners={processedOwners}
          portfolios={portfolios}
          onStatusChange={handlePropertyStatusChange}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
          const portfolio = portfolios.find(p => p.id === property.portfolio_id);
          const owner = processedOwners.find(o => o.id === property.owner_id);
          
          return (
            <Card key={property.id} className={`hover:shadow-lg transition-shadow ${
              selectedProperties.includes(property.id) ? 'ring-2 ring-primary' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedProperties.includes(property.id)}
                      onCheckedChange={() => {
                        if (selectedProperties.includes(property.id)) {
                          setSelectedProperties(prev => prev.filter(id => id !== property.id));
                        } else {
                          setSelectedProperties(prev => [...prev, property.id]);
                        }
                      }}
                    />
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {formatAddress(property)}
                    </CardTitle>
                  </div>
                  <Badge variant={getStatusVariant(property.status)}>
                    {property.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Location */}
                {(property.city || property.state) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {property.city && property.state 
                      ? `${property.city}, ${property.state}`
                      : property.city || property.state}
                  </div>
                )}

                {/* Rent */}
                {property.monthly_rent && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">
                      ${property.monthly_rent.toLocaleString()}/month
                    </span>
                  </div>
                )}

                {/* Owner */}
                {portfolio?.client_email ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{portfolio.client_email}</span>
                    <Badge className="w-fit bg-purple-100 text-purple-800 text-xs">
                      OpenKey Listed
                    </Badge>
                  </div>
                ) : owner && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {owner.name}
                  </div>
                )}

                {/* Portfolio */}
                {portfolio && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {portfolio.client_name}
                    </Badge>
                  </div>
                )}

                {/* Property Type */}
                {property.property_type && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {property.property_type}
                      {property.commercial_type && ` - ${property.commercial_type}`}
                    </Badge>
                  </div>
                )}

                {/* Management Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <div className="flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    {(property as Property).maintenance_requests_count || 0} requests
                  </div>
                  {(property as Property).lease_end_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Lease ends {new Date((property as Property).lease_end_date!).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Admin Controls */}
                <div className="space-y-3 pt-2 border-t">
                  {/* Market Toggle */}
                  {(property as any).unit_count <= 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Market Status:</span>
                      <OnMarketToggle
                        propertyId={property.id}
                        currentOnMarket={(property as any).on_market || false}
                        propertyData={property}
                        onStatusChange={handlePropertyStatusChange}
                        adminMode={true}
                      />
                    </div>
                  )}

                  {/* Tenant Actions */}
                  {(property as any).supports_tenant_management && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tenant:</span>
                      <TenantQuickActions
                        propertyId={property.id}
                        propertyAddress={formatAddress(property)}
                        hasTenant={!!(property as any).tenant_id}
                        onStatusChange={handlePropertyStatusChange}
                        adminMode={true}
                        tenantInfo={(property as any).tenant_info}
                      />
                    </div>
                  )}

                  {/* Unit Management (for multi-unit properties) */}
                  {(property as any).unit_count && (property as any).unit_count > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Units:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUnitsDialogProperty(property)}
                      >
                        Manage Units ({(property as any).unit_count})
                      </Button>
                    </div>
                  )}
                </div>

                {/* Management Actions - Responsive Layout */}
                <div className="space-y-2 pt-3">
                  {/* Primary Actions Row - Always visible */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedProperty(property);
                        setModalInitialTab('applications');
                      }}
                    >
                      Manage
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedProperty(property);
                        setModalInitialTab('overview');
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                  
                  {/* Listing Actions Row - Only when on-market */}
                  {(property as any).on_market && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                          const { data: unitData } = await supabase
                            .from('property_units')
                            .select('id')
                            .eq('property_id', property.id)
                            .limit(1)
                            .maybeSingle();
                          
                          setEditListingPropertyId(property.id);
                          setEditListingAddress(formatAddress(property));
                          setEditListingUnitId(unitData?.id || null);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Listing
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => fetchFullPropertyForPreview(property.id)}
                        disabled={isLoadingPreview === property.id}
                        title="View Listing as Tenant"
                      >
                        {isLoadingPreview === property.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
                        ) : (
                          <Home className="h-3 w-3 mr-1" />
                        )}
                        View Listing
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
          <p className="text-muted-foreground mb-4">
            No properties match your current filter criteria.
          </p>
          <Button 
            variant="outline" 
            onClick={() => setFilters({
              status: 'all',
              propertyType: 'all',
              portfolio: 'all',
              owner: 'all',
              dateAdded: 'all',
              rentRange: 'all',
              location: 'all',
              marketStatus: 'all',
              tenantStatus: 'all'
            })}
          >
            Clear All Filters
          </Button>
        </div>
      )}
      
      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetailsModal
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          property={selectedProperty}
          initialTab={modalInitialTab}
          isAdmin={true}
        />
      )}

      {/* Units Management Dialog */}
      {unitsDialogProperty && (
        <AdminUnitsManagerDialog
          isOpen={!!unitsDialogProperty}
          onClose={() => setUnitsDialogProperty(null)}
          property={{
            id: unitsDialogProperty.id,
            address: formatAddress(unitsDialogProperty)
          }}
        />
      )}

      {/* Debug Diagnostics Panel */}
      {(isDebugMode || rpcError) && (
        <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Bug className="w-4 h-4 mr-2" />
              Diagnostics {debugData && `(${debugData.method})`}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Debug Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>User:</strong> {user?.email} ({user?.id?.substring(0, 8)}...)
                  </div>
                  <div>
                    <strong>Mode:</strong> {useFallback ? 'Fallback Query' : 'RPC Call'}
                  </div>
                </div>

                {debugData && (
                  <div className="space-y-2">
                    <div><strong>Request ID:</strong> {debugData.requestId}</div>
                    <div><strong>Method:</strong> {debugData.method}</div>
                    <div><strong>Duration:</strong> {debugData.duration?.toFixed(2)}ms</div>
                    {debugData.rows !== undefined && <div><strong>Rows Returned:</strong> {debugData.rows}</div>}
                  </div>
                )}

                {rpcError && (
                  <div className="p-2 bg-red-50 dark:bg-red-950 rounded">
                    <strong>Error Details:</strong>
                    <pre className="text-xs mt-1 whitespace-pre-wrap">
                      {JSON.stringify(rpcError, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="space-y-1">
                  <div><strong>Applied Filters:</strong></div>
                  <div className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded">
                    {Object.entries(filters).filter(([_, value]) => value !== 'all').map(([key, value]) => (
                      <div key={key}>{key}: {value}</div>
                    )) || 'None'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div><strong>Results:</strong></div>
                  <div>Total Properties: {properties.length}</div>
                  <div>Filtered Properties: {filteredProperties.length}</div>
                </div>

                {properties.length > 0 && (
                  <div className="space-y-1">
                    <div><strong>Sample Data (first property):</strong></div>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                      {JSON.stringify(properties[0], null, 2).substring(0, 500)}...
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Add Property Modal */}
      <AddPropertyModal
        isOpen={showAddPropertyModal}
        onClose={() => setShowAddPropertyModal(false)}
      />

      {/* Restore Properties Modal */}
      <RestorePropertiesModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
      />

      {/* Edit Listing Modal */}
      <Dialog open={!!editListingPropertyId} onOpenChange={(open) => {
        if (!open) {
          setEditListingPropertyId(null);
          setEditListingUnitId(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 pt-4">
              {editListingPropertyId && (
                <MultiStepTenantRequestForm
                  propertyId={editListingPropertyId}
                  propertyAddress={editListingAddress}
                  unitId={editListingUnitId || undefined}
                  onRequestSent={() => {
                    setEditListingPropertyId(null);
                    setEditListingUnitId(null);
                    refetchProperties();
                  }}
                  onCancel={() => {
                    setEditListingPropertyId(null);
                    setEditListingUnitId(null);
                  }}
                  isEditMode={true}
                />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Listing Preview Modal - Shows what tenant sees */}
      <PropertyDetailsModalEnhanced
        property={listingPreviewProperty}
        isOpen={showListingPreview}
        onClose={() => {
          setShowListingPreview(false);
          setListingPreviewProperty(null);
        }}
        onInterestClick={() => {}}
        isSubmittingInterest={false}
        hasApplied={false}
      />

      {/* Permission Debug Panel */}
      {user && isDebugMode && (
        <div className="mt-6">
          <PermissionDebugPanel />
        </div>
      )}
    </div>
  );
};

export default PropertyManagementHub;
