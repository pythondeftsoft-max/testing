import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  MoreHorizontal, 
  Mail, 
  Phone, 
  ChevronDown, 
  ChevronRight,
  Building2,
  MapPin,
  DollarSign,
  FileText,
  Edit,
  Eye,
  Trash2,
  Calendar,
  Users,
  BedDouble,
  Home,
  Contact
} from 'lucide-react';
import { ClientPortfolio } from '@/hooks/useClientProperties';
import { useNavigate } from 'react-router-dom';
import { EditClientModal } from './EditClientModal';
import { ViewClientDetailsModal } from './ViewClientDetailsModal';
import { DeleteClientDialog } from './DeleteClientDialog';
import { OnMarketToggle } from '@/components/property/OnMarketToggle';
import { UnitOnMarketToggle } from '@/components/property/UnitOnMarketToggle';
import { useEnhancedAdminActions } from '@/hooks/useEnhancedAdminActions';
import { useToast } from '@/hooks/use-toast';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';
import { UnitDetailsModal } from '@/components/UnitDetailsModal';
import { usePropertyGeocoding } from '@/hooks/usePropertyGeocoding';
import { BulkSetRentDialog } from './BulkSetRentDialog';

interface ClientPropertiesTableProps {
  clients: ClientPortfolio[];
  loading: boolean;
  refetch?: () => void;
}

export const ClientPropertiesTable: React.FC<ClientPropertiesTableProps> = ({
  clients,
  loading,
  refetch,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { softDeleteProperty } = useEnhancedAdminActions();
  const { geocodeProperty, loading: geocoding } = usePropertyGeocoding();
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [unitsByProperty, setUnitsByProperty] = useState<Record<string, any[]>>({});
  const [loadingUnits, setLoadingUnits] = useState<Record<string, boolean>>({});
  const [editingClient, setEditingClient] = useState<ClientPortfolio | null>(null);
  const [viewingClient, setViewingClient] = useState<ClientPortfolio | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientPortfolio | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkRentProperty, setBulkRentProperty] = useState<{ id: string; address: string } | null>(null);

  // Emergency cleanup on unmount - ensure body is always interactive
  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = 'auto';
    };
  }, []);

  // Workaround for Radix UI bug #3645: Dialog leaves pointer-events: none on body
  // Poll to repeatedly reset pointer-events until dialog is fully unmounted
  useEffect(() => {
    if (deleteDialogOpen) return;
    
    // Use an interval to repeatedly ensure pointer-events is reset
    // This is necessary because Radix may set it to 'none' during animation
    let attempts = 0;
    const maxAttempts = 10; // 10 attempts over 500ms total
    
    const interval = setInterval(() => {
      document.body.style.pointerEvents = 'auto';
      attempts++;
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 50); // Check every 50ms
    
    return () => clearInterval(interval);
  }, [deleteDialogOpen]);
  const [deletingProperty, setDeletingProperty] = useState<any>(null);
  const [viewingProperty, setViewingProperty] = useState<any>(null);
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<any>(null);
  const [listingPreviewProperty, setListingPreviewProperty] = useState<any>(null);
  const [showListingPreview, setShowListingPreview] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState<string | null>(null);

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const handleTogglePropertyExpand = async (property: any) => {
    if (property.unit_count <= 1) return;
    
    const isExpanded = expandedProperties.has(property.id);
    
    if (!isExpanded && !unitsByProperty[property.id] && !loadingUnits[property.id]) {
      setLoadingUnits(prev => ({ ...prev, [property.id]: true }));
      try {
      const { data, error } = await supabase
        .from('property_units')
            .select(`
              id, 
              unit_number, 
              unit_name, 
              bedrooms, 
              bathrooms, 
              status, 
              monthly_rent, 
              on_market,
              photos,
              unit_amenities,
              created_at,
              property_applications(id, status, created_at)
            `)
        .eq('property_id', property.id)
        .order('unit_number', { ascending: true });
        
        if (error) throw error;
        setUnitsByProperty(prev => ({ ...prev, [property.id]: data || [] }));
      } catch (err) {
        console.error('Error fetching units:', err);
        toast({
          title: "Error",
          description: "Failed to load units. Please try again.",
          variant: "destructive",
        });
        setUnitsByProperty(prev => ({ ...prev, [property.id]: [] }));
      } finally {
        setLoadingUnits(prev => ({ ...prev, [property.id]: false }));
      }
    }
    
    const newExpanded = new Set(expandedProperties);
    if (isExpanded) {
      newExpanded.delete(property.id);
    } else {
      newExpanded.add(property.id);
    }
    setExpandedProperties(newExpanded);
  };

  const getUnitsAvailable = (property: any, units: any[]) => {
    if (!units || units.length === 0) {
      return property.status === 'vacant' ? 1 : 0;
    }
    return units.filter(u => u.status === 'vacant').length;
  };

  const getApplicationsCount = (property: any, units: any[]) => {
    if (!units || units.length === 0) {
      return property.application_count || 0;
    }
    return units.reduce((sum, unit) => {
      return sum + (unit.property_applications?.length || 0);
    }, 0);
  };

  const getDaysOnMarket = (property: any, units: any[]) => {
    if (!units || units.length === 0) {
      if (!property.created_at) return 0;
      const createdDate = new Date(property.created_at);
      const now = new Date();
      return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const vacantUnits = units.filter(u => u.status === 'vacant' && u.on_market);
    if (vacantUnits.length === 0) return 0;
    
    const avgDays = vacantUnits.reduce((sum, unit) => {
      const createdDate = new Date(unit.created_at);
      const now = new Date();
      const days = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0) / vacantUnits.length;
    
    return Math.round(avgDays);
  };

  const getTotalAskingRent = (property: any, units: any[]) => {
    if (!units || units.length === 0) {
      return property.monthly_rent || 0;
    }
    return units.reduce((sum, unit) => sum + (unit.monthly_rent || 0), 0);
  };

  const getUnitDaysListed = (unit: any) => {
    // Use listed_date instead of created_at, only count days for on-market units
    if (!unit.listed_date || !unit.on_market) return 0;
    
    const listedDate = new Date(unit.listed_date);
    const now = new Date();
    return Math.floor((now.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUnitApplicationsCount = (unit: any) => {
    return unit.property_applications?.length || 0;
  };

  const getUnitLastActivity = (unit: any) => {
    const applications = unit.property_applications || [];
    if (applications.length === 0) return 'No activity';
    
    const latestApp = applications.reduce((latest: any, app: any) => {
      return new Date(app.created_at) > new Date(latest.created_at) ? app : latest;
    });
    
    const daysAgo = Math.floor((new Date().getTime() - new Date(latestApp.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return '1 day ago';
    return `${daysAgo} days ago`;
  };

  const handleContactClient = (email: string | null, phone: string | null) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    } else if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleViewProperty = (property: any) => {
    setViewingProperty(property);
  };

  const fetchFullPropertyForPreview = async (propertyId: string, unitId?: string) => {
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
      
      // Pick the target unit (specific or first)
      const targetUnit = unitId
        ? data.property_units?.find((u: any) => u.id === unitId) || data.property_units?.[0]
        : data.property_units?.[0];

      // Compute rent range across all units
      const allRents = (data.property_units || [])
        .map((u: any) => u.monthly_rent)
        .filter((r: number | null): r is number => r != null && r > 0);
      const minRent = allRents.length > 0 ? Math.min(...allRents) : null;
      const maxRent = allRents.length > 0 ? Math.max(...allRents) : null;
      const rentDisplay = minRent && maxRent && minRent !== maxRent
        ? `$${minRent.toLocaleString()} – $${maxRent.toLocaleString()}`
        : null;

      const transformedProperty = {
        ...data,
        street_address: data.address,
        address: `${data.address || ''}${data.city ? ', ' + data.city : ''}${data.state ? ', ' + data.state : ''}${data.zipcode ? ' ' + data.zipcode : ''}`.trim(),
        city: data.city,
        state: data.state,
        zipcode: data.zipcode,
        desiredRent: targetUnit?.monthly_rent || data.monthly_rent,
        desired_rent: targetUnit?.monthly_rent || data.monthly_rent,
        monthly_rent: targetUnit?.monthly_rent || data.monthly_rent,
        rentRangeDisplay: rentDisplay,
        bedrooms: data.unit_count > 1 ? (targetUnit?.bedrooms ?? data.bedrooms) : data.bedrooms,
        bathrooms: data.unit_count > 1 ? (targetUnit?.bathrooms ?? data.bathrooms) : data.bathrooms,
        photos: (Array.isArray(targetUnit?.photos) && targetUnit.photos.length > 0)
          ? targetUnit.photos
          : (data.photos || []),
        property_units: data.property_units,
        description: targetUnit?.description || '',
        currentUnitId: unitId || targetUnit?.id,
      };
      
      setListingPreviewProperty(transformedProperty);
      setShowListingPreview(true);
    } catch (error) {
      console.error('Error fetching property for preview:', error);
      toast({
        title: "Error",
        description: "Failed to load listing preview",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPreview(null);
    }
  };

  const handleGeocodeProperty = async (property: any) => {
    const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipcode}`;
    const result = await geocodeProperty(property.id, fullAddress);
    
    if (result.success && refetch) {
      refetch();
    }
  };

  const needsGeocoding = (property: any) => {
    return !property.latitude || !property.longitude;
  };

  const handleDeleteProperty = async (property: any) => {
    try {
      await softDeleteProperty.mutateAsync({
        propertyId: property.id,
        reason: 'Deleted from Client Services by admin'
      });

      toast({
        title: "Property Deleted",
        description: `${property.address} has been successfully removed.`,
      });

      setDeletingProperty(null);
      if (refetch) {
        refetch();
      }
    } catch (error: any) {
      console.error('Delete property error details:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);
      
      toast({
        title: "Error",
        description: error?.message || "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewUnit = (unit: any, property: any) => {
    setSelectedUnitForDetails({ ...unit, property });
  };

  const handleUnitUpdated = async () => {
    // Keep modal open and refetch the specific property's units to get fresh data
    if (selectedUnitForDetails?.property?.id) {
      const propertyId = selectedUnitForDetails.property.id;
      
      try {
        const { data, error } = await supabase
          .from('property_units')
          .select(`
            id, 
            unit_number, 
            unit_name, 
            bedrooms, 
            bathrooms, 
            status, 
            monthly_rent, 
            on_market,
            photos,
            unit_amenities,
            created_at,
            property_applications(id, status, created_at)
          `)
          .eq('property_id', propertyId)
          .order('unit_number', { ascending: true });
          
        if (error) throw error;
        
        // Update the units cache for this property
        setUnitsByProperty(prev => ({ ...prev, [propertyId]: data || [] }));
        
        // Update the selected unit with fresh data from database
        const updatedUnit = data?.find(u => u.id === selectedUnitForDetails.id);
        if (updatedUnit) {
          setSelectedUnitForDetails({ 
            ...updatedUnit, 
            property: selectedUnitForDetails.property 
          });
        }
      } catch (err) {
        console.error('Error refreshing unit data:', err);
      }
    }
    
    // REMOVED: Full refetch was causing modal to close due to component re-render
    // The targeted unit refetch above already updates the necessary data
    // if (refetch) {
    //   refetch();
    // }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/50">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Client Properties Yet</h3>
        <p className="text-muted-foreground mb-4">
          Start by adding your first client property using the button above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => (
        <Collapsible
          key={client.id}
          open={expandedClients.has(client.id)}
          onOpenChange={() => toggleClient(client.id)}
        >
          <div className="border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  {expandedClients.has(client.id) ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{client.client_name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {client.client_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.client_email}
                        </span>
                      )}
                      {client.client_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.client_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {client.property_count} {client.property_count === 1 ? 'Property' : 'Properties'}
                      </Badge>
                      <Badge variant="outline">
                        {client.active_listings} On Market
                      </Badge>
                      {client.application_count > 0 && (
                        <Badge variant="default">
                          {client.application_count} Applications
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingClient(client);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Client Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClient(client);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Client Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactClient(client.client_email, client.client_phone);
                        }}
                        disabled={!client.client_email && !client.client_phone}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Contact Client
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingClient(client);
                          // Delay dialog opening to let dropdown close first
                          // This prevents the pointer-events conflict (Radix bug #3317)
                          setTimeout(() => {
                            setDeleteDialogOpen(true);
                          }, 0);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="p-4">
                {client.client_notes && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Notes:</strong> {client.client_notes}
                    </p>
                  </div>
                )}
                
                {client.properties.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No properties for this client yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>Units Available</TableHead>
                        <TableHead>Applications</TableHead>
                        <TableHead>Asking Rent</TableHead>
                        <TableHead>Days on Market</TableHead>
                        <TableHead>Listing Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.properties.map((property) => {
                        const units = unitsByProperty[property.id] || [];
                        const isExpanded = expandedProperties.has(property.id);
                        const isMultiUnit = property.unit_count > 1;
                        
                        return (
                          <React.Fragment key={property.id}>
                            <TableRow>
                              <TableCell>
                                <div className="flex items-start gap-2">
                                  {isMultiUnit && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleTogglePropertyExpand(property)}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </Button>
                                  )}
                                  {!isMultiUnit && <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />}
                                  <div>
                                    {property.property_name && (
                                      <div className="text-xs font-semibold text-primary">{property.property_name}</div>
                                    )}
                                    <div className="font-medium">{property.address}</div>
                                    {!property.address.toLowerCase().includes(property.city.toLowerCase()) && (
                                      <div className="text-sm text-muted-foreground">
                                        {property.city}, {property.state} {property.zipcode}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {getUnitsAvailable(property, units)}
                                  </span>
                                  {isMultiUnit && (
                                    <span className="text-xs text-muted-foreground">
                                      / {property.unit_count}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span className={getApplicationsCount(property, units) > 0 ? "font-medium text-primary" : ""}>
                                    {getApplicationsCount(property, units)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {isExpanded && units.length > 0
                                      ? `$${getTotalAskingRent(property, units).toLocaleString()}`
                                      : (() => {
                                          const unitRents = (property.property_units || [])
                                            .map(u => u.monthly_rent)
                                            .filter((r): r is number => r != null && r > 0);
                                          if (unitRents.length > 1) {
                                            const minRent = Math.min(...unitRents);
                                            const maxRent = Math.max(...unitRents);
                                            return minRent === maxRent
                                              ? `$${minRent.toLocaleString()}`
                                              : `$${minRent.toLocaleString()} – $${maxRent.toLocaleString()}`;
                                          }
                                          const singleRent = property.monthly_rent || unitRents[0];
                                          return singleRent ? `$${singleRent.toLocaleString()}` : 'Not Set';
                                        })()
                                    }
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {getDaysOnMarket(property, units)} days
                                  </span>
                                </div>
                              </TableCell>
              <TableCell>
                {!isMultiUnit ? (
                  <OnMarketToggle
                    propertyId={property.id}
                    currentOnMarket={property.on_market}
                    propertyData={property}
                    onStatusChange={() => refetch && refetch()}
                    adminMode={true}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">See units below</span>
                )}
              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewProperty(property)}
                                    title="View Property Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {(property.contact_name || property.contact_email || property.contact_phone) && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Property Contact"
                                        >
                                          <Contact className="w-4 h-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64" align="end">
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-sm">Property Contact</h4>
                                          {property.contact_name && (
                                            <div className="text-sm">{property.contact_name}</div>
                                          )}
                                          {property.contact_email && (
                                            <a href={`mailto:${property.contact_email}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                                              <Mail className="w-3.5 h-3.5" />
                                              {property.contact_email}
                                            </a>
                                          )}
                                          {property.contact_phone && (
                                            <a href={`tel:${property.contact_phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                                              <Phone className="w-3.5 h-3.5" />
                                              {property.contact_phone}
                                            </a>
                                          )}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                  {property.on_market && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => fetchFullPropertyForPreview(property.id)}
                                      disabled={isLoadingPreview === property.id}
                                      title="View Listing as Tenant"
                                      className="text-xs"
                                    >
                                      {isLoadingPreview === property.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1.5" />
                                      ) : (
                                        <Home className="w-3.5 h-3.5 mr-1.5" />
                                      )}
                                      View Listing
                                    </Button>
                                  )}
                                  {needsGeocoding(property) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleGeocodeProperty(property)}
                                      title="Add to Map (Missing Coordinates)"
                                      disabled={geocoding}
                                      className="text-orange-500 hover:text-orange-600"
                                    >
                                      <MapPin className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletingProperty(property)}
                                    title="Delete Property"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {isExpanded && isMultiUnit && (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="bg-muted/30 p-0">
                                  <div className="p-3">
                                    {loadingUnits[property.id] ? (
                                      <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        <span className="ml-3 text-sm text-muted-foreground">Loading units...</span>
                                      </div>
                                    ) : units.length === 0 ? (
                                      <div className="text-center py-4 text-sm text-muted-foreground">
                                        No units found for this property.
                                      </div>
                                    ) : (
                                      <>
                                      {/* Bulk market controls */}
                                      <div className="flex items-center justify-between mb-3 px-1">
                                        <span className="text-sm text-muted-foreground">
                                          {units.filter(u => u.on_market).length} of {units.length} units on market
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => setBulkRentProperty({ id: property.id, address: property.address })}
                                          >
                                            Set Rent
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={async () => {
                                              const offMarketUnits = units.filter(u => !u.on_market);
                                              if (offMarketUnits.length === 0) {
                                                toast({ title: "All units are already on market" });
                                                return;
                                              }
                                              try {
                                                for (const unit of offMarketUnits) {
                                                  const { error } = await supabase.rpc('admin_set_unit_market_status', {
                                                    p_unit_id: unit.id,
                                                    p_on_market: true,
                                                    p_reason: 'Admin bulk listed all units via client services',
                                                    p_metadata: { source: 'admin_client_services_bulk', property_id: property.id }
                                                  });
                                                  if (error) throw error;
                                                }
                                                setUnitsByProperty(prev => ({
                                                  ...prev,
                                                  [property.id]: (prev[property.id] || []).map(u => ({ ...u, on_market: true }))
                                                }));
                                                toast({ title: "All Units Listed", description: `${offMarketUnits.length} units put on market` });
                                              } catch (err: any) {
                                                console.error('Bulk list error:', err);
                                                toast({ title: "Error", description: "Failed to list all units", variant: "destructive" });
                                              }
                                            }}
                                          >
                                            Put All On Market
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={async () => {
                                              const onMarketUnits = units.filter(u => u.on_market);
                                              if (onMarketUnits.length === 0) {
                                                toast({ title: "All units are already off market" });
                                                return;
                                              }
                                              try {
                                                for (const unit of onMarketUnits) {
                                                  const { error } = await supabase.rpc('admin_set_unit_market_status', {
                                                    p_unit_id: unit.id,
                                                    p_on_market: false,
                                                    p_reason: 'Admin bulk unlisted all units via client services',
                                                    p_metadata: { source: 'admin_client_services_bulk', property_id: property.id }
                                                  });
                                                  if (error) throw error;
                                                }
                                                setUnitsByProperty(prev => ({
                                                  ...prev,
                                                  [property.id]: (prev[property.id] || []).map(u => ({ ...u, on_market: false }))
                                                }));
                                                toast({ title: "All Units Unlisted", description: `${onMarketUnits.length} units taken off market` });
                                              } catch (err: any) {
                                                console.error('Bulk unlist error:', err);
                                                toast({ title: "Error", description: "Failed to unlist all units", variant: "destructive" });
                                              }
                                            }}
                                          >
                                            Take All Off Market
                                          </Button>
                                        </div>
                                      </div>
                                      <Table>
                                         <TableHeader>
                                             <TableRow>
                  <TableHead className="w-[10%]">Unit</TableHead>
                  <TableHead className="w-[10%]">Days Listed</TableHead>
                  <TableHead className="w-[10%]">Applications</TableHead>
                  <TableHead className="w-[12%]">Asking Rent</TableHead>
                  <TableHead className="w-[16%]">Status</TableHead>
                  <TableHead className="w-[12%] text-right">Actions</TableHead>
                  <TableHead className="w-[13%]">Bed/Bath</TableHead>
                  <TableHead className="w-[12%]">Occupancy</TableHead>
                  <TableHead className="w-[15%]">Lease Ends</TableHead>
                       </TableRow>
                                         </TableHeader>
                                        <TableBody>
                                          {units.map((unit) => (
                                            <TableRow key={unit.id}>
                                              <TableCell className="font-medium">
                                                {unit.unit_name || `Unit ${unit.unit_number}`}
                                              </TableCell>
                              <TableCell className="text-sm">
                                {unit.on_market ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>
                                      {getUnitDaysListed(unit)} days
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                                              <TableCell className="text-sm">
                                                <div className="flex items-center gap-1">
                                                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                  <span className={getUnitApplicationsCount(unit) > 0 ? "font-medium text-primary" : ""}>
                                                    {getUnitApplicationsCount(unit)}
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                <div className="flex items-center gap-1">
                                                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                                                  <span className="font-medium">
                                                    ${(unit.monthly_rent || 0).toLocaleString()}
                                                  </span>
                                                </div>
                                              </TableCell>
                                                   <TableCell>
                                                     <UnitOnMarketToggle
                                                       propertyId={property.id}
                                                       unitId={unit.id}
                                                       initialOnMarket={unit.on_market || false}
                                                       unitLabel={unit.unit_name || `Unit ${unit.unit_number}`}
                                                       propertyAddress={`${property.address}, ${property.city}, ${property.state} ${property.zipcode}`}
                                                       unitData={unit}
                                                       onStatusChange={(onMarket) => {
                                                         // Update local state in-place — no full refetch, no scroll jump
                                                         setUnitsByProperty(prev => ({
                                                           ...prev,
                                                           [property.id]: (prev[property.id] || []).map(u =>
                                                             u.id === unit.id ? { ...u, on_market: onMarket } : u
                                                           )
                                                         }));
                                                       }}
                                                       adminMode={true}
                                                     />
                                                   </TableCell>
                                                    <TableCell className="text-right">
                                                      <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-8 w-8"
                                                          onClick={() => handleViewUnit(unit, property)}
                                                          title="View Unit Details"
                                                        >
                                                          <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {unit.on_market && (
                                                          <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8"
                                                            onClick={() => fetchFullPropertyForPreview(property.id, unit.id)}
                                                            disabled={isLoadingPreview === property.id}
                                                            title="View Unit Listing"
                                                          >
                                                            <Home className="w-3 h-3 mr-1" />
                                                            Listing
                                                          </Button>
                                                        )}
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                      <div className="flex items-center gap-1">
                                                        <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span>{unit.bedrooms || 0} bed / {unit.bathrooms || 0} bath</span>
                                                      </div>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Badge 
                                                        variant={unit.status === 'occupied' ? 'default' : 'secondary'}
                                                        className={unit.status === 'occupied' ? 'bg-green-500 hover:bg-green-600' : ''}
                                                      >
                                                        {unit.status === 'occupied' ? 'Occupied' : 'Vacant'}
                                                      </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                      {unit.status === 'occupied' && unit.lease_end_date ? (
                                                        <div className="flex items-center gap-1">
                                                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                          <span className={
                                                            new Date(unit.lease_end_date) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                                                              ? 'text-orange-500 font-medium'
                                                              : ''
                                                          }>
                                                            {new Date(unit.lease_end_date).toLocaleDateString('en-US', { 
                                                              month: 'short', 
                                                              day: 'numeric', 
                                                              year: 'numeric' 
                                                            })}
                                                          </span>
                                                        </div>
                                                      ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                      )}
                                                    </TableCell>
                                               </TableRow>
                                           ))}
                                        </TableBody>
                                      </Table>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
      
      <EditClientModal
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        onSuccess={() => {
          setEditingClient(null);
          if (refetch) refetch();
        }}
      />
      
      <ViewClientDetailsModal
        client={viewingClient}
        open={!!viewingClient}
        onOpenChange={(open) => !open && setViewingClient(null)}
        onEdit={handleViewProperty}
        onViewApplications={handleViewProperty}
        refetch={refetch}
      />
      
      <DeleteClientDialog
        client={deletingClient}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          // Clear client data after dialog closes (with delay for animation)
          if (!open) {
            setTimeout(() => setDeletingClient(null), 200);
          }
        }}
        onSuccess={() => {
          setDeleteDialogOpen(false);
          // Delay refetch to allow modal backdrop to fully unmount
          // This prevents UI freeze from orphaned overlay
          setTimeout(() => {
            if (refetch) refetch();
          }, 300);
        }}
      />
      
      <AlertDialog
        open={!!deletingProperty}
        onOpenChange={(open) => !open && setDeletingProperty(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deletingProperty?.address}</strong>? This will soft delete the
              property and it can be restored later if needed. All associated data
              (applications, maintenance requests, etc.) will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProperty && handleDeleteProperty(deletingProperty)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {viewingProperty && (
        <PropertyDetailsModal
          property={viewingProperty}
          isOpen={true}
          onClose={() => setViewingProperty(null)}
          isAdmin={true}
        />
      )}

      {selectedUnitForDetails && (
        <UnitDetailsModal
          unit={selectedUnitForDetails}
          property={selectedUnitForDetails.property}
          onClose={() => setSelectedUnitForDetails(null)}
          onUnitUpdated={handleUnitUpdated}
        />
      )}

      {/* Listing Preview Modal - Shows what tenant sees */}
      <PropertyDetailsModalEnhanced
        property={listingPreviewProperty}
        isOpen={showListingPreview}
        onClose={() => {
          setShowListingPreview(false);
          setListingPreviewProperty(null);
        }}
        onInterestClick={() => {}} // No-op for admin preview
        isSubmittingInterest={false}
        hasApplied={false}
      />
      {bulkRentProperty && (
        <BulkSetRentDialog
          open={!!bulkRentProperty}
          onOpenChange={(o) => { if (!o) setBulkRentProperty(null); }}
          propertyId={bulkRentProperty.id}
          propertyAddress={bulkRentProperty.address}
          units={unitsByProperty[bulkRentProperty.id] || []}
          onApplied={(updates, propertyRent, createdUnits) => {
            setUnitsByProperty(prev => {
              const existing = (prev[bulkRentProperty.id] || []).map(u =>
                updates[u.id] != null ? { ...u, monthly_rent: updates[u.id] } : u
              );
              const appended = [...existing, ...(createdUnits || [])];
              return { ...prev, [bulkRentProperty.id]: appended };
            });
            if (propertyRent != null) {
              // best-effort visual refresh; full property list will refresh on next fetch
            }
          }}
        />
      )}
    </div>
  );
};
