import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  agencyId: string;
}

const PortDashboardKPIs: React.FC<Props> = ({ agencyId }) => {
  const [kpis, setKpis] = useState({ openOutgoing: 0, openIncoming: 0, slaBreaching: 0, absorbedFY: 0 });

  useEffect(() => {
    (async () => {
      const fyStart = new Date(new Date().getFullYear(), 9, 1).toISOString(); // FY starts Oct 1
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);

      const [{ count: outCount }, { count: inCount }, { count: slaCount }, { count: absorbed }] = await Promise.all([
        supabase.from('porting_requests').select('*', { count: 'exact', head: true })
          .eq('from_agency_id', agencyId).in('status', ['requested', 'approved']),
        supabase.from('porting_requests').select('*', { count: 'exact', head: true })
          .eq('to_agency_id', agencyId).in('status', ['requested', 'approved']),
        supabase.from('agency_port_packets').select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId).eq('decision', 'pending').lte('sla_deadline', sevenDays.toISOString()),
        supabase.from('agency_port_packets').select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId).eq('decision', 'absorbed').gte('decision_at', fyStart),
      ]);

      setKpis({
        openOutgoing: outCount || 0,
        openIncoming: inCount || 0,
        slaBreaching: slaCount || 0,
        absorbedFY: absorbed || 0,
      });
    })();
  }, [agencyId]);

  const items = [
    { icon: ArrowUpFromLine, label: 'Open Outgoing', value: kpis.openOutgoing, color: 'text-blue-600' },
    { icon: ArrowDownToLine, label: 'Open Incoming', value: kpis.openIncoming, color: 'text-purple-600' },
    { icon: Clock, label: 'SLA ≤7 days', value: kpis.slaBreaching, color: kpis.slaBreaching > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { icon: CheckCircle2, label: 'Absorbed (FY)', value: kpis.absorbedFY, color: 'text-green-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ icon: Icon, label, value, color }) => (
        <Card key={label}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PortDashboardKPIs;
