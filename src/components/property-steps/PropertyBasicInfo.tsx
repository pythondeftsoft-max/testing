import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import PropertyImageUpload from '@/components/PropertyImageUpload';
import { Loader2, MapPin, Link2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
import { CountrySelector } from '@/components/ui/country-selector';

interface PropertyBasicInfoProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  userId: string;
  portfolioId?: string;
  propertyId?: string;
  onManualGeocode?: () => void;
  isGeocoding?: boolean;
  onScrapeUrl?: (url: string) => Promise<void>;
  scrapeStatus?: 'idle' | 'loading' | 'success' | 'error';
  scrapeError?: string;
  autoListOnSubmit?: boolean;
  onAutoListChange?: (autoList: boolean) => void;
}

export const PropertyBasicInfo = ({ 
  formData, 
  updateFormData, 
  userId, 
  portfolioId, 
  propertyId,
  onManualGeocode,
  isGeocoding = false,
  onScrapeUrl,
  scrapeStatus = 'idle',
  scrapeError,
  autoListOnSubmit = false,
  onAutoListChange
}: PropertyBasicInfoProps) => {
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(userId);
  const showPortfolioSelector = portfolioId === "everything";
  const [importUrl, setImportUrl] = useState('');

  const handleImagesChange = (images: string[]) => {
    updateFormData('images', images);
  };

  return (
    <div className="space-y-6">
      {/* Quick Import Section */}
      {onScrapeUrl && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4" />
              Quick Import (Optional)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Paste a Zillow, Trulia, or listing URL to auto-fill property details. 
              When submitted, the property will be automatically listed on the marketplace.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md mb-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Best for single-family homes.</strong> For multi-unit buildings, 
                skip this and add the property manually, then set up individual units in the Units step.
              </span>
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.zillow.com/... or https://www.trulia.com/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="flex-1"
                disabled={scrapeStatus === 'loading'}
              />
              <Button 
                onClick={() => onScrapeUrl(importUrl)}
                disabled={!importUrl.trim() || scrapeStatus === 'loading'}
                variant="secondary"
                type="button"
              >
                {scrapeStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Import'
                )}
              </Button>
            </div>
            
            {scrapeStatus === 'loading' && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching listing details... This may take 30-60 seconds.
              </div>
            )}
            
            {scrapeStatus === 'success' && (
              <>
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Details imported! Review and edit below.
                </div>
                
                {/* Auto-list notice with toggle */}
                <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                  <Checkbox 
                    id="autoList"
                    checked={autoListOnSubmit}
                    onCheckedChange={(checked) => onAutoListChange?.(!!checked)}
                  />
                  <Label htmlFor="autoList" className="text-sm text-blue-800 cursor-pointer">
                    Auto-list on marketplace when submitted
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Property will be visible to tenants immediately after creation
                </p>
              </>
            )}
            
            {scrapeStatus === 'error' && scrapeError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {scrapeError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Property Images */}
      <Card>
        <CardHeader>
          <CardTitle>Property Images</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertyImageUpload
            propertyId={propertyId}
            userId={userId}
            images={formData.images || []}
            onImagesChange={handleImagesChange}
            portfolioId={portfolioId}
          />
        </CardContent>
      </Card>

      {/* Portfolio Selection - Only show when creating from "everything" view - Compact version */}
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
                  onValueChange={(value) => {
                    updateFormData('selectedPortfolio', value);
                    updateFormData('portfolioId', value);
                  }}
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

      {/* Address Section */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
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
            <Label htmlFor="streetAddress">Street Address *</Label>
            <AddressAutocompleteInput
              value={formData.streetAddress}
              countryCode={formData.country || 'US'}
              onAddressSelect={(address) => {
                updateFormData('streetAddress', address.streetAddress);
                updateFormData('city', address.city);
                updateFormData('state', address.state);
                updateFormData('zipcode', address.zipcode);
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
                value={formData.city}
                onChange={(e) => updateFormData('city', e.target.value)}
                placeholder="City"
                required
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => updateFormData('state', e.target.value)}
                placeholder="State"
                required
              />
            </div>
            <div>
              <Label htmlFor="zipcode">Zip Code *</Label>
              <Input
                id="zipcode"
                value={formData.zipcode}
                onChange={(e) => updateFormData('zipcode', e.target.value)}
                placeholder="12345"
                required
              />
            </div>
          </div>

          {/* Re-geocode button - only show when editing */}
          {onManualGeocode && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onManualGeocode}
                disabled={isGeocoding || !formData.streetAddress || !formData.city || !formData.state || !formData.zipcode}
                className="w-full sm:w-auto"
              >
                {isGeocoding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Geocoding...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Update Map Location
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Click to refresh the property's coordinates for map display
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Details - More Compact */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="bedrooms" className="text-sm">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => updateFormData('bedrooms', e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="bathrooms" className="text-sm">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => updateFormData('bathrooms', e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="propertyType" className="text-sm">Property Type</Label>
              <Select 
                value={formData.propertyType} 
                onValueChange={(value) => updateFormData('propertyType', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="squareFeet" className="text-sm">Square Feet</Label>
              <Input
                id="squareFeet"
                type="number"
                value={formData.squareFeet}
                onChange={(e) => updateFormData('squareFeet', e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="yearBuilt" className="text-sm">Year Built</Label>
              <Input
                id="yearBuilt"
                type="number"
                value={formData.yearBuilt}
                onChange={(e) => updateFormData('yearBuilt', e.target.value)}
                placeholder="2020"
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
