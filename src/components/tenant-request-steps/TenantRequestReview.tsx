
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DollarSign, Calendar, FileText, Image, Video, Home, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';

interface TenantRequestReviewProps {
  formData: {
    desiredRent: string;
    preferredMoveInDate: string;
    additionalRequirements: string;
    images: string[];
    videoTourUrl: string;
    amenities: Record<string, boolean>;
  };
  propertyAddress: string;
  unitNumber?: string;
  termsAgreed: boolean;
  onTermsAgreed: (agreed: boolean) => void;
  isAdminListing?: boolean;
  clientAgreementSigned?: boolean;
  onClientAgreementSigned?: (signed: boolean) => void;
}

export const TenantRequestReview = ({ formData, propertyAddress, unitNumber, termsAgreed, onTermsAgreed, isAdminListing = false, clientAgreementSigned = false, onClientAgreementSigned }: TenantRequestReviewProps) => {
  const { data: placementFeeConfig } = usePlacementFeeConfig();
  const placementFeePercentage = placementFeeConfig?.config_value?.percentage || 40;
  const placementFeeDecimal = placementFeePercentage / 100;
  
  const selectedAmenities = Object.entries(formData.amenities)
    .filter(([_, isSelected]) => isSelected)
    .map(([amenity]) => {
      // Convert camelCase to readable format
      return amenity.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    });

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <h3 className="text-lg font-semibold">Review Your Property Marketing</h3>
        <p className="text-sm text-gray-600">
          {unitNumber && <span className="font-bold">{unitNumber} - </span>}
          {propertyAddress}
        </p>
      </div>

      {/* Property Marketing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Rental Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">Monthly Rent:</span>
              <span className="ml-2 text-lg font-bold text-green-600">
                ${formData.desiredRent}
              </span>
            </div>
            {formData.preferredMoveInDate && (
              <div>
                <span className="font-medium">Move-in Date:</span>
                <span className="ml-2">{formData.preferredMoveInDate}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Marketing Media
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Photos:</span>
              <Badge variant="secondary">{formData.images.length} uploaded</Badge>
            </div>
            {formData.videoTourUrl && (
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-green-500" />
                <span className="font-medium">Video Tour:</span>
                <Badge variant="secondary">Added</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Images Preview */}
      {formData.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Property Images ({formData.images.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {formData.images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Property ${index + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                  {index === 0 && (
                    <Badge className="absolute -top-2 -left-2 text-xs">Main</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Tour */}
      {formData.videoTourUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Tour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded border-l-4 border-blue-500">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Video URL:</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 break-all">{formData.videoTourUrl}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amenities */}
      {selectedAmenities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Featured Amenities ({selectedAmenities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedAmenities.map((amenity, index) => (
                <Badge key={index} variant="secondary">
                  {amenity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Description */}
      {formData.additionalRequirements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Property Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-gray-700 whitespace-pre-wrap">
                {formData.additionalRequirements}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms & Conditions - REQUIRED BEFORE SUBMISSION (Landlords only) */}
      {!isAdminListing && (
        <Card className="border-amber-400 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <FileText className="h-5 w-5" />
              Terms & Conditions - Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-400 bg-amber-100">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Placement Fee Agreement</AlertTitle>
              <AlertDescription className="text-amber-800">
                <div className="space-y-2 mt-2">
                  <p className="font-semibold">
                    OpenKey charges a one-time placement fee of {placementFeePercentage}% of the first month's rent for each successful tenant placement.
                  </p>
                  <div className="bg-white/60 p-3 rounded border border-amber-300">
                    <div className="flex items-center gap-2 text-lg font-bold text-amber-900">
                      <DollarSign className="h-5 w-5" />
                      <span>Placement Fee: ${(parseFloat(formData.desiredRent || '0') * placementFeeDecimal).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1">
                      ({placementFeePercentage}% of ${formData.desiredRent || '0'}/month)
                    </p>
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>Fee is due within 3 business days of lease signing or tenant move-in</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>One-time fee per unit - no recurring charges</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>Full refund if referred tenant fails to move in for reasons outside your control</span>
                    </li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-amber-300">
              <Checkbox
                id="terms-agreement"
                checked={termsAgreed}
                onCheckedChange={(checked) => onTermsAgreed(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="terms-agreement"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I understand and agree to pay a placement fee of {placementFeePercentage}% of the first month's rent (
                <span className="font-bold text-amber-900">
                  ${(parseFloat(formData.desiredRent || '0') * placementFeeDecimal).toFixed(2)}
                </span>
                ) upon successful tenant placement. <span className="text-red-600">*</span>
              </label>
            </div>

            <p className="text-xs text-gray-600 italic">
              By checking this box, you acknowledge the placement fee terms outlined above. 
              You will review and sign the full Placement Agreement after clicking Submit.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Admin Client Agreement Verification - REQUIRED */}
      {isAdminListing && (
        <Card className="border-blue-400 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <FileText className="h-5 w-5" />
              Client Agreement Verification - Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-400 bg-blue-100">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Client Services Agreement</AlertTitle>
              <AlertDescription className="text-blue-800">
                <p className="font-semibold">
                  Before listing this property, confirm that the client has signed a contract 
                  with OpenKey agreeing to placement fee terms.
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-blue-300">
              <Checkbox
                id="client-agreement"
                checked={clientAgreementSigned}
                onCheckedChange={(checked) => onClientAgreementSigned?.(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="client-agreement"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I confirm that this client has signed a contract with OpenKey agreeing to 
                pay placement fees for this property. <span className="text-red-600">*</span>
              </label>
            </div>

            <p className="text-xs text-gray-600 italic">
              Required: This ensures proper documentation exists before listing client properties.
            </p>
          </CardContent>
        </Card>
      )}

      {/* What Happens Next */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">What happens after you submit?</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAdminListing ? (
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Your property will be listed at ${formData.desiredRent}/month</li>
              <li>• {formData.images.length} property images will be displayed to tenants</li>
              {formData.videoTourUrl && <li>• Video tour will be featured prominently</li>}
              <li>• Property description will be shown on the marketplace</li>
              <li>• Selected amenities will be highlighted to attract tenants</li>
              <li>• The property status will be updated to "available"</li>
              <li>• Qualified tenants will be able to view and apply</li>
              <li>• You'll receive notifications when tenants show interest</li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Property will be listed at ${formData.desiredRent}/month</li>
              <li>• {formData.images.length} property images will be displayed to tenants</li>
              {formData.videoTourUrl && <li>• Video tour will be featured prominently</li>}
              <li>• Property description will be shown on the marketplace</li>
              <li>• Selected amenities will be highlighted to attract tenants</li>
              <li>• The property status will be updated to "on market"</li>
              <li>• Qualified tenants will be able to view and apply</li>
              <li>• Applications will appear in Client Services application tracking</li>
              <li>• Landlord shown to tenants will be "OpenKey" (not the client)</li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
