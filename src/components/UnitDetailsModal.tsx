import React, { useState, useEffect, useMemo } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

import { UnitOverviewTab } from './unit/UnitOverviewTab';
import { UnitAmenities } from './unit-steps/UnitAmenities';
import { UnitMaintenanceRequests } from './unit/UnitMaintenanceRequests';
import { UnitPaymentsTab } from './unit/UnitPaymentsTab';
import { UnitDocumentsTab } from './unit/UnitDocumentsTab';
import { 
  Home, 
  Users, 
  Wrench,
  Sparkles,
  DollarSign,
  FileText,
  Shield,
  User,
  Clock,
  X,
  Mail,
  Phone,
  Eye
} from 'lucide-react';
import TenantProfileModal from './TenantProfileModal';
import { useUnitAuditTrail } from '@/hooks/useUnitAuditTrail';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminCheck } from '@/hooks/useAdminCheck';

interface UnitDetailsModalProps {
  unit: any;
  property: any;
  onClose: () => void;
  onUnitUpdated: () => void;
}

export const UnitDetailsModal = ({ unit, property, onClose, onUnitUpdated }: UnitDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [showTenantProfile, setShowTenantProfile] = useState(false);
  const { toast } = useToast();
  const { data: isAdmin } = useAdminCheck();

  // Fallback fetch for owner_id if not present in property prop
  const { data: propertyOwner } = useQuery({
    queryKey: ['property-owner', property?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', property.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!property?.id && !property?.owner_id,
    staleTime: 5 * 60 * 1000,
  });

  // Use owner_id from prop if available, otherwise use fetched value
  const landlordId = useMemo(() => {
    return property?.owner_id || propertyOwner?.owner_id || '';
  }, [property?.owner_id, propertyOwner?.owner_id]);

  // Fetch audit trail for admin users
  const { data: auditTrail = [], isLoading: auditLoading } = useUnitAuditTrail(
    unit?.id || '',
    isAdmin ? 50 : 0
  );

  // Fetch current tenant for this unit
  useEffect(() => {
    const fetchCurrentTenant = async () => {
      if (!unit?.id) return;
      setTenantLoading(true);
      
      const { data } = await supabase
        .from('marketplace_applications')
        .select(`
          id, status, lifecycle_stage, became_tenant_at,
          profiles:user_id (id, first_name, last_name, email, phone)
        `)
        .eq('unit_id', unit.id)
        .eq('lifecycle_stage', 'current_tenant')
        .eq('status', 'housed')
        .maybeSingle();
      
      setCurrentTenant(data);
      setTenantLoading(false);
    };
    
    fetchCurrentTenant();
  }, [unit?.id]);

  useEffect(() => {
    if (unit) {
      setEditedData({
        unit_number: unit.unit_number || '',
        unit_name: unit.unit_name || unit.name || '',
        monthly_rent: unit.monthly_rent || '',
        bedrooms: unit.bedrooms || '',
        bathrooms: unit.bathrooms || '',
        square_feet: unit.square_feet || '',
        status: unit.status || '',
        description: unit.description || '',
        tenant_type: unit.tenant_type || '',
        security_deposit: unit.security_deposit || '',
        on_market: unit.on_market || false,
        unit_amenities: unit.unit_amenities || []
      });
    }
  }, [unit]);

  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    try {
      console.log('=== SAVE STARTED ===');
      console.log('1. Current editedData:', JSON.stringify(editedData, null, 2));
      console.log('2. unit_amenities in editedData:', editedData.unit_amenities);
      
      // Fields that should NOT be updated through this modal
      const excludedFields = [
        'id',
        'property_id', 
        'created_at',
        'updated_at',
        'tenant_id',
        'lease_id',
        'status',        // Controlled through occupancy management
        'tenant_type',   // Controlled through tenant assignment
        'on_market',     // Controlled through toggle component
      ];
      
      // Clean the data before sending to database
      const cleanedData: any = {};
      
      // Numeric fields that should be null if empty
      const numericFields = ['monthly_rent', 'bedrooms', 'bathrooms', 'square_feet', 'security_deposit'];
      
      // Process each field in editedData
      Object.keys(editedData).forEach(key => {
        console.log(`Processing field: ${key}, value:`, editedData[key]);
        
        // Skip excluded fields
        if (excludedFields.includes(key)) {
          console.log(`  -> Skipped (excluded field)`);
          return;
        }
        
        const value = editedData[key];
        
        // Skip undefined values
        if (value === undefined) {
          console.log(`  -> Skipped (undefined)`);
          return;
        }
        
        // Convert empty strings to null for numeric fields
        if (numericFields.includes(key)) {
          cleanedData[key] = value === '' ? null : value;
          console.log(`  -> Added as numeric: ${cleanedData[key]}`);
        } else {
          cleanedData[key] = value;
          console.log(`  -> Added: ${JSON.stringify(value)}`);
        }
      });
      
      console.log('3. Final cleanedData being sent to DB:', JSON.stringify(cleanedData, null, 2));
      console.log('4. Updating unit ID:', unit.id);
      
      const { data: updateResult, error } = await supabase
        .from('property_units')
        .update(cleanedData)
        .eq('id', unit.id)
        .select();

      console.log('5. Database update result:', updateResult);
      console.log('6. Database error (if any):', error);

      if (error) throw error;

      // If single-unit property and photos changed, sync to property level
      if (editedData.photos) {
        const { data: propertyData } = await supabase
          .from('properties')
          .select('unit_count')
          .eq('id', property.id)
          .single();

        if (propertyData?.unit_count === 1) {
          await supabase
            .from('properties')
            .update({ photos: editedData.photos })
            .eq('id', property.id);
        }
      }

      toast({
        title: "Success",
        description: "Unit details updated successfully",
      });

      console.log('7. Calling onUnitUpdated to refresh data...');
      setIsEditMode(false);
      onUnitUpdated();
      console.log('=== SAVE COMPLETE ===');
    } catch (error: any) {
      console.error('=== SAVE FAILED ===', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditedData({
      unit_number: unit.unit_number || '',
      unit_name: unit.unit_name || unit.name || '',
      monthly_rent: unit.monthly_rent || '',
      bedrooms: unit.bedrooms || '',
      bathrooms: unit.bathrooms || '',
      square_feet: unit.square_feet || '',
      status: unit.status || '',
      description: unit.description || '',
      tenant_type: unit.tenant_type || '',
      security_deposit: unit.security_deposit || '',
      on_market: unit.on_market || false,
      unit_amenities: unit.unit_amenities || []
    });
    setIsEditMode(false);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: 'success',
      occupied: 'occupied',
      maintenance: 'warning',
      vacant: 'neutral'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const renderAmenitiesTab = () => {
    return (
      <UnitAmenities
        formData={{ amenities: editedData.unit_amenities || [] }}
        updateFormData={(field, value) => handleFieldChange('unit_amenities', value)}
        listingMode={true}
        isEditMode={isEditMode}
      />
    );
  };

  const renderTenantTab = () => {
    if (tenantLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!currentTenant) {
      return (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Current Tenant</h3>
          <p className="text-muted-foreground">This unit is currently vacant</p>
        </div>
      );
    }

    const tenant = currentTenant.profiles;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Current Tenant</h3>
          <Badge variant="default">Housed</Badge>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-lg">
                  {tenant?.first_name} {tenant?.last_name}
                </h4>
                {tenant?.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {tenant.email}
                  </div>
                )}
                {tenant?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {tenant.phone}
                  </div>
                )}
                {currentTenant.became_tenant_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Housed since: {new Date(currentTenant.became_tenant_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              {tenant?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTenantProfile(true)}
                  title="View tenant details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tenant Profile Modal */}
        {showTenantProfile && tenant?.id && (
          <TenantProfileModal
            isOpen={showTenantProfile}
            onClose={() => setShowTenantProfile(false)}
            tenantId={tenant.id}
            propertyId={property.id}
            isPrimary={true}
            showPrimaryBadge={false}
          />
        )}
      </div>
    );
  };

  const renderMaintenanceTab = () => {
    return <UnitMaintenanceRequests unit={unit} property={property} />;
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
          <h3 className="text-lg font-semibold">Unit Audit Trail</h3>
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
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">
                          {entry.user_name || 'Unknown User'}
                        </span>
                        <Badge variant={entry.allowed ? 'default' : 'destructive'}>
                          {entry.action}
                        </Badge>
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

  if (!unit || !property) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay />
      <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-6xl h-[90vh] translate-x-[-50%] translate-y-[-50%] bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg border flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">
                {unit.unit_name || unit.unit_number || 'Unit 1'} - {property.address}
              </h2>
              {getStatusBadge(unit.status || 'available')}
              {unit.tenant_type && (
                <Badge variant={unit.tenant_type === 'voucher' ? 'secondary' : 'outline'}>
                  {unit.tenant_type === 'voucher' ? 'Voucher' : 'Market'}
                </Badge>
              )}
              {unit.on_market && (
                <Badge variant="default">On Market</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveChanges}>
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                  Edit Unit
                </Button>
              )}
              <DialogPrimitive.Close
                onClick={onClose}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            View and manage detailed information about this unit
          </p>
        </div>

        {/* Vertical Tabs Layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 overflow-hidden" orientation="vertical">
          <div className="w-56 border-r p-4 space-y-2 flex-shrink-0">
            <TabsList className="flex flex-col w-full h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="overview" className="justify-start w-full">
                <Home className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="amenities" className="justify-start w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                Amenities
              </TabsTrigger>
              <TabsTrigger value="tenant" className="justify-start w-full">
                <User className="h-4 w-4 mr-2" />
                Tenant
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="justify-start w-full">
                <Wrench className="h-4 w-4 mr-2" />
                Maintenance
              </TabsTrigger>
              <TabsTrigger value="payments" className="justify-start w-full">
                <DollarSign className="h-4 w-4 mr-2" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="documents" className="justify-start w-full">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="audit" className="justify-start w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Audit Trail
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <UnitOverviewTab 
                    unit={unit} 
                    property={property}
                    isEditMode={isEditMode}
                    editedData={editedData}
                    onFieldChange={handleFieldChange}
                  />
                </TabsContent>

                <TabsContent value="amenities" className="mt-0">
                  {renderAmenitiesTab()}
                </TabsContent>

                <TabsContent value="tenant" className="mt-0">
                  {renderTenantTab()}
                </TabsContent>

                <TabsContent value="maintenance" className="mt-0">
                  {renderMaintenanceTab()}
                </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <UnitPaymentsTab
                unitId={unit.id}
                propertyId={property.id}
                landlordId={landlordId}
                unitNumber={unit.unit_name || unit.unit_number || 'Unit 1'}
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <UnitDocumentsTab
                unit={unit}
                property={property}
              />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="audit" className="mt-0">
                {renderAuditTab()}
              </TabsContent>
            )}
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </DialogPrimitive.Content>
    </DialogPortal>
  </Dialog>
  );
};
