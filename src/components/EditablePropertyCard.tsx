import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '@/hooks/useProperties';
import { Edit2, Save, X, UserIcon, DollarSign, Users } from 'lucide-react';
import PropertyImageUpload from './PropertyImageUpload';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import TenantRequestModal from './TenantRequestModal';
import LandlordPropertyDetailsModal from './LandlordPropertyDetailsModal';
import { HAPSplitBar } from '@/components/property/HAPSplitBar';

interface EditablePropertyCardProps {
  property: any;
  onApplicationsClick: () => void;
  onTenantClick: (property: any) => void;
  onRentSetupClick: (property: any) => void;
  onPropertyUpdated: () => void;
  portfolioId?: string;
}

const EditablePropertyCard = ({ 
  property, 
  onApplicationsClick, 
  onTenantClick, 
  onRentSetupClick,
  onPropertyUpdated,
  portfolioId 
}: EditablePropertyCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    street_address: property.street_address || '',
    city: property.city || '',
    state: property.state || '',
    zipcode: property.zipcode || '',
    bedrooms: property.bedrooms?.toString() || '',
    bathrooms: property.bathrooms?.toString() || '',
    unit_count: property.unit_count?.toString() || '1',
    monthly_rent: property.monthly_rent?.toString() || '',
    status: property.status || 'vacant',
    insurance_cost: property.insurance_cost?.toString() || '',
    mortgage_cost: property.mortgage_cost?.toString() || '',
    management_fee: property.management_fee?.toString() || '',
    repair_costs: property.repair_costs?.toString() || '',
    description: property.description || '',
    for_sale: property.for_sale || false,
    sale_price: property.sale_price?.toString() || '',
    desired_rent: property.desired_rent?.toString() || ''
  });
  const [propertyImages, setPropertyImages] = useState<string[]>(property.photos || []);
  const [loading, setLoading] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchApplicationCount = async () => {
      try {
        const { data, error } = await supabase
          .from('property_applications')
          .select('id')
          .eq('property_id', property.id);

        if (error) throw error;
        setApplicationCount(data?.length || 0);
      } catch (error) {
        console.error('Error fetching application count:', error);
      }
    };

    fetchApplicationCount();
  }, [property.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Construct full address from separate fields
      const fullAddress = `${editData.street_address}, ${editData.city}, ${editData.state} ${editData.zipcode}`.trim();
      
      const updateData = {
        address: fullAddress,
        street_address: editData.street_address,
        city: editData.city,
        state: editData.state,
        zipcode: editData.zipcode,
        bedrooms: editData.bedrooms ? parseInt(editData.bedrooms) : null,
        bathrooms: editData.bathrooms ? parseFloat(editData.bathrooms) : null,
        unit_count: parseInt(editData.unit_count),
        monthly_rent: parseFloat(editData.monthly_rent || '0'),
        status: editData.status,
        insurance_cost: editData.insurance_cost ? parseFloat(editData.insurance_cost) : 0,
        mortgage_cost: editData.mortgage_cost ? parseFloat(editData.mortgage_cost) : 0,
        management_fee: editData.management_fee ? parseFloat(editData.management_fee) : 0,
        repair_costs: editData.repair_costs ? parseFloat(editData.repair_costs) : 0,
        description: editData.description,
        for_sale: editData.for_sale,
        sale_price: editData.sale_price ? parseFloat(editData.sale_price) : null,
        desired_rent: editData.desired_rent ? parseFloat(editData.desired_rent) : null,
        photos: propertyImages
      };

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Property updated successfully!",
        description: "Your property details have been saved.",
      });

      setIsEditing(false);
      // Invalidate property queries for real-time updates
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      queryClient.invalidateQueries({ queryKey: propertyKeys.byOwner(property.owner_id) });
      
      onPropertyUpdated();
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast({
        title: "Error updating property",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset edit data to original values
    setEditData({
      street_address: property.street_address || '',
      city: property.city || '',
      state: property.state || '',
      zipcode: property.zipcode || '',
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      unit_count: property.unit_count?.toString() || '1',
      monthly_rent: property.monthly_rent?.toString() || '',
      status: property.status || 'vacant',
      insurance_cost: property.insurance_cost?.toString() || '',
      mortgage_cost: property.mortgage_cost?.toString() || '',
      management_fee: property.management_fee?.toString() || '',
      repair_costs: property.repair_costs?.toString() || '',
      description: property.description || '',
      for_sale: property.for_sale || false,
      sale_price: property.sale_price?.toString() || '',
      desired_rent: property.desired_rent?.toString() || ''
    });
    setPropertyImages(property.photos || []);
    setIsEditing(false);
  };

  const expenses = (property.insurance_cost || 0) + (property.mortgage_cost || 0) + 
                  (property.management_fee || 0) + (property.repair_costs || 0);
  const cashFlow = (property.monthly_rent || 0) - expenses;

  const renderActionButtons = () => {
    if (property.status === 'occupied') {
      return (
        <div className="space-y-2">
          <Button 
            onClick={() => onTenantClick(property)}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <UserIcon className="w-4 h-4 mr-2" />
            View Tenant
          </Button>
          <Button 
            onClick={() => onRentSetupClick(property)}
            variant="outline"
            className="w-full bg-white text-black border-gray-300 hover:bg-gray-50"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Setup Rent & Payments
          </Button>
        </div>
      );
    } else if (property.status === 'vacant') {
      const hasApplications = applicationCount > 0;
      const hasTenantRequests = (property.tenant_request_count || 0) > 0 || (property.desired_rent && property.desired_rent > 0);
      
      if (hasApplications || hasTenantRequests) {
        // Property is in the marketplace - show View Applications + Take Off Market
        return (
          <div className="space-y-2">
            <div className="relative">
              <Button 
                onClick={onApplicationsClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                {hasApplications ? `View ${applicationCount} Application${applicationCount !== 1 ? 's' : ''}` : 'View Applications'}
              </Button>
              {hasApplications && (
                <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold">
                  {applicationCount}
                </div>
              )}
            </div>
            <TenantRequestModal
              propertyId={property.id}
              propertyAddress={property.address}
              onRequestSent={onPropertyUpdated}
              requestCount={property.tenant_request_count || 0}
            />
          </div>
        );
      } else {
        // Property not yet requested for tenants - show Request Tenant button
        return (
          <div className="w-full">
            <TenantRequestModal
              propertyId={property.id}
              propertyAddress={property.address}
              onRequestSent={onPropertyUpdated}
              requestCount={property.tenant_request_count || 0}
            />
          </div>
        );
      }
    } else if (property.status === 'available') {
      // Properties that are available for browsing - handle edge cases
      const hasRealRequests = (property.tenant_request_count || 0) > 0 || (property.desired_rent && property.desired_rent > 0);
      
      if (hasRealRequests) {
        // Normal available property with requests
        return (
          <div className="space-y-2">
            <Button 
              onClick={onApplicationsClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              View Applications
            </Button>
            <TenantRequestModal
              propertyId={property.id}
              propertyAddress={property.address}
              onRequestSent={onPropertyUpdated}
              requestCount={property.tenant_request_count || 0}
            />
          </div>
        );
      } else {
        // Inconsistent state - treat as vacant needing request
        return (
          <div className="w-full">
            <TenantRequestModal
              propertyId={property.id}
              propertyAddress={property.address}
              onRequestSent={onPropertyUpdated}
              requestCount={0}
            />
          </div>
        );
      }
    }
    return null;
  };

  if (isEditing) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Edit Property</h3>
            <div className="flex space-x-2">
              <PermissionGuard 
                object="portfolio.properties" 
                action="edit" 
                scope="portfolio" 
                portfolioId={portfolioId}
              >
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </PermissionGuard>
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Property Images */}
          <PropertyImageUpload
            propertyId={property.id}
            userId={property.owner_id}
            images={propertyImages}
            onImagesChange={setPropertyImages}
            portfolioId={portfolioId || property.portfolio_id}
          />

          {/* Address Fields */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="street_address">Street Address</Label>
              <Input
                id="street_address"
                value={editData.street_address}
                onChange={(e) => setEditData({ ...editData, street_address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  placeholder="Springfield"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={editData.state}
                  onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                  placeholder="IL"
                />
              </div>
              <div>
                <Label htmlFor="zipcode">Zip</Label>
                <Input
                  id="zipcode"
                  value={editData.zipcode}
                  onChange={(e) => setEditData({ ...editData, zipcode: e.target.value })}
                  placeholder="62701"
                />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={editData.bedrooms}
                onChange={(e) => setEditData({ ...editData, bedrooms: e.target.value })}
                placeholder="2"
              />
            </div>
            <div>
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={editData.bathrooms}
                onChange={(e) => setEditData({ ...editData, bathrooms: e.target.value })}
                placeholder="1.5"
              />
            </div>
            <div>
              <Label htmlFor="unit_count">Units</Label>
              <Input
                id="unit_count"
                type="number"
                value={editData.unit_count}
                onChange={(e) => setEditData({ ...editData, unit_count: e.target.value })}
              />
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="monthly_rent">Monthly Rent ($)</Label>
              <Input
                id="monthly_rent"
                type="number"
                step="0.01"
                value={editData.monthly_rent}
                onChange={(e) => setEditData({ ...editData, monthly_rent: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="desired_rent">Desired Rent ($)</Label>
              <Input
                id="desired_rent"
                type="number"
                step="0.01"
                value={editData.desired_rent}
                onChange={(e) => setEditData({ ...editData, desired_rent: e.target.value })}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Under Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monthly Expenses */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="insurance_cost">Insurance ($)</Label>
              <Input
                id="insurance_cost"
                type="number"
                step="0.01"
                value={editData.insurance_cost}
                onChange={(e) => setEditData({ ...editData, insurance_cost: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="mortgage_cost">Mortgage ($)</Label>
              <Input
                id="mortgage_cost"
                type="number"
                step="0.01"
                value={editData.mortgage_cost}
                onChange={(e) => setEditData({ ...editData, mortgage_cost: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="management_fee">Management Fee ($)</Label>
              <Input
                id="management_fee"
                type="number"
                step="0.01"
                value={editData.management_fee}
                onChange={(e) => setEditData({ ...editData, management_fee: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="repair_costs">Repair Costs ($)</Label>
              <Input
                id="repair_costs"
                type="number"
                step="0.01"
                value={editData.repair_costs}
                onChange={(e) => setEditData({ ...editData, repair_costs: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Property description..."
              rows={3}
            />
          </div>

          {/* Sale Information */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="for_sale"
              checked={editData.for_sale}
              onCheckedChange={(checked) => setEditData({ ...editData, for_sale: !!checked })}
            />
            <Label htmlFor="for_sale">List for sale</Label>
          </div>

          {editData.for_sale && (
            <div>
              <Label htmlFor="sale_price">Sale Price ($)</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                value={editData.sale_price}
                onChange={(e) => setEditData({ ...editData, sale_price: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Get rent split data if available
  const rentSplit = property.rent_splits?.[0];
  const hasHAPSplit = rentSplit && rentSplit.pha_portion > 0;

  return (
    <>
      <Card 
        className="property-gallery-card group cursor-pointer"
        onClick={() => setShowDetailsModal(true)}
      >
        {/* Property Image Header */}
        {property.photos?.[0] && (
          <div className="relative h-40 overflow-hidden">
            <img 
              src={property.photos[0]} 
              alt={property.address}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute top-3 right-3">
              <Badge 
                variant={property.status === 'occupied' ? 'default' : 'secondary'}
                className={property.status === 'occupied' 
                  ? 'bg-success text-white' 
                  : 'bg-warning text-white'
                }
              >
                {property.status}
              </Badge>
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              variant="ghost"
              size="sm"
              className="absolute top-3 left-3 bg-white/90 hover:bg-white text-gray-700 h-8 w-8 p-0 rounded-lg shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground line-clamp-1">
                {property.address}
              </h3>
              <p className="text-sm text-muted-foreground">
                {property.bedrooms && property.bathrooms ? 
                  `${property.bedrooms} bed, ${property.bathrooms} bath` : 
                  `${property.unit_count} unit(s)`
                }
              </p>
            </div>
            {/* Edit button for cards without images */}
            {!property.photos?.[0] && (
              <>
                <Badge 
                  variant={property.status === 'occupied' ? 'default' : 'secondary'}
                  className={`ml-2 ${property.status === 'occupied' 
                    ? 'bg-success text-white' 
                    : 'bg-warning text-white'
                  }`}
                >
                  {property.status}
                </Badge>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground ml-2"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-0">
          {/* HAP Split Progress Bar */}
          {hasHAPSplit && (
            <HAPSplitBar
              hapPortion={rentSplit.pha_portion}
              tenantPortion={rentSplit.tenant_portion}
              totalRent={rentSplit.total_rent}
            />
          )}

          {/* Financial Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Monthly Rent</span>
              <p className="font-bold text-lg text-success">${property.monthly_rent?.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Cash Flow</span>
              <p className={`font-bold text-lg ${cashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                {cashFlow >= 0 ? '+' : '-'}${Math.abs(cashFlow).toLocaleString()}
              </p>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            {renderActionButtons()}
          </div>
        </CardContent>
      </Card>

      <LandlordPropertyDetailsModal
        property={property}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onEdit={() => {
          setShowDetailsModal(false);
          setIsEditing(true);
        }}
        onViewApplications={() => {
          setShowDetailsModal(false);
          onApplicationsClick();
        }}
        onViewMessages={() => {
          setShowDetailsModal(false);
          onApplicationsClick();
        }}
      />
    </>
  );
};

export default EditablePropertyCard;
