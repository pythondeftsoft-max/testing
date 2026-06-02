import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bed, Bath, DollarSign, Home, Square, User, Mail, Phone, Briefcase, CreditCard, Ticket, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PropertyUnit {
  id: string;
  unit_number: string;
  unit_name: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  status: string;
  square_feet: number;
  description: string;
  unit_amenities: string[];
  property_id: string;
}

interface UnitApplicationModalProps {
  unit: PropertyUnit | null;
  propertyAddress: string;
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onApplicationSubmitted: () => void;
}

const UnitApplicationModal = ({
  unit,
  propertyAddress,
  isOpen,
  onClose,
  tenantId,
  onApplicationSubmitted,
}: UnitApplicationModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const { toast } = useToast();

  if (!unit) return null;

  // Load tenant profile data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTenantProfile();
    }
  }, [isOpen, tenantId]);

  const loadTenantProfile = async () => {
    setIsLoading(true);
    try {
      const [profileRes, tenantProfileRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', tenantId).single(),
        supabase.from('tenant_profiles').select('*').eq('user_id', tenantId).single()
      ]);

      setProfileData(profileRes.data);
      setTenantProfile(tenantProfileRes.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      console.log('🔧 Submitting unit application:', { unitId: unit.id, tenantId });

      // Check if tenant already has an application for this unit
      const { data: existingApplication, error: checkError } = await supabase
        .from('unit_applications')
        .select('id')
        .eq('unit_id', unit.id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing application:', checkError);
        throw checkError;
      }

      if (existingApplication) {
        toast({
          title: "Application Already Exists",
          description: "You have already applied for this unit.",
          variant: "destructive",
        });
        return;
      }

      // Submit unit application with profile snapshot
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create comprehensive profile snapshot with all tenant data
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

      const { data: newApplication, error: insertError } = await supabase
        .from('unit_applications')
        .insert({
          unit_id: unit.id,
          tenant_id: tenantId,
          status: 'pending',
          answers: {
            appliedAt: new Date().toISOString(),
            source: 'quick_apply',
            applicationMethod: 'one_click'
          },
          profile_snapshot: profileSnapshot
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting application:', insertError);
        throw insertError;
      }

      console.log('✅ Unit application created:', newApplication);

      // Get property info for notification
      const { data: propertyUnit } = await supabase
        .from('property_units')
        .select(`
          property_id,
          properties (
            owner_id,
            address,
            street_address,
            city,
            state,
            zipcode
          )
        `)
        .eq('id', unit.id)
        .single();

      if (propertyUnit?.properties) {
        // Create notification for landlord
        await supabase
          .from('notifications')
          .insert({
            user_id: propertyUnit.properties.owner_id,
            title: 'New Unit Application',
            description: `New application received for Unit ${unit.unit_number} at ${propertyAddress}`,
            type: 'application',
            link: '/dashboard?tab=applications',
            metadata: {
              unit_id: unit.id,
              unit_number: unit.unit_number,
              application_id: newApplication.id
            }
          });
      }

      toast({
        title: "Application Submitted Successfully!",
        description: `Your application for Unit ${unit.unit_number} has been submitted. The landlord will review it and contact you.`,
      });

      onApplicationSubmitted();
      onClose();
    } catch (error) {
      console.error('Error submitting unit application:', error);
      toast({
        title: "Application Failed",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Apply for Unit {unit.unit_number} {unit.unit_name && `(${unit.unit_name})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Unit Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Unit Details</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">{propertyAddress}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  <span>{unit.bedrooms} bedroom{unit.bedrooms !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  <span>{unit.bathrooms} bathroom{unit.bathrooms !== 1 ? 's' : ''}</span>
                </div>
                {unit.square_feet && (
                  <div className="flex items-center gap-1">
                    <Square className="h-4 w-4" />
                    <span>{unit.square_feet.toLocaleString()} sq ft</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold text-lg">${unit.monthly_rent.toLocaleString()}/month</span>
              </div>

              {unit.description && (
                <p className="text-sm text-gray-600 mt-2">{unit.description}</p>
              )}

              {unit.unit_amenities && unit.unit_amenities.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Unit Amenities:</p>
                  <div className="flex flex-wrap gap-1">
                    {unit.unit_amenities.map((amenity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Application Info */}
          <Separator />

          {/* Tenant Profile Summary */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tenantProfile ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Profile Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {profileData?.first_name} {profileData?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profileData?.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profileData?.phone || 'Not provided'}</span>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-medium">
                        ${tenantProfile?.monthly_income?.toLocaleString() || 'N/A'}
                      </span>
                      <span className="text-muted-foreground"> /month</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">
                      {tenantProfile?.employment_status?.replace('_', ' ') || 'Not provided'}
                    </span>
                  </div>
                  {tenantProfile?.credit_score && (
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Credit: <span className="font-medium">
                          {tenantProfile.credit_score}
                        </span>
                      </span>
                    </div>
                  )}
                  {tenantProfile?.voucher_holder && (
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Housing Voucher: <span className="font-medium">
                          ${tenantProfile.voucher_amount?.toLocaleString() || 'Yes'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Complete your tenant profile to apply for properties.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* What Happens Next */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens next:</strong> Your complete profile will be sent to the landlord. 
              They will review your application and contact you directly.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitApplication}
              disabled={isSubmitting || !tenantProfile}
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
      </DialogContent>
    </Dialog>
  );
};

export default UnitApplicationModal;