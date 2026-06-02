import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import TenantProfileModal from './TenantProfileModal';
import FinalizeRentModal from './FinalizeRentModal';
import TenantsApplicationsToggle from './TenantsApplicationsToggle';
import ApplicationsMasterDetailView from './applications/ApplicationsMasterDetailView';
import CurrentTenantsView from './CurrentTenantsView';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { notifyApplicationDenied } from '@/utils/applicationNotifications';
import { usePrimaryApplicantActions } from '@/hooks/usePrimaryApplicantActions';
import { PrimaryApplicantConfirmDialog } from '@/components/property/PrimaryApplicantConfirmDialog';
import { RejectPrimaryConfirmDialog } from '@/components/property/RejectPrimaryConfirmDialog';
import { ApplicantMessagingModal } from './applications/ApplicantMessagingModal';
import { useLandlordDenyPush, useLandlordApprovePush } from '@/hooks/useLandlordPushApplications';

interface LandlordApplicationsProps {
  userId: string;
  portfolioId?: string;
  selectedPropertyId?: string;
  onClearPropertyFilter?: () => void;
  externalRefreshKey?: number;
  initialView?: 'applications' | 'current-tenants';
}

const LandlordApplications = ({ userId, portfolioId, selectedPropertyId, onClearPropertyFilter, externalRefreshKey, initialView = 'applications' }: LandlordApplicationsProps) => {
  const [applications, setApplications] = useState([]);
  const [propertiesWithApplications, setPropertiesWithApplications] = useState([]);
  const [selectedTenantModal, setSelectedTenantModal] = useState<{tenantId: string, propertyId: string, unitId?: string} | null>(null);
  const [finalizeRentModal, setFinalizeRentModal] = useState<{applicationId: string, property: any, tenantName: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'applications' | 'current-tenants'>(initialView);
  const [primaryApplicants, setPrimaryApplicants] = useState<Record<string, { id: string; name: string; unitId?: string }>>({});
  const [primaryConfirmDialog, setPrimaryConfirmDialog] = useState<{ open: boolean; application?: any; primaries?: Record<string, { id: string; name: string; unitId?: string; propertyId: string }> }>({ open: false });
  const [rejectPrimaryDialog, setRejectPrimaryDialog] = useState<{ open: boolean; application?: any }>({ open: false });
  const [messagingModal, setMessagingModal] = useState<{
    open: boolean;
    applicationId?: string;
    tenantId?: string;
    propertyId?: string;
    tenantName?: string;
    propertyAddress?: string;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setAsPrimaryApplicant, rejectPrimaryApplicant } = usePrimaryApplicantActions();
  const denyPushMutation = useLandlordDenyPush();
  const approvePushMutation = useLandlordApprovePush();

  useEffect(() => {
    fetchApplications();
    fetchPrimaryApplicants();
    
    // Listen for primary applicant updates
    const handlePrimaryApplicantUpdate = () => {
      fetchApplications();
      fetchPrimaryApplicants();
    };
    
    window.addEventListener('primary-applicant-updated', handlePrimaryApplicantUpdate);
    
    return () => {
      window.removeEventListener('primary-applicant-updated', handlePrimaryApplicantUpdate);
    };
  }, [userId, portfolioId, selectedPropertyId, externalRefreshKey]);

  const fetchPrimaryApplicants = async () => {
    try {
      // Query ALL THREE tables for primary applicants
      const [marketplaceResult, propertyResult, pushResult] = await Promise.all([
        supabase
          .from('marketplace_applications')
          .select('id, property_id, unit_id, user_id')
          .eq('is_primary_applicant', true),
        supabase
          .from('property_applications')
          .select('id, property_id, unit_id, tenant_id, application_data')
          .eq('is_primary_applicant', true),
        supabase
          .from('property_pushes')
          .select('id, property_id, unit_id, tenant_id')
          .in('status', ['primary_applicant', 'lease_sent', 'lease_signed'])
      ]);

      if (marketplaceResult.error) throw marketplaceResult.error;
      if (propertyResult.error) throw propertyResult.error;
      if (pushResult.error) console.error('Error fetching push primary applicants:', pushResult.error);

      const marketplaceApps = marketplaceResult.data || [];
      const propertyApps = propertyResult.data || [];
      const pushApps = pushResult.data || [];

      console.log('🔍 fetchPrimaryApplicants: marketplace apps', marketplaceApps);
      console.log('🔍 fetchPrimaryApplicants: property apps', propertyApps);
      console.log('🔍 fetchPrimaryApplicants: push apps', pushApps);

      // Collect all user IDs from all three tables
      const userIds = [
        ...marketplaceApps.map(app => app.user_id),
        ...propertyApps.map(app => app.tenant_id),
        ...pushApps.map(app => app.tenant_id)
      ].filter(Boolean);

      if (userIds.length === 0) {
        setPrimaryApplicants({});
        return {};
      }

      // Get profiles for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile])
      );

      const primaries: Record<string, { id: string; name: string; unitId?: string; propertyId: string }> = {};

      // Process marketplace_applications
      marketplaceApps.forEach((app: any) => {
        const profile = profilesMap.get(app.user_id);
        const name = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : 'Primary Applicant';
        const key = app.unit_id ? `${app.property_id}:${app.unit_id}` : app.property_id;
        primaries[key] = {
          id: app.user_id,
          name,
          unitId: app.unit_id,
          propertyId: app.property_id
        };
      });

      // Process property_applications (with original_unit_id fallback)
      propertyApps.forEach((app: any) => {
        const profile = profilesMap.get(app.tenant_id);
        const name = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : 'Primary Applicant';
        // Use unit_id, or fall back to original_unit_id from application_data
        const effectiveUnitId = app.unit_id || app.application_data?.original_unit_id;
        const key = effectiveUnitId ? `${app.property_id}:${effectiveUnitId}` : app.property_id;
        primaries[key] = {
          id: app.tenant_id,
          name,
          unitId: effectiveUnitId,
          propertyId: app.property_id
        };
      });

      // Process property_pushes (admin-driven matches)
      pushApps.forEach((app: any) => {
        const profile = profilesMap.get(app.tenant_id);
        const name = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : 'Primary Applicant';
        const key = app.unit_id ? `${app.property_id}:${app.unit_id}` : app.property_id;
        primaries[key] = {
          id: app.tenant_id,
          name,
          unitId: app.unit_id,
          propertyId: app.property_id
        };
      });

      console.log('🔍 fetchPrimaryApplicants: primaries object', primaries);
      setPrimaryApplicants(primaries);
      return primaries;
    } catch (error) {
      console.error('Error fetching primary applicants:', error);
      return {};
    }
  };

  const fetchApplications = async () => {
    try {
      console.log('LandlordApplications: Fetching in-market properties for userId:', userId, 'portfolioId:', portfolioId);
      
      // Step 1: Fetch ALL "in market" properties (available or vacant)
      let propertiesQuery = supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          bedrooms,
          bathrooms,
          zipcode,
          status,
          on_market,
          portfolio_id,
          owner_id,
          property_units (
            id,
            unit_number,
            monthly_rent,
            bedrooms,
            bathrooms,
            status,
            on_market
          )
        `)
        .eq('owner_id', userId)
        .is('deleted_at', null);

      // Apply portfolio filter
      if (portfolioId && portfolioId !== 'everything') {
        console.log('LandlordApplications: Applying portfolio filter:', portfolioId);
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
      }

      // Filter by specific property if selected
      if (selectedPropertyId) {
        propertiesQuery = propertiesQuery.eq('id', selectedPropertyId);
      }

      const propertiesResult = await propertiesQuery;
      if (propertiesResult.error) throw propertiesResult.error;

      const properties = propertiesResult.data || [];
      console.log('LandlordApplications: Found in-market properties:', properties.length);

      // Step 2: Fetch ALL applications from all three tables
      const propertyIds = properties.map(p => p.id);
      const unitIds = properties.flatMap(p => (p.property_units || []).map(u => u.id));

      // Query marketplace_applications
      const { data: marketplaceApps, error: appsError } = await supabase
        .from('marketplace_applications')
        .select('*')
        .in('property_id', propertyIds.length > 0 ? propertyIds : ['']);

      if (appsError) throw appsError;

      // Query property_pushes - include both pending review AND primary applicants AND signed leases
      const { data: pushApps, error: pushAppsError } = await supabase
        .from('property_pushes')
        .select('*')
        .in('status', ['landlord_review', 'primary_applicant', 'lease_sent', 'lease_signed'])
        .in('unit_id', unitIds.length > 0 ? unitIds : [''])
        .gt('expires_at', new Date().toISOString());

      if (pushAppsError) console.error('Error fetching property_pushes:', pushAppsError);

      // Fetch tenant info for push apps
      const pushTenantIds = (pushApps || []).map(p => p.tenant_id).filter(Boolean);
      let pushProfilesMap = new Map<string, any>();
      let pushTenantProfilesMap = new Map<string, any>();
      
      if (pushTenantIds.length > 0) {
        const [profilesResult, tenantProfilesResult] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, email, phone').in('id', pushTenantIds),
          supabase.from('tenant_profiles').select('*').in('user_id', pushTenantIds)
        ]);
        
        (profilesResult.data || []).forEach(p => pushProfilesMap.set(p.id, p));
        (tenantProfilesResult.data || []).forEach(tp => pushTenantProfilesMap.set(tp.user_id, tp));
      }

      // Old unit_applications table is no longer queried

      // Query old property_applications (exclude synced duplicates from marketplace)
      // Join with profiles only - tenant_profiles fetched separately to avoid PGRST200 error
      const { data: propertyApps, error: propertyAppsError } = await supabase
        .from('property_applications')
        .select(`
          *,
          tenant:profiles!property_applications_tenant_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            housing_status
          )
        `)
        .in('property_id', propertyIds.length > 0 ? propertyIds : [''])
        .is('marketplace_application_id', null);

      if (propertyAppsError) console.error('Error fetching property_applications:', propertyAppsError);

      // Fetch tenant_profiles separately for all tenant_ids from property_applications
      const propertyAppTenantIds = (propertyApps || []).map(app => app.tenant_id).filter(Boolean);
      let tenantProfilesMap = new Map<string, any>();
      
      if (propertyAppTenantIds.length > 0) {
        const { data: tenantProfiles, error: tenantProfilesError } = await supabase
          .from('tenant_profiles')
          .select('*')
          .in('user_id', propertyAppTenantIds);
        
        if (tenantProfilesError) {
          console.error('Error fetching tenant_profiles:', tenantProfilesError);
        } else {
          (tenantProfiles || []).forEach(tp => {
            tenantProfilesMap.set(tp.user_id, tp);
          });
        }
      }

      const marketplaceApplications = marketplaceApps || [];
      const propertyApplications = propertyApps || [];
      const pushApplications = pushApps || [];
      
      console.log('LandlordApplications: Found applications:', {
        marketplace: marketplaceApplications.length,
        property: propertyApplications.length,
        pushes: pushApplications.length
      });

      // Step 3: Normalize ALL applications to match expected structure
      
      // Normalize marketplace_applications
      const normalizedMarketplace = marketplaceApplications.map(app => {
        const property = properties.find(p => p.id === app.property_id);
        const unit = app.unit_id ? property?.property_units?.find(u => u.id === app.unit_id) : null;
        
        // Extract tenant data from profile_snapshot
        const tenantData = (app.profile_snapshot || {}) as any;
        
        return {
          id: app.id,
          tenant_id: app.user_id,
          property_id: app.property_id,
          unit_id: app.unit_id,
          status: app.status as string,
          created_at: app.created_at,
          submitted_at: app.submitted_at,
          type: app.unit_id ? 'unit' : 'property',
          
          // Basic profile from contact info or profile_snapshot
          profiles: {
            id: app.user_id,
            first_name: tenantData.first_name || app.contact_name?.split(' ')[0] || '',
            last_name: tenantData.last_name || app.contact_name?.split(' ').slice(1).join(' ') || '',
            email: tenantData.email || app.contact_email || '',
            phone: tenantData.phone || app.contact_phone || '',
            user_type: 'tenant'
          },
          
          // Tenant profile data from snapshot
          tenant_profiles: {
            user_id: app.user_id,
            monthly_income: tenantData.monthly_income,
            employment_status: tenantData.employment_status,
            credit_score: tenantData.credit_score,
            credit_score_range: tenantData.credit_score_range,
            voucher_holder: tenantData.voucher_holder,
            voucher_status: tenantData.voucher_status,
            voucher_amount: tenantData.voucher_amount,
            has_pets: tenantData.has_pets,
            pet_type: tenantData.pet_type,
            has_eviction: tenantData.has_eviction,
            has_felonies: tenantData.has_felonies,
            move_in_window: tenantData.move_in_window,
          },
          
          // Property info
          properties: property ? {
            id: property.id,
            address: property.address,
            monthly_rent: unit?.monthly_rent || property.monthly_rent,
            bedrooms: unit?.bedrooms || property.bedrooms,
            bathrooms: unit?.bathrooms || property.bathrooms,
            zipcode: property.zipcode,
            owner_id: property.owner_id,
            portfolio_id: property.portfolio_id
          } : undefined,
          
          // Unit info if applicable
          unit_number: unit?.unit_number,
          property_units: unit ? {
            id: unit.id,
            unit_number: unit.unit_number,
            properties: {
              id: property?.id,
              address: property?.address,
              zipcode: property?.zipcode
            }
          } : undefined,
          
          profile_snapshot: app.profile_snapshot,
          is_primary_applicant: app.is_primary_applicant || false,
          priority_payment_made: false
        };
      });

      // Old unit_applications no longer normalized

      // Normalize property_applications - use joined tenant data + tenantProfilesMap
      const normalizedPropertyApps = propertyApplications.map(app => {
        const property = properties.find(p => p.id === app.property_id);
        const tenant = (app as any).tenant;
        const tenantProfile = tenantProfilesMap.get(app.tenant_id);
        
        // Build profile_snapshot from tenant data for consistency with marketplace apps
        const profileSnapshot = {
          first_name: tenant?.first_name,
          last_name: tenant?.last_name,
          email: tenant?.email,
          phone: tenant?.phone,
          housing_status: tenant?.housing_status,
          monthly_income: tenantProfile?.monthly_income,
          employment_status: tenantProfile?.employment_status,
          credit_score: tenantProfile?.credit_score,
          credit_score_range: tenantProfile?.credit_score_range,
          voucher_holder: tenantProfile?.voucher_holder,
          voucher_status: tenantProfile?.voucher_status,
          voucher_amount: tenantProfile?.voucher_amount,
          has_pets: tenantProfile?.has_pets,
          pet_type: tenantProfile?.pet_type,
          has_eviction: tenantProfile?.has_eviction,
          has_felonies: tenantProfile?.has_felonies,
          move_in_window: tenantProfile?.move_in_window,
          rent_range_min: tenantProfile?.rent_range_min,
          rent_range_max: tenantProfile?.rent_range_max,
        };
        
        return {
          id: app.id,
          tenant_id: app.tenant_id,
          property_id: app.property_id,
          unit_id: app.unit_id || null,
          status: app.status as string,
          created_at: app.created_at,
          submitted_at: app.created_at,
          type: app.unit_id ? 'unit' : 'property',
          
          profiles: {
            id: app.tenant_id,
            first_name: tenant?.first_name || '',
            last_name: tenant?.last_name || '',
            email: tenant?.email || '',
            phone: tenant?.phone || '',
            user_type: 'tenant'
          },
          
          tenant_profiles: {
            user_id: app.tenant_id,
            monthly_income: tenantProfile?.monthly_income,
            employment_status: tenantProfile?.employment_status,
            credit_score: tenantProfile?.credit_score,
            credit_score_range: tenantProfile?.credit_score_range,
            voucher_holder: tenantProfile?.voucher_holder,
            voucher_status: tenantProfile?.voucher_status,
            voucher_amount: tenantProfile?.voucher_amount,
            has_pets: tenantProfile?.has_pets,
            pet_type: tenantProfile?.pet_type,
            has_eviction: tenantProfile?.has_eviction,
            has_felonies: tenantProfile?.has_felonies,
            move_in_window: tenantProfile?.move_in_window,
          },
          
          properties: property ? {
            id: property.id,
            address: property.address,
            monthly_rent: property.monthly_rent,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            zipcode: property.zipcode,
            owner_id: property.owner_id,
            portfolio_id: property.portfolio_id
          } : undefined,
          
          profile_snapshot: profileSnapshot,
          is_primary_applicant: app.is_primary_applicant || false,
          priority_payment_made: app.priority_payment_made || false,
          application_data: app.application_data
        };
      });

      // Normalize property_pushes (UNIFIED FLOW - main source for matchmaker)
      const normalizedPushApps = pushApplications.map(push => {
        const unit = properties.flatMap(p => p.property_units || []).find(u => u.id === push.unit_id);
        const property = properties.find(p => (p.property_units || []).some(u => u.id === push.unit_id));
        const profile = pushProfilesMap.get(push.tenant_id);
        const tenantProfile = pushTenantProfilesMap.get(push.tenant_id);

        return {
          id: push.id,
          tenant_id: push.tenant_id,
          property_id: property?.id || push.property_id,
          unit_id: push.unit_id,
          status: 'submitted', // Show as submitted to landlord
          created_at: push.pushed_at,
          submitted_at: push.updated_at || push.pushed_at,
          type: 'unit',
          source: 'push', // Mark as push-based for special handling
          push_id: push.id, // Keep reference for actions
          
          profiles: {
            id: push.tenant_id,
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email: profile?.email || '',
            phone: profile?.phone || '',
            user_type: 'tenant'
          },
          
          tenant_profiles: {
            user_id: push.tenant_id,
            monthly_income: tenantProfile?.monthly_income,
            employment_status: tenantProfile?.employment_status,
            credit_score_range: tenantProfile?.credit_score_range,
            voucher_holder: tenantProfile?.voucher_holder,
            voucher_status: tenantProfile?.voucher_status,
            voucher_amount: tenantProfile?.voucher_amount,
            has_pets: tenantProfile?.has_pets,
            pet_type: tenantProfile?.pet_type,
            has_eviction: tenantProfile?.has_eviction,
            has_felonies: tenantProfile?.has_felonies,
            move_in_window: tenantProfile?.move_in_window,
          },
          
          properties: property ? {
            id: property.id,
            address: property.address,
            monthly_rent: unit?.monthly_rent || property.monthly_rent,
            bedrooms: unit?.bedrooms || property.bedrooms,
            bathrooms: unit?.bathrooms || property.bathrooms,
            zipcode: property.zipcode,
            owner_id: property.owner_id,
            portfolio_id: property.portfolio_id
          } : undefined,
          
          unit_number: unit?.unit_number,
          property_units: unit ? {
            id: unit.id,
            unit_number: unit.unit_number,
            properties: { id: property?.id, address: property?.address, zipcode: property?.zipcode }
          } : undefined,
          
          profile_snapshot: { 
            first_name: profile?.first_name, 
            last_name: profile?.last_name, 
            email: profile?.email, 
            phone: profile?.phone,
            rent_range_min: tenantProfile?.rent_range_min,
            rent_range_max: tenantProfile?.rent_range_max,
            move_in_window: tenantProfile?.move_in_window,
            preferred_move_date: tenantProfile?.preferred_move_date,
          },
          is_primary_applicant: ['primary_applicant', 'lease_sent', 'lease_signed'].includes(push.status),
          priority_payment_made: false
        };
      });

      // Combine all applications and filter out withdrawn (denied/rejected)
      const allAppsNormalized = [...normalizedMarketplace, ...normalizedPropertyApps, ...normalizedPushApps]
        .filter(app => app.status !== 'withdrawn' && app.status !== 'rejected')
        .sort((a, b) => {
          // Primary applicants first
          if (a.is_primary_applicant && !b.is_primary_applicant) return -1;
          if (!a.is_primary_applicant && b.is_primary_applicant) return 1;
          // Then priority payment made
          if (a.priority_payment_made && !b.priority_payment_made) return -1;
          if (!a.priority_payment_made && b.priority_payment_made) return 1;
          // Then by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      // Separate into property and unit apps for grouping
      const propertyLevelApps = allAppsNormalized.filter(app => !app.unit_id);
      const unitLevelApps = allAppsNormalized.filter(app => app.unit_id);

      // Step 5: Create property data structure with application counts
      const propertiesWithApps = properties.map(property => {
        const propApps = propertyLevelApps.filter(app => app.property_id === property.id);
        
        // Check if any application has a primary applicant for this property (exclude housed)
        const hasPrimaryApplicant = propApps.some(app => app.is_primary_applicant === true && app.status !== 'housed');
        
        // Identify unit IDs that have active applications (lease_signed, moved_in)
        const unitIdsWithActiveApps = new Set(
          unitLevelApps
            .filter(app => app.status === 'lease_signed' || app.status === 'moved_in')
            .map(app => app.unit_id)
        );
        
        // Identify unit IDs that have a primary applicant
        const unitIdsWithPrimaryApplicant = new Set(
          unitLevelApps
            .filter(app => app.is_primary_applicant === true && app.status !== 'housed')
            .map(app => app.unit_id)
        );
        
        // Identify unit IDs that have 6+ applications (paused at limit)
        const unitAppCounts = unitLevelApps.reduce((acc, app) => {
          if (app.unit_id) {
            acc[app.unit_id] = (acc[app.unit_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const unitIdsWithMaxApps = new Set(
          Object.entries(unitAppCounts)
            .filter(([_, count]) => count >= 6)
            .map(([unitId]) => unitId)
        );
        
        const units = (property.property_units || [])
          .filter(unit => 
            unit.on_market === true || 
            unit.status === 'in_process' ||
            unitIdsWithActiveApps.has(unit.id) ||  // Include units with lease_signed/moved_in apps
            unitIdsWithPrimaryApplicant.has(unit.id) ||  // Include units with primary applicant
            unitIdsWithMaxApps.has(unit.id)  // Include units paused at 6+ applications
          )
          .map(unit => {
            const unitApps = unitLevelApps.filter(app => app.unit_id === unit.id);
            const unitHasPrimary = unitApps.some(app => app.is_primary_applicant === true && app.status !== 'housed');
            return {
              unitId: unit.id,
              unitNumber: unit.unit_number,
              status: unit.status,
              applicationCount: unitApps.length,
              applications: unitApps,
              hasPrimaryApplicant: unitHasPrimary
            };
          });

        // Property has primary if property-level app is primary OR any unit has primary
        const propertyHasPrimary = hasPrimaryApplicant || units.some(u => u.hasPrimaryApplicant);

        return {
          propertyId: property.id,
          address: property.address,
          status: property.status,
          on_market: property.on_market,
          applicationCount: propApps.length + units.reduce((sum, u) => sum + u.applicationCount, 0),
          applications: propApps,
          units,
          hasPrimaryApplicant: propertyHasPrimary
        };
      });

      // Show properties that are:
      // 1. On-market (active listings)
      // 2. OR have a primary applicant (paused but in process)
      // 3. OR have applications awaiting housing completion (lease_signed, moved_in)
      // 4. OR have 6+ applications (paused at limit)
      // 5. OR single-family property where unit is on_market even if property is not
      const filteredPropertiesWithApps = propertiesWithApps.filter(prop => {
        // Check if property has any applications in active progress states
        const hasActiveApplications = prop.applications.some(app => 
          app.status === 'lease_signed' || app.status === 'moved_in'
        ) || prop.units.some(u => 
          u.applications.some(app => app.status === 'lease_signed' || app.status === 'moved_in')
        );
        
        // Check if property/unit has 6+ apps (paused at limit)
        const hasMaxApps = prop.applicationCount >= 6 || 
          prop.units.some(u => u.applicationCount >= 6);
        
        // For single-family (unit_count=1), check if the unit is on_market
        const isSingleFamilyUnitOnMarket = prop.units.length === 1 && 
          prop.units[0] && 
          properties.find(p => p.id === prop.propertyId)?.property_units?.[0]?.on_market === true;
        
        // Include properties with ANY applications (from admin pipeline or marketplace)
        // This ensures landlords see applications even for off-market/occupied properties
        const hasAnyApplications = prop.applicationCount > 0;
        
        return prop.on_market === true || 
          prop.hasPrimaryApplicant === true ||
          hasActiveApplications ||
          hasMaxApps ||
          isSingleFamilyUnitOnMarket ||
          hasAnyApplications;
      });

      setApplications(allAppsNormalized);
      setPropertiesWithApplications(filteredPropertiesWithApps);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      // Find the application
      const application = applications.find(app => app.id === applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Handle push-based applications (from unified flow)
      if ((application as any).source === 'push') {
        if (newStatus === 'withdrawn') {
          await denyPushMutation.mutateAsync({ pushId: applicationId });
          await fetchApplications();
          return;
        }
      }

      // For denials (withdrawn), use the secure RPC function
      if (newStatus === 'withdrawn') {
        const { data, error } = await supabase.rpc('landlord_deny_application', {
          p_application_id: applicationId
        });
        
        if (error) throw error;
        
        const result = data as { success: boolean; error?: string };
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to deny application');
        }
        
        console.log(`✅ Successfully denied application ${applicationId}`);
      } else {
        // For other status changes, try updating marketplace_applications first
        const { data: marketplaceData, error: marketplaceError } = await supabase
          .from('marketplace_applications')
          .update({ status: newStatus as any })
          .eq('id', applicationId)
          .select();

        // If no rows updated in marketplace, try property_applications
        if (!marketplaceData || marketplaceData.length === 0) {
          const { error: propertyError } = await supabase
            .from('property_applications')
            .update({ status: newStatus })
            .eq('id', applicationId);

          if (propertyError) {
            console.error('Failed to update property_applications:', propertyError);
            throw propertyError;
          }
        } else if (marketplaceError) {
          console.error('Failed to update marketplace_applications:', marketplaceError);
          throw marketplaceError;
        }

        console.log(`✅ Successfully updated application ${applicationId} to ${newStatus}`);
      }

      // If withdrawn (denied/rejected), remove from local state and notify tenant
      if (newStatus === 'withdrawn') {
        // Send notification to tenant
        await notifyApplicationDenied(
          applicationId, 
          application.tenant_id, 
          application.property_id
        );

        // Remove from local state immediately
        setApplications(apps => apps.filter(app => app.id !== applicationId));
        
        // Update propertiesWithApplications to remove the application
        setPropertiesWithApplications(props => 
          props.map(prop => {
            // Remove from property-level applications
            const filteredPropApps = prop.applications.filter(app => app.id !== applicationId);
            
            // Remove from unit-level applications
            const updatedUnits = prop.units.map(unit => ({
              ...unit,
              applications: unit.applications.filter(app => app.id !== applicationId),
              applicationCount: unit.applications.filter(app => app.id !== applicationId).length
            }));
            
            // Recalculate total application count
            const totalCount = filteredPropApps.length + updatedUnits.reduce((sum, u) => sum + u.applicationCount, 0);
            
            return {
              ...prop,
              applications: filteredPropApps,
              units: updatedUnits,
              applicationCount: totalCount
            };
          })
        );
        
        // Force re-fetch to ensure counts are accurate
        await fetchApplications();
      } else {
        // For other status changes, just update the status
        setApplications(apps => 
          apps.map(app => 
            app.id === applicationId 
              ? { ...app, status: newStatus }
              : app
          )
        );
      }

      // If approved, send contract to tenant and cancel subscription
      if (newStatus === 'approved') {
        if (application) {
          await sendContract(applicationId, application.tenant_id);
          
          // Cancel tenant subscription immediately (fast path)
          try {
            await supabase.functions.invoke('cancel-tenant-subscription-now', {
              body: { tenant_id: application.tenant_id }
            });
          } catch (cancelError) {
            console.error('Error cancelling tenant subscription:', cancelError);
            // Don't show error to user as the trigger will handle it as backup
          }
        }
      }

      toast({
        title: "Success",
        description: newStatus === 'withdrawn' 
          ? `Application denied. The tenant has been notified.` 
          : `Application ${newStatus} successfully.`,
      });
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    }
  };

  const handleViewProfile = (tenantId: string, propertyId: string, unitId?: string) => {
    setSelectedTenantModal({ tenantId, propertyId, unitId });
  };

  const handleSetAsPrimary = async (application: any) => {
    // If already primary, show informative message instead of rejecting
    if (application.is_primary_applicant) {
      toast({
        title: "Already Primary Applicant",
        description: "This person is the Primary Applicant. To change their status: send them a lease, use the deny (X) button, or set another applicant as primary.",
      });
      return;
    }
    
    // Force refresh primary applicants data before opening dialog
    const freshPrimaries = await fetchPrimaryApplicants();
    
    // Optimistic UI update - immediately show gold star
    setApplications(prevApps => 
      prevApps.map(app => 
        app.id === application.id 
          ? { ...app, is_primary_applicant: true }
          : app
      )
    );
    
    setPrimaryConfirmDialog({ open: true, application, primaries: freshPrimaries });
  };

  const handlePrimaryConfirmCancel = () => {
    // Revert optimistic update if user cancels
    const application = primaryConfirmDialog.application;
    if (application) {
      setApplications(prevApps => 
        prevApps.map(app => 
          app.id === application.id 
            ? { ...app, is_primary_applicant: false }
            : app
        )
      );
    }
    setPrimaryConfirmDialog({ open: false, application: null });
  };

  const handleConfirmSetPrimary = async () => {
    if (!primaryConfirmDialog.application) return;

    const app = primaryConfirmDialog.application;
    
    // Determine the correct unit_id
    // Check column first, then fallback to application_data.original_unit_id (for property_applications created via direct apply)
    let unitId = app.unit_id || app.application_data?.original_unit_id;
    
    if (!unitId) {
      // Query the database directly for all units of this property
      const { data: units, error: unitsError } = await supabase
        .from('property_units')
        .select('id, unit_number')
        .eq('property_id', app.property_id);
      
      if (unitsError) {
        console.error('Error fetching units:', unitsError);
        toast({
          title: "Error",
          description: "Failed to fetch property units",
          variant: "destructive",
        });
        return;
      }
      
      if (!units || units.length === 0) {
        toast({
          title: "Error", 
          description: "No units found for this property",
          variant: "destructive",
        });
        return;
      }
      
      if (units.length === 1) {
        // Single unit property - use that unit
        unitId = units[0].id;
        console.log('Using single unit:', unitId);
      } else {
        // Multiple units - need to show selector
        toast({
          title: "Multiple Units",
          description: "Please specify which unit this applicant is for",
          variant: "destructive",
        });
        return; // TODO: Implement unit selector dialog
      }
    }

    try {
      // Check if this is a push-based application
      if (app.source === 'push' && app.push_id) {
        // Use the approve push mutation which handles both push status and primary applicant
        await approvePushMutation.mutateAsync({
          pushId: app.push_id,
          unitId: unitId,
          tenantId: app.tenant_id
        });
      } else {
        // Regular marketplace/property application flow
        // Update the application with the correct unit_id if it was missing
        if (!app.unit_id && unitId) {
          await supabase
            .from('marketplace_applications')
            .update({ unit_id: unitId })
            .eq('id', app.id);
        }

        await setAsPrimaryApplicant.mutateAsync({
          unitId: unitId,
          tenantId: app.tenant_id
        });
      }

      // Refresh data
      await fetchApplications();
      await fetchPrimaryApplicants();

      setPrimaryConfirmDialog({ open: false });
    } catch (error) {
      console.error('Error setting primary applicant:', error);
    }
  };

  const handleMessage = (applicationId: string) => {
    const application = applications.find((app: any) => app.id === applicationId);
    if (application) {
      const tenantName = application.profile_snapshot 
        ? `${application.profile_snapshot.first_name} ${application.profile_snapshot.last_name}`
        : 'Applicant';
      
      // Construct property address using the correct data source
      let propertyAddress = 'Property';
      
      // For unit applications, use property_units.properties (has correct DB join)
      if (application.property_units?.properties) {
        const props = application.property_units.properties;
        propertyAddress = props.address || 'Property';
        
// Add unit number for unit applications
      if (application.unit_number) {
        const unitDisplay = application.unit_number.toString().toLowerCase().startsWith('unit ')
          ? application.unit_number
          : `Unit ${application.unit_number}`;
        propertyAddress = `${propertyAddress} - ${unitDisplay}`;
      }
      }
      // For property applications, use application.properties
      else if (application.properties) {
        propertyAddress = application.properties.address || 'Property';
      }
      
      setMessagingModal({
        open: true,
        applicationId,
        tenantId: application.tenant_id,
        propertyId: application.property_id,
        tenantName,
        propertyAddress,
      });
    }
  };

  const handleScheduleInterview = (applicationId: string, tenantId: string, propertyId: string) => {
    // Navigate to landlord messages with interview scheduling context
    navigate('/dashboard', { 
      state: { 
        activeTab: 'Messages', 
        applicationId, 
        action: 'schedule', 
        tenantId, 
        propertyId 
      } 
    });
  };

  const handleRentFinalized = async () => {
    if (!finalizeRentModal) return;
    
    // Update application status to approved
    await updateApplicationStatus(finalizeRentModal.applicationId, 'approved');
    
    // Refresh applications to show updated data
    await fetchApplications();
  };

  const sendContract = async (applicationId: string, tenantId: string) => {
    try {
      // Send contract notification to tenant
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: tenantId,
          title: 'Housing Contract Available',
          description: 'Your rental application has been approved! Please review and sign your housing contract.',
          type: 'contract',
          link: `/tenant-auth?tab=documents&contract=${applicationId}`
        });

      if (error) throw error;

      toast({
        title: "Contract Sent",
        description: "Housing contract has been sent to the tenant for signature.",
      });
    } catch (error) {
      console.error('Error sending contract:', error);
      toast({
        title: "Error",
        description: "Failed to send contract. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApprove = (application: any) => {
    setFinalizeRentModal({
      applicationId: application.id,
      property: application.properties,
      tenantName: application.profiles?.first_name && application.profiles?.last_name 
        ? `${application.profiles.first_name} ${application.profiles.last_name}`
        : 'Tenant'
    });
  };

  const handleDeny = async (applicationId: string) => {
    const application = applications.find((app: any) => app.id === applicationId);
    
    if (application?.is_primary_applicant) {
      // Show confirmation dialog for primary applicants
      setRejectPrimaryDialog({ open: true, application });
    } else {
      // Standard withdrawal
      await updateApplicationStatus(applicationId, 'withdrawn');
      await fetchApplications();
    }
  };

  const handleConfirmRejectPrimary = async (reason: string) => {
    if (!rejectPrimaryDialog.application) return;

    const application = rejectPrimaryDialog.application;
    try {
      await rejectPrimaryApplicant.mutateAsync({
        unitId: application.unit_id || undefined,
        propertyId: application.property_id,
        reason: reason
      });
      
      await fetchApplications();
      await fetchPrimaryApplicants();
      
      setRejectPrimaryDialog({ open: false });
    } catch (error) {
      console.error('Error rejecting primary:', error);
      setRejectPrimaryDialog({ open: false });
    }
  };

  const handleResendContract = (applicationId: string, tenantId: string) => {
    sendContract(applicationId, tenantId);
  };

  const handleViewLease = async (applicationId: string) => {
    try {
      // Find the application to get tenant/unit details
      const app = applications.find((a: any) => a.id === applicationId);
      if (!app) {
        toast({ title: "Error", description: "Application not found" });
        return;
      }
      
      // Check if a lease already exists for this tenant+unit
      const { data: existingLease } = await supabase
        .from('tenant_leases')
        .select('id')
        .eq('tenant_id', (app as any).tenant_id)
        .maybeSingle();
      
      if (existingLease) {
        toast({ title: "Lease Found", description: "A lease record already exists for this tenant." });
      } else {
        // Create a new lease from the application data
        const { error } = await supabase.from('tenant_leases').insert({
          tenant_id: (app as any).tenant_id,
          landlord_id: (app as any).landlord_id || (app as any).owner_id || '',
          lease_category: 'market_rate',
          total_monthly_rent: (app as any).monthly_rent || (app as any).proposed_rent || 0,
          tenant_portion: (app as any).monthly_rent || (app as any).proposed_rent || 0,
          hap_portion: 0,
          lease_start: new Date().toISOString().split('T')[0],
          status: 'active',
        });
        if (error) throw error;
        toast({ title: "Lease Created", description: "A new lease record has been created from this application." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading applications...</div>
      </div>
    );
  }

  return (
    <>
      <CardEnhanced variant="outlined">
        <CardEnhancedHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardEnhancedTitle className="flex items-center gap-2">
                Tenants & Applications
              </CardEnhancedTitle>
              <CardEnhancedDescription>
                Manage tenant applications and current tenants
              </CardEnhancedDescription>
            </div>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <TenantsApplicationsToggle 
            activeView={activeView}
            onViewChange={setActiveView}
          />

          {activeView === 'applications' ? (
            <ApplicationsMasterDetailView
              propertiesWithApplications={propertiesWithApplications}
              primaryApplicants={primaryApplicants}
              onViewProfile={handleViewProfile}
              onMessage={handleMessage}
              onScheduleInterview={handleScheduleInterview}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onSetAsPrimary={handleSetAsPrimary}
            />
          ) : (
            <CurrentTenantsView
              applications={applications}
              onViewProfile={handleViewProfile}
              onMessage={handleMessage}
              onViewLease={handleViewLease}
            />
          )}
        </CardEnhancedContent>
      </CardEnhanced>

      {selectedTenantModal && (
        <TenantProfileModal
          isOpen={!!selectedTenantModal}
          onClose={() => setSelectedTenantModal(null)}
          tenantId={selectedTenantModal.tenantId}
          propertyId={selectedTenantModal.propertyId}
          isPrimary={(() => {
            const key = selectedTenantModal.unitId 
              ? `${selectedTenantModal.propertyId}:${selectedTenantModal.unitId}` 
              : selectedTenantModal.propertyId;
            return primaryApplicants[key]?.id === selectedTenantModal.tenantId;
          })()}
        />
      )}

      {primaryConfirmDialog.open && primaryConfirmDialog.application && (() => {
        const unitId = primaryConfirmDialog.application.unit_id;
        const propertyId = primaryConfirmDialog.application.property_id;
        
        // Use the fresh primaries data passed directly from the fetch
        const primaries = primaryConfirmDialog.primaries || primaryApplicants;
        
        // Try unit-specific composite key first, then fall back to property-level
        const compositeKey = unitId ? `${propertyId}:${unitId}` : propertyId;
        const existingPrimary = primaries[compositeKey] || primaries[propertyId];
        
        // Check if the person being set as primary is already the primary (same tenant ID)
        const isSamePerson = existingPrimary?.id === primaryConfirmDialog.application.tenant_id;
        
        // Only show "replace" messaging if it's a DIFFERENT person
        const currentPrimaryName = isSamePerson ? undefined : existingPrimary?.name;
        
        console.log('🔍 Dialog lookup:', { 
          propertyId, 
          unitId, 
          compositeKey, 
          existingPrimary, 
          primaries,
          currentPrimaryName 
        });
        
        return (
          <PrimaryApplicantConfirmDialog
            open={primaryConfirmDialog.open}
            onOpenChange={(open) => setPrimaryConfirmDialog({ open })}
            onConfirm={handleConfirmSetPrimary}
            currentPrimaryName={currentPrimaryName}
            newApplicantName={
              primaryConfirmDialog.application.profiles?.first_name && primaryConfirmDialog.application.profiles?.last_name
                ? `${primaryConfirmDialog.application.profiles.first_name} ${primaryConfirmDialog.application.profiles.last_name}`
                : 'Applicant'
            }
            isPending={setAsPrimaryApplicant.isPending}
          />
        );
      })()}

      {finalizeRentModal && (
        <FinalizeRentModal
          property={finalizeRentModal.property}
          tenantName={finalizeRentModal.tenantName}
          applicationId={finalizeRentModal.applicationId}
          onClose={() => setFinalizeRentModal(null)}
          onSaved={handleRentFinalized}
        />
      )}

      {messagingModal?.open && (
        <ApplicantMessagingModal
          open={messagingModal.open}
          onOpenChange={(open) => setMessagingModal(prev => prev ? {...prev, open} : null)}
          applicationId={messagingModal.applicationId!}
          tenantId={messagingModal.tenantId!}
          propertyId={messagingModal.propertyId!}
          tenantName={messagingModal.tenantName}
          propertyAddress={messagingModal.propertyAddress}
        />
      )}

      {rejectPrimaryDialog.open && rejectPrimaryDialog.application && (
        <RejectPrimaryConfirmDialog
          open={rejectPrimaryDialog.open}
          onOpenChange={(open) => setRejectPrimaryDialog({ open })}
          onConfirm={handleConfirmRejectPrimary}
          applicantName={
            rejectPrimaryDialog.application.profiles?.first_name && rejectPrimaryDialog.application.profiles?.last_name
              ? `${rejectPrimaryDialog.application.profiles.first_name} ${rejectPrimaryDialog.application.profiles.last_name}`
              : 'Applicant'
          }
          isPending={rejectPrimaryApplicant.isPending}
        />
      )}
    </>
  );
};

export default LandlordApplications;
