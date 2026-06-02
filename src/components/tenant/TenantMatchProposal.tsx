import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { 
  Loader2, Home, Bed, Bath, DollarSign, MapPin, ThumbsUp, ThumbsDown, Sparkles, Clock, Maximize2, Star, Eye, ChevronLeft, ChevronRight, Camera, X, ClipboardList,
  Wind, Sofa, WashingMachine, Trees, Car, PawPrint, Utensils, Microwave, Refrigerator, Flame, TreeDeciduous, Square, Thermometer, Dumbbell, Waves, Shield, Wifi, Warehouse, ArrowUpDown, Accessibility, Check,
  Search, Globe
} from 'lucide-react';
import { useTenantPendingMatch, useTenantRespondToMatch, MatchProposalWithDetails } from '@/hooks/useMatchProposals';
import { useAuth } from '@/hooks/useAuth';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { LISTING_AMENITIES } from '@/constants/listingAmenities';

// Amenity icon mapping (consistent with PropertyAmenitiesBadges)
const amenityIcons: Record<string, React.ElementType> = {
  airConditioning: Wind, air_conditioning: Wind, 'Air Conditioning': Wind,
  furnished: Sofa, Furnished: Sofa,
  inUnitLaundry: WashingMachine, in_unit_laundry: WashingMachine, 'In-Unit Laundry': WashingMachine,
  sharedLaundry: WashingMachine, 'Shared Laundry': WashingMachine,
  laundryHookups: WashingMachine, 'Laundry Hookups': WashingMachine,
  balconyPatio: TreeDeciduous, 'Balcony/Patio': TreeDeciduous,
  yardGarden: Trees, yard_garden: Trees, 'Yard/Garden': Trees,
  parkingAvailable: Car, parking_available: Car, parking: Car, 'Parking Available': Car,
  petFriendly: PawPrint, pet_friendly: PawPrint, 'Pet Friendly': PawPrint, 'Pet-Friendly': PawPrint,
  dishwasher: Utensils, Dishwasher: Utensils,
  microwave: Microwave, Microwave: Microwave,
  refrigerator: Refrigerator, Refrigerator: Refrigerator,
  stoveOven: Flame, stove_oven: Flame, 'Stove/Oven': Flame,
  hardwoodFloors: Square, 'Hardwood Floors': Square,
  carpet: Square, Carpet: Square,
  tileFloors: Square, 'Tile Floors': Square,
  centralHeating: Thermometer, 'Central Heating': Thermometer,
  fireplace: Flame, Fireplace: Flame,
  walkinClosets: Warehouse, 'Walk-in Closets': Warehouse,
  storageUnit: Warehouse, storage_unit: Warehouse, 'Storage Unit': Warehouse,
  gymFitness: Dumbbell, 'Gym/Fitness Center': Dumbbell,
  pool: Waves, Pool: Waves,
  securitySystem: Shield, 'Security System': Shield,
  highSpeedInternet: Wifi, 'High Speed Internet': Wifi,
  garage: Warehouse, Garage: Warehouse,
  elevator: ArrowUpDown, Elevator: ArrowUpDown,
  wheelchairAccessible: Accessibility, 'Wheelchair Accessible': Accessibility,
};

// Get display label for amenity
const getAmenityLabel = (amenity: string): string => {
  const found = LISTING_AMENITIES.find(a => a.key === amenity);
  return found ? found.label : amenity;
};

// Get icon component for amenity
const getAmenityIcon = (amenity: string): React.ElementType => {
  return amenityIcons[amenity] || amenityIcons[getAmenityLabel(amenity)] || Check;
};
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';
import { supabase } from '@/integrations/supabase/client';
import { transformPropertiesToListings } from '@/utils/marketplaceListings';
import { toast } from 'sonner';

// Helper to get all photos (unit photos take priority, then property photos)
const getAllPhotos = (match: MatchProposalWithDetails): string[] => {
  const unitPhotos = match.property_units?.unit_photos || match.property_units?.photos || [];
  const propertyPhotos = match.property_units?.properties?.photos || [];
  
  // Combine and dedupe
  const allPhotos = [...unitPhotos, ...propertyPhotos];
  return [...new Set(allPhotos)];
};

// Helper to get square feet (unit takes priority)
const getSquareFeet = (match: MatchProposalWithDetails): number | null => {
  return match.property_units?.unit_square_feet 
    || match.property_units?.square_feet 
    || match.property_units?.properties?.square_feet 
    || null;
};

// Helper to get description (unit takes priority)
const getDescription = (match: MatchProposalWithDetails): string | null => {
  return match.property_units?.description 
    || match.property_units?.properties?.description 
    || null;
};

// Helper to get amenities (unit_amenities is string[], amenities is string - need to parse/combine)
const getAmenities = (match: MatchProposalWithDetails): string[] => {
  const unitAmenities = match.property_units?.unit_amenities || [];
  const amenitiesStr = match.property_units?.amenities || '';
  
  // Get property-level amenities (this is where most amenities are stored)
  const propertyAmenities = match.property_units?.properties?.amenities || [];
  
  let parsedAmenities: string[] = [];
  if (amenitiesStr) {
    if (amenitiesStr.trim().startsWith('[')) {
      try {
        parsedAmenities = JSON.parse(amenitiesStr);
      } catch {
        parsedAmenities = amenitiesStr.split(',').map(a => a.trim()).filter(Boolean);
      }
    } else {
      parsedAmenities = amenitiesStr.split(',').map(a => a.trim()).filter(Boolean);
    }
  }
  
  const cleanedAmenities = parsedAmenities.map(a => 
    String(a).replace(/[\[\]"]/g, '').trim()
  ).filter(Boolean);
  
  // Combine ALL amenity sources: unit, parsed string, AND property-level
  const allAmenities = [...unitAmenities, ...cleanedAmenities, ...propertyAmenities];
  
  // Dedupe by normalized key (lowercase, no spaces/dashes/underscores/slashes)
  const seen = new Map<string, string>();
  allAmenities.forEach(amenity => {
    const normalizedKey = amenity.toLowerCase().replace(/[\s\-_\/]/g, '');
    if (!seen.has(normalizedKey)) {
      seen.set(normalizedKey, amenity);
    }
  });
  
  const uniqueAmenities = Array.from(seen.values());
  
  // Add "Pet Friendly" if pet policy allows pets
  const petPolicy = match.property_units?.properties?.pet_policy;
  if (petPolicy && petPolicy !== 'no_pets') {
    uniqueAmenities.push('Pet Friendly');
  }
  
  return uniqueAmenities;
};


interface TenantMatchProposalProps {
  onRequestProfileCompletion?: () => void;
}

const TenantMatchProposal: React.FC<TenantMatchProposalProps> = ({ onRequestProfileCompletion }) => {
  const { user } = useAuth();
  const { data: pendingMatch, isLoading } = useTenantPendingMatch(user?.id);
  const respondToMatch = useTenantRespondToMatch();
  const queryClient = useQueryClient();
  const { isComplete: isProfileComplete, isLoading: isProfileLoading } = useProfileCompletion(user?.id);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [isOptingIn, setIsOptingIn] = useState(false);
  
  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // Property details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [fullPropertyForModal, setFullPropertyForModal] = useState<any | null>(null);
  const [isLoadingPropertyDetails, setIsLoadingPropertyDetails] = useState(false);

  // Fetch tenant profile to check intent and country
  const { data: tenantProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['tenant-profile-intent', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('tenant_profiles')
        .select('tenant_intent, country_code')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.error('Error fetching tenant profile intent:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const isRentTracker = tenantProfile?.tenant_intent === 'rent_tracker';
  const isUSUser = !tenantProfile?.country_code || tenantProfile.country_code === 'US';

  const handleOptInToHousing = async () => {
    if (!user?.id) return;
    setIsOptingIn(true);
    try {
      const { error } = await supabase
        .from('tenant_profiles')
        .update({
          tenant_intent: 'housing_seeker',
          has_eviction: null,
          has_felonies: null,
          has_pets: null,
          has_accessibility_needs: null,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      
      // Invalidate queries so profile completion kicks in
      queryClient.invalidateQueries({ queryKey: ['tenant-profile-intent', user.id] });
      queryClient.invalidateQueries({ queryKey: ['profile-completion', user.id] });
      toast.success("Great! Let's complete your housing profile to start matching.");
    } catch (error) {
      console.error('Error updating tenant intent:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsOptingIn(false);
    }
  };
  
  // Image navigation handlers
  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const photos = pendingMatch ? getAllPhotos(pendingMatch) : [];
    setSelectedImageIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const photos = pendingMatch ? getAllPhotos(pendingMatch) : [];
    setSelectedImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Check if tenant already expressed interest (waiting for landlord)
  const isWaitingForLandlord = pendingMatch?.status === 'tenant_interested';
  const isPrimaryApplicant = pendingMatch?.status === 'primary_applicant';

  if (isLoading || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const property = pendingMatch?.property_units?.properties;
  const unit = pendingMatch?.property_units;

  // Get derived listing data
  const photos = pendingMatch ? getAllPhotos(pendingMatch) : [];
  const squareFeet = pendingMatch ? getSquareFeet(pendingMatch) : null;
  const description = pendingMatch ? getDescription(pendingMatch) : null;
  const amenities = pendingMatch ? getAmenities(pendingMatch) : null;
  const videoTourUrl = pendingMatch?.property_units?.video_tour_url;

  const handleRespond = async (interested: boolean) => {
    if (!pendingMatch) return;

    await respondToMatch.mutateAsync({
      proposalId: pendingMatch.id,
      interested
    });

    setShowDeclineConfirm(false);
  };

  // Fetch full property details for the modal
  const handleViewFullProperty = async () => {
    if (!pendingMatch?.property_units?.properties?.id) return;
    
    setIsLoadingPropertyDetails(true);
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
            unit_photos,
            on_market
          )
        `)
        .eq('id', pendingMatch.property_units.properties.id)
        .single();
        
      if (error) throw error;
      
      // Use the same transformation as the marketplace
      const transformedListings = transformPropertiesToListings([data]);
      const listing = transformedListings[0];
      
      if (!listing) {
        throw new Error('No listing generated from property');
      }
      
      setFullPropertyForModal(listing);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching property details:', error);
      toast.error('Failed to load property details');
    } finally {
      setIsLoadingPropertyDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Pending Match */}
      {pendingMatch ? (
        <Card className="border-primary/20 shadow-lg overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                Property Match Found
              </Badge>
            </div>
            <CardTitle className="text-2xl">We Found a Property for You!</CardTitle>
            <CardDescription>
              Our team has matched you with this property. Review the details and let us know if you're interested.
            </CardDescription>
          </CardHeader>

          {/* Property Image Gallery - Matching Admin Style */}
          {photos.length > 0 ? (
            <div className="space-y-2 px-6">
              <div className="relative group">
                <img
                  src={photos[selectedImageIndex] || photos[0]}
                  alt="Property"
                  className="w-full h-[28rem] object-cover rounded-xl cursor-pointer"
                  onClick={() => setShowImageGallery(true)}
                />
                
                {/* Image Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-10 h-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={handlePrevImage}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-10 h-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={handleNextImage}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    
                    {/* Image Indicator Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {photos.slice(0, 10).map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                      {photos.length > 10 && (
                        <span className="text-white text-xs ml-1">+{photos.length - 10}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Property ${index + 1}`}
                      className={`w-16 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0 transition-all ${
                        selectedImageIndex === index ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/50'
                      }`}
                      onClick={() => setSelectedImageIndex(index)}
                    />
                  ))}
                  <div
                    className="w-16 h-16 bg-black/70 rounded-lg cursor-pointer flex-shrink-0 flex flex-col items-center justify-center text-white hover:bg-black/80 transition-all"
                    onClick={() => setShowImageGallery(true)}
                  >
                    <Camera className="h-4 w-4 mb-1" />
                    <span className="text-xs">View All</span>
                    <span className="text-xs">({photos.length})</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-6 bg-muted/50 h-80 rounded-xl flex items-center justify-center border border-border">
              <div className="text-center text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No images available</p>
              </div>
            </div>
          )}

          <CardContent className="space-y-6 pt-6">
            {/* Property Address - Below Images */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg">
                  {property?.street_address || property?.address || 'Property Address'}
                </h4>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {[property?.city, property?.state].filter(Boolean).join(', ')}
                    {property?.zipcode ? ` ${property.zipcode}` : ''}
                  </span>
                </div>
                {unit?.unit_name && (
                  <Badge variant="outline" className="mt-2">
                    {unit.unit_name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Prominent Price Display */}
            <div className="text-3xl font-bold text-foreground">
              ${unit?.monthly_rent?.toLocaleString()}/month
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{unit?.bedrooms} Bed{unit?.bedrooms !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{unit?.bathrooms} Bath{unit?.bathrooms !== 1 ? 's' : ''}</span>
              </div>
              {squareFeet && (
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{squareFeet.toLocaleString()} sqft</span>
                </div>
              )}
            </div>

            {/* Description */}
            {description && (
              <div className="space-y-2">
                <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Description</h5>
                <p className="text-sm leading-relaxed">{description}</p>
              </div>
            )}

            {/* Amenities - Grid Layout */}
            {amenities && amenities.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Amenities</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {amenities.map((amenity, index) => {
                    const IconComponent = getAmenityIcon(amenity);
                    const label = getAmenityLabel(amenity);
                    return (
                      <div key={index} className="flex items-center p-3 bg-muted/50 rounded-lg">
                        <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="ml-3 text-sm">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}



            {/* Admin Notes if any */}
            {pendingMatch.admin_notes && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note from our team:</strong> {pendingMatch.admin_notes}
                </p>
              </div>
            )}


            {/* Action Buttons or Waiting Status */}
            {isPrimaryApplicant ? (
              <div className="flex flex-col items-center justify-center py-4 bg-green-50 dark:bg-green-950/30 rounded-lg text-center gap-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 px-4 py-2">
                  <Star className="h-4 w-4 mr-2" />
                  You're the Primary Applicant!
                </Badge>
                <p className="text-sm text-muted-foreground">
                  The landlord has selected you. Await next steps regarding the lease.
                </p>
              </div>
            ) : isWaitingForLandlord ? (
              <div className="flex items-center justify-center py-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 px-4 py-2">
                  <Clock className="h-4 w-4 mr-2" />
                  Waiting for landlord response
                </Badge>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                {showDeclineConfirm ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeclineConfirm(false)}
                      disabled={respondToMatch.isPending}
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleRespond(false)}
                      disabled={respondToMatch.isPending}
                    >
                      {respondToMatch.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 mr-2" />
                      )}
                      Confirm Decline
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeclineConfirm(true)}
                      disabled={respondToMatch.isPending}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Not Interested
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleRespond(true)}
                      disabled={respondToMatch.isPending}
                    >
                      {respondToMatch.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 mr-2" />
                      )}
                      I'm Interested
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : isRentTracker ? (
        // Rent tracker users see opt-in card instead of generic empty state
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            {isUSUser ? (
              <>
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Want Help Finding Housing?</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  You signed up to track rent, but we can also match you with voucher-friendly properties in your area. 
                  Opt in and we'll start looking for your perfect home.
                </p>
                <Button
                  onClick={handleOptInToHousing}
                  disabled={isOptingIn}
                  size="lg"
                >
                  {isOptingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Home className="h-4 w-4 mr-2" />
                  )}
                  I'm Interested in Finding Housing
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Property Matching Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  Our housing match service is currently available in the United States only. 
                  We're working on expanding to more countries — stay tuned!
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : !isProfileComplete ? (
        <Card className="border-dashed border-warning/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-warning/10 p-4 mb-4">
              <ClipboardList className="h-8 w-8 text-warning" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Complete Your Housing Profile</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              You're almost there! Complete your profile so we can start matching you with properties.
            </p>
            <Button
              variant="gradient"
              onClick={() => {
                onRequestProfileCompletion?.();
              }}
            >
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">We're Finding Your Perfect Home</h3>
            <p className="text-muted-foreground max-w-md">
              Our team is actively working to match you with the ideal property. 
              You'll be notified as soon as we find a great fit for you.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Property Details Modal */}
      {fullPropertyForModal && (
        <PropertyDetailsModalEnhanced
          property={fullPropertyForModal}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setFullPropertyForModal(null);
          }}
          onInterestClick={() => {}}
          isSubmittingInterest={false}
          hasApplied={false}
          hideBuildingUnits={true}
        />
      )}

      {/* Full-Screen Image Gallery Modal */}
      {showImageGallery && photos.length > 0 && (
        <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
          <DialogPortal>
            <DialogOverlay className="bg-black/95" />
            <DialogPrimitive.Content 
              className="fixed inset-0 z-50 flex flex-col items-center justify-center"
              aria-describedby={undefined}
            >
              <DialogPrimitive.Title className="sr-only">Property Photo Gallery</DialogPrimitive.Title>
              
              {/* Close button */}
              <button 
                onClick={() => setShowImageGallery(false)}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black/90 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              
              {/* Main Image Container */}
              <div className="relative w-[95vw] h-[80vh] flex items-center justify-center">
                <img
                  src={photos[selectedImageIndex]}
                  alt={`Property photo ${selectedImageIndex + 1} of ${photos.length}`}
                  className="max-w-full max-h-full object-contain"
                />
                
                {/* Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 text-white hover:bg-black/90 rounded-full w-12 h-12 p-0"
                      onClick={handlePrevImage}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 text-white hover:bg-black/90 rounded-full w-12 h-12 p-0"
                      onClick={handleNextImage}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
                
                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                  {selectedImageIndex + 1} / {photos.length}
                </div>
              </div>
              
              {/* Thumbnail Strip */}
              <div className="flex gap-2 p-3 overflow-x-auto bg-muted/90 rounded-lg mt-4 max-w-[95vw]">
                {photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Thumbnail ${index + 1}`}
                    className={`w-14 h-14 object-cover rounded-lg cursor-pointer flex-shrink-0 transition-all ${
                      selectedImageIndex === index 
                        ? 'ring-2 ring-primary' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  />
                ))}
              </div>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      )}
    </div>
  );
};

export default TenantMatchProposal;
