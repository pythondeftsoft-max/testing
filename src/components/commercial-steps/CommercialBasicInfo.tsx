import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommercialPropertyData, CommercialPropertyType, CommercialSubType } from '@/types/commercial';
import PropertyImageUpload from '@/components/PropertyImageUpload';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
import { CountrySelector } from '@/components/ui/country-selector';

interface CommercialBasicInfoProps {
  formData: CommercialPropertyData;
  updateFormData: (field: keyof CommercialPropertyData, value: any) => void;
  userId: string;
  portfolioId?: string;
}

export const CommercialBasicInfo = ({ formData, updateFormData, userId, portfolioId }: CommercialBasicInfoProps) => {
  const [newTag, setNewTag] = useState('');
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(userId);
  const showPortfolioSelector = portfolioId === "everything";

  const handleImagesChange = (images: string[]) => {
    updateFormData('images', images);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.asset_tags.includes(newTag.trim())) {
      updateFormData('asset_tags', [...formData.asset_tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormData('asset_tags', formData.asset_tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Property Images */}
      <Card>
        <CardHeader>
          <CardTitle>Property Images</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertyImageUpload
            userId={userId}
            portfolioId={portfolioId}
            images={formData.images || []}
            onImagesChange={handleImagesChange}
          />
        </CardContent>
      </Card>

      {/* Portfolio Selection - Only show when creating from "everything" view */}
      {showPortfolioSelector && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Client Portfolio *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label htmlFor="selectedPortfolio" className="text-sm">Assign to Portfolio *</Label>
              {portfoliosLoading ? (
                <div className="flex items-center space-x-2 h-9 px-3 py-2 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading portfolios...</span>
                </div>
              ) : (
                <Select 
                  value={formData.selectedPortfolio || ""} 
                  onValueChange={(value) => updateFormData('selectedPortfolio', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a client portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Select which client portfolio this property belongs to
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Address */}
      <Card>
        <CardHeader>
          <CardTitle>Property Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="country">Country</Label>
            <CountrySelector
              value={formData.country || 'US'}
              onValueChange={(value) => updateFormData('country', value)}
              placeholder="Select country"
            />
          </div>

          <div>
            <Label htmlFor="address">Street Address *</Label>
            <AddressAutocompleteInput
              value={formData.address || ''}
              countryCode={formData.country || 'US'}
              onAddressSelect={(address) => {
                updateFormData('address', address.streetAddress);
                updateFormData('city', address.city);
                updateFormData('state', address.state);
                updateFormData('zip_code', address.zipcode);
                updateFormData('latitude', address.latitude);
                updateFormData('longitude', address.longitude);
                if (address.country) {
                  updateFormData('country', address.country);
                }
              }}
              placeholder="Start typing an address..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => updateFormData('city', e.target.value)}
                placeholder="e.g., Atlanta"
                required
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state || ''}
                onChange={(e) => updateFormData('state', e.target.value)}
                placeholder="e.g., GA"
                required
              />
            </div>
            <div>
              <Label htmlFor="zip_code">ZIP Code *</Label>
              <Input
                id="zip_code"
                value={formData.zip_code || ''}
                onChange={(e) => updateFormData('zip_code', e.target.value)}
                placeholder="e.g., 30309"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Type & Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Property Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commercial_type">Commercial Type</Label>
              <Select 
                value={formData.commercial_type} 
                onValueChange={(value) => updateFormData('commercial_type', value as CommercialPropertyType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                  <SelectItem value="mixed_use">Mixed Use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="commercial_subtype">Subtype (Optional)</Label>
              <Select 
                value={formData.commercial_subtype || ''} 
                onValueChange={(value) => updateFormData('commercial_subtype', value as CommercialSubType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subtype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="motel">Motel</SelectItem>
                  <SelectItem value="golf_course">Golf Course</SelectItem>
                  <SelectItem value="marina">Marina</SelectItem>
                  <SelectItem value="prison">Prison/Correctional</SelectItem>
                  <SelectItem value="self_storage">Self Storage</SelectItem>
                  <SelectItem value="medical">Medical Office</SelectItem>
                  <SelectItem value="shopping_center">Shopping Center</SelectItem>
                  <SelectItem value="office_building">Office Building</SelectItem>
                  <SelectItem value="warehouse_distribution">Distribution Center</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="flex_space">Flex Space</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source_badge">Source</Label>
              <Select 
                value={formData.source_badge || 'manual'} 
                onValueChange={(value) => updateFormData('source_badge', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="parsed">Document Parsed</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="import">Bulk Import</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="asset_category">Asset Category</Label>
              <Select 
                value={formData.asset_category || 'real_estate'} 
                onValueChange={(value) => updateFormData('asset_category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="business_holding">Business Holding</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Asset Tags */}
          <div>
            <Label>Asset Tags</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag (e.g., high_yield, prime_location)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.asset_tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};