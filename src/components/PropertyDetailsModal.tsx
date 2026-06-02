import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogPortal, DialogOverlay, DialogContent } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, 
  Users, 
  FileText, 
  Settings, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Edit,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  User,
  Clock,
  Sparkles,
  Building,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
// PropertyModalApplicationsSubTabs removed - now showing tenants directly
import { AdminUnitsManager } from './admin/AdminUnitsManager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EnhancedPropertyDocuments from './EnhancedPropertyDocuments';
import { formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { useCombinedPropertyAuditTrail } from '@/hooks/useCombinedPropertyAuditTrail';
import { LISTING_AMENITIES } from '@/constants/listingAmenities';
import { MultiStepTenantRequestForm } from '@/components/MultiStepTenantRequestForm';

interface PropertyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any;
  onEdit?: () => void;
  onInterestClick?: (property: any) => Promise<void>;
  isSubmittingInterest?: boolean;
  hasApplied?: boolean;
  initialTab?: string;
  onPropertyUpdated?: () => void;
  isAdmin?: boolean;
}

const PropertyDetailsModal = ({ isOpen, onClose, property, onEdit, onInterestClick, isSubmittingInterest, hasApplied, initialTab = 'overview', onPropertyUpdated, isAdmin = false }: PropertyDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { toast } = useToast();
  
  // Detect if this is a unit listing and create display data that prioritizes unit info
  const isUnitListing = property?.type === 'unit';
  const displayData = useMemo(() => {
    if (!property) return property;
    
    // If it's a unit listing, prioritize unit-specific data
    if (isUnitListing) {
      return {
        ...property,
        // Use unit rent, photos, description, amenities over property-level data
        monthly_rent: property.rent || property.monthly_rent || 0,
        photos: property.photos || [],
        description: property.description || '',
        amenities: property.amenities || [],
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        square_feet: property.squareFeet || property.square_feet,
      };
    }
    
    return property;
  }, [property, isUnitListing]);
  
  const [propertyDetails, setPropertyDetails] = useState(displayData);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState(displayData);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [isClientProperty, setIsClientProperty] = useState(false);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showEditListingModal, setShowEditListingModal] = useState(false);

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch audit trail for admin users
  const { data: auditTrail = [], isLoading: auditLoading } = useCombinedPropertyAuditTrail(
    property?.id || '',
    isAdmin ? 50 : 0
  );

  useEffect(() => {
    setPropertyDetails(displayData);
    setEditedData(displayData);
    setActiveTab(initialTab);
  }, [displayData, initialTab]);

  // Fetch full property data when modal opens (for admin view to get complete data)
  useEffect(() => {
    const fetchFullPropertyData = async () => {
      if (!isOpen || !property?.id) return;
      
      // For unit listings, the property.id is actually the unit ID
      // Use property_id (from unit data) or parentPropertyId as fallback, then property.id
      const propertyIdToFetch = property.property_id || property.parentPropertyId || property.id;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_units(*)
        `)
        .eq('id', propertyIdToFetch)
        .single();
      
      if (data && !error) {
        // Merge with existing data, but preserve unit-specific photos if this is a unit listing
        const shouldPreserveUnitPhotos = isUnitListing && property.photos && property.photos.length > 0;
        
        setPropertyDetails(prev => ({
          ...prev,
          ...data,
          // Preserve unit photos from original data for unit listings
          photos: shouldPreserveUnitPhotos ? property.photos : (prev?.photos || data.property_units?.[0]?.photos || []),
          property_units: data.property_units
        }));
        setEditedData(prev => ({
          ...prev,
          ...data,
          photos: shouldPreserveUnitPhotos ? property.photos : (prev?.photos || data.property_units?.[0]?.photos || []),
          property_units: data.property_units
        }));
      }
      setLoading(false);
    };
    
    fetchFullPropertyData();
  }, [isOpen, property?.id, isUnitListing]);

  useEffect(() => {
    if (isOpen && property?.id && activeTab === 'payments') {
      fetchPropertyPayments();
    }
  }, [isOpen, property?.id, activeTab]);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!property?.portfolio_id) return;
      
      const { data, error } = await supabase
        .from('portfolios')
        .select('client_name, client_email, client_phone')
        .eq('id', property.portfolio_id)
        .single();
      
      if (data && (data.client_email || data.client_phone)) {
        setPortfolioData(data);
        setIsClientProperty(true);
      } else {
        setPortfolioData(null);
        setIsClientProperty(false);
      }
    };
    
    if (isOpen) {
      fetchPortfolioData();
    }
  }, [isOpen, property?.portfolio_id]);

  const renderOverviewTab = () => {
    return (
      <div className="space-y-6">
        {/* Unit Identifier Badge - Show if this is a unit listing */}
        {isUnitListing && (property.unitName || property.unitNumber) && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm">
                Unit: {property.unitName || property.unitNumber}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Individual unit within a multi-unit property
              </span>
            </div>
          </div>
        )}
        
        {/* Three Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Property Specs */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Property Specs</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                {isEditMode ? (
                  <div className="space-y-2 mt-1">
                    <Input
                      placeholder="Street Address"
                      value={editedData.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                    />
                    <Input
                      placeholder="City"
                      value={editedData.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="State"
                        value={editedData.state || ''}
                        onChange={(e) => handleFieldChange('state', e.target.value)}
                        maxLength={2}
                      />
                      <Input
                        placeholder="Zip Code"
                        value={editedData.zipcode || ''}
                        onChange={(e) => handleFieldChange('zipcode', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-0.5 mt-1">
                    <p>{propertyDetails.address}</p>
                    {(propertyDetails.city || propertyDetails.state || propertyDetails.zipcode) ? (
                      <p className="text-muted-foreground">
                        {[propertyDetails.city, propertyDetails.state, propertyDetails.zipcode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">City, State, Zip not specified</p>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                {isEditMode ? (
                  <Select
                    value={editedData.property_type || ''}
                    onValueChange={(value) => handleFieldChange('property_type', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="mobile_home">Mobile Home</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1">{propertyDetails.property_type}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={editedData.bedrooms || ''}
                    onChange={(e) => handleFieldChange('bedrooms', e.target.value ? parseInt(e.target.value) : null)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{propertyDetails.bedrooms || 'Not specified'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                {isEditMode ? (
                  <Input
                    type="number"
                    step="0.5"
                    value={editedData.bathrooms || ''}
                    onChange={(e) => handleFieldChange('bathrooms', e.target.value ? parseFloat(e.target.value) : null)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{propertyDetails.bathrooms || 'Not specified'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Square Feet</Label>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={editedData.square_feet || ''}
                    onChange={(e) => handleFieldChange('square_feet', e.target.value ? parseInt(e.target.value) : null)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{propertyDetails.square_feet ? `${propertyDetails.square_feet.toLocaleString()} sq ft` : 'Not specified'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Year Built</Label>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={editedData.year_built || ''}
                    onChange={(e) => handleFieldChange('year_built', e.target.value ? parseInt(e.target.value) : null)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{propertyDetails.year_built || 'Not specified'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Number of Units</Label>
                <p className="text-sm mt-1">
                  {propertyDetails.property_units?.length || propertyDetails.unit_count || 1}
                  {((propertyDetails.property_units?.length || propertyDetails.unit_count || 1) === 1 ? ' unit' : ' units')}
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: Financials */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Financials</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Monthly Rent</Label>
                {isEditMode ? (
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={editedData.monthly_rent || ''}
                      onChange={(e) => handleFieldChange('monthly_rent', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="pl-7"
                    />
                  </div>
                ) : (
                  <p className="text-sm mt-1">
                    {propertyDetails.monthly_rent > 0 
                      ? `$${propertyDetails.monthly_rent.toLocaleString()}/month`
                      : 'Contact for pricing'}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Deposit</Label>
                {isEditMode ? (
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={editedData.deposit_amount || ''}
                      onChange={(e) => handleFieldChange('deposit_amount', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="pl-7"
                    />
                  </div>
                ) : (
                  <p className="text-sm mt-1">${propertyDetails.deposit_amount}</p>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Description */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Description</h4>
            {isEditMode ? (
              <Textarea
                value={editedData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="min-h-[300px]"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {propertyDetails.description || 'No description provided.'}
              </p>
            )}
          </div>
        </div>

        {/* Unit Allocation Summary - Full Width Section */}
        {propertyDetails.property_units && propertyDetails.property_units.length > 0 && (
          <div className="border-t pt-6">
            <Label className="text-xs text-muted-foreground">Unit Allocation</Label>
            {(() => {
              const units = propertyDetails.property_units;
              const totalBeds = units.reduce((sum: number, u: any) => sum + (u.bedrooms || 0), 0);
              const totalBaths = units.reduce((sum: number, u: any) => sum + (u.bathrooms || 0), 0);
              const remaining = {
                beds: (propertyDetails.bedrooms || 0) - totalBeds,
                baths: (propertyDetails.bathrooms || 0) - totalBaths
              };
              const isComplete = remaining.beds === 0 && remaining.baths === 0;
              const isOver = remaining.beds < 0 || remaining.baths < 0;

              return (
                <div className="text-sm mt-1 space-y-1">
                  <div className="flex items-center gap-4">
                    <span><strong>Total:</strong> {propertyDetails.bedrooms} bed, {propertyDetails.bathrooms} bath</span>
                    <span><strong>Allocated:</strong> {totalBeds} bed, {totalBaths} bath ({units.length} {units.length === 1 ? 'unit' : 'units'})</span>
                    <span className={isOver ? 'text-destructive font-medium' : isComplete ? 'text-green-600 font-medium' : ''}>
                      <strong>Remaining:</strong> {remaining.beds} bed, {remaining.baths} bath
                      {isComplete && ' ✓'}
                      {isOver && ' ⚠️'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Contact Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
          <div>
            <h4 className="font-medium mb-2">
              {isClientProperty ? 'Client Contact Information' : 'Contact Information'}
            </h4>
            
            {isClientProperty && (
              <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Displaying client contact information from portfolio
                </span>
              </div>
            )}

            {isClientProperty ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Name</Label>
                  <p className="text-sm mt-1">{portfolioData?.client_name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  {portfolioData?.client_phone ? (
                    <a
                      href={`tel:${portfolioData.client_phone}`}
                      className="text-sm text-primary hover:underline mt-1 block"
                    >
                      {portfolioData.client_phone}
                    </a>
                  ) : (
                    <p className="text-sm mt-1">Not specified</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  {portfolioData?.client_email ? (
                    <a
                      href={`mailto:${portfolioData.client_email}`}
                      className="text-sm text-primary hover:underline mt-1 block"
                    >
                      {portfolioData.client_email}
                    </a>
                  ) : (
                    <p className="text-sm mt-1">Not specified</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Name</Label>
                  {isEditMode ? (
                    <Input
                      value={editedData.contact_name || ''}
                      onChange={(e) => handleFieldChange('contact_name', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{propertyDetails.contact_name || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  {isEditMode ? (
                    <Input
                      type="tel"
                      value={editedData.contact_phone || ''}
                      onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                      className="mt-1"
                    />
                  ) : propertyDetails.contact_phone ? (
                    <a
                      href={`tel:${propertyDetails.contact_phone}`}
                      className="text-sm text-primary hover:underline mt-1 block"
                    >
                      {propertyDetails.contact_phone}
                    </a>
                  ) : (
                    <p className="text-sm mt-1">Not specified</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  {isEditMode ? (
                    <Input
                      type="email"
                      value={editedData.contact_email || ''}
                      onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                      className="mt-1"
                    />
                  ) : propertyDetails.contact_email ? (
                    <a
                      href={`mailto:${propertyDetails.contact_email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {propertyDetails.contact_email}
                    </a>
                  ) : (
                    <p className="text-sm">Not specified</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderUnitsTab = () => {
    return (
      <AdminUnitsManager 
        propertyId={propertyDetails.id}
        propertyAddress={propertyDetails.address}
      />
    );
  };

  const renderAmenitiesTab = () => {
    // Mapping between property database columns (snake_case) and listing amenity keys (camelCase)
    const propertyColumnToAmenityKey: Record<string, string> = {
      'air_conditioning': 'airConditioning',
      'furnished': 'furnished',
      'in_unit_laundry': 'inUnitLaundry',
      'shared_laundry': 'sharedLaundry',
      'laundry_hookups': 'laundryHookups',
      'balcony_patio': 'balconyPatio',
      'yard_garden': 'yardGarden',
      'parking_available': 'parkingAvailable',
      'pet_friendly': 'petFriendly',
      'dishwasher': 'dishwasher',
      'microwave': 'microwave',
      'refrigerator': 'refrigerator',
      'hardwood_floors': 'hardwoodFloors',
      'carpet': 'carpet',
      'tile_floors': 'tileFloors',
      'central_heating': 'centralHeating',
      'fireplace': 'fireplace',
      'walk_in_closets': 'walkinClosets',
      'storage_unit': 'storageUnit',
      'gym_fitness': 'gymFitness',
      'pool': 'pool',
      'security_system': 'securitySystem'
    };

    // Reverse mapping for save operation
    const amenityKeyToPropertyColumn: Record<string, string> = Object.entries(propertyColumnToAmenityKey).reduce((acc, [col, key]) => {
      acc[key] = col;
      return acc;
    }, {} as Record<string, string>);
    
    // Convert property columns to amenity keys array for display
    const selectedAmenities = Object.entries(propertyColumnToAmenityKey)
      .filter(([column]) => propertyDetails[column] === true)
      .map(([_, key]) => key);
    
    const handleAmenityChange = (amenityKey: string, checked: boolean) => {
      const propertyColumn = amenityKeyToPropertyColumn[amenityKey];
      setEditedData(prev => ({
        ...prev,
        [propertyColumn]: checked
      }));
    };
    
    // Count active amenities
    const activeCount = LISTING_AMENITIES.filter(amenity => {
      const column = amenityKeyToPropertyColumn[amenity.key];
      return isEditMode ? editedData[column] === true : propertyDetails[column] === true;
    }).length;
    
    const renderAmenityCheckbox = (amenity: any) => {
      const column = amenityKeyToPropertyColumn[amenity.key];
      const isChecked = isEditMode 
        ? editedData[column] === true
        : propertyDetails[column] === true;
      
      return (
        <div key={amenity.key} className="flex items-center space-x-2">
          <Checkbox
            id={amenity.key}
            checked={isChecked}
            disabled={!isEditMode}
            onCheckedChange={(checked) => 
              handleAmenityChange(amenity.key, checked as boolean)
            }
          />
          <Label 
            htmlFor={amenity.key} 
            className={`text-sm ${isEditMode ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {amenity.label}
          </Label>
        </div>
      );
    };
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Property Amenities</h3>
          <Badge variant="secondary">
            {activeCount} amenities selected
          </Badge>
        </div>
        
        {isEditMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              ✏️ <strong>Edit Mode:</strong> Check or uncheck amenities below to update this property.
            </p>
          </div>
        )}
        
        <ScrollArea className="h-[calc(100vh-400px)] pr-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {LISTING_AMENITIES.map(renderAmenityCheckbox)}
              </div>
            </CardContent>
          </Card>
        </ScrollArea>
      </div>
    );
  };

  const renderTenantsTab = () => {
    const [currentTenants, setCurrentTenants] = useState<any[]>([]);
    const [tenantsLoading, setTenantsLoading] = useState(true);

    useEffect(() => {
      const fetchCurrentTenants = async () => {
        if (!property?.id) return;
        
        setTenantsLoading(true);
        try {
          // Fetch current tenants from marketplace_applications
          const { data: applications, error } = await supabase
            .from('marketplace_applications')
            .select(`
              id,
              user_id,
              unit_id,
              became_tenant_at,
              lifecycle_stage,
              status,
              profiles!marketplace_applications_user_id_fkey (
                id,
                first_name,
                last_name,
                email,
                phone
              ),
              property_units!marketplace_applications_unit_id_fkey (
                id,
                unit_number,
                unit_name
              )
            `)
            .eq('property_id', property.id)
            .eq('lifecycle_stage', 'current_tenant')
            .eq('status', 'housed');

          if (error) throw error;

          setCurrentTenants(applications || []);
        } catch (error) {
          console.error('Error fetching current tenants:', error);
          toast({
            title: "Error loading tenants",
            description: "Failed to load current tenant information",
            variant: "destructive",
          });
        } finally {
          setTenantsLoading(false);
        }
      };

      if (isOpen) {
        fetchCurrentTenants();
      }
    }, [property?.id, isOpen]);

    if (tenantsLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (currentTenants.length === 0) {
      return (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Current Tenants</h3>
          <p className="text-muted-foreground">This property currently has no tenants.</p>
        </div>
      );
    }

    // For multi-unit properties, group by unit
    const isMultiUnit = (propertyDetails.property_units?.length || propertyDetails.unit_count || 1) > 1;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Current Tenants</h3>
          <Badge variant="secondary">{currentTenants.length} {currentTenants.length === 1 ? 'tenant' : 'tenants'}</Badge>
        </div>

        <div className="grid gap-4">
          {currentTenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold text-lg">
                        {tenant.profiles?.first_name} {tenant.profiles?.last_name}
                      </h4>
                      <Badge variant="default" className="ml-2">Current Tenant</Badge>
                    </div>

                    {isMultiUnit && tenant.property_units && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Unit: {tenant.property_units.unit_number || tenant.property_units.unit_name}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {tenant.profiles?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${tenant.profiles.email}`}
                            className="text-primary hover:underline"
                          >
                            {tenant.profiles.email}
                          </a>
                        </div>
                      )}

                      {tenant.profiles?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`tel:${tenant.profiles.phone}`}
                            className="text-primary hover:underline"
                          >
                            {tenant.profiles.phone}
                          </a>
                        </div>
                      )}

                      {tenant.became_tenant_at && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Housed: {format(new Date(tenant.became_tenant_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderDocumentsTab = () => {
    return (
      <EnhancedPropertyDocuments 
        propertyId={property.id} 
        isAdmin={isAdmin}
      />
    );
  };

  const fetchPropertyPayments = async () => {
    if (!property?.id) return;
    
    setPaymentsLoading(true);
    try {
      // Fetch tenant portion payments (Stripe)
      const { data: rentPayments } = await supabase
        .from('rent_payments')
        .select(`
          id, payment_date, amount, payment_status, payment_source,
          stripe_payment_intent_id, tenant_id, unit_id,
          profiles:tenant_id(first_name, last_name),
          property_units:unit_id(unit_number, unit_name)
        `)
        .eq('property_id', property.id)
        .order('payment_date', { ascending: false });
      
      // Fetch HAP payments (Plaid)
      const { data: hapPayments } = await supabase
        .from('hap_payments')
        .select(`
          id, payment_date, actual_amount, payment_status,
          plaid_transaction_id, matched_via_plaid, tenant_id, unit_id,
          profiles:tenant_id(first_name, last_name),
          property_units:unit_id(unit_number, unit_name)
        `)
        .eq('property_id', property.id)
        .order('payment_date', { ascending: false });
      
      // Merge and format data
      const allPayments = [
        ...(rentPayments || []).map(p => ({
          ...p,
          payment_type: 'Tenant Portion',
          amount: p.amount,
          source: 'Stripe'
        })),
        ...(hapPayments || []).map(p => ({
          ...p,
          payment_type: 'HAP/Section 8',
          amount: p.actual_amount,
          source: 'Plaid'
        }))
      ].sort((a, b) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
      
      setPaymentsData(allPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({ title: "Error loading payments", variant: "destructive" });
    } finally {
      setPaymentsLoading(false);
    }
  };

  const renderPaymentsTab = () => {
    const getPaymentStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'completed': return 'default';
        case 'pending': return 'secondary';
        case 'failed': return 'destructive';
        default: return 'outline';
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Payment History</h3>
          <Badge variant="outline">{paymentsData.length} total payments</Badge>
        </div>
        
        {paymentsLoading ? (
          <div className="flex justify-center py-8">
            <Clock className="h-8 w-8 animate-spin" />
          </div>
        ) : paymentsData.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment records found for this property</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsData.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {payment.payment_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.property_units && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Unit {payment.property_units.unit_number || payment.property_units.unit_name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${parseFloat(payment.amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusColor(payment.payment_status)}>
                        {payment.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.profiles 
                        ? `${payment.profiles.first_name} ${payment.profiles.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {payment.source === 'Stripe' ? (
                          <CreditCard className="h-4 w-4" />
                        ) : (
                          <Building className="h-4 w-4" />
                        )}
                        <span className="text-sm">{payment.source}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  const handleMarkVacant = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'vacant' })
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Property Updated",
        description: "Property marked as vacant.",
      });

      if (onPropertyUpdated) onPropertyUpdated();
      setPropertyDetails({ ...propertyDetails, status: 'vacant' });
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update property status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOccupied = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'occupied' })
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Property Updated",
        description: "Property marked as occupied.",
      });

      if (onPropertyUpdated) onPropertyUpdated();
      setPropertyDetails({ ...propertyDetails, status: 'occupied' });
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update property status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      // Filter out generated and non-editable fields
      const {
        id,
        created_at,
        updated_at,
        owner_id,
        portfolio_id,
        normalized_address,
        latitude,
        longitude,
        property_units,
        unit_count,
        ...updateData
      } = editedData;

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyDetails.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property updated successfully",
      });

      setPropertyDetails(editedData);
      setIsEditMode(false);
      
      if (onPropertyUpdated) {
        onPropertyUpdated();
      }
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearField = async (field: string) => {
    setLoading(true);
    try {
      const updateData: any = {};
      
      switch (field) {
        case 'financials':
          updateData.monthly_rent = null;
          updateData.deposit_amount = null;
          updateData.application_fee = null;
          break;
        case 'features':
          updateData.amenities = null;
          updateData.pets_allowed = false;
          updateData.smoking_allowed = false;
          updateData.parking_available = false;
          break;
        case 'description':
          updateData.description = null;
          updateData.lease_term = null;
          updateData.available_date = null;
          break;
      }

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Fields Cleared",
        description: `${field} information has been cleared.`,
      });

      if (onPropertyUpdated) onPropertyUpdated();
      setPropertyDetails({ ...propertyDetails, ...updateData });
    } catch (error) {
      console.error('Error clearing fields:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear fields.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSettingsTab = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Property Settings</h3>
          
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h4 className="font-medium mb-2">Property Information</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Address:</strong> {propertyDetails.address}</p>
                <p><strong>Type:</strong> {propertyDetails.property_type}</p>
                <p><strong>Status:</strong> 
                  <Badge 
                    variant={propertyDetails.status === 'occupied' ? 'destructive' : 'default'}
                    className="ml-2"
                  >
                    {propertyDetails.status || 'Unknown'}
                  </Badge>
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Financial Details</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Monthly Rent:</strong> ${propertyDetails.monthly_rent || 'Not set'}</p>
                <p><strong>Deposit:</strong> ${propertyDetails.deposit_amount || 'Not set'}</p>
                <p><strong>Application Fee:</strong> ${propertyDetails.application_fee || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {isAdmin && (
            <div className="border rounded-lg p-4 mb-6">
              <h4 className="font-medium mb-2">Quick Actions</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Quickly update property status or clear specific information.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {propertyDetails.status !== 'vacant' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loading}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Mark as Vacant
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark Property as Vacant</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will update the property status to vacant. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkVacant}>
                          Mark as Vacant
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {propertyDetails.status !== 'occupied' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loading}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Occupied
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark Property as Occupied</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will update the property status to occupied. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkOccupied}>
                          Mark as Occupied
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Clear Information</h5>
                <div className="flex flex-wrap gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loading}>
                        Clear Features
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Property Features</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will clear amenities, pet policy, smoking policy, and parking information. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleClearField('features')}>
                          Clear Features
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loading}>
                        Clear Description & Terms
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Description & Terms</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will clear property description, lease terms, and availability date. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleClearField('description')}>
                          Clear Description & Terms
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAuditTab = () => {
    if (!isAdmin) {
      return (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Admin access required</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audit Trail</h3>
          <Badge variant="secondary">
            {auditTrail.length} events
          </Badge>
        </div>

        {auditLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : auditTrail.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditTrail.map((entry) => (
              <Card key={entry.log_id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-4 h-4" />
                        <span className="font-medium">
                          {entry.user_name || 'Unknown User'}
                        </span>
                        <Badge variant={entry.allowed ? 'default' : 'destructive'}>
                          {entry.action}
                        </Badge>
                        {entry.unit_id && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Unit {entry.unit_number || entry.unit_name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.user_email}
                      </div>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="text-xs">
                          <details>
                            <summary className="cursor-pointer text-primary hover:underline">
                              View Details
                            </summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs">
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No audit events found</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-6xl translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh]">
          <DialogHeader className="p-6 pb-2 border-b">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold">
                  Property Details
                </DialogTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  View and manage detailed information about this property
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <Badge 
                  variant={propertyDetails.status === 'occupied' ? 'destructive' : 'default'}
                >
                  {propertyDetails.status === 'vacant' ? 'Vacant' : 
                   propertyDetails.status === 'occupied' ? 'Occupied' : 
                   propertyDetails.status || 'Unknown'}
                </Badge>
                {isAdmin && (
                  <>
                    {propertyDetails?.on_market && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditListingModal(true)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Edit Listing
                      </Button>
                    )}
                    <Button
                      variant={isEditMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (isEditMode) {
                          handleSaveChanges();
                        } else {
                          setIsEditMode(true);
                          setEditedData(propertyDetails);
                        }
                      }}
                      disabled={loading}
                    >
                      {isEditMode ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Property
                        </>
                      )}
                    </Button>
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditMode(false);
                          setEditedData(propertyDetails);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 overflow-hidden" orientation="vertical">
          <div className="w-56 border-r p-4 space-y-4">
            <TabsList className="flex flex-col w-full h-auto">
              <TabsTrigger value="overview" className="justify-start w-full p-3">
                <Home className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="units" className="justify-start w-full p-3">
                <Users className="h-4 w-4 mr-2" />
                Units
              </TabsTrigger>
              <TabsTrigger value="amenities" className="justify-start w-full p-3">
                <Sparkles className="h-4 w-4 mr-2" />
                Amenities
              </TabsTrigger>
              <TabsTrigger value="tenants" className="justify-start w-full p-3">
                <User className="h-4 w-4 mr-2" />
                Tenants
              </TabsTrigger>
              <TabsTrigger value="documents" className="justify-start w-full p-3">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              {isAdmin && (
                <>
                  <TabsTrigger value="payments" className="justify-start w-full p-3">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="justify-start w-full p-3">
                    <Shield className="h-4 w-4 mr-2" />
                    Audit
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="settings" className="justify-start w-full p-3">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

            <div className="flex-1 overflow-hidden max-h-[calc(90vh-8rem)]">
              <ScrollArea className="h-full">
              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  {renderOverviewTab()}
                </TabsContent>
                
                <TabsContent value="units" className="mt-0">
                  {renderUnitsTab()}
                </TabsContent>
                
                <TabsContent value="amenities" className="mt-0">
                  {renderAmenitiesTab()}
                </TabsContent>
                
                <TabsContent value="tenants" className="mt-0">
                  {renderTenantsTab()}
                </TabsContent>
                
                <TabsContent value="documents" className="mt-0">
                  {renderDocumentsTab()}
                </TabsContent>

                {isAdmin && (
                  <>
                    <TabsContent value="payments" className="mt-0">
                      {renderPaymentsTab()}
                    </TabsContent>
                    
                    <TabsContent value="audit" className="mt-0">
                      {renderAuditTab()}
                    </TabsContent>
                  </>
                )}
                
                <TabsContent value="settings" className="mt-0">
                  {renderSettingsTab()}
                </TabsContent>
              </div>
            </ScrollArea>
          </div>
        </Tabs>
        </DialogPrimitive.Content>
      </DialogPortal>
      
      {/* Edit Listing Modal */}
      <Dialog open={showEditListingModal} onOpenChange={setShowEditListingModal}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <MultiStepTenantRequestForm
                propertyId={property?.id}
                propertyAddress={propertyDetails?.address || ''}
                unitId={propertyDetails?.property_units?.[0]?.id}
                unitNumber={propertyDetails?.property_units?.[0]?.unit_number}
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
    </Dialog>
  );
};

export default PropertyDetailsModal;
