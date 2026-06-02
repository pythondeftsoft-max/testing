import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Home, 
  DollarSign, 
  Bed, 
  Bath, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  CreditCard,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';
import { useQueryClient } from '@tanstack/react-query';

interface Property {
  id: string;
  type?: 'unit' | 'property';
  parentPropertyId?: string;
  street_address?: string;
  address: string;
  monthly_rent?: number;
  desired_rent?: number;
  bedrooms: number;
  bathrooms: number;
  photos?: string[];
  owner_id: string;
  city?: string;
  state?: string;
  zipcode?: string;
}

interface QuickApplicationConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  unitId?: string | null;
  onSuccess: () => void;
}

const QuickApplicationConfirmDialog = ({
  isOpen,
  onClose,
  property,
  unitId,
  onSuccess
}: QuickApplicationConfirmDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { mutate: logEvent } = useMarketplaceEvents();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      loadProfileData();
    }
  }, [isOpen, property.id, unitId]);

  const loadProfileData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to apply');
        setIsLoading(false);
        return;
      }

      // Fetch profile and tenant profile data
      // For multi-unit properties, property.id is actually the unit ID, so use parentPropertyId
      const actualPropertyId = property.parentPropertyId || property.id;
      const actualUnitId = property.type === 'unit' ? property.id : (unitId || null);
      
      // Check for existing application with proper null handling
      let existingAppQuery = supabase
        .from('marketplace_applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_id', actualPropertyId)
        .eq('status', 'submitted');

      // Handle unit_id properly - use .is() for null, .eq() for values
      if (actualUnitId) {
        existingAppQuery = existingAppQuery.eq('unit_id', actualUnitId);
      } else {
        existingAppQuery = existingAppQuery.is('unit_id', null);
      }

      const [profileRes, tenantProfileRes, existingAppRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('tenant_profiles').select('*').eq('user_id', user.id).single(),
        existingAppQuery.maybeSingle()
      ]);

      if (profileRes.error) throw profileRes.error;
      if (tenantProfileRes.error) {
        setError('Please complete your tenant profile before applying');
        setIsLoading(false);
        return;
      }

      setProfileData(profileRes.data);
      setTenantProfile(tenantProfileRes.data);
      setHasExistingApplication(!!existingAppRes.data);
      
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setError(error.message || 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (hasExistingApplication) {
      toast({
        title: "Already Applied",
        description: "You have already submitted an application for this property.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // For multi-unit properties, property.id is actually the unit ID, so use parentPropertyId
    const actualPropertyId = property.parentPropertyId || property.id;
    const actualUnitId = property.type === 'unit' ? property.id : (unitId || null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create profile snapshot with all tenant data
      const profileSnapshot = {
        // Basic Info (from profiles table)
        first_name: profileData?.first_name,
        last_name: profileData?.last_name,
        phone: profileData?.phone,
        email: user.email,
        
        // Contact Details (from tenant_profiles)
        phone_type: tenantProfile?.phone_type,
        city: tenantProfile?.city,
        zip_code: tenantProfile?.zip_code,
        
        // Financial Info
        monthly_income: tenantProfile?.monthly_income,
        employment_status: tenantProfile?.employment_status,
        rent_range_min: tenantProfile?.rent_range_min,
        rent_range_max: tenantProfile?.rent_range_max,
        
        // Credit & Screening
        credit_score: tenantProfile?.credit_score,
        credit_score_range: tenantProfile?.credit_score_range,
        
        // Housing Voucher Info
        voucher_holder: tenantProfile?.voucher_holder,
        voucher_status: tenantProfile?.voucher_status,
        voucher_amount: tenantProfile?.voucher_amount,
        housing_authority: tenantProfile?.housing_authority,
        bedrooms_approved: tenantProfile?.bedrooms_approved,
        
        // Timeline
        move_in_window: tenantProfile?.move_in_window,
        preferred_move_date: tenantProfile?.preferred_move_date,
        
        // Screening History
        has_eviction: tenantProfile?.has_eviction,
        eviction_details: tenantProfile?.eviction_details,
        has_felonies: tenantProfile?.has_felonies,
        felony_details: tenantProfile?.felony_details,
        
        // Pet Info
        has_pets: tenantProfile?.has_pets,
        pet_type: tenantProfile?.pet_type,
        
        // Accessibility
        has_accessibility_needs: tenantProfile?.has_accessibility_needs,
        accessibility_details: tenantProfile?.accessibility_details,
        
        // References
        reference_contacts: tenantProfile?.reference_contacts
      };

      // Submit application
      const { data: application, error: insertError } = await supabase
        .from('marketplace_applications')
        .insert({
          user_id: user.id,
          property_id: actualPropertyId,
          unit_id: actualUnitId,
          status: 'submitted',
          contact_name: `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim(),
          contact_email: user.email,
          contact_phone: profileData?.phone,
          answers: {
            appliedAt: new Date().toISOString(),
            source: 'quick_apply',
            applicationMethod: 'one_click'
          },
          profile_snapshot: profileSnapshot
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create notification for landlord
      const propertyAddress = property.street_address || property.address;
      await supabase
        .from('notifications')
        .insert({
          user_id: property.owner_id,
          title: 'New Application Received',
          description: `${profileData?.first_name || 'A tenant'} ${profileData?.last_name || ''} has applied for ${propertyAddress}`,
          type: 'application',
          link: `/dashboard?tab=applications&applicationId=${application.id}`
        });

      // Log event
      logEvent({
        eventType: 'application_submitted',
        metadata: {
          property_id: actualPropertyId,
          unit_id: actualUnitId,
          application_method: 'quick_apply',
          has_voucher: tenantProfile?.voucher_holder || false,
          monthly_income: tenantProfile?.monthly_income || null
        }
      });

      toast({
        title: "Application Submitted! 🎉",
        description: "Your application has been sent to the landlord. They will review it shortly.",
      });

      // Invalidate tenant applications query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['tenant-applications'] });

      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRent = property.desired_rent || property.monthly_rent || 0;
  const propertyImage = property.photos?.[0];

  const getCreditScoreColor = (score: number) => {
    if (score >= 700) return 'text-green-600';
    if (score >= 650) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCreditScoreLabel = (score: number) => {
    if (score >= 700) return 'Excellent';
    if (score >= 650) return 'Good';
    return 'Fair';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Confirm Your Application</DialogTitle>
          <DialogDescription>
            Review your information before submitting your application
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : hasExistingApplication ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              You have already submitted an application for this property. Check your Applications tab to see the status.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Property Summary */}
            <div className="rounded-lg border overflow-hidden">
              {propertyImage && (
                <img 
                  src={propertyImage} 
                  alt="Property" 
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {property.street_address || property.address}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {property.city}, {property.state} {property.zipcode}
                    </p>
                  </div>
                  <Badge variant="default" className="text-lg px-3 py-1">
                    ${displayRent.toLocaleString()}/mo
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Your Profile Summary */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Profile Information
              </h3>
              
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{profileData?.first_name} {profileData?.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{profileData?.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{profileData?.phone} ({tenantProfile?.phone_type || 'mobile'})</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{tenantProfile?.city}, {tenantProfile?.zip_code}</p>
                </div>
              </div>

              <Separator />

              {/* Financial Info */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div>
                  <p className="text-sm text-muted-foreground">Yearly Income</p>
                  <p className="font-semibold text-lg">${tenantProfile?.monthly_income?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employment</p>
                  <p className="font-medium capitalize">{tenantProfile?.employment_status?.replace('_', ' ') || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget Range</p>
                  <p className="font-medium">${tenantProfile?.rent_range_min} - ${tenantProfile?.rent_range_max}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credit Score</p>
                  <p className={`font-semibold ${tenantProfile?.credit_score ? getCreditScoreColor(tenantProfile.credit_score) : ''}`}>
                    {tenantProfile?.credit_score || tenantProfile?.credit_score_range || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Voucher Section */}
              {tenantProfile?.voucher_holder && (
                <>
                  <Separator />
                  <div className="bg-blue-50 p-3 rounded-md my-4">
                    <p className="font-semibold mb-2 flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      Section 8 Voucher Information
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span> {tenantProfile.voucher_status}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount:</span> ${tenantProfile.voucher_amount}/mo
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Authority:</span> {tenantProfile.housing_authority}
                      </div>
                      {tenantProfile.bedrooms_approved?.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Approved Bedrooms:</span> {tenantProfile.bedrooms_approved.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Additional Info */}
              <div className="text-sm space-y-2 my-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Move-in Timeline:</span>
                  <span className="font-medium">{tenantProfile?.move_in_window || 'ASAP'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pets:</span>
                  <span className="font-medium">
                    {tenantProfile?.has_pets ? `Yes (${tenantProfile.pet_type})` : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Eviction History:</span>
                  <span className={`font-medium ${tenantProfile?.has_eviction ? 'text-red-600' : 'text-green-600'}`}>
                    {tenantProfile?.has_eviction ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Felonies:</span>
                  <span className={`font-medium ${tenantProfile?.has_felonies ? 'text-red-600' : 'text-green-600'}`}>
                    {tenantProfile?.has_felonies ? 'Yes' : 'No'}
                  </span>
                </div>
                {tenantProfile?.has_accessibility_needs && (
                  <div className="bg-blue-50 p-2 rounded mt-2">
                    <span className="text-muted-foreground font-medium">Accessibility Needs:</span>
                    <p className="text-xs mt-1">{tenantProfile.accessibility_details}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* What Happens Next */}
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens next:</strong> Your complete profile information will be sent to the landlord. 
                They will review your application and contact you directly if they're interested.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitApplication}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm & Apply
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickApplicationConfirmDialog;
