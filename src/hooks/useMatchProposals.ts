import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MatchProposal {
  id: string;
  tenant_id: string;
  unit_id: string;
  created_by: string;
  status: 'pending_tenant' | 'tenant_interested' | 'tenant_declined' | 'pending_landlord' | 'primary_applicant' | 'landlord_approved' | 'landlord_denied' | 'expired' | 'cancelled';
  admin_notes: string | null;
  tenant_responded_at: string | null;
  tenant_notes: string | null;
  landlord_responded_at: string | null;
  landlord_notes: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface MatchProposalWithDetails extends MatchProposal {
  property_units: {
    id: string;
    unit_name: string | null;
    unit_number: string | null;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number;
    square_feet: number | null;
    unit_square_feet: number | null;
    description: string | null;
    photos: string[] | null;
    unit_photos: string[] | null;
    video_tour_url: string | null;
    unit_amenities: string[] | null;
    amenities: string | null;
    properties: {
      id: string;
      address: string;
      street_address: string | null;
      city: string;
      state: string;
      zipcode: string;
      owner_id: string;
      photos: string[] | null;
      description: string | null;
      pet_policy: string | null;
      square_feet: number | null;
      amenities: string[] | null;
    };
  };
  tenant?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

// Hook to fetch pending match for a tenant (from property_pushes table)
export const useTenantPendingMatch = (tenantId: string | undefined) => {
  return useQuery({
    queryKey: ['tenant-pending-match', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      // Query property_pushes for pending pushes (push_sent, interested, or landlord_review)
      const { data: pushData, error: pushError } = await supabase
        .from('property_pushes')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['push_sent', 'interested', 'landlord_review', 'primary_applicant'])
        .gt('expires_at', new Date().toISOString()) // Not expired
        .order('pushed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pushError) throw pushError;
      if (!pushData) return null;

      // Use unit_id to fetch unit details (falls back to property_id for old records)
      const unitIdToQuery = pushData.unit_id || pushData.property_id;
      
      const { data: unitData, error: unitError } = await supabase
        .from('property_units')
        .select(`
          id,
          unit_name,
          unit_number,
          bedrooms,
          bathrooms,
          monthly_rent,
          square_feet,
          unit_square_feet,
          description,
          photos,
          unit_photos,
          video_tour_url,
          unit_amenities,
          amenities,
          properties (
            id,
            address,
            street_address,
            city,
            state,
            zipcode,
            owner_id,
            photos,
            description,
            pet_policy,
            square_feet,
            amenities
          )
        `)
        .eq('id', unitIdToQuery)
        .single();

      if (unitError) throw unitError;

      // Map push status to proposal status
      const mapStatus = (status: string): 'pending_tenant' | 'tenant_interested' | 'primary_applicant' => {
        if (status === 'primary_applicant') return 'primary_applicant';
        return (status === 'interested' || status === 'landlord_review') 
          ? 'tenant_interested' 
          : 'pending_tenant';
      };

      return {
        id: pushData.id,
        tenant_id: pushData.tenant_id,
        unit_id: pushData.unit_id || pushData.property_id,
        created_by: pushData.admin_id,
        status: mapStatus(pushData.status),
        admin_notes: null,
        tenant_responded_at: pushData.status === 'interested' ? pushData.updated_at : null,
        tenant_notes: null,
        landlord_responded_at: null,
        landlord_notes: null,
        created_at: pushData.pushed_at,
        updated_at: pushData.updated_at || pushData.pushed_at,
        expires_at: pushData.expires_at,
        property_units: unitData,
      } as MatchProposalWithDetails;
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Poll every 30 seconds for new matches
    refetchOnWindowFocus: true, // Refetch when user focuses the tab
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};

// Hook to fetch ALL matches for a tenant (for history view) - from property_pushes
export const useTenantMatchHistory = (tenantId: string | undefined) => {
  return useQuery({
    queryKey: ['tenant-match-history', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Query all property_pushes for this tenant
      const { data: pushes, error: pushError } = await supabase
        .from('property_pushes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('pushed_at', { ascending: false });

      if (pushError) throw pushError;
      if (!pushes || pushes.length === 0) return [];

      // Get all unit IDs - use unit_id if available, otherwise fall back to property_id
      const unitIds = [...new Set(pushes.map(p => p.unit_id || p.property_id))];

      // Fetch all units in one query
      const { data: units, error: unitError } = await supabase
        .from('property_units')
        .select(`
          id,
          unit_name,
          unit_number,
          bedrooms,
          bathrooms,
          monthly_rent,
          square_feet,
          unit_square_feet,
          description,
          photos,
          unit_photos,
          video_tour_url,
          unit_amenities,
          amenities,
          properties (
            id,
            address,
            street_address,
            city,
            state,
            zipcode,
            owner_id,
            photos,
            description,
            pet_policy,
            square_feet,
            amenities
          )
        `)
        .in('id', unitIds);

      if (unitError) throw unitError;

      // Create a map for quick lookup
      const unitMap = new Map(units?.map(u => [u.id, u]) || []);

      // Map push status to match proposal status
      const mapPushStatus = (status: string): MatchProposalWithDetails['status'] => {
        switch (status) {
          case 'push_sent': return 'pending_tenant';
          case 'interested': return 'tenant_interested';
          case 'denied': return 'tenant_declined';
          case 'landlord_review': return 'pending_landlord';
          case 'primary_applicant': return 'primary_applicant';
          default: return 'pending_tenant';
        }
      };

      // Transform to MatchProposalWithDetails format
      return pushes.map(push => {
        const unitIdForLookup = push.unit_id || push.property_id;
        return {
          id: push.id,
          tenant_id: push.tenant_id,
          unit_id: unitIdForLookup,
          created_by: push.admin_id,
          status: mapPushStatus(push.status),
          admin_notes: null,
          tenant_responded_at: push.status !== 'push_sent' ? push.pushed_at : null,
          tenant_notes: null,
          landlord_responded_at: push.status === 'primary_applicant' ? push.pushed_at : null,
          landlord_notes: null,
          created_at: push.pushed_at,
          updated_at: push.pushed_at,
          expires_at: push.expires_at,
          property_units: unitMap.get(unitIdForLookup) || null,
        };
      }) as MatchProposalWithDetails[];
    },
    enabled: !!tenantId,
  });
};

// Hook to fetch pending matches for landlord's properties
export const useLandlordPendingMatches = (landlordId: string | undefined) => {
  return useQuery({
    queryKey: ['landlord-pending-matches', landlordId],
    queryFn: async () => {
      if (!landlordId) return [];

      const { data, error } = await supabase
        .from('match_proposals')
        .select(`
          *,
          property_units (
            id,
            unit_name,
            unit_number,
            bedrooms,
            bathrooms,
            monthly_rent,
            properties!inner (
              id,
              address,
              city,
              state,
              zipcode,
              owner_id
            )
          ),
          tenant:profiles!match_proposals_tenant_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'pending_landlord')
        .eq('property_units.properties.owner_id', landlordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MatchProposalWithDetails[];
    },
    enabled: !!landlordId,
  });
};

// Hook for admin to create match proposals
export const useCreateMatchProposal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      unitId,
      adminNotes
    }: {
      tenantId: string;
      unitId: string;
      adminNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('match_proposals')
        .insert({
          tenant_id: tenantId,
          unit_id: unitId,
          created_by: user.id,
          admin_notes: adminNotes || null,
          status: 'pending_tenant'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant-pending-match'] }),
        queryClient.invalidateQueries({ queryKey: ['landlord-pending-matches'] }),
        queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] }),
      ]);
      toast.success('Match proposal sent to tenant');
    },
    onError: (error: any) => {
      console.error('Create match proposal error:', error);
      toast.error(`Failed to create match: ${error.message}`);
    }
  });
};

const PUBLISHED_URL = typeof window !== 'undefined' ? window.location.origin : 'https://openkey-housing-hub.lovable.app';

// Send SMS notification when a tenant expresses interest
const sendInterestNotification = async (pushData: any) => {
  try {
    const propertyId = pushData.property_id;
    const unitId = pushData.unit_id;
    const tenantId = pushData.tenant_id;
    const adminId = pushData.admin_id;

    // Fetch property details
    const { data: property } = await supabase
      .from('properties')
      .select('address, street_address, city, state, admin_listed, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property) return;

    // Fetch unit info
    let unitInfo = '';
    if (unitId) {
      const { data: unit } = await supabase
        .from('property_units')
        .select('unit_number, unit_name')
        .eq('id', unitId)
        .single();
      if (unit?.unit_number) unitInfo = `, Unit ${unit.unit_number}`;
      else if (unit?.unit_name) unitInfo = `, ${unit.unit_name}`;
    }

    // Fetch tenant name
    const { data: tenant } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', tenantId)
      .single();

    const tenantName = tenant ? [tenant.first_name, tenant.last_name].filter(Boolean).join(' ') : 'A tenant';
    const address = property.street_address || property.address || 'your property';

    // Determine recipient
    let recipientPhone: string | null = null;
    let recipientName = '';
    let link = '';

    if (property.admin_listed && adminId) {
      // Admin-listed: notify the admin who pushed
      const { data: admin } = await supabase
        .from('profiles')
        .select('phone, first_name')
        .eq('id', adminId)
        .single();
      recipientPhone = admin?.phone || null;
      recipientName = admin?.first_name || '';
      link = `${PUBLISHED_URL}/admin?tab=pipeline`;
    } else if (property.owner_id) {
      // Landlord-owned: notify the landlord
      const { data: landlord } = await supabase
        .from('profiles')
        .select('phone, first_name')
        .eq('id', property.owner_id)
        .single();
      recipientPhone = landlord?.phone || null;
      recipientName = landlord?.first_name || '';
      link = `${PUBLISHED_URL}/landlord?tab=applications`;
    }

    if (!recipientPhone) {
      console.log('Interest notification: no phone for recipient, skipping SMS');
      return;
    }

    const greeting = recipientName ? `Hi ${recipientName}, ` : '';
    const smsBody = `${greeting}${tenantName} is interested in your property at ${address}${unitInfo}. Review: ${link}`;

    await supabase.functions.invoke('send-sms', {
      body: {
        to: recipientPhone,
        body: smsBody,
        property_id: propertyId,
        tenant_id: tenantId,
      },
    });

    console.log('Interest notification SMS sent successfully');
  } catch (err) {
    console.error('sendInterestNotification error:', err);
  }
};

// Hook for tenant to respond to match - ONLY updates property_pushes (unified flow)
export const useTenantRespondToMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      interested,
      notes
    }: {
      proposalId: string;
      interested: boolean;
      notes?: string;
    }) => {
      // Update property_pushes table - this is the ONLY source of truth
      // When tenant is interested, move to landlord_review so landlord can act
      const newStatus = interested ? 'landlord_review' : 'denied';
      
      const { data, error } = await supabase
        .from('property_pushes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId)
        .select('*, tenant_id, unit_id, property_id')
        .maybeSingle();

      if (error) throw error;
      
      console.log(`✅ Tenant response recorded: push ${proposalId} -> ${newStatus}`);
      
      return { ...data, interested };
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant-pending-match'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-match-history'] }),
        queryClient.invalidateQueries({ queryKey: ['landlord-push-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['landlord-pending-matches'] }),
        queryClient.invalidateQueries({ queryKey: ['push-status'] }),
      ]);
      
      if (data.interested) {
        toast.success('Interest sent! The landlord will review your application.');
        
        // Non-blocking: send SMS notification to landlord or admin
        sendInterestNotification(data).catch(err => {
          console.error('Interest notification SMS failed (non-blocking):', err);
        });
      } else {
        toast.info('Match declined');
      }
    },
    onError: (error: any) => {
      console.error('Tenant respond error:', error);
      toast.error(`Failed to respond: ${error.message}`);
    }
  });
};

// Hook for landlord to respond to match (approve sets primary applicant)
export const useLandlordRespondToMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      unitId,
      tenantId,
      approved,
      notes
    }: {
      proposalId: string;
      unitId: string;
      tenantId: string;
      approved: boolean;
      notes?: string;
    }) => {
      const newStatus = approved ? 'landlord_approved' : 'landlord_denied';
      
      // Update the proposal status
      const { error: proposalError } = await supabase
        .from('match_proposals')
        .update({
          status: newStatus,
          landlord_responded_at: new Date().toISOString(),
          landlord_notes: notes || null
        })
        .eq('id', proposalId);

      if (proposalError) throw proposalError;

      // If approved, call the existing set primary applicant RPC
      if (approved) {
        const { error: primaryError } = await supabase.rpc('landlord_set_primary_applicant', {
          p_unit_id: unitId,
          p_tenant_id: tenantId
        });

        if (primaryError) throw primaryError;
      }

      return { approved, proposalId };
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant-pending-match'] }),
        queryClient.invalidateQueries({ queryKey: ['landlord-pending-matches'] }),
        queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] }),
        queryClient.invalidateQueries({ queryKey: ['property-units'] }),
        queryClient.invalidateQueries({ queryKey: ['unit-applications'] }),
      ]);
      
      if (data.approved) {
        toast.success('Tenant set as primary applicant - continue with your normal flow');
      } else {
        toast.info('Match denied - tenant returned to pool');
      }
    },
    onError: (error: any) => {
      console.error('Landlord respond error:', error);
      toast.error(`Failed to respond: ${error.message}`);
    }
  });
};
