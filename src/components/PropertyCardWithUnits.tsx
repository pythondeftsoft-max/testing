import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ForSaleCheckbox } from '@/components/property/ForSaleCheckbox';
import { MapPin, Home, Bed, Bath, Building, Eye, Edit, FileText, AlertTriangle, Users, Clock, DollarSign, MoreVertical, Trash2, Map } from 'lucide-react';
import { validatePropertyCoordinates, getGeocodingMessage } from '@/utils/geocodingValidation';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

import { InviteTenantButton } from './InviteTenantButton';
import { MultiStepTenantRequestForm } from './MultiStepTenantRequestForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ComputedStatusBadge } from './property/ComputedStatusBadge';
import { OnMarketToggle } from './property/OnMarketToggle';
import { TenantQuickActions } from './property/TenantQuickActions';
import { PropertyFinancialSetupWizard } from './property/PropertyFinancialSetupWizard';
import { useTenantManagementVisibility } from '@/hooks/useAssetBehavior';
import { debugLog, isTenantDebugEnabled } from '@/utils/debug';
import { UnitFinancialsEditorDialog } from './unit/UnitFinancialsEditorDialog';
import { useUnitRealTimeUpdates } from '@/hooks/useUnitRealTimeUpdates';
import { PropertyFinancialMetrics } from './property/PropertyFinancialMetrics';
import { PropertyFinancialEditor } from './property/PropertyFinancialEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Property {
  id: string;
  address: string;
  monthly_rent: number;
  desired_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  unit_count: number;
  zipcode?: string;
  city?: string;
  state?: string;
  amenities?: string[];
  status: string;
  owner_id: string;
  lease_end_date?: string;
  on_market?: boolean;
  occupancy_status?: string;
  property_type?: string;
  portfolio_id?: string;
  portfolio_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  country?: string;
}

interface UnitSummary {
  total_units: number;
  available_units: number;
  vacant_units: number;
  occupied_units: number;
  maintenance_units: number;
  vacancy_rate: number;
}

interface PropertyCardWithUnitsProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  onMoreInfo?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onPropertyUpdated?: () => void;
}

const PropertyCardWithUnits = ({ 
  property, 
  onViewDetails, 
  onMoreInfo, 
  onEdit,
  onDelete,
  onPropertyUpdated 
}: PropertyCardWithUnitsProps) => {
  const [unitSummary, setUnitSummary] = useState<UnitSummary | null>(null);
  
  const [showFinancialWizard, setShowFinancialWizard] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ id: string; name: string } | null>(null);
  const [leaseRenewalStatus, setLeaseRenewalStatus] = useState<string | null>(null);
  const [computedStatus, setComputedStatus] = useState<string>('Loading...');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUnitForFinancials, setSelectedUnitForFinancials] = useState<any>(null);
  const [isFinancialsDialogOpen, setIsFinancialsDialogOpen] = useState(false);
  const [isPropertyFinancialsDialogOpen, setIsPropertyFinancialsDialogOpen] = useState(false);
  const [showEditListingModal, setShowEditListingModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getRentDisplay = () => {
    switch (computedStatus) {
      case 'Occupied':
        const currentRent = property.monthly_rent || 0;
        return {
          amount: currentRent,
          text: `$${currentRent.toLocaleString()}/month`,
          colorClass: 'text-green-600',
          shouldShow: true,
          secondaryRent: null
        };
        
      case 'Occupied / Listed':
        const currentRentListed = property.monthly_rent || 0;
        const askingRentForListed = property.desired_rent || 0;
        const hasSecondaryRent = askingRentForListed > 0 && askingRentForListed !== currentRentListed;
        
        return {
          amount: currentRentListed,
          text: `$${currentRentListed.toLocaleString()}/month`,
          colorClass: 'text-green-600',
          shouldShow: true,
          secondaryRent: hasSecondaryRent ? {
            text: `Asking: $${askingRentForListed.toLocaleString()}/month`,
            colorClass: 'text-blue-600'
          } : null
        };
        
      case 'Available':
        const askingRent = property.desired_rent || property.monthly_rent || 0;
        return {
          amount: askingRent,
          text: `Asking: $${askingRent.toLocaleString()}/month`,
          colorClass: 'text-blue-600',
          shouldShow: true,
          secondaryRent: null
        };
        
      case 'Vacant':
      default:
        return {
          amount: 0,
          text: '$0/month',
          colorClass: 'text-muted-foreground',
          shouldShow: true,
          secondaryRent: null
        };
    }
  };

  const rentDisplay = getRentDisplay();

  useEffect(() => {
    if (property.unit_count > 1) {
      fetchUnitSummary();
    }
    // Fetch tenant info under broader conditions
    if (property.status === 'occupied' || property.occupancy_status === 'occupied' || computedStatus?.includes('Occupied')) {
      fetchTenantInfo();
      fetchLeaseRenewalStatus();
    } else {
      // Clear tenant info when property is no longer occupied
      setTenantInfo(null);
      setLeaseRenewalStatus(null);
    }
    fetchComputedStatus();
  }, [property.id, property.unit_count, property.status, property.occupancy_status, computedStatus, refreshKey]);

  const fetchUnitSummary = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_property_vacancy_summary', { property_id_param: property.id });

      if (error) throw error;
      if (data && data.length > 0) {
        setUnitSummary(data[0]);
      }
    } catch (error) {
      console.error('Error fetching unit summary:', error);
    }
  };

  const fetchTenantInfo = async () => {
    try {
      // Check 1: property_applications with status='approved' (legacy)
      const { data: appData } = await supabase
        .from('property_applications')
        .select(`
          tenant_id,
          profiles!property_applications_tenant_id_fkey(first_name, last_name)
        `)
        .eq('property_id', property.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (appData?.profiles) {
        setTenantInfo({
          id: appData.tenant_id,
          name: `${appData.profiles.first_name} ${appData.profiles.last_name}`
        });
        return;
      }

      // Check 2: marketplace_applications with status='housed' or 'lease_signed'
      const { data: marketplaceData } = await supabase
        .from('marketplace_applications')
        .select(`
          user_id,
          user:profiles!marketplace_applications_user_id_fkey(first_name, last_name)
        `)
        .eq('property_id', property.id)
        .in('status', ['housed', 'lease_signed'])
        .maybeSingle();

      if (marketplaceData?.user) {
        setTenantInfo({
          id: marketplaceData.user_id,
          name: `${marketplaceData.user.first_name} ${marketplaceData.user.last_name}`
        });
        return;
      }

      // Check 3: property_units with tenant_id set and status='occupied'
      const { data: unitData } = await supabase
        .from('property_units')
        .select(`
          tenant_id,
          tenant:profiles!property_units_tenant_id_fkey(first_name, last_name)
        `)
        .eq('property_id', property.id)
        .not('tenant_id', 'is', null)
        .eq('status', 'occupied')
        .limit(1)
        .maybeSingle();

      if (unitData?.tenant) {
        setTenantInfo({
          id: unitData.tenant_id,
          name: `${unitData.tenant.first_name} ${unitData.tenant.last_name}`
        });
        return;
      }

      setTenantInfo(null);
    } catch (error) {
      console.error('Error fetching tenant info:', error);
      setTenantInfo(null);
    }
  };

  const fetchLeaseRenewalStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_renewals')
        .select('renewal_status')
        .eq('property_id', property.id)
        .in('renewal_status', ['pending', 'sent', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLeaseRenewalStatus(data.renewal_status);
      }
    } catch (error) {
      setLeaseRenewalStatus(null);
    }
  };

  const fetchComputedStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_computed_property_status', {
        p_property_id: property.id
      });

      if (error) {
        console.error('Error fetching computed status:', error);
        setComputedStatus('Unknown');
        return;
      }

      setComputedStatus(data || 'Unknown');
    } catch (error) {
      console.error('Error fetching computed status:', error);
      setComputedStatus('Unknown');
    }
  };

  const handleStatusChange = () => {
    setRefreshKey(prev => prev + 1);
    window.dispatchEvent(new CustomEvent('properties-changed', { 
      detail: { eventType: 'UPDATE' }
    }));
    onPropertyUpdated?.();
  };

  const getStreetAddress = () => {
    // Extract just the street address from the full address
    // If we have separate fields, use them; otherwise parse the full address
    const fullAddress = property.address;
    
    // If city and state are available separately, we can assume 
    // the address field might contain the full address, so we need to extract street
    if (property.city && property.state) {
      // Try to extract street address by removing city, state, zip from the end
      const cityStateZip = `${property.city}, ${property.state} ${property.zipcode || ''}`.trim();
      if (fullAddress.includes(cityStateZip)) {
        return fullAddress.replace(cityStateZip, '').replace(/,\s*$/, '').trim();
      }
    }
    
    // Fallback: return the full address if we can't parse it
    return fullAddress;
  };

  const getLeaseExpirationWarning = () => {
    if (!property.lease_end_date) return null;
    
    const leaseEndDate = new Date(property.lease_end_date);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration <= 60 && daysUntilExpiration > 0) {
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Lease expires in {daysUntilExpiration} days
        </Badge>
      );
    }
    
    return null;
  };

  const getLeaseRenewalBadge = () => {
    if (!leaseRenewalStatus) return null;
    
    switch (leaseRenewalStatus) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">Renewal Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Renewal Offer Sent</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Renewal Accepted</Badge>;
      default:
        return null;
    }
  };

  const getGeocodingBadge = () => {
    const geocodingStatus = validatePropertyCoordinates(
      property.latitude,
      property.longitude,
      property.state,
      property.country || 'US'
    );

    if (geocodingStatus.statusColor === 'green') {
      return null; // Don't show badge for properly geocoded properties
    }

    const badgeColors = {
      yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
      red: 'bg-destructive/10 text-destructive border-destructive/30',
    };

    const message = getGeocodingMessage(geocodingStatus);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`${badgeColors[geocodingStatus.statusColor]} cursor-help`}
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(property);
              }}
            >
              <Map className="w-3 h-3 mr-1" />
              {geocodingStatus.statusText}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{message}</p>
            <p className="text-xs text-muted-foreground mt-1">Click to edit and update location</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };


  const getVacancyInfo = () => {
    // Treat properties with unit_count <= 1 as single units
    if (property.unit_count <= 1) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building className="h-3 w-3" />
          Single Unit
        </div>
      );
    }

    if (unitSummary) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Building className="h-3 w-3" />
            <span className="font-medium">{unitSummary.total_units} Units</span>
          </div>
          <div className="flex gap-2 text-xs flex-wrap">
            {unitSummary.available_units > 0 && (
              <span className="text-green-600">{unitSummary.available_units} Available</span>
            )}
            {unitSummary.vacant_units > 0 && (
              <span className="text-orange-600">{unitSummary.vacant_units} Vacant</span>
            )}
            <span className="text-blue-600">{unitSummary.occupied_units} Occupied</span>
            {unitSummary.maintenance_units > 0 && (
              <span className="text-yellow-600">{unitSummary.maintenance_units} Maintenance</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {unitSummary.vacancy_rate.toFixed(1)}% Vacancy Rate
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building className="h-3 w-3" />
        {property.unit_count} Units
      </div>
    );
  };

  // Refined logic for determining if property has a tenant
  // Only trust actual tenant info, not stale occupancy_status
  const hasTenant = Boolean(tenantInfo);
  
  // Determine if tenant management is supported for this property
  // Default to 'residential' for missing property_type to enable tenant management
  const propertyWithDefaults = {
    ...property,
    property_type: property.property_type || 'residential'
  };
  const supportsTenant = useTenantManagementVisibility(propertyWithDefaults as any);

  // Enhanced debug logging with per-card visibility
  debugLog('PropertyCardWithUnits', `Card ${property.id.slice(0, 8)} tenant management`, {
    propertyId: property.id,
    address: property.address.slice(0, 30) + '...',
    propertyType: {
      original: property.property_type,
      defaulted: propertyWithDefaults.property_type
    },
    status: {
      occupancyStatus: property.occupancy_status,
      computedStatus: computedStatus,
      legacyStatus: property.status
    },
    tenantData: {
      hasTenant,
      tenantInfo: tenantInfo ? { id: tenantInfo.id, name: tenantInfo.name } : null
    },
    visibility: {
      supportsTenant,
      onMarket: property.on_market
    },
    decision: `${supportsTenant ? 'SHOW' : 'HIDE'} button: ${hasTenant ? 'Remove' : 'Invite'} Tenant`
  });

  return (
    <>
      <Card className="card-hover-gold relative flex flex-col h-full hover:shadow-md transition-shadow border-border/50">
        {/* Debug badge in top left corner when debugging is enabled */}
        {isTenantDebugEnabled() && (
          <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded shadow-lg z-20 font-mono">
            SUPPORT:{supportsTenant ? 'Yes' : 'No'} | TENANT:{hasTenant ? 'Yes' : 'No'}
          </div>
        )}
        
        {/* Edit and menu buttons in top right corner */}
        {(onEdit || onDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-card/90 hover:bg-card shadow-sm"
                onClick={() => onEdit(property)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 bg-card/90 hover:bg-card shadow-sm"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                  {property.on_market && (
                    <DropdownMenuItem 
                      onClick={() => setShowEditListingModal(true)}
                      className="cursor-pointer"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Listing
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Property
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
        
        <CardHeader className="flex-shrink-0 pb-4">
          {/* Address - Street only */}
          <div className="flex items-center gap-2 pr-10">
            <Home className="h-4 w-4 flex-shrink-0" />
            <CardTitle className="text-lg line-clamp-2">{getStreetAddress()}</CardTitle>
          </div>
          
          {/* Location - City, State, Zip only */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="line-clamp-1">
              {property.city && property.state ? 
                `${property.city}, ${property.state} ${property.zipcode || ''}`.trim() :
                (property.zipcode || 'Location not specified')
              }
            </span>
          </div>
          
          {/* Portfolio badge and geocoding status */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {property.portfolio_name && (
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
                {property.portfolio_name}
              </Badge>
            )}
            {getGeocodingBadge()}
          </div>
          
          {/* Status only - removed Market Toggle from here */}
          <div className="flex justify-start items-center pt-2">
            <ComputedStatusBadge computedStatus={computedStatus} />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-4">
            {/* Primary Rent Display */}
            {rentDisplay.shouldShow && (
              <div className={`${
                computedStatus === 'Available' 
                  ? 'text-base font-medium'
                  : 'text-xl font-semibold'
              } flex-shrink-0 ${rentDisplay.colorClass}`}>
                {rentDisplay.text}
              </div>
            )}

            {/* Bed/Bath */}
            {property.bedrooms && property.bathrooms && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  {property.bedrooms} bed
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="h-3 w-3" />
                  {property.bathrooms} bath
                </div>
              </div>
            )}

            {/* Vacancy Info & Status Indicators */}
            <div className="flex justify-between items-start">
              <div className="flex-shrink-0">
                {getVacancyInfo()}
              </div>
              <div className="flex flex-col gap-1 items-end">
                {getLeaseExpirationWarning()}
                {getLeaseRenewalBadge()}
              </div>
            </div>


            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 overflow-hidden">
                {property.amenities.slice(0, 3).map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {property.amenities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{property.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Asking Rent for Occupied / Listed properties */}
            {rentDisplay.secondaryRent && (
              <div className="pt-4 mt-auto">
                <div className={`text-sm ${rentDisplay.secondaryRent.colorClass}`}>
                  {rentDisplay.secondaryRent.text}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="mt-auto pt-4 border-t bg-muted/20 flex flex-col gap-3">
          {/* Top row - Footer controls */}
          <div className="grid grid-cols-3 gap-2 items-center w-full">
            <div className="justify-self-start">
              <ForSaleCheckbox 
                property={{
                  id: property.id,
                  address: property.address,
                  city: property.city,
                  state: property.state,
                  monthly_rent: property.monthly_rent,
                  bedrooms: property.bedrooms,
                  bathrooms: property.bathrooms
                }}
              />
            </div>
            <div className="justify-self-center">
              {property.unit_count <= 1 ? (
                <OnMarketToggle
                  propertyId={property.id}
                  currentOnMarket={property.on_market || false}
                  propertyData={property}
                  onStatusChange={handleStatusChange}
                  className="w-full"
                />
              ) : (
                <span className="text-sm text-muted-foreground text-center">
                  Manage units below
                </span>
              )}
            </div>
            <div className="justify-self-end">
              {property.unit_count <= 1 ? (
                hasTenant ? (
                  <TenantQuickActions
                    propertyId={property.id}
                    propertyAddress={property.address}
                    hasTenant={hasTenant}
                    onStatusChange={handleStatusChange}
                    currentOnMarket={property.on_market || false}
                    supportsTenantManagement={supportsTenant}
                    adminMode={false}
                    tenantInfo={tenantInfo ? {
                      tenant_id: tenantInfo.id,
                      tenant_name: tenantInfo.name,
                      tenant_email: ''
                    } : undefined}
                  />
                ) : (
                  <InviteTenantButton
                    propertyId={property.id}
                    propertyStatus={property.status}
                    occupancyStatus={property.occupancy_status}
                    propertyAddress={property.address}
                    landlordId={property.owner_id}
                    supportsTenantManagement={supportsTenant}
                    onTenantInvited={handleStatusChange}
                    size="icon"
                    variant="outline"
                    iconOnly={true}
                  />
                )
              ) : null}
            </div>
          </div>

          {/* Bottom row - Footer actions */}
          <div className="flex gap-2 flex-wrap w-full">

            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-[120px] border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              onClick={() => onViewDetails(property)}
            >
              <Eye className="h-3 w-3 mr-2" />
              View Details
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{getStreetAddress()}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(property);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <PropertyFinancialSetupWizard
        isOpen={showFinancialWizard}
        onClose={() => setShowFinancialWizard(false)}
        propertyId={property.id}
        propertyAddress={property.address}
        currentData={property}
      />

      <Dialog open={isPropertyFinancialsDialogOpen} onOpenChange={setIsPropertyFinancialsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              Edit Financial Details - {getStreetAddress()}
            </DialogTitle>
          </DialogHeader>
          <PropertyFinancialEditor
            property={property}
            onSave={() => {
              setIsPropertyFinancialsDialogOpen(false);
              onPropertyUpdated?.();
            }}
            onCancel={() => setIsPropertyFinancialsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Listing Modal */}
      <Dialog open={showEditListingModal} onOpenChange={setShowEditListingModal}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 pt-4">
              <MultiStepTenantRequestForm
                propertyId={property.id}
                propertyAddress={property.address}
                onRequestSent={() => {
                  setShowEditListingModal(false);
                  onPropertyUpdated?.();
                }}
                onCancel={() => setShowEditListingModal(false)}
                isEditMode={true}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PropertyCardWithUnits;
