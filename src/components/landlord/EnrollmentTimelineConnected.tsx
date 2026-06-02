import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import EnrollmentTimeline from './EnrollmentTimeline';

interface Props { userId: string; userEmail?: string | null; }

/** Fetches the landlord's first agency_landlords row and renders the timeline. */
export default function EnrollmentTimelineConnected({ userId, userEmail }: Props) {
  const { data: agencyLandlord } = useQuery({
    queryKey: ['agency-landlord-self', userId, userEmail],
    enabled: !!userId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('agency_landlords')
        .select('id, agency_id, w9_status, payment_method, pay_ready, onboarding_status')
        .limit(1);
      const { data: byId } = await q.eq('landlord_id', userId).maybeSingle();
      if (byId) return byId;
      if (userEmail) {
        const { data: byEmail } = await (supabase as any)
          .from('agency_landlords')
          .select('id, agency_id, w9_status, payment_method, pay_ready, onboarding_status')
          .ilike('landlord_email', userEmail)
          .maybeSingle();
        return byEmail ?? null;
      }
      return null;
    },
    staleTime: 60_000,
  });

  return <EnrollmentTimeline userId={userId} agencyLandlord={agencyLandlord ?? null} />;
}
