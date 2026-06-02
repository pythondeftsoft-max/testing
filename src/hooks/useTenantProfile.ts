
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Helper to check if user is admin
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data, error } = await (supabase as any).rpc('is_admin', { user_id: userId });
  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  return data || false;
};

export interface TenantProfileData {
  // Basic Info
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneType?: string;
  userType?: string;
  
  // Location
  city?: string;
  state?: string;
  zipCode?: string;
  
  // Voucher & Housing
  voucherStatus?: 'yes' | 'in-progress' | 'no';
  rentRangeMin?: number;
  rentRangeMax?: number;
  housingAuthority?: string;
  bedroomsApproved?: string[];
  moveInWindow?: 'asap' | '30-days' | '1-2-months';
  
  // Financial
  monthlyIncome?: string | number;
  employmentStatus?: string;
  
  // Background
  creditScore?: string;
  hasEviction?: boolean;
  evictionDetails?: string;
  hasPets?: boolean;
  petType?: string;
  hasAccessibilityNeeds?: boolean;
  accessibilityDetails?: string;
  hasFelonies?: boolean;
  felonyDetails?: string;
  
  // Emergency Contact
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  // Voucher Info (for placed tenants)
  voucher?: {
    number: string;
    type: string;
    pha: string;
    caseworker: {
      name: string;
      phone: string;
      email: string;
    };
    expirationDate: string;
  };
  
  // Lease Info (for placed tenants)
  lease?: {
    propertyAddress: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    totalRent: number;
    hapPortion: number;
    tenantPortion: number;
    startDate: string;
    endDate: string;
  };
  
  // Documents
  documents: Array<{
    id: string;
    name: string;
    type: string;
    uploadDate: string;
  }>;
  
  // Reminders
  reminders: Array<{
    id: string;
    type: string;
    date: string;
    status: string;
  }>;
  
  // Activity Metrics
  accountAge?: number;
  selfSentApplications?: number;
  adminPushedApplications?: number;
  scheduledInterviews?: number;
}

// Helper functions for type casting
const castVoucherStatus = (value: string | null): 'yes' | 'in-progress' | 'no' => {
  if (value === 'yes' || value === 'in-progress' || value === 'no') {
    return value;
  }
  return 'no';
};

const castMoveInWindow = (value: string | null): 'asap' | '30-days' | '1-2-months' => {
  if (value === 'asap' || value === '30-days' || value === '1-2-months') {
    return value;
  }
  return 'asap';
};

export const useTenantProfile = (tenantId: string, propertyId?: string, currentUserId?: string) => {
  const [tenantData, setTenantData] = useState<TenantProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canViewDocuments, setCanViewDocuments] = useState(false);
  const [canViewLease, setCanViewLease] = useState(false);

  const fetchTenantProfile = async () => {
      try {
        setLoading(true);
        console.log('Fetching tenant profile for ID:', tenantId);
        
        // Get user profile and auth data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', tenantId)
          .maybeSingle();

        if (profileError) {
          console.error('Profile error:', profileError);
          throw profileError;
        }

        if (!profile) {
          console.log('No profile found for tenant ID:', tenantId);
          throw new Error('Tenant profile not found');
        }

        console.log('Found profile:', profile);

        // Email is stored in the profiles table

        // Get tenant-specific profile data
        let { data: tenantProfile, error: tenantError } = await supabase
          .from('tenant_profiles')
          .select('*')
          .eq('user_id', tenantId)
          .maybeSingle();

        if (tenantError && tenantError.code !== 'PGRST116') {
          console.error('Tenant profile error:', tenantError);
        }

        // If no tenant_profiles record exists, create one with defaults
        if (!tenantProfile && profile.user_type === 'tenant') {
          console.log('Creating missing tenant_profiles record for user:', tenantId);
          const { data: newTenantProfile, error: createError } = await supabase
            .from('tenant_profiles')
            .insert({
              user_id: tenantId,
              move_in_window: 'asap',
              voucher_status: 'no',
              employment_status: 'unemployed',
              monthly_income: '0'
            })
            .select('*')
            .single();

          if (createError) {
            console.error('Error creating tenant profile:', createError);
          } else {
            tenantProfile = newTenantProfile;
            console.log('Created new tenant profile:', tenantProfile);
          }
        }

        console.log('Found tenant profile:', tenantProfile);

        // Get lease information to determine placement status
        const { data: applications, error: appError } = await supabase
          .from('property_applications')
          .select(`
            *,
            properties!property_applications_property_id_fkey (
              id,
              address,
              monthly_rent,
              bedrooms,
              bathrooms
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'approved')
          .limit(1);

        if (appError) {
          console.error('Applications error:', appError);
          throw appError;
        }

        console.log('Found applications:', applications);

      // Get application statistics
      const { count: selfSentCount } = await supabase
        .from('property_applications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .or('push_direction.is.null,push_direction.eq.tenant-initiated');

      const { count: adminPushedCount } = await supabase
        .from('property_applications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('push_direction', ['admin-push', 'worker-push']);

      // Get scheduled interviews count
      const { count: interviewCount } = await supabase
        .from('viewing_appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed', 'requested']);

        // Calculate account age in days
        const accountAgeDays = Math.floor(
          (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get rent split information
        let rentSplitData = null;
        if (applications && applications.length > 0) {
          const { data: rentSplit } = await supabase
            .from('rent_splits')
            .select('*')
            .eq('property_id', applications[0].properties?.id)
            .maybeSingle();
          
          rentSplitData = rentSplit;
          console.log('Found rent split:', rentSplitData);
        }

        // Check if tenant has an active placement
        const hasActivePlacement = applications && applications.length > 0;

        // Determine if current user can view lease details
        let canViewLeaseData = false;
        if (hasActivePlacement && currentUserId) {
          const isViewingSelf = currentUserId === tenantId;
          const isAdmin = await checkIsAdmin(currentUserId);
          
          if (isViewingSelf || isAdmin) {
            canViewLeaseData = true;
          } else {
            // Check if current user manages the property where tenant is currently placed
            const currentPlacementPropertyId = applications[0].properties?.id;
            if (currentPlacementPropertyId) {
              const { data: portfolioMember } = await supabase
                .from('properties')
                .select(`
                  portfolio_id,
                  portfolios!inner (
                    portfolio_members!inner (
                      user_id
                    )
                  )
                `)
                .eq('id', currentPlacementPropertyId)
                .eq('portfolios.portfolio_members.user_id', currentUserId)
                .maybeSingle();
              
              canViewLeaseData = !!portfolioMember;
            }
          }
        }
        
        setCanViewLease(canViewLeaseData);

        // Build comprehensive data structure
        const profileData: TenantProfileData = {
          id: tenantId,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          phoneType: tenantProfile?.phone_type || 'mobile',
          userType: profile.user_type || '',
          
          // Location from tenant profile
          city: tenantProfile?.city || '',
          state: tenantProfile?.state || '',
          zipCode: tenantProfile?.zip_code || '',
          
          // Voucher & Housing from tenant profile
          voucherStatus: castVoucherStatus(tenantProfile?.voucher_status),
          rentRangeMin: tenantProfile?.rent_range_min || undefined,
          rentRangeMax: tenantProfile?.rent_range_max || undefined,
          housingAuthority: tenantProfile?.housing_authority || '',
          bedroomsApproved: tenantProfile?.bedrooms_approved || [],
          moveInWindow: castMoveInWindow(tenantProfile?.move_in_window),
          
          // Financial from tenant profile
          monthlyIncome: tenantProfile?.monthly_income || undefined,
          employmentStatus: tenantProfile?.employment_status || '',
          
          // Background from tenant profile
          creditScore: tenantProfile?.credit_score_range || '',
          hasEviction: tenantProfile?.has_eviction || false,
          evictionDetails: tenantProfile?.eviction_details || '',
          hasPets: tenantProfile?.has_pets || false,
          petType: tenantProfile?.pet_type || '',
          hasAccessibilityNeeds: tenantProfile?.has_accessibility_needs || false,
          accessibilityDetails: tenantProfile?.accessibility_details || '',
          hasFelonies: tenantProfile?.has_felonies || false,
          felonyDetails: tenantProfile?.felony_details || '',
          
          emergencyContact: {
            name: '',
            phone: '',
            relationship: ''
          },
          
          // Only include lease data if tenant is placed AND viewer has permission
          ...(hasActivePlacement && canViewLeaseData && {
            voucher: {
              number: 'HCV-2024-005678',
              type: 'Housing Choice Voucher',
              pha: rentSplitData?.pha_contact_name ? 
                `Metropolitan Housing Authority` : 'Metropolitan Housing Authority',
              caseworker: {
                name: rentSplitData?.pha_contact_name || 'Jennifer Smith',
                phone: rentSplitData?.pha_contact_phone || '314-555-0123',
                email: rentSplitData?.pha_contact_email || 'j.smith@mha.gov'
              },
              expirationDate: '2025-08-15'
            },
            lease: {
              propertyAddress: applications[0].properties?.address || 'Property Address',
              unitNumber: 'Unit A',
              bedrooms: applications[0].properties?.bedrooms || 2,
              bathrooms: applications[0].properties?.bathrooms || 1.5,
              totalRent: rentSplitData?.total_rent || applications[0].properties?.monthly_rent || 1400,
              hapPortion: rentSplitData?.pha_portion || 900,
              tenantPortion: rentSplitData?.tenant_portion || 500,
              startDate: '2024-01-01',
              endDate: '2024-12-31'
            }
          }),
          
          // Fetch tenant documents - only if viewing own profile or admin
          documents: [],
          
          reminders: [
            { id: '1', type: 'Lease Expiration', date: '2024-12-31', status: 'upcoming' },
            { id: '2', type: 'Annual Recertification', date: '2024-11-01', status: 'upcoming' },
            { id: '3', type: 'Pet Registration Renewal', date: '2024-09-15', status: 'completed' }
          ],
          
          // Activity Metrics
          accountAge: accountAgeDays,
          selfSentApplications: selfSentCount || 0,
          adminPushedApplications: adminPushedCount || 0,
          scheduledInterviews: interviewCount || 0
        };

        // Fetch tenant personal documents only if user is viewing their own profile or is admin
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const isViewingSelf = currentUser?.id === tenantId;
        const isAdmin = currentUser?.id ? await checkIsAdmin(currentUser.id) : false;
        const canView = isViewingSelf || isAdmin;
        
        setCanViewDocuments(canView);
        
        if (canView) {
          const { data: documents } = await supabase
            .from('tenant_documents')
            .select('*')
            .eq('user_id', tenantId)
            .order('created_at', { ascending: false });
          
          if (documents) {
            profileData.documents = documents.map(doc => ({
              id: doc.id,
              name: doc.file_name,
              type: doc.document_type,
              uploadDate: new Date(doc.created_at).toISOString().split('T')[0]
            }));
          }
        }

        console.log('Final profile data:', profileData);
        setTenantData(profileData);
      } catch (err: any) {
        console.error('Error fetching tenant profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (tenantId) {
      fetchTenantProfile();
    }
  }, [tenantId]);

  const refetch = () => {
    if (tenantId) {
      fetchTenantProfile();
    }
  };

  return { tenantData, loading, error, refetch, canViewDocuments, canViewLease };
};
