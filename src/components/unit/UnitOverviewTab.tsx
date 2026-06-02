
import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  FileText,
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnitOverviewTabProps {
  unit: any;
  property: any;
  isEditMode?: boolean;
  editedData?: any;
  onFieldChange?: (field: string, value: any) => void;
}

export const UnitOverviewTab = ({ unit, property, isEditMode = false, editedData, onFieldChange }: UnitOverviewTabProps) => {
  const displayData = isEditMode && editedData ? editedData : unit;
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${unit.id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const currentPhotos = displayData.photos || [];
      const updatedPhotos = [...currentPhotos, ...uploadedUrls];
      
      if (onFieldChange) {
        onFieldChange('photos', updatedPhotos);
      }

      toast({
        title: "Success",
        description: `${uploadedUrls.length} photo(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const currentPhotos = displayData.photos || [];
    const updatedPhotos = currentPhotos.filter((_: string, index: number) => index !== indexToRemove);
    
    if (onFieldChange) {
      onFieldChange('photos', updatedPhotos);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
    } as const;

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const formatPropertyAddress = () => {
    const parts = [];
    
    if (property.address) parts.push(property.address);
    if (property.city) parts.push(property.city);
    if (property.state && property.zipcode) {
      parts.push(`${property.state} ${property.zipcode}`);
    } else if (property.state) {
      parts.push(property.state);
    } else if (property.zipcode) {
      parts.push(property.zipcode);
    }
    
    return parts.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Photos Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Photos ({(displayData.photos || []).length})
            </h3>
            {isEditMode && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Add Photos'}
                </Button>
              </div>
            )}
          </div>

          {(displayData.photos || []).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(displayData.photos || []).map((photo: string, index: number) => (
                <div key={index} className="relative group aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={photo}
                    alt={`Unit photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === 0 && (
                    <Badge className="absolute top-2 left-2" variant="secondary">
                      Primary
                    </Badge>
                  )}
                  {isEditMode && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No photos uploaded</p>
              {isEditMode && <p className="text-sm">Click "Add Photos" to upload images</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${displayData.monthly_rent || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                {displayData.tenant_type === 'voucher' && displayData.pha_portion && displayData.tenant_portion && (
                  <p className="text-xs text-muted-foreground">
                    HAP: ${displayData.pha_portion} + Tenant: ${displayData.tenant_portion}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Interest Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Three Column Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Unit Specs */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Unit Specs</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Status</span>
              {getStatusBadge(displayData.status || 'available')}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Unit Number</span>
              {isEditMode && onFieldChange ? (
                <Input
                  type="text"
                  value={displayData.unit_number}
                  onChange={(e) => onFieldChange('unit_number', e.target.value)}
                  className="w-32 h-8 text-right"
                />
              ) : (
                <span className="font-medium">{displayData.unit_number}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Unit Name</span>
              {isEditMode && onFieldChange ? (
                <Input
                  type="text"
                  value={displayData.unit_name || ''}
                  onChange={(e) => onFieldChange('unit_name', e.target.value)}
                  className="w-32 h-8 text-right"
                />
              ) : (
                <span className="font-medium">{displayData.unit_name || displayData.name || 'N/A'}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Bedrooms</span>
              {isEditMode && onFieldChange ? (
                <Input
                  type="number"
                  value={displayData.bedrooms || ''}
                  onChange={(e) => onFieldChange('bedrooms', parseInt(e.target.value))}
                  className="w-20 h-8 text-right"
                />
              ) : (
                <span className="font-medium">{displayData.bedrooms || 'N/A'}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Bathrooms</span>
              {isEditMode && onFieldChange ? (
                <Input
                  type="number"
                  step="0.5"
                  value={displayData.bathrooms || ''}
                  onChange={(e) => onFieldChange('bathrooms', parseFloat(e.target.value))}
                  className="w-20 h-8 text-right"
                />
              ) : (
                <span className="font-medium">{displayData.bathrooms || 'N/A'}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Square Feet</span>
              {isEditMode && onFieldChange ? (
                <Input
                  type="number"
                  value={displayData.square_feet || ''}
                  onChange={(e) => onFieldChange('square_feet', parseInt(e.target.value))}
                  className="w-24 h-8 text-right"
                />
              ) : (
                <span className="font-medium">{displayData.square_feet || 'N/A'} sq ft</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Property</span>
              <span className="font-medium text-sm">{formatPropertyAddress()}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Financials */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Financials</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Monthly Rent</span>
              {isEditMode && onFieldChange ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm">$</span>
                  <Input
                    type="number"
                    value={displayData.monthly_rent || ''}
                    onChange={(e) => onFieldChange('monthly_rent', parseFloat(e.target.value))}
                    className="w-28 h-8 text-right"
                  />
                </div>
              ) : (
                <span className="font-medium">${displayData.monthly_rent || 'N/A'}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Security Deposit</span>
              {isEditMode && onFieldChange ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm">$</span>
                  <Input
                    type="number"
                    value={displayData.security_deposit || ''}
                    onChange={(e) => onFieldChange('security_deposit', parseFloat(e.target.value))}
                    className="w-28 h-8 text-right"
                  />
                </div>
              ) : (
                <span className="font-medium">${displayData.security_deposit || 'N/A'}</span>
              )}
            </div>
            {!isEditMode && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Tenant Type</span>
                <span className="font-medium">{displayData.tenant_type || 'N/A'}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">On Market</span>
              <Badge variant={displayData.on_market ? 'default' : 'secondary'}>
                {displayData.on_market ? 'Listed' : 'Not Listed'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Column 3: Description */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Description</h4>
          {isEditMode && onFieldChange ? (
            <Textarea
              value={displayData.description || ''}
              onChange={(e) => onFieldChange('description', e.target.value)}
              placeholder="Unit description"
              rows={8}
              className="resize-none"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {displayData.description || 'No description provided'}
            </p>
          )}
        </div>
      </div>

      {/* Lease Information - Full Width Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Lease Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lease Start</span>
              <span className="font-medium">
                {displayData.lease_start_date ? new Date(displayData.lease_start_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lease End</span>
              <span className="font-medium">
                {displayData.lease_end_date ? new Date(displayData.lease_end_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available From</span>
              <span className="font-medium">
                {displayData.status === 'available' ? 'Now' : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Added</span>
              <span className="font-medium">
                {new Date(displayData.created_at || '').toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
