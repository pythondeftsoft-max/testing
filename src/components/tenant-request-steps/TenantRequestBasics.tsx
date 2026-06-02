import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PropertyImageUpload from '@/components/PropertyImageUpload';
import { Link2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface TenantRequestBasicsProps {
  formData: {
    desiredRent: string;
    preferredMoveInDate: string;
    additionalRequirements: string;
    images: string[];
    videoTourUrl: string;
  };
  updateFormData: (field: string, value: any) => void;
  propertyAddress: string;
  unitNumber?: string;
  userId: string;
  propertyId?: string;
  onScrapeUrl?: (url: string) => Promise<void>;
  scrapeStatus?: 'idle' | 'loading' | 'success' | 'error';
  scrapeError?: string;
}

export const TenantRequestBasics = ({ 
  formData, 
  updateFormData, 
  propertyAddress,
  unitNumber,
  userId,
  propertyId,
  onScrapeUrl,
  scrapeStatus = 'idle',
  scrapeError
}: TenantRequestBasicsProps) => {
  const [importUrl, setImportUrl] = useState('');
  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 -mx-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">List Property for Rent</h1>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Property Marketing & Details</h2>
        <p className="text-sm text-gray-600">
          {propertyAddress}
        </p>
      </div>

      {/* Quick Import from Listing URL */}
      {onScrapeUrl && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4" />
              Quick Import (Optional)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Paste a Zillow, Trulia, or listing URL to auto-fill property details
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
                
                {/* Auto-list notice */}
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Property will be listed on the marketplace when you submit
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

      {/* Property Images & Video Tour */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Property Media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Property Images - Compact */}
          <div>
            <PropertyImageUpload
              propertyId={propertyId}
              userId={userId}
              images={formData.images}
              onImagesChange={(images) => updateFormData('images', images)}
              skipPermissionCheck={true}
            />
          </div>

          {/* Video Tour - Compact */}
          <div>
            <Label htmlFor="videoTourUrl" className="text-sm font-medium">Video Tour (Optional)</Label>
            <Input
              id="videoTourUrl"
              type="url"
              value={formData.videoTourUrl}
              onChange={(e) => updateFormData('videoTourUrl', e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Add a link to your property video tour
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rental Details - NOW SECOND */}
      <Card>
        <CardHeader>
          <CardTitle>Rental Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="desiredRent">Desired Rent *</Label>
            <Input
              id="desiredRent"
              type="number"
              step="0.01"
              value={formData.desiredRent}
              onChange={(e) => updateFormData('desiredRent', e.target.value)}
              placeholder="e.g., 1200.00"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              This is the rent amount that will be displayed to tenants
            </p>
          </div>

          <div>
            <Label htmlFor="moveInDate">Preferred Move-in Date</Label>
            <Input
              id="moveInDate"
              type="date"
              value={formData.preferredMoveInDate}
              onChange={(e) => updateFormData('preferredMoveInDate', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Property Description</Label>
            <Textarea
              id="description"
              value={formData.additionalRequirements}
              onChange={(e) => updateFormData('additionalRequirements', e.target.value)}
              placeholder="Write an attractive description of your property that will be shown to potential tenants on the marketplace. Highlight unique features, nearby amenities, and what makes this property special..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              This description will be displayed to tenants browsing the marketplace. Make it engaging and highlight the property's best features!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
