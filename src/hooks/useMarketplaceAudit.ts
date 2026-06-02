import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceAuditEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  created_at: string;
  metadata: any;
  user_email?: string;
  user_name?: string;
  property_address?: string;
}

export interface AuditStats {
  totalEvents: number;
  propertyListings: number;
  propertyDelistings: number;
  searchViews: number;
  cardShows: number;
  applicationsStarted: number;
  applicationsSubmitted: number;
  optIns: number;
  matchesApproved: number;
  matchesPaid: number;
  matchesMovedIn: number;
}

export const useMarketplaceAudit = (filters?: {
  eventType?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}) => {
  return useQuery({
    queryKey: ['marketplace-audit', filters],
    queryFn: async () => {
      // Fetch marketplace events
      let eventsQuery = supabase
        .from('marketplace_events')
        .select('id, event_type, user_id, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.eventType) {
        eventsQuery = eventsQuery.eq('event_type', filters.eventType);
      }
      if (filters?.startDate) {
        eventsQuery = eventsQuery.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        eventsQuery = eventsQuery.lte('created_at', filters.endDate);
      }
      if (filters?.userId) {
        eventsQuery = eventsQuery.eq('user_id', filters.userId);
      }

      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      // Fetch profiles separately for manual join
      const eventUserIds = [...new Set((events || []).map(e => e.user_id).filter(Boolean))];
      let profilesData: any[] = [];
      
      if (eventUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', eventUserIds);
        
        if (!profilesError && profiles) {
          profilesData = profiles;
        }
      }

      // Create profile lookup map
      const profileMap = new Map(profilesData.map(p => [p.id, p]));

      // Fetch property data for pipeline change events
      const pipelineChangeEvents = (events || []).filter(e => e.event_type === 'property_pipeline_change');
      const propertyUnitIds = [...new Set(pipelineChangeEvents.map(e => {
        const meta = e.metadata as any;
        return meta?.property_unit_id;
      }).filter(Boolean))];
      let propertyUnitsData: any[] = [];
      
      if (propertyUnitIds.length > 0) {
        const { data: propertyUnits, error: propertyError } = await supabase
          .from('property_units')
          .select('id, unit_number, properties(id, address)')
          .in('id', propertyUnitIds);
        
        if (!propertyError && propertyUnits) {
          propertyUnitsData = propertyUnits;
        }
      }

      // Create property lookup map
      const propertyMap = new Map(propertyUnitsData.map(pu => [pu.id, pu]));

      // Fetch match outcomes
      let matchesQuery = supabase
        .from('unit_applications')
        .select(`
          id,
          status,
          tenant_id,
          created_at,
          lease_signed_date,
          payment_received_date,
          move_in_date,
          property_units (
            unit_number,
            properties (
              address
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.startDate) {
        matchesQuery = matchesQuery.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        matchesQuery = matchesQuery.lte('created_at', filters.endDate);
      }
      if (filters?.userId) {
        matchesQuery = matchesQuery.eq('tenant_id', filters.userId);
      }

      const { data: matches, error: matchesError } = await matchesQuery;
      if (matchesError) throw matchesError;

      // Fetch tenant profiles for matches
      const tenantIds = [...new Set((matches || []).map(m => m.tenant_id).filter(Boolean))];
      let tenantProfilesData: any[] = [];
      
      if (tenantIds.length > 0) {
        const { data: tenantProfiles, error: tenantProfilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', tenantIds);
        
        if (!tenantProfilesError && tenantProfiles) {
          tenantProfilesData = tenantProfiles;
        }
      }

      // Create tenant profile lookup map
      const tenantProfileMap = new Map(tenantProfilesData.map(p => [p.id, p]));

      // Transform events with manual profile join
      const transformedEvents: MarketplaceAuditEvent[] = (events || []).map(event => {
        const profile = profileMap.get(event.user_id);
        let propertyAddress = undefined;
        
        // For pipeline change events, get property address
        if (event.event_type === 'property_pipeline_change') {
          const meta = event.metadata as any;
          if (meta?.property_unit_id) {
            const propertyUnit = propertyMap.get(meta.property_unit_id);
            if (propertyUnit?.properties) {
              propertyAddress = propertyUnit.properties.address;
            }
          }
        }
        
        return {
          id: event.id,
          event_type: event.event_type,
          user_id: event.user_id,
          created_at: event.created_at,
          metadata: event.metadata,
          user_email: profile?.email,
          user_name: profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : undefined,
          property_address: propertyAddress,
        };
      });

      // Add match events with manual profile join
      const matchEvents: MarketplaceAuditEvent[] = (matches || []).flatMap(match => {
        const events: MarketplaceAuditEvent[] = [];
        const propertyAddress = (match.property_units as any)?.properties?.address;
        const tenantProfile = tenantProfileMap.get(match.tenant_id);
        const userName = tenantProfile?.first_name && tenantProfile?.last_name
          ? `${tenantProfile.first_name} ${tenantProfile.last_name}`
          : undefined;

        // Match approved
        if (match.status === 'approved') {
          events.push({
            id: `${match.id}-approved`,
            event_type: 'match_approved',
            user_id: null,
            created_at: match.created_at,
            metadata: { match_id: match.id },
            user_email: tenantProfile?.email,
            user_name: userName,
            property_address: propertyAddress,
          });
        }

        // Lease signed
        if (match.lease_signed_date) {
          events.push({
            id: `${match.id}-lease`,
            event_type: 'lease_signed',
            user_id: null,
            created_at: match.lease_signed_date,
            metadata: { match_id: match.id },
            user_email: tenantProfile?.email,
            user_name: userName,
            property_address: propertyAddress,
          });
        }

        // Payment received
        if (match.payment_received_date) {
          events.push({
            id: `${match.id}-payment`,
            event_type: 'payment_received',
            user_id: null,
            created_at: match.payment_received_date,
            metadata: { match_id: match.id },
            user_email: tenantProfile?.email,
            user_name: userName,
            property_address: propertyAddress,
          });
        }

        // Move in
        if (match.move_in_date) {
          events.push({
            id: `${match.id}-movein`,
            event_type: 'move_in_completed',
            user_id: null,
            created_at: match.move_in_date,
            metadata: { match_id: match.id },
            user_email: tenantProfile?.email,
            user_name: userName,
            property_address: propertyAddress,
          });
        }

        return events;
      });

      const allEvents = [...transformedEvents, ...matchEvents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Calculate stats
      const pipelineChanges = transformedEvents.filter(e => e.event_type === 'property_pipeline_change');
      const stats: AuditStats = {
        totalEvents: allEvents.length,
        propertyListings: pipelineChanges.filter(e => {
          const meta = e.metadata as any;
          return meta?.on_market === true;
        }).length,
        propertyDelistings: pipelineChanges.filter(e => {
          const meta = e.metadata as any;
          return meta?.on_market === false;
        }).length,
        searchViews: transformedEvents.filter(e => e.event_type === 'search_view_loaded').length,
        cardShows: transformedEvents.filter(e => e.event_type === 'card_shown').length,
        applicationsStarted: transformedEvents.filter(e => e.event_type === 'application_started').length,
        applicationsSubmitted: transformedEvents.filter(e => e.event_type === 'application_submitted').length,
        optIns: transformedEvents.filter(e => e.event_type === 'opt_in_clicked').length,
        matchesApproved: matchEvents.filter(e => e.event_type === 'match_approved').length,
        matchesPaid: matchEvents.filter(e => e.event_type === 'payment_received').length,
        matchesMovedIn: matchEvents.filter(e => e.event_type === 'move_in_completed').length,
      };

      return { events: allEvents, stats };
    },
    staleTime: 30000, // 30 seconds
  });
};
