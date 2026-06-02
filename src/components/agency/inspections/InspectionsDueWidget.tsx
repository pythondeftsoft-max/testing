import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  agencyId: string;
}

const InspectionsDueWidget: React.FC<Props> = ({ agencyId }) => {
  const [counts, setCounts] = useState({ thisWeek: 0, overdue: 0, abatementRisk: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [weekRes, overdueRes, abateRes] = await Promise.all([
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'scheduled')
          .gte('scheduled_date', now.toISOString())
          .lte('scheduled_date', weekFromNow.toISOString()),
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'scheduled')
          .lt('scheduled_date', now.toISOString()),
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('abatement_triggered', true)
          .is('abatement_cleared_at', null),
      ]);

      setCounts({
        thisWeek: weekRes.count || 0,
        overdue: overdueRes.count || 0,
        abatementRisk: abateRes.count || 0,
      });
      setLoading(false);
    };
    load();
  }, [agencyId]);

  if (loading) return <Card><CardContent className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" /> Inspections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded bg-muted/50">
            <p className="text-2xl font-bold">{counts.thisWeek}</p>
            <p className="text-xs text-muted-foreground">Due this week</p>
          </div>
          <div className={`p-2 rounded ${counts.overdue > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
            <p className={`text-2xl font-bold ${counts.overdue > 0 ? 'text-destructive' : ''}`}>{counts.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className={`p-2 rounded ${counts.abatementRisk > 0 ? 'bg-warning/10' : 'bg-muted/50'}`}>
            <p className="text-2xl font-bold">{counts.abatementRisk}</p>
            <p className="text-xs text-muted-foreground">Abatement risk</p>
          </div>
        </div>
        {counts.abatementRisk > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" />
            HAP contracts flagged after failed inspection
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InspectionsDueWidget;
