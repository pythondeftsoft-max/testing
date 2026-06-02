import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, ArrowRight } from 'lucide-react';

interface Props {
  agencyId: string;
  onJump?: () => void;
}

export default function PendingLandlordApprovals({ agencyId, onJump }: Props) {
  const { data } = useQuery({
    queryKey: ['pending-landlord-approvals', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, count } = await (supabase as any)
        .from('agency_landlords')
        .select('id, landlord_name, w9_status, created_at', { count: 'exact' })
        .eq('agency_id', agencyId)
        .eq('onboarding_status', 'pending_review')
        .order('created_at', { ascending: true })
        .limit(5);
      return { rows: data || [], count: count ?? 0 };
    },
    staleTime: 30_000,
  });

  if (!data || data.count === 0) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-amber-600" />
            Pending Landlord Approvals
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300">
              {data.count}
            </Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onJump} className="gap-1">
            Review <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="text-sm divide-y">
          {data.rows.map((r: any) => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-2">
              <span className="font-medium truncate">{r.landlord_name}</span>
              <span className="text-xs text-muted-foreground">
                W-9: {r.w9_status} · {new Date(r.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
