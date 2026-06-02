import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, MapPin, DollarSign, Calendar, Bed, Bath, User, Eye, Loader2 } from 'lucide-react';
import { Match } from '@/hooks/useQuickMatch';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';

interface PropertyDetailsDialogProps {
  property: Match['property'] | null;
  tenant?: Match['tenant'];
  matchScore?: number;
  isOpen: boolean;
  onClose: () => void;
  onCreateApplication?: () => void;
}

export const PropertyDetailsDialog: React.FC<PropertyDetailsDialogProps> = ({
  property,
  tenant,
  matchScore,
  isOpen,
  onClose,
  onCreateApplication,
}) => {
  const { toast } = useToast();
  const [fullProperty, setFullProperty] = useState<any | null>(null);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);

  if (!property) return null;

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
          unit_amenities
        )
      `)
      .eq('id', propertyId)
      .single();
      
    if (error) throw error;
    return data;
  };

  const handleViewListing = async () => {
    if (!property?.id) return;
    
    setIsLoadingProperty(true);
    try {
      const fullPropertyData = await fetchFullProperty(property.id);
      setFullProperty(fullPropertyData);
      setShowMarketplaceModal(true);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast({
        title: "Error",
        description: "Failed to load property details",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProperty(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    if (score >= 50) return 'text-orange-500';
    return 'text-destructive';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Property Details
            </DialogTitle>
            <DialogDescription>
              Complete information for this property listing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Match Score - if available */}
            {matchScore !== undefined && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Match Score with Tenant</span>
                  <span className={`text-2xl font-bold ${getScoreColor(matchScore)}`}>
                    {matchScore}%
                  </span>
                </div>
              </div>
            )}

            {/* Address & Location */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Address
              </h3>
              <p className="text-lg">{property.address}</p>
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Bed className="w-4 h-4" />
                  Bedrooms
                </div>
                <p className="text-lg font-semibold">{property.bedrooms || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Bath className="w-4 h-4" />
                  Bathrooms
                </div>
                <p className="text-lg font-semibold">{property.bathrooms || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <DollarSign className="w-4 h-4" />
                  Monthly Rent
                </div>
                <p className="text-lg font-semibold text-success">
                  {formatCurrency(property.monthly_rent)}
                </p>
              </div>
            </div>

            {/* Status & Availability */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Availability
              </h3>
              <div className="flex items-center gap-4">
                <Badge variant={property.status === 'available' ? 'success' : 'secondary'}>
                  {property.status || 'Unknown'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Available: {property.available_date ? formatDate(property.available_date) : 'Now'}
                </span>
              </div>
            </div>

            {/* Owner Info */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Owner Information
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                ID: {property.owner_id?.substring(0, 24) || 'Unknown'}...
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button 
                variant="default" 
                onClick={handleViewListing}
                disabled={isLoadingProperty}
                className="flex-1"
              >
                {isLoadingProperty ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Listing
                  </>
                )}
              </Button>
              {onCreateApplication && (
                <Button onClick={onCreateApplication} className="flex-1">
                  Create Application
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Marketplace Modal */}
      {fullProperty && (
        <PropertyDetailsModalEnhanced
          property={fullProperty}
          isOpen={showMarketplaceModal}
          onClose={() => setShowMarketplaceModal(false)}
          onInterestClick={() => {}}
          isSubmittingInterest={false}
          hasApplied={false}
          hideBuildingUnits={true}
        />
      )}
    </>
  );
};
