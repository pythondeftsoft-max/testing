import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntityStageDetails, EntityType, TenantStage, PropertyStage } from '@/hooks/useEntityStageDetails';
import { ExternalLink, UserCircle, Home, DollarSign, Calendar, X, ChevronUp, Loader2, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight, FileText, Send, MessageSquare, UserPlus, MapPin, Users, Eye, Crown, Copy, Filter, ChevronDown, Building2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SubStageBadge } from './SubStageBadge';
import { PushStatusCell } from './PushStatusCell';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MatchTenantToUnitDialog } from './MatchTenantToUnitDialog';
import { MatchPropertyToTenantDialog } from './MatchPropertyToTenantDialog';
import { ConfirmPlacementFeeDialog } from './ConfirmPlacementFeeDialog';
import TenantProfileModal from '@/components/TenantProfileModal';
import { PaymentLinkIndicator } from './PaymentLinkIndicator';
import { PaymentDetailsDialog } from './PaymentDetailsDialog';
import { useWorkerAssignment } from '@/hooks/useWorkerAssignment';
import { usePropertyAssignment } from '@/hooks/usePropertyAssignment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';
import { useToast } from '@/hooks/use-toast';
import { useTenantPipelineNavigation, usePropertyPipelineNavigation } from '@/hooks/useTenantPipelineNavigation';
import { BackToQueueConfirmDialog } from './BackToQueueConfirmDialog';
import { MoveBackOneStageConfirmDialog } from './MoveBackOneStageConfirmDialog';
import { MoveForwardOneStageConfirmDialog } from './MoveForwardOneStageConfirmDialog';
import { JumpToFinalConfirmDialog } from './JumpToFinalConfirmDialog';
import { usePipelineNavigation } from '@/hooks/usePipelineNavigation';
import { useResendPaymentLink } from '@/hooks/useResendPaymentLink';
import { usePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';

import { ViewToggle } from '@/components/implementation/ViewToggle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UnitApplicationsModal } from './UnitApplicationsModal';
import { copyTenantInfoToClipboard } from '@/utils/copyTenantInfo';
import { MarkLeaseSignedDialog } from './MarkLeaseSignedDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// Helper functions
const formatBedrooms = (bedrooms: any[]): string => {
  if (!bedrooms || bedrooms.length === 0) return 'N/A';
  
  // Handle both string formats like ['1BR', '2BR'] and numbers like [1, 2]
  const parsed = bedrooms
    .map(br => {
      if (typeof br === 'string') {
        return parseInt(br.replace('BR', ''), 10);
      }
      return br;
    })
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);
  
  if (parsed.length === 0) return 'N/A';
  if (parsed.length === 1) return `${parsed[0]}BR`;
  return `${Math.min(...parsed)}-${Math.max(...parsed)}BR`;
};

const getInitials = (entity: any) => {
  const firstName = entity.first_name || '';
  const lastName = entity.last_name || '';
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (entity.email) {
    return entity.email[0].toUpperCase();
  }
  return '?';
};

const getDaysSeekingColor = (entity: any) => {
  if (!entity.created_at) return '';
  const days = differenceInDays(new Date(), new Date(entity.created_at));
  if (days <= 14) return 'text-green-600 dark:text-green-400';
  if (days <= 30) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getDaysListedColor = (entity: any) => {
  // If on market but no listed_date, treat as just listed (green)
  if (entity.on_market && !entity.listed_date) {
    return 'text-green-600 dark:text-green-400';
  }
  const dateToUse = entity.listed_date || entity.created_at;
  if (!dateToUse) return '';
  const days = differenceInDays(new Date(), new Date(dateToUse));
  if (days <= 7) return 'text-green-600 dark:text-green-400';
  if (days <= 21) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const formatMoveInWindow = (moveInWindow: string | null): string => {
  if (!moveInWindow) return 'Not specified';
  
  const windowMap: Record<string, string> = {
    'asap': 'ASAP',
    '30-days': 'Within 30 Days',
    '1-2-months': '1-2 Months'
  };
  
  return windowMap[moveInWindow] || moveInWindow;
};

// Helper function to translate UI stages to pipeline stages
function translateUIToPipelineStage(
  uiStage: TenantStage | PropertyStage, 
  entityType: EntityType
): string {
  if (entityType === 'tenant') {
    const tenantStageMap: Record<string, string> = {
      'unassigned': 'unassigned',
      'assigned': 'assigned',
      'in_process': 'in_process',
      'lease_signed': 'approved_awaiting',  // UI name → Pipeline name
      'paid_housed': 'housed_paid',         // UI name → Pipeline name
    };
    return tenantStageMap[uiStage] || uiStage;
  } else {
    const propertyStageMap: Record<string, string> = {
      'unassigned': 'unassigned',
      'assigned': 'available',
      'in_process': 'in_process',
      'lease_signed': 'filled_awaiting_payment',
      'paid_housed': 'paid',
    };
    return propertyStageMap[uiStage] || uiStage;
  }
}

interface PipelineStageExpansionProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType | undefined;
  stage: TenantStage | PropertyStage | undefined;
  stageLabel: string | undefined;
  workerId?: string;
}

export const PipelineStageExpansion: React.FC<PipelineStageExpansionProps> = ({
  isOpen,
  onClose,
  entityType,
  stage,
  stageLabel,
  workerId,
}) => {
  const navigate = useNavigate();
  const resendPaymentLink = useResendPaymentLink();
  const { data: placementFeeConfig } = usePlacementFeeConfig();
  const { data: entities, isLoading } = useEntityStageDetails(
    entityType!,
    stage!,
    workerId
  );
  
  // Calculate placement fee decimal from config
  const placementFeeDecimal = (placementFeeConfig?.config_value?.percentage || 40) / 100;

  // Resend Payment Link Button Component
  const ResendPaymentLinkButton = ({ 
    applicationId, 
    variant = "ghost", 
    size = "icon",
    className = "h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
  }: { 
    applicationId?: string; 
    variant?: "ghost" | "outline" | "default";
    size?: "icon" | "sm" | "default";
    className?: string;
  }) => {
    if (!applicationId) return null;
    
    return (
      <Button 
        variant={variant}
        size={size}
        className={className}
        onClick={() => resendPaymentLink.mutate(applicationId)}
        disabled={resendPaymentLink.isPending}
        title="Resend Payment Link to Landlord"
      >
        {resendPaymentLink.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Send className="h-4 w-4" />
            {size !== "icon" && <span className="ml-1">Resend Payment Link</span>}
          </>
        )}
      </Button>
    );
  };

  // Payment details dialog state
  const [paymentDetails, setPaymentDetails] = useState<{
    applicationId?: string;
    propertyAddress?: string;
    tenantName?: string;
    placementFeeAmount?: number;
    tenantId?: string;
    propertyId?: string;
    unitId?: string;
  } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Filter states
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [bedroomFilter, setBedroomFilter] = useState<string>('all');
  const [daysSort, setDaysSort] = useState<string>('default');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Extract unique filter values
  const filterOptions = useMemo(() => {
    const states = new Set<string>();
    const cities = new Set<string>();
    const bedrooms = new Set<string>();
    
    (entities || []).forEach((entity: any) => {
      if (entity.state) states.add(entity.state);
      if (entity.city) cities.add(entity.city);
      
      if (entityType === 'tenant') {
        if (entity.bedrooms_approved && Array.isArray(entity.bedrooms_approved)) {
          entity.bedrooms_approved.forEach((br: any) => {
            let brStr = typeof br === 'string' ? br : `${br}BR`;
            // Normalize: uppercase, handle studio variants
            brStr = brStr.toUpperCase().replace('STUDIO-', 'STUDIO/');
            // If it's just a number (like "2" or "3"), add "BR" suffix
            if (/^\d+$/.test(brStr)) {
              brStr = `${brStr}BR`;
            }
            bedrooms.add(brStr);
          });
        }
      } else {
        if (entity.bedrooms) bedrooms.add(`${entity.bedrooms}BR`);
      }
    });
    
    return {
      states: Array.from(states).sort(),
      cities: Array.from(cities).sort(),
      bedrooms: Array.from(bedrooms).sort((a, b) => {
        const numA = parseInt(a.replace('BR', ''));
        const numB = parseInt(b.replace('BR', ''));
        return numA - numB;
      }),
    };
  }, [entities, entityType]);

  // Filter and sort entities
  const filteredEntities = useMemo(() => {
    let result = (entities || []).filter((entity: any) => {
      if (stateFilter !== 'all' && entity.state !== stateFilter) return false;
      if (cityFilter !== 'all' && entity.city !== cityFilter) return false;
      if (bedroomFilter !== 'all') {
        if (entityType === 'tenant') {
          const bedroomsApproved = entity.bedrooms_approved || [];
          const bedroomMatch = bedroomsApproved.some((br: any) => {
            let brStr = typeof br === 'string' ? br : `${br}BR`;
            brStr = brStr.toUpperCase().replace('STUDIO-', 'STUDIO/');
            // If it's just a number (like "2" or "3"), add "BR" suffix
            if (/^\d+$/.test(brStr)) {
              brStr = `${brStr}BR`;
            }
            return brStr === bedroomFilter;
          });
          if (!bedroomMatch) return false;
        } else {
          const unitBedrooms = `${entity.bedrooms}BR`;
          if (unitBedrooms !== bedroomFilter) return false;
        }
      }
      if (searchQuery) {
        const aw = entity.assigned_worker;
        const workerName = aw ? `${aw.first_name || ''} ${aw.last_name || ''}` : '';
        let haystack = '';
        if (entityType === 'property') {
          const owner = entity.profiles || {};
          haystack = [
            entity.street_address, entity.address, entity.unit_number,
            entity.city, entity.state, entity.zip, entity.zip_code,
            owner.first_name, owner.last_name, owner.email,
            workerName,
          ].filter(Boolean).join(' ').toLowerCase();
        } else {
          haystack = [
            entity.first_name, entity.last_name, entity.email, entity.phone,
            entity.city, entity.state,
            entity.voucher_pha_name, entity.pha_name,
            workerName,
          ].filter(Boolean).join(' ').toLowerCase();
        }
        if (!haystack.includes(searchQuery)) return false;
      }
      return true;
    });

    // Apply days sort
    if (daysSort === 'oldest') {
      result = [...result].sort((a: any, b: any) => {
        const dateA = entityType === 'property' 
          ? new Date(a.listed_date || a.created_at).getTime()
          : new Date(a.created_at).getTime();
        const dateB = entityType === 'property' 
          ? new Date(b.listed_date || b.created_at).getTime()
          : new Date(b.created_at).getTime();
        return dateA - dateB;
      });
    } else if (daysSort === 'newest') {
      result = [...result].sort((a: any, b: any) => {
        const dateA = entityType === 'property' 
          ? new Date(a.listed_date || a.created_at).getTime()
          : new Date(a.created_at).getTime();
        const dateB = entityType === 'property' 
          ? new Date(b.listed_date || b.created_at).getTime()
          : new Date(b.created_at).getTime();
        return dateB - dateA;
      });
    }

    return result;
  }, [entities, stateFilter, cityFilter, bedroomFilter, entityType, daysSort, searchQuery]);

  const hasFilters = stateFilter !== 'all' || cityFilter !== 'all' || bedroomFilter !== 'all' || daysSort !== 'default' || searchQuery !== '';

  const clearFilters = () => {
    setStateFilter('all');
    setCityFilter('all');
    setBedroomFilter('all');
    setDaysSort('default');
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Calculate pagination (using filtered data)
  const totalItems = filteredEntities.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEntities = filteredEntities.slice(startIndex, endIndex);

  // Reset to page 1 when stage or worker changes
  useEffect(() => {
    setCurrentPage(1);
    setStateFilter('all');
    setCityFilter('all');
    setBedroomFilter('all');
    setDaysSort('default');
    setSearchInput('');
    setSearchQuery('');
  }, [stage, workerId]);

  const [selectedTenantForMatch, setSelectedTenantForMatch] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [selectedEntityForPayment, setSelectedEntityForPayment] = useState<{
    entityType: 'tenant' | 'property';
    entityId: string;
    entityName: string;
    placementFeeAmount?: number;
    monthlyRent?: number;
    feePercent?: number;
    applicationId?: string;
    tenantId?: string;
    propertyId?: string;
    unitId?: string;
  } | null>(null);

  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState<{
    id: string;
  } | null>(null);

  const [selectedPropertyForModal, setSelectedPropertyForModal] = useState<any | null>(null);

  const [selectedPropertyForMatch, setSelectedPropertyForMatch] = useState<{
    unitId: string;
    propertyId: string;
    address: string;
  } | null>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);

  // Applications modal state
  const [selectedApplicationsUnit, setSelectedApplicationsUnit] = useState<{
    unitId: string;
    address: string;
  } | null>(null);

  // Mark lease signed dialog state
  const [selectedUnitForLeaseSigning, setSelectedUnitForLeaseSigning] = useState<{
    unitId: string;
    address: string;
    tenantName: string;
  } | null>(null);

  // View toggle state
  const [view, setView] = useState<'card' | 'table'>('table');
  const [selectedEntityForView, setSelectedEntityForView] = useState<any>(null);
  
  // Expanded buildings state for grouped multi-unit properties
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  
  const toggleBuildingExpand = useCallback((propertyId: string) => {
    setExpandedBuildings(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  }, []);

  const { assignTenantToWorker } = useWorkerAssignment();
  const { assignPropertyUnitToWorker } = usePropertyAssignment();
  const { moveBackOneStage: moveBackTenant, backToQueue: backToQueueTenant } = useTenantPipelineNavigation();
  const { moveBackOneStage: moveBackProperty, backToQueue: backToQueueProperty } = usePropertyPipelineNavigation();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast: toastHook } = useToast();
  
  // Dialog states for navigation
  const [backToQueueDialogOpen, setBackToQueueDialogOpen] = useState(false);
  const [moveBackDialogOpen, setMoveBackDialogOpen] = useState(false);
  const [moveForwardDialogOpen, setMoveForwardDialogOpen] = useState(false);
  const [jumpToFinalDialogOpen, setJumpToFinalDialogOpen] = useState(false);
  const [selectedEntityForAction, setSelectedEntityForAction] = useState<any>(null);

  // Forward navigation hook
  const { moveForwardOneStage, jumpToFinal } = usePipelineNavigation();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  const handleAssignToMe = async (entityId: string) => {
    if (!currentUserId) {
      toast.error('Unable to identify current user');
      return;
    }

    try {
      if (entityType === 'tenant') {
        await assignTenantToWorker.mutateAsync({
          tenantId: entityId,
          workerId: currentUserId
        });
      } else {
        await assignPropertyUnitToWorker.mutateAsync({
          unitId: entityId,
          workerId: currentUserId
        });
      }
      onClose();
    } catch (error) {
      console.error('Assignment error:', error);
    }
  };

  const handleCopyTenantInfo = (tenant: any) => {
    copyTenantInfoToClipboard(tenant);
  };

  const fetchFullProperty = async (propertyId: string) => {
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
          unit_photos,
          photos,
          on_market
        )
      `)
      .eq('id', propertyId)
      .single();
      
    if (error) throw error;
    return data;
  };

  const transformUnitToListing = (property: any, unitId: string) => {
    // Find the specific unit
    const unit = property.property_units?.find((u: any) => u.id === unitId);
    
    if (!unit) {
      // If unit not found, return property as-is
      return property;
    }
    
    // Build address
    const baseAddress = property.address || property.street_address || '';
    const fullAddress = `${baseAddress}${property.city ? ', ' + property.city : ''}${property.state ? ', ' + property.state : ''}${property.zipcode ? ' ' + property.zipcode : ''}`.trim();
    
    // Transform unit into marketplace listing format
    return {
      ...property, // Keep all property fields for reference
      type: 'unit', // Mark as unit listing
      id: unit.id, // Use unit ID as primary ID
      parentPropertyId: property.id,
      
      // Unit-specific details (override property-level data)
      unitNumber: unit.unit_number,
      unitName: unit.unit_name,
      rent: unit.monthly_rent || property.monthly_rent || 0,
      monthly_rent: unit.monthly_rent || property.monthly_rent || 0,
      desired_rent: unit.monthly_rent || property.monthly_rent || 0,
      bedrooms: unit.bedrooms || property.bedrooms,
      bathrooms: unit.bathrooms || property.bathrooms,
      square_feet: unit.square_feet || property.square_feet,
      amenities: (unit.unit_amenities && unit.unit_amenities.length > 0) 
        ? unit.unit_amenities 
        : (property.amenities || []),
      description: unit.description || property.description,
      status: unit.status,
      
      // Photos: Unit photos take priority, fall back to property photos
      // Must check array length since empty arrays are truthy
      photos: (Array.isArray(unit.photos) && unit.photos.length > 0)
        ? unit.photos
        : (Array.isArray(unit.unit_photos) && unit.unit_photos.length > 0)
          ? unit.unit_photos
          : (property.photos || []),
      
      // Keep property address and location
      address: fullAddress,
      street_address: property.street_address,
      
      // Preserve property_units array for "Available Units" section
      property_units: property.property_units,
    };
  };

  const handleViewDetails = async (unitId: string, propertyId?: string) => {
    if (entityType === 'tenant') {
      navigate(`/admin/users/${unitId}`);
      onClose();
    } else {
      // For properties/units: Validate we have a property ID
      if (!propertyId) {
        toastHook({
          title: "Error",
          description: "Property information is missing. Please refresh and try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Open modal with unit-specific marketplace view
      setIsLoadingProperty(true);
      try {
        const fullPropertyData = await fetchFullProperty(propertyId);
        
        // Transform the specific unit into a marketplace listing
        const unitListing = transformUnitToListing(fullPropertyData, unitId);
        
        console.log('🏠 Opening unit modal:', {
          unitId,
          propertyId,
          type: unitListing.type,
          bedrooms: unitListing.bedrooms,
          rent: unitListing.rent,
          unitNumber: unitListing.unitNumber
        });
        
        setSelectedPropertyForModal(unitListing);
        setShowPropertyModal(true);
      } catch (error) {
        console.error('Error fetching property:', error);
        toastHook({
          title: "Error",
          description: "Failed to load property details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingProperty(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="border rounded-lg bg-background shadow-sm mt-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
      <div className="flex flex-col">
          {/* Header with close button and view toggle */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/50 shrink-0">
            <div className="flex items-center gap-2">
              {entityType === 'tenant' ? <UserCircle className="h-4 w-4" /> : <Home className="h-4 w-4" />}
              <h3 className="font-semibold">{stageLabel}</h3>
              <Badge variant="secondary">{hasFilters ? `${filteredEntities.length} of ${entities?.length || 0}` : entities?.length || 0}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <ViewToggle view={view} onViewChange={setView} />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={entityType === 'property' ? 'Search address, owner, worker…' : 'Search name, email, PHA…'}
                className="h-8 pl-7 w-[240px]"
              />
            </div>
            <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {filterOptions.states.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {filterOptions.cities
                  .filter(city => stateFilter === 'all' || (entities || []).some((e: any) => e.city === city && e.state === stateFilter))
                  .map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={bedroomFilter} onValueChange={(v) => { setBedroomFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bedrooms</SelectItem>
                {filterOptions.bedrooms.map(br => (
                  <SelectItem key={br} value={br}>{br}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={daysSort} onValueChange={(v) => { setDaysSort(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder={entityType === 'tenant' ? 'Days Seeking' : 'Days Listed'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{entityType === 'tenant' ? 'Days Seeking' : 'Days Listed'}</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Pagination controls - Top */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {totalItems === 0 ? 0 : startIndex + 1}-{totalItems === 0 ? 0 : Math.min(endIndex, totalItems)} of {totalItems}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Select 
                value={String(itemsPerPage)} 
                onValueChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
              
              {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {(() => {
                        const getPageNumbers = (current: number, total: number) => {
                          if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
                          if (current <= 3) return [1, 2, 3, 4, 5, '...', total];
                          if (current >= total - 2) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
                          return [1, '...', current - 1, current, current + 1, '...', total];
                        };
                        return getPageNumbers(currentPage, totalPages).map((pageNum, idx) => (
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
                        ));
                      })()}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>

          {/* Entity content with conditional rendering */}
          <div className="p-4 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : entities && entities.length > 0 ? (
              view === 'table' ? (
                // TABLE VIEW
                <Table>
                  <TableHeader>
                    <TableRow>
                      {entityType === 'tenant' ? (
                        <>
                          <TableHead>Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>BR</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Days Seeking</TableHead>
                          {stage === 'assigned' && <TableHead>Sub-Stage</TableHead>}
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Navigate</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Address</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>BR/BA</TableHead>
                          <TableHead>Rent</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Days Listed</TableHead>
                          {stage === 'assigned' && <TableHead>Sub-Stage</TableHead>}
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Navigate</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEntities.map((entity: any) => {
                      // Handle grouped building rows for properties
                      if (entityType === 'property' && entity.isGroupedBuilding) {
                        const isExpanded = expandedBuildings.has(entity.groupedPropertyId);
                        return (
                          <React.Fragment key={`building-${entity.groupedPropertyId}`}>
                            {/* Building Header Row */}
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50 bg-accent/20"
                              onClick={() => toggleBuildingExpand(entity.groupedPropertyId)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-primary" />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{entity.street_address}</p>
                                      <Badge variant="secondary" className="text-xs">
                                        {entity.groupedUnitCount} units
                                      </Badge>
                                    </div>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{entity.city}, {entity.state}</TableCell>
                              <TableCell>
                                {entity.bedrooms_range 
                                  ? `${entity.bedrooms_range}/${entity.bathrooms_range || entity.bathrooms}`
                                  : `${entity.bedrooms || '-'}/${entity.bathrooms || '-'}`}
                              </TableCell>
                              <TableCell>
                                {entity.rent_range || `$${entity.monthly_rent?.toLocaleString() || 'N/A'}`}
                              </TableCell>
                              <TableCell>
                                {entity.portfolio_client_email ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs truncate max-w-24">{entity.portfolio_client_email}</span>
                                    <Badge className="w-fit bg-purple-100 text-purple-800 text-[10px] dark:bg-purple-900/30 dark:text-purple-300">
                                      OpenKey
                                    </Badge>
                                  </div>
                                ) : entity.profiles ? (
                                  <span className="text-sm text-muted-foreground truncate max-w-24">
                                    {`${entity.profiles.first_name || ''} ${entity.profiles.last_name || ''}`.trim() || 'Unknown'}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {entity.assigned_worker
                                    ? `${entity.assigned_worker.first_name || ''} ${entity.assigned_worker.last_name || ''}`.trim()
                                    : 'Mixed'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const refDate = entity.listed_date || entity.listed_at || entity.created_at;
                                  if (!refDate) return <span className="text-xs text-muted-foreground">-</span>;
                                  return (
                                    <div className={`flex items-center gap-1 text-xs font-medium ${getDaysListedColor(entity)}`}>
                                      {differenceInDays(new Date(), new Date(refDate))} days
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              {stage === 'assigned' && <TableCell>-</TableCell>}
                              <TableCell>
                                <Badge variant="secondary">
                                  {entity.groupedUnitCount} units
                                </Badge>
                              </TableCell>
                              <TableCell><span className="text-xs text-muted-foreground">Expand →</span></TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(entity.id, entity.properties?.id);
                                  }}
                                  disabled={isLoadingProperty || !entity.properties?.id}
                                  title="View Property"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            {/* Expanded Child Unit Rows */}
                            {isExpanded && entity.groupedUnits.map((childUnit: any) => (
                              <TableRow 
                                key={childUnit.id} 
                                className="cursor-pointer hover:bg-muted/50 bg-muted/10 border-l-2 border-l-primary/30"
                                onClick={() => handleViewDetails(childUnit.id, childUnit.properties?.id)}
                              >
                                <TableCell className="font-medium pl-10">
                                  <div className="flex items-center gap-2">
                                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm">
                                        {childUnit.unit_number 
                                          ? (childUnit.unit_number.toLowerCase().startsWith('unit') 
                                            ? childUnit.unit_number 
                                            : `Unit ${childUnit.unit_number}`)
                                          : `Unit`}
                                      </p>
                                       {!childUnit.on_market && (
                                        stage === 'lease_signed' || stage === 'paid_housed' ? (
                                          <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">
                                            Off-market (filled)
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] border-warning text-warning">
                                            Paused
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{childUnit.city}, {childUnit.state}</TableCell>
                                <TableCell className="text-sm">{childUnit.bedrooms}/{childUnit.bathrooms}</TableCell>
                                <TableCell className="text-sm">${childUnit.monthly_rent?.toLocaleString() || 'N/A'}</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>
                                  <span className="text-sm">
                                    {childUnit.assigned_worker
                                      ? `${childUnit.assigned_worker.first_name || ''} ${childUnit.assigned_worker.last_name || ''}`.trim()
                                      : 'Unassigned'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const refDate = childUnit.listed_date || childUnit.listed_at || childUnit.created_at;
                                    if (!refDate) return <span className="text-xs text-muted-foreground">-</span>;
                                    return (
                                      <div className={`flex items-center gap-1 text-xs font-medium ${getDaysListedColor(childUnit)}`}>
                                        {differenceInDays(new Date(), new Date(refDate))} days
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                {stage === 'assigned' && (
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <PushStatusCell entityType="property" entityId={childUnit.id} />
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Badge variant="secondary" className="text-[10px]">{childUnit.vacancy_status || 'N/A'}</Badge>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-0.5">
                                    {stage !== 'unassigned' && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => { e.stopPropagation(); setSelectedEntityForAction(childUnit); setBackToQueueDialogOpen(true); }}
                                        title="Send back to queue"><ChevronsLeft className="h-3 w-3" /></Button>
                                    )}
                                    {stage !== 'unassigned' && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        onClick={(e) => { e.stopPropagation(); setSelectedEntityForAction(childUnit); setMoveBackDialogOpen(true); }}
                                        title="Move back one stage"><ChevronLeft className="h-3 w-3" /></Button>
                                    )}
                                    {stage !== 'paid_housed' && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-success hover:bg-success/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (stage === 'assigned') {
                                            setSelectedPropertyForMatch({ unitId: childUnit.id, propertyId: childUnit.properties?.id || childUnit.id, address: childUnit.street_address || 'Unknown Address' });
                                          } else {
                                            setSelectedEntityForAction(childUnit); setMoveForwardDialogOpen(true);
                                          }
                                        }}
                                        title="Move forward one stage"><ChevronRight className="h-3 w-3" /></Button>
                                    )}
                                    {stage !== 'paid_housed' && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-success hover:bg-success/10"
                                        onClick={(e) => { e.stopPropagation(); setSelectedEntityForAction(childUnit); setJumpToFinalDialogOpen(true); }}
                                        title="Jump to final stage"><ChevronsRight className="h-3 w-3" /></Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => handleViewDetails(childUnit.id, childUnit.properties?.id)}
                                    disabled={isLoadingProperty || !childUnit.properties?.id}
                                    title="View Details"><Eye className="h-4 w-4" /></Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      }
                      
                      // Regular (non-grouped) row rendering
                      return (
                      <TableRow key={entity.id} className="cursor-pointer hover:bg-muted/50" onClick={() => entityType === 'tenant' ? setSelectedTenantForProfile({ id: entity.id }) : handleViewDetails(entity.id, entity.properties?.id)}>
                        {entityType === 'tenant' ? (
                          <>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                  {getInitials(entity)}
                                </div>
                                <div>
                                  <p className="font-medium">{`${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.email}</p>
                                  <p className="text-xs text-muted-foreground">{entity.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {entity.city && entity.state 
                                ? `${entity.city}, ${entity.state}`
                                : entity.city || entity.state || entity.territory?.territory_name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {formatBedrooms(entity.bedrooms_approved)}
                            </TableCell>
                            <TableCell>
                              {entity.rent_range_min && entity.rent_range_max
                                ? `$${entity.rent_range_min.toLocaleString()}-$${entity.rent_range_max.toLocaleString()}`
                                : entity.max_rent 
                                ? `Up to $${entity.max_rent.toLocaleString()}`
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {entity.assigned_worker
                                ? `${entity.assigned_worker.first_name || ''} ${entity.assigned_worker.last_name || ''}`.trim()
                                : 'Unassigned'}
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1 text-xs font-medium ${getDaysSeekingColor(entity)}`}>
                                {differenceInDays(new Date(), new Date(entity.created_at))} days
                              </div>
                            </TableCell>
                            {stage === 'assigned' && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <PushStatusCell entityType="tenant" entityId={entity.id} />
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge variant="secondary">{entity.housing_status || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-0.5">
                                {stage !== 'unassigned' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEntityForAction(entity);
                                      setBackToQueueDialogOpen(true);
                                    }}
                                    title="Send back to queue"
                                  >
                                    <ChevronsLeft className="h-3 w-3" />
                                  </Button>
                                )}
                                {stage !== 'unassigned' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEntityForAction(entity);
                                      setMoveBackDialogOpen(true);
                                    }}
                                    title="Move back one stage"
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                )}
                                {stage !== 'paid_housed' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-success hover:bg-success/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (stage === 'assigned') {
                                        setSelectedTenantForMatch({ id: entity.id, name: `${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.email });
                                      } else {
                                        setSelectedEntityForAction(entity);
                                        setMoveForwardDialogOpen(true);
                                      }
                                    }}
                                    title="Move forward one stage"
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                )}
                                {stage !== 'paid_housed' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-success hover:bg-success/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEntityForAction(entity);
                                      setJumpToFinalDialogOpen(true);
                                    }}
                                    title="Jump to final stage"
                                  >
                                    <ChevronsRight className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                             <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {stage === 'lease_signed' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                                    onClick={() => {
                                      const tenantName = `${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.email || 'Unknown';
                                      const rentForFee = entity.matched_unit?.monthly_rent || 0;
                                      const placementFee = rentForFee ? Math.round(rentForFee * placementFeeDecimal) : 0;
                                      setSelectedEntityForPayment({
                                        entityType: 'tenant',
                                        entityId: entity.id,
                                        entityName: tenantName,
                                        placementFeeAmount: placementFee,
                                        monthlyRent: rentForFee,
                                        feePercent: Math.round(placementFeeDecimal * 100),
                                        applicationId: entity.matched_unit?.application_id,
                                        tenantId: entity.id,
                                        propertyId: entity.matched_unit?.property_id,
                                        unitId: entity.matched_unit?.unit_id,
                                      });
                                    }}
                                    title="Confirm Placement Fee Payment"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyTenantInfo(entity);
                                  }}
                                  title="Copy Tenant Info"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setSelectedTenantForProfile({ id: entity.id })}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                             </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{entity.street_address}</p>
                                    {!entity.on_market && (
                                      stage === 'lease_signed' || stage === 'paid_housed' ? (
                                        <Badge variant="outline" className="text-xs border-muted-foreground/40 text-muted-foreground">
                                          Off-market (filled)
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs border-warning text-warning">
                                          Paused {entity.applications_count > 0 && `(${entity.applications_count} apps)`}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                  {entity.unit_number && (
                                    <p className="text-xs text-muted-foreground">
                                      {entity.unit_number.toLowerCase().startsWith('unit') 
                                        ? entity.unit_number 
                                        : `Unit ${entity.unit_number}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{entity.city}, {entity.state}</TableCell>
                            <TableCell>{entity.bedrooms}/{entity.bathrooms}</TableCell>
                            <TableCell>${entity.monthly_rent?.toLocaleString() || 'N/A'}</TableCell>
                            <TableCell>
                              {entity.portfolio_client_email ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs truncate max-w-24">{entity.portfolio_client_email}</span>
                                  <Badge className="w-fit bg-purple-100 text-purple-800 text-[10px] dark:bg-purple-900/30 dark:text-purple-300">
                                    OpenKey
                                  </Badge>
                                </div>
                              ) : entity.profiles ? (
                                <span className="text-sm text-muted-foreground truncate max-w-24">
                                  {`${entity.profiles.first_name || ''} ${entity.profiles.last_name || ''}`.trim() || 'Unknown'}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm">
                                  {entity.assigned_worker
                                    ? `${entity.assigned_worker.first_name || ''} ${entity.assigned_worker.last_name || ''}`.trim()
                                    : 'Unassigned'}
                                </span>
                                {entity.primary_applicant ? (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Crown className="h-3 w-3 text-yellow-500" />
                                    <span>{entity.primary_applicant.first_name} {entity.primary_applicant.last_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">No primary</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const refDate = entity.listed_date || entity.listed_at || entity.created_at;
                                if (!refDate) return <span className="text-xs text-muted-foreground">-</span>;
                                return (
                                  <div className={`flex items-center gap-1 text-xs font-medium ${getDaysListedColor(entity)}`}>
                                    {differenceInDays(new Date(), new Date(refDate))} days
                                    {!entity.on_market && (
                                      stage === 'lease_signed' || stage === 'paid_housed' ? (
                                        <span className="text-muted-foreground ml-1">(filled)</span>
                                      ) : (
                                        <span className="text-muted-foreground ml-1">(paused)</span>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            {stage === 'assigned' && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <PushStatusCell entityType="property" entityId={entity.id} />
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge variant="secondary">{entity.vacancy_status || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-0.5">
                                {stage !== 'unassigned' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEntityForAction(entity);
                                      setBackToQueueDialogOpen(true);
                                    }}
                                    title="Send back to queue"
                                  >
                                    <ChevronsLeft className="h-3 w-3" />
                                  </Button>
                                )}
                                {stage !== 'unassigned' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEntityForAction(entity);
                                      setMoveBackDialogOpen(true);
                                    }}
                                    title="Move back one stage"
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                )}
                                {stage !== 'paid_housed' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-success hover:bg-success/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (stage === 'assigned') {
                                        setSelectedPropertyForMatch({ 
                                          unitId: entity.id, 
                                          propertyId: entity.properties?.id || entity.id,
                                          address: entity.street_address || 'Unknown Address'
                                        });
                                      } else {
                                        setSelectedEntityForAction(entity);
                                        setMoveForwardDialogOpen(true);
                                      }
                                    }}
                                    title="Move forward one stage"
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                )}
                                {stage !== 'paid_housed' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-success hover:bg-success/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEntityForAction(entity);
                                      setJumpToFinalDialogOpen(true);
                                    }}
                                    title="Jump to final stage"
                                  >
                                    <ChevronsRight className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                             <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {stage === 'lease_signed' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                                    onClick={() => {
                                      const rentForFee = entity.monthly_rent || 0;
                                      const placementFee = rentForFee ? Math.round(rentForFee * placementFeeDecimal) : 0;
                                      const tenantName = entity.matched_tenant ? `${entity.matched_tenant.first_name || ''} ${entity.matched_tenant.last_name || ''}`.trim() : (entity.street_address || 'Unknown');
                                      setSelectedEntityForPayment({
                                        entityType: 'property',
                                        entityId: entity.properties?.id || entity.id,
                                        entityName: entity.street_address || tenantName,
                                        placementFeeAmount: placementFee,
                                        monthlyRent: rentForFee,
                                        feePercent: Math.round(placementFeeDecimal * 100),
                                        applicationId: entity.matched_tenant?.application_id,
                                        tenantId: entity.matched_tenant?.tenant_id,
                                        propertyId: entity.properties?.id,
                                        unitId: entity.id,
                                      });
                                    }}
                                    title="Confirm Placement Fee Payment"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewDetails(entity.id, entity.properties?.id)}
                                  disabled={isLoadingProperty || !entity.properties?.id}
                                  title="View Details"
                                >
                                  {isLoadingProperty ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                             </TableCell>
                          </>
                        )}
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                // CARD VIEW (existing code)
                <div className="space-y-3">{paginatedEntities.map((entity: any) => (
                <div
                  key={entity.id}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                {entityType === 'tenant' ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`flex-1 ${stage === 'lease_signed' && entity.matched_unit ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg">
                            {`${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.email || 'Unknown'}
                          </h4>
                          <p className="text-sm text-muted-foreground">{entity.email}</p>
                          {entity.phone && (
                            <p className="text-sm text-muted-foreground">{entity.phone}</p>
                          )}
                          {entity.assigned_worker && (
                            <p className="text-sm text-primary font-medium mt-1">
                              Assigned to: {`${entity.assigned_worker.first_name || ''} ${entity.assigned_worker.last_name || ''}`.trim()}
                            </p>
                          )}
                          {entity.territory && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              📍 {entity.territory.territory_name}
                            </p>
                          )}
                        </div>
                        
                        {/* Matched Property Details for Lease Signed Stage */}
                        {stage === 'lease_signed' && entity.matched_unit && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">
                              Matched Property
                            </p>
                            <div className="space-y-1.5">
                              {/* Property Address */}
                              <div className="flex items-start gap-2">
                                <Home className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {entity.matched_unit.property_address}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {entity.matched_unit.property_city}, {entity.matched_unit.property_state}
                                    {entity.matched_unit.unit_number && ` • Unit ${entity.matched_unit.unit_number}`}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Monthly Rent */}
                              {entity.matched_unit.monthly_rent && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-success flex-shrink-0" />
                                  <p className="text-sm">
                                    <span className="font-semibold">${entity.matched_unit.monthly_rent.toLocaleString()}</span>
                                    <span className="text-muted-foreground text-xs">/month</span>
                                  </p>
                                </div>
                              )}
                              
                              {/* Lease Start Date */}
                              {entity.matched_unit.lease_start_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                  <p className="text-sm">
                                    <span className="text-xs text-muted-foreground mr-1">Lease starts:</span>
                                    <span className="font-medium">
                                      {format(new Date(entity.matched_unit.lease_start_date), 'MMM dd, yyyy')}
                                    </span>
                                  </p>
                                </div>
                              )}
                              
                              {/* Property Assigned Worker (if different) */}
                              {entity.matched_unit.unit_assigned_worker && 
                               entity.matched_unit.unit_assigned_worker_id !== entity.assigned_worker_id && (
                                <div className="flex items-center gap-2">
                                  <UserCircle className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                  <p className="text-sm">
                                    <span className="text-xs text-muted-foreground mr-1">Property assigned to:</span>
                                    <span className="font-medium">
                                      {`${entity.matched_unit.unit_assigned_worker.first_name || ''} ${entity.matched_unit.unit_assigned_worker.last_name || ''}`.trim()}
                                    </span>
                                  </p>
                                </div>
                              )}

                              {/* Property Territory */}
                              {entity.matched_unit.property_territory && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                  <p className="text-sm">
                                    <span className="text-xs text-muted-foreground mr-1">Property territory:</span>
                                    <span className="font-medium">
                                      {entity.matched_unit.property_territory.territory_name}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-4">
                          {/* Left side: Backward navigation */}
                          <div className="flex gap-1">
                            {/* Back to Queue button */}
                            {stage !== 'unassigned' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedEntityForAction(entity);
                                  setBackToQueueDialogOpen(true);
                                }}
                                title="Send back to queue (complete reset)"
                              >
                                <ChevronsLeft className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            
                            {/* Move Back One Stage button */}
                            {stage !== 'unassigned' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setSelectedEntityForAction(entity);
                                  setMoveBackDialogOpen(true);
                                }}
                                title="Move back one stage"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>

                          {/* Right side: Forward navigation */}
                          <div className="flex gap-1">
                            {/* Move Forward One Stage button */}
                            {stage !== 'paid_housed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-success hover:bg-success/10"
                                onClick={() => {
                                  // Check if this stage requires selection dialog
                                  if (stage === 'assigned') {
                                    // Open unit selection dialog for tenant
                                    setSelectedTenantForMatch({ id: entity.id, name: `${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.email });
                                  } else {
                                    setSelectedEntityForAction(entity);
                                    setMoveForwardDialogOpen(true);
                                  }
                                }}
                                title="Move forward one stage"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            
                            {/* Jump to Final button */}
                            {stage !== 'paid_housed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-success hover:bg-success/10"
                                onClick={() => {
                                  setSelectedEntityForAction(entity);
                                  setJumpToFinalDialogOpen(true);
                                }}
                                title="Jump to final stage"
                              >
                                <ChevronsRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {entity.housing_status || 'N/A'}
                        </Badge>
                        {/* Push status will be shown via property_pushes table */}
                        {entity.created_at && (() => {
                          const daysSeeking = differenceInDays(new Date(), new Date(entity.created_at));
                          const colorClass = daysSeeking <= 14 
                            ? 'text-green-600 dark:text-green-400' 
                            : daysSeeking <= 30 
                            ? 'text-yellow-600 dark:text-yellow-400' 
                            : 'text-red-600 dark:text-red-400';
                          return (
                            <div className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
                              <Calendar className="h-3 w-3" />
                              <span>{daysSeeking} {daysSeeking === 1 ? 'day' : 'days'} seeking</span>
                            </div>
                          );
                        })()}
                        {stage === 'lease_signed' && (entity as any).payment_link && (
                          <PaymentLinkIndicator
                            createdAt={(entity as any).payment_link.created_at}
                            expiresAt={(entity as any).payment_link.expires_at}
                            accessedCount={(entity as any).payment_link.accessed_count}
                            lastAccessedAt={(entity as any).payment_link.last_accessed_at}
                            placementFeeId={(entity as any).payment_link.placement_fee_id}
                          />
                        )}
                      </div>
                    </div>

                    {/* Matched Property for Lease Signed Stage */}
                    {stage === 'lease_signed' && (entity as any).matched_unit && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">
                          Matched Property
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <Home className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">
                                {(entity as any).matched_unit.property_address}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(entity as any).matched_unit.property_city}, {(entity as any).matched_unit.property_state}
                                {(entity as any).matched_unit.unit_number && ` • Unit ${(entity as any).matched_unit.unit_number}`}
                              </p>
                            </div>
                          </div>
                          {(entity as any).matched_unit.monthly_rent && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <p className="text-sm">
                                <span className="font-semibold">${(entity as any).matched_unit.monthly_rent.toLocaleString()}</span>
                                <span className="text-muted-foreground text-xs">/month</span>
                              </p>
                            </div>
                          )}
                          {(entity as any).matched_unit.lease_start_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <p className="text-sm">
                                <span className="text-xs text-muted-foreground mr-1">Lease starts:</span>
                                <span className="font-medium">
                                  {format(new Date((entity as any).matched_unit.lease_start_date), 'MMM dd, yyyy')}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tenant Preferences Grid */}
                    {((entity as any).rent_range_min || (entity as any).rent_range_max || (entity as any).max_rent || (entity as any).bedrooms_approved || (entity as any).voucher_holder || (entity as any).has_pets) && (
                      <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                        {/* Rent Range */}
                        {((entity as any).rent_range_min || (entity as any).rent_range_max || (entity as any).max_rent) && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground/70">Rent Budget</span>
                              <span className="font-medium text-foreground">
                                {(entity as any).rent_range_min && (entity as any).rent_range_max 
                                  ? `$${(entity as any).rent_range_min.toLocaleString()} - $${(entity as any).rent_range_max.toLocaleString()}`
                                  : (entity as any).max_rent 
                                  ? `Up to $${(entity as any).max_rent.toLocaleString()}`
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Bedrooms */}
                        {(entity as any).bedrooms_approved && (entity as any).bedrooms_approved.length > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Home className="h-4 w-4 flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground/70">Bedrooms</span>
                              <span className="font-medium text-foreground">
                                {(entity as any).bedrooms_approved.sort((a: number, b: number) => a - b).join(', ')} BR
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Applications Filed */}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground/70">Applications</span>
                            <span className="font-medium text-foreground">
                              {(entity as any).applications_count || 0} filed
                            </span>
                          </div>
                        </div>

                        {/* Push Status with Sub-Stage */}
                        <div className="flex items-center gap-2 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                          <Send className="h-4 w-4 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground/70">Push Status</span>
                            <PushStatusCell entityType="tenant" entityId={entity.id} />
                          </div>
                        </div>
                        
                        {/* Move-in Timeline */}
                        {(entity as any).move_in_window && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground/70">Move-in</span>
                              <span className="font-medium text-foreground">
                                {formatMoveInWindow((entity as any).move_in_window)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Signup Notes - Prominent Position */}
                    {(entity as any).signup_notes && (
                      <div className="mt-3 p-3 bg-accent/30 rounded-lg border border-border/40">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tenant Note</span>
                            <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap">
                              {(entity as any).signup_notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      {/* Unassigned stage: Assign to Me button */}
                      {stage === 'unassigned' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleAssignToMe(entity.id)}
                          disabled={!currentUserId || assignTenantToWorker.isPending}
                          className="flex-1"
                        >
                          {assignTenantToWorker.isPending ? 'Assigning...' : 'Assign to Me'}
                        </Button>
                      )}
                      
                      {/* Assigned stage: Match to Unit button */}
                      {stage === 'assigned' && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            // Navigate to Match tab with pre-selected tenant
                            navigate(`/dashboard?tab=house-hunter&subtab=quick-match&tenantId=${entity.id}`);
                          }}
                          className="flex-1"
                        >
                          Match to Unit
                        </Button>
                      )}
                      
                      {/* Lease Signed stage: View Payment Details button */}
                      {stage === 'lease_signed' && entity.matched_unit && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => {
                            const rentForFee = entity.matched_unit?.monthly_rent || 0;
                            const placementFee = rentForFee ? Math.round(rentForFee * placementFeeDecimal) : 0;
                            const tenantName = `${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.email;
                            setSelectedEntityForPayment({
                              entityType: 'tenant',
                              entityId: entity.id,
                              entityName: tenantName,
                              placementFeeAmount: placementFee,
                              monthlyRent: rentForFee,
                              feePercent: Math.round(placementFeeDecimal * 100),
                              applicationId: entity.matched_unit?.application_id,
                              tenantId: entity.id,
                              propertyId: entity.matched_unit?.property_id,
                              unitId: entity.matched_unit?.unit_id,
                            });
                          }}
                          className="flex-1"
                        >
                          <DollarSign className="h-4 w-4 mr-1.5" />
                          Confirm Payment
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedTenantForProfile({ id: entity.id })}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`flex-1 ${(stage === 'lease_signed' || stage === 'paid_housed') && entity.matched_tenant ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg">
                            {entity.street_address || 'Unknown Address'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {entity.city}, {entity.state}
                          </p>
                          {entity.portfolio_client_email ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium">{entity.portfolio_client_email}</span>
                              <Badge className="w-fit bg-purple-100 text-purple-800 text-xs dark:bg-purple-900/30 dark:text-purple-300">
                                OpenKey Listed
                              </Badge>
                            </div>
                          ) : entity.profiles && (
                            <p className="text-sm text-muted-foreground">
                              Owner: {`${entity.profiles.first_name || ''} ${entity.profiles.last_name || ''}`.trim() || 'Unknown'}
                            </p>
                          )}
                          {entity.assigned_worker && (
                            <p className="text-sm text-primary font-medium mt-1">
                              Assigned to: {`${entity.assigned_worker.first_name || ''} ${entity.assigned_worker.last_name || ''}`.trim()}
                            </p>
                          )}
                          {entity.territory && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              📍 {entity.territory.territory_name}
                            </p>
                          )}
                        </div>

                        {/* Matched Tenant - appears next to property header */}
                        {(stage === 'lease_signed' || stage === 'paid_housed') && entity.matched_tenant && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">
                              Matched Tenant
                            </p>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <UserCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <p className="text-sm font-medium">
                                  {`${entity.matched_tenant.tenant_first_name || ''} ${entity.matched_tenant.tenant_last_name || ''}`.trim() || 'Unknown Tenant'}
                                </p>
                              </div>
                              
                              {entity.matched_tenant.tenant_email && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{entity.matched_tenant.tenant_email}</span>
                                </div>
                              )}
                              
                              {entity.matched_tenant.tenant_phone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{entity.matched_tenant.tenant_phone}</span>
                                </div>
                              )}
                              
                              {(entity.matched_tenant.rent_range_min || entity.matched_tenant.rent_range_max) && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  <p className="text-sm">
                                    <span className="text-xs text-muted-foreground mr-1">Rent Budget:</span>
                                    <span className="font-medium">
                                      ${entity.matched_tenant.rent_range_min || 0} - ${entity.matched_tenant.rent_range_max || 0}
                                    </span>
                                  </p>
                                </div>
                              )}
                              
                              {entity.matched_tenant.household_size && (
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                  <p className="text-sm">
                                    <span className="text-xs text-muted-foreground mr-1">Household:</span>
                                    <span className="font-medium">{entity.matched_tenant.household_size} people</span>
                                  </p>
                                </div>
                              )}
                              
                              {entity.matched_tenant.tenant_assigned_worker && (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm">
                                    <span className="text-xs text-primary font-medium">Assigned to:</span>
                                    <span className="ml-1 font-medium">
                                      {`${entity.matched_tenant.tenant_assigned_worker.first_name || ''} ${entity.matched_tenant.tenant_assigned_worker.last_name || ''}`.trim()}
                                    </span>
                                  </p>
                                </div>
                              )}
                              
                              {entity.matched_tenant.tenant_territory && (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm">
                                    <span className="text-xs text-muted-foreground">📍</span>
                                    <span className="ml-0.5 text-muted-foreground">
                                      {entity.matched_tenant.tenant_territory.territory_name}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-4">
                          {/* Left side: Backward navigation */}
                          <div className="flex gap-1">
                            {/* Back to Queue button */}
                            {stage !== 'unassigned' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedEntityForAction(entity);
                                  setBackToQueueDialogOpen(true);
                                }}
                                title="Send back to queue (complete reset)"
                              >
                                <ChevronsLeft className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            
                            {/* Move Back One Stage button */}
                            {stage !== 'unassigned' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setSelectedEntityForAction(entity);
                                  setMoveBackDialogOpen(true);
                                }}
                                title="Move back one stage"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>

                          {/* Right side: Forward navigation */}
                          <div className="flex gap-1">
                            {/* Move Forward One Stage button */}
                            {stage !== 'paid_housed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-success hover:bg-success/10"
                                onClick={() => {
                                  // Check if this stage requires selection dialog
                                  if (stage === 'assigned') {
                                    // Open tenant selection dialog for property
                                    setSelectedPropertyForMatch({ 
                                      unitId: entity.id, 
                                      propertyId: entity.properties?.id || entity.id,
                                      address: entity.street_address || 'Unknown Address'
                                    });
                                  } else {
                                    setSelectedEntityForAction(entity);
                                    setMoveForwardDialogOpen(true);
                                  }
                                }}
                                title="Move forward one stage"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            
                            {/* Jump to Final button */}
                            {stage !== 'paid_housed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-success hover:bg-success/10"
                                onClick={() => {
                                  setSelectedEntityForAction(entity);
                                  setJumpToFinalDialogOpen(true);
                                }}
                                title="Jump to final stage"
                              >
                                <ChevronsRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {entity.vacancy_status || 'N/A'}
                        </Badge>
                        {/* Push status will be shown via property_pushes table */}
                        {entity.on_market && (() => {
                          const daysOnMarket = entity.listed_date 
                            ? differenceInDays(new Date(), new Date(entity.listed_date))
                            : 0;
                          const colorClass = daysOnMarket <= 7 
                            ? 'text-green-600 dark:text-green-400' 
                            : daysOnMarket <= 21 
                            ? 'text-yellow-600 dark:text-yellow-400' 
                            : 'text-red-600 dark:text-red-400';
                          return (
                            <div className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
                              <Calendar className="h-3 w-3" />
                              <span>{daysOnMarket} {daysOnMarket === 1 ? 'day' : 'days'} on market</span>
                            </div>
                          );
                        })()}
                        {stage === 'lease_signed' && (entity as any).payment_link && (
                          <PaymentLinkIndicator
                            createdAt={(entity as any).payment_link.created_at}
                            expiresAt={(entity as any).payment_link.expires_at}
                            accessedCount={(entity as any).payment_link.accessed_count}
                            lastAccessedAt={(entity as any).payment_link.last_accessed_at}
                            placementFeeId={(entity as any).payment_link.placement_fee_id}
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>${entity.monthly_rent}/mo</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Home className="h-4 w-4" />
                          <span>{entity.bedrooms} bed / {entity.bathrooms} bath</span>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <PushStatusCell entityType="property" entityId={entity.id} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {/* Unassigned stage: Assign to Me button */}
                      {stage === 'unassigned' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleAssignToMe(entity.id)}
                          disabled={!currentUserId || assignPropertyUnitToWorker.isPending}
                          className="flex-1"
                        >
                          {assignPropertyUnitToWorker.isPending ? 'Assigning...' : 'Assign to Me'}
                        </Button>
                      )}
                      
                      {/* Assigned stage: Match to Tenant button */}
                      {stage === 'assigned' && entity.properties && (
                        <Button
                          size="sm" 
                          onClick={() => {
                            // Navigate to Match tab with pre-selected property
                            navigate(`/dashboard?tab=house-hunter&subtab=quick-match&propertyId=${entity.properties.id}`);
                          }}
                          className="flex-1"
                        >
                          Match to Tenant
                        </Button>
                      )}
                      
                      {/* In Process stage: Mark as Lease Signed button (Admin only) */}
                      {stage === 'in_process' && entity.matched_tenant && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => setSelectedUnitForLeaseSigning({
                            unitId: entity.id,
                            address: entity.address,
                            tenantName: `${entity.matched_tenant.first_name || ''} ${entity.matched_tenant.last_name || ''}`.trim() || 'Unknown',
                          })}
                          className="flex-1"
                        >
                          Mark as Lease Signed
                        </Button>
                      )}
                      
                      {/* Lease Signed stage: View Payment Details */}
                      {stage === 'lease_signed' && entity.matched_tenant && (
                        <>
                          <ResendPaymentLinkButton 
                            applicationId={entity.matched_tenant?.application_id}
                            variant="outline"
                            size="sm"
                          />
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => {
                              const rentForFee = entity.monthly_rent || 0;
                              const placementFee = rentForFee ? Math.round(rentForFee * placementFeeDecimal) : 0;
                              const tenantName = `${entity.matched_tenant.first_name || ''} ${entity.matched_tenant.last_name || ''}`.trim();
                              setSelectedEntityForPayment({
                                entityType: 'property',
                                entityId: entity.properties?.id || entity.id,
                                entityName: entity.address || tenantName,
                                placementFeeAmount: placementFee,
                                monthlyRent: rentForFee,
                                feePercent: Math.round(placementFeeDecimal * 100),
                                applicationId: entity.matched_tenant?.application_id,
                                tenantId: entity.matched_tenant?.tenant_id,
                                propertyId: entity.properties?.id,
                                unitId: entity.id,
                              });
                            }}
                            className="flex-1"
                          >
                            <DollarSign className="h-4 w-4 mr-1.5" />
                            Confirm Payment
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewDetails(entity.id, entity.properties?.id)}
                        disabled={isLoadingProperty || !entity.properties?.id}
                      >
                        {isLoadingProperty ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Property
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}</div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No {entityType === 'tenant' ? 'tenants' : 'properties'} in this stage
              </div>
            )}

            {/* Pagination controls - Bottom */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center px-4 py-3 border-t bg-muted/30 mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {(() => {
                      const getPageNumbers = (current: number, total: number) => {
                        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
                        if (current <= 3) return [1, 2, 3, 4, 5, '...', total];
                        if (current >= total - 2) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
                        return [1, '...', current - 1, current, current + 1, '...', total];
                      };
                      return getPageNumbers(currentPage, totalPages).map((pageNum, idx) => (
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
                      ));
                    })()}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>

      {/* Dialogs */}
      {selectedTenantForMatch && (
        <MatchTenantToUnitDialog
          isOpen={!!selectedTenantForMatch}
          onClose={() => setSelectedTenantForMatch(null)}
          tenantId={selectedTenantForMatch.id}
          tenantName={selectedTenantForMatch.name}
        />
      )}

      {selectedPropertyForMatch && (
        <MatchPropertyToTenantDialog
          isOpen={!!selectedPropertyForMatch}
          onClose={() => setSelectedPropertyForMatch(null)}
          unitId={selectedPropertyForMatch.unitId}
          propertyId={selectedPropertyForMatch.propertyId}
          propertyAddress={selectedPropertyForMatch.address}
        />
      )}

      {selectedEntityForPayment && (
        <ConfirmPlacementFeeDialog
          isOpen={!!selectedEntityForPayment}
          onClose={() => setSelectedEntityForPayment(null)}
          entityType={selectedEntityForPayment.entityType}
          entityId={selectedEntityForPayment.entityId}
          entityName={selectedEntityForPayment.entityName}
          placementFeeAmount={selectedEntityForPayment.placementFeeAmount}
          monthlyRent={selectedEntityForPayment.monthlyRent}
          feePercent={selectedEntityForPayment.feePercent}
          applicationId={selectedEntityForPayment.applicationId}
          tenantId={selectedEntityForPayment.tenantId}
          propertyId={selectedEntityForPayment.propertyId}
          unitId={selectedEntityForPayment.unitId}
        />
      )}

      {selectedTenantForProfile && (
        <TenantProfileModal
          isOpen={!!selectedTenantForProfile}
          onClose={() => setSelectedTenantForProfile(null)}
          tenantId={selectedTenantForProfile.id}
          propertyId=""
        />
      )}

      {/* Property Details Modal */}
      {showPropertyModal && selectedPropertyForModal && (
        <PropertyDetailsModalEnhanced
          isOpen={showPropertyModal}
          onClose={() => {
            setShowPropertyModal(false);
            setSelectedPropertyForModal(null);
          }}
          property={selectedPropertyForModal}
          currentUnitId={selectedPropertyForModal.type === 'unit' ? selectedPropertyForModal.id : undefined}
          onInterestClick={() => {}}
          onUnitInterestClick={() => {}}
          isSubmittingInterest={false}
          hasApplied={false}
          hideBuildingUnits={true}
        />
      )}

      {/* Unit Applications Modal */}
      <UnitApplicationsModal
        open={!!selectedApplicationsUnit}
        onOpenChange={(open) => !open && setSelectedApplicationsUnit(null)}
        unitId={selectedApplicationsUnit?.unitId || null}
        propertyAddress={selectedApplicationsUnit?.address || ''}
      />

      {/* Mark Lease Signed Dialog */}
      <MarkLeaseSignedDialog
        open={!!selectedUnitForLeaseSigning}
        onOpenChange={(open) => !open && setSelectedUnitForLeaseSigning(null)}
        unitId={selectedUnitForLeaseSigning?.unitId || null}
        propertyAddress={selectedUnitForLeaseSigning?.address || ''}
        tenantName={selectedUnitForLeaseSigning?.tenantName || ''}
      />

      {/* Payment Details Dialog */}
      <PaymentDetailsDialog
        open={!!paymentDetails}
        onOpenChange={(open) => !open && setPaymentDetails(null)}
        applicationId={paymentDetails?.applicationId}
        propertyAddress={paymentDetails?.propertyAddress}
        tenantName={paymentDetails?.tenantName}
        placementFeeAmount={paymentDetails?.placementFeeAmount}
        tenantId={paymentDetails?.tenantId}
        propertyId={paymentDetails?.propertyId}
        unitId={paymentDetails?.unitId}
      />

      {/* Navigation Confirmation Dialogs */}
      {selectedEntityForAction && (
        <>
          <BackToQueueConfirmDialog
            open={backToQueueDialogOpen}
            onOpenChange={setBackToQueueDialogOpen}
            entityName={
              entityType === 'tenant'
                ? `${selectedEntityForAction.first_name || ''} ${selectedEntityForAction.last_name || ''}`.trim() || selectedEntityForAction.email
                : selectedEntityForAction.street_address || 'Unknown Address'
            }
            entityType={entityType || 'tenant'}
            currentStage={stage || ''}
            onConfirm={() => {
              if (entityType === 'tenant') {
                backToQueueTenant.mutate(selectedEntityForAction.id, {
                  onSuccess: () => {
                    setBackToQueueDialogOpen(false);
                    setSelectedEntityForAction(null);
                  }
                });
              } else {
                backToQueueProperty.mutate(selectedEntityForAction.id, {
                  onSuccess: () => {
                    setBackToQueueDialogOpen(false);
                    setSelectedEntityForAction(null);
                  }
                });
              }
            }}
            isPending={backToQueueTenant.isPending || backToQueueProperty.isPending}
          />

          <MoveBackOneStageConfirmDialog
            open={moveBackDialogOpen}
            onOpenChange={setMoveBackDialogOpen}
            entityName={
              entityType === 'tenant'
                ? `${selectedEntityForAction.first_name || ''} ${selectedEntityForAction.last_name || ''}`.trim() || selectedEntityForAction.email
                : selectedEntityForAction.street_address || 'Unknown Address'
            }
            entityType={entityType || 'tenant'}
            currentStage={stage || ''}
            previousStage={getPreviousStage(stage!, entityType!)}
            onConfirm={() => {
              if (entityType === 'tenant') {
                moveBackTenant.mutate(
                  { tenantId: selectedEntityForAction.id, currentStage: translateUIToPipelineStage(stage!, entityType!) as any },
                  {
                    onSuccess: () => {
                      setMoveBackDialogOpen(false);
                      setSelectedEntityForAction(null);
                    }
                  }
                );
              } else {
                moveBackProperty.mutate(
                  { unitId: selectedEntityForAction.id, currentStage: translateUIToPipelineStage(stage!, entityType!) as any },
                  {
                    onSuccess: () => {
                      setMoveBackDialogOpen(false);
                      setSelectedEntityForAction(null);
                    }
                  }
                );
              }
            }}
            isPending={moveBackTenant.isPending || moveBackProperty.isPending}
          />

          <MoveForwardOneStageConfirmDialog
            open={moveForwardDialogOpen}
            onOpenChange={setMoveForwardDialogOpen}
            entityName={
              entityType === 'tenant'
                ? `${selectedEntityForAction.first_name || ''} ${selectedEntityForAction.last_name || ''}`.trim() || selectedEntityForAction.email
                : selectedEntityForAction.street_address || 'Unknown Address'
            }
            entityType={entityType || 'tenant'}
            currentStage={stage || ''}
            nextStage={getNextStage(stage!, entityType!)}
            onConfirm={() => {
              if (stage === 'lease_signed') {
                // For lease signed entities, open mark as paid dialog
                if (entityType === 'tenant' && selectedEntityForAction.matched_unit) {
                  const rentForFee = selectedEntityForAction.matched_unit.monthly_rent || 0;
                  const placementFee = rentForFee ? Math.round(rentForFee * placementFeeDecimal) : 0;
                  setSelectedEntityForPayment({
                    entityType: 'tenant',
                    entityId: selectedEntityForAction.id,
                    entityName: `${selectedEntityForAction.first_name || ''} ${selectedEntityForAction.last_name || ''}`.trim() || selectedEntityForAction.email,
                    placementFeeAmount: placementFee,
                    monthlyRent: rentForFee,
                    feePercent: Math.round(placementFeeDecimal * 100),
                    applicationId: selectedEntityForAction.matched_unit.application_id,
                    tenantId: selectedEntityForAction.id,
                    propertyId: selectedEntityForAction.matched_unit.property_id,
                    unitId: selectedEntityForAction.matched_unit.unit_id
                  });
                  setMoveForwardDialogOpen(false);
                  setSelectedEntityForAction(null);
                } else if (entityType === 'property' && selectedEntityForAction.matched_tenant) {
                  const rentForFee = selectedEntityForAction.monthly_rent || 0;
                  const placementFee = rentForFee ? Math.round(rentForFee * placementFeeDecimal) : 0;
                  setSelectedEntityForPayment({
                    entityType: 'property',
                    entityId: selectedEntityForAction.properties?.id || selectedEntityForAction.id,
                    entityName: selectedEntityForAction.address || selectedEntityForAction.street_address,
                    placementFeeAmount: placementFee,
                    monthlyRent: rentForFee,
                    feePercent: Math.round(placementFeeDecimal * 100),
                    applicationId: selectedEntityForAction.matched_tenant.application_id,
                    tenantId: selectedEntityForAction.matched_tenant.tenant_id,
                    propertyId: selectedEntityForAction.properties?.id,
                    unitId: selectedEntityForAction.id
                  });
                  setMoveForwardDialogOpen(false);
                  setSelectedEntityForAction(null);
                }
              } else {
                // For other stages, use the mutation
                moveForwardOneStage.mutate(
                  {
                    entityId: selectedEntityForAction.id,
                    entityType: entityType!,
                    currentStage: stage!,
                    workerId: currentUserId!,
                  },
                  {
                    onSuccess: () => {
                      setMoveForwardDialogOpen(false);
                      setSelectedEntityForAction(null);
                    }
                  }
                );
              }
            }}
            isPending={moveForwardOneStage.isPending}
          />

          <JumpToFinalConfirmDialog
            open={jumpToFinalDialogOpen}
            onOpenChange={setJumpToFinalDialogOpen}
            entityName={
              entityType === 'tenant'
                ? `${selectedEntityForAction.first_name || ''} ${selectedEntityForAction.last_name || ''}`.trim() || selectedEntityForAction.email
                : selectedEntityForAction.street_address || 'Unknown Address'
            }
            entityType={entityType || 'tenant'}
            currentStage={stage || ''}
            finalStage={entityType === 'tenant' ? 'housed_paid' : 'paid_housed'}
            onConfirm={() => {
              // Close jump dialog and open payment confirmation dialog
              setJumpToFinalDialogOpen(false);
              
              // Use the same logic as MoveForward for lease_signed stage
              if (entityType === 'tenant' && selectedEntityForAction.matched_unit) {
                const rentForFee = selectedEntityForAction.matched_unit.monthly_rent || 0;
                const placementFee = rentForFee ? Math.round(rentForFee * placementFeeDecimal) : 0;
                setSelectedEntityForPayment({
                  entityType: 'tenant',
                  entityId: selectedEntityForAction.id,
                  entityName: `${selectedEntityForAction.first_name || ''} ${selectedEntityForAction.last_name || ''}`.trim() || selectedEntityForAction.email,
                  placementFeeAmount: placementFee,
                  monthlyRent: rentForFee,
                  feePercent: Math.round(placementFeeDecimal * 100),
                  applicationId: selectedEntityForAction.matched_unit.application_id,
                  tenantId: selectedEntityForAction.id,
                  propertyId: selectedEntityForAction.matched_unit.property_id,
                  unitId: selectedEntityForAction.matched_unit.unit_id
                });
              } else if (entityType === 'property' && selectedEntityForAction.matched_tenant) {
                const rentForFee = selectedEntityForAction.monthly_rent || 0;
                const placementFee = rentForFee ? Math.round(rentForFee * placementFeeDecimal) : 0;
                setSelectedEntityForPayment({
                  entityType: 'property',
                  entityId: selectedEntityForAction.properties?.id || selectedEntityForAction.id,
                  entityName: selectedEntityForAction.address || selectedEntityForAction.street_address,
                  placementFeeAmount: placementFee,
                  monthlyRent: rentForFee,
                  feePercent: Math.round(placementFeeDecimal * 100),
                  applicationId: selectedEntityForAction.matched_tenant.application_id,
                  tenantId: selectedEntityForAction.matched_tenant.tenant_id,
                  propertyId: selectedEntityForAction.properties?.id,
                  unitId: selectedEntityForAction.id
                });
              }
              setSelectedEntityForAction(null);
            }}
            isPending={jumpToFinal.isPending}
          />
        </>
      )}
    </div>
  );
};

// Helper function to get next stage
function getNextStage(currentStage: TenantStage | PropertyStage, entityType: EntityType): string {
  if (entityType === 'tenant') {
    const tenantStages: Record<TenantStage, string> = {
      unassigned: 'assigned',
      assigned: 'lease_signed',
      lease_signed: 'paid_housed',
      paid_housed: 'paid_housed',
    };
    return tenantStages[currentStage as TenantStage];
  } else {
    const propertyStages: Record<PropertyStage, string> = {
      unassigned: 'assigned',
      assigned: 'in_process',
      in_process: 'lease_signed',
      lease_signed: 'paid_housed',
      paid_housed: 'paid_housed',
    };
    return propertyStages[currentStage as PropertyStage];
  }
}

// Helper function to get previous stage
function getPreviousStage(currentStage: TenantStage | PropertyStage, entityType: EntityType): string {
  if (entityType === 'tenant') {
    const tenantStages: Record<TenantStage, string> = {
      unassigned: 'unassigned',
      assigned: 'unassigned',
      lease_signed: 'assigned',
      paid_housed: 'lease_signed',
    };
    return tenantStages[currentStage as TenantStage];
  } else {
    const propertyStages: Record<PropertyStage, string> = {
      unassigned: 'unassigned',
      assigned: 'unassigned',
      in_process: 'assigned',
      lease_signed: 'in_process',
      paid_housed: 'lease_signed',
    };
    return propertyStages[currentStage as PropertyStage];
  }
}
