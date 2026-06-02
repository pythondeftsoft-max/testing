import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, DollarSign, ClipboardCheck, RefreshCw, Home, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  agencyId: string;
}

interface Rollup {
  hapThisMonth: number;
  inspectionsCompleted30d: number;
  inspectionsScheduled: number;
  recertsOnTimeRate: number;
  leaseUpRate: number;
  activeVouchers: number;
  activeLeases: number;
}

const ExecutiveDirectorRollup: React.FC<Props> = ({ agencyId }) => {
  const [data, setData] = useState<Rollup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [hapRes, inspDoneRes, inspSchedRes, recertRes, vouchRes, leaseRes] = await Promise.all([
        supabase
          .from('agency_hap_batches' as any)
          .select('total_amount, status, created_at')
          .eq('agency_id', agencyId)
          .gte('created_at', monthStart)
          .in('status', ['paid', 'sent', 'completed']),
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'completed')
          .gte('updated_at', thirtyDaysAgo),
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .in('status', ['scheduled', 'in_progress'] as any),
        supabase
          .from('agency_recertifications')
          .select('status, due_date, completed_at'),
        supabase
          .from('agency_vouchers')
          .select('status')
          .eq('agency_id', agencyId),
        supabase
          .from('tenant_leases')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'active'),
      ]);

      const hapRows = (hapRes.data || []) as any[];
      const hapThisMonth = hapRows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

      const recerts = (recertRes.data || []) as any[];
      const completedRecerts = recerts.filter(r => r.completed_at);
      const onTime = completedRecerts.filter(r => {
        if (!r.due_date || !r.completed_at) return false;
        return new Date(r.completed_at) <= new Date(r.due_date);
      }).length;
      const recertsOnTimeRate = completedRecerts.length
        ? Math.round((onTime / completedRecerts.length) * 100)
        : 0;

      const vouchers = (vouchRes.data || []) as any[];
      const issued = vouchers.filter(v => ['issued', 'searching', 'leased_up', 'expired'].includes(v.status)).length;
      const leasedUp = vouchers.filter(v => v.status === 'leased_up').length;
      const leaseUpRate = issued ? Math.round((leasedUp / issued) * 100) : 0;
      const activeVouchers = vouchers.filter(v => ['issued', 'searching', 'leased_up'].includes(v.status)).length;

      setData({
        hapThisMonth,
        inspectionsCompleted30d: inspDoneRes.count || 0,
        inspectionsScheduled: inspSchedRes.count || 0,
        recertsOnTimeRate,
        leaseUpRate,
        activeVouchers,
        activeLeases: leaseRes.count || 0,
      });
      setLoading(false);
    };
    load();
  }, [agencyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const tiles = [
    {
      label: 'HAP Disbursed (MTD)',
      value: fmtMoney(data.hapThisMonth),
      icon: DollarSign,
      tone: 'text-primary',
    },
    {
      label: 'Inspections Completed (30d)',
      value: data.inspectionsCompleted30d.toString(),
      sub: `${data.inspectionsScheduled} scheduled`,
      icon: ClipboardCheck,
      tone: 'text-accent',
    },
    {
      label: 'Recerts On Time',
      value: `${data.recertsOnTimeRate}%`,
      icon: RefreshCw,
      tone: data.recertsOnTimeRate >= 90 ? 'text-success' : data.recertsOnTimeRate >= 75 ? 'text-warning' : 'text-destructive',
    },
    {
      label: 'Lease-Up Rate',
      value: `${data.leaseUpRate}%`,
      sub: `${data.activeVouchers} active vouchers`,
      icon: Home,
      tone: 'text-primary',
    },
    {
      label: 'Active Leases',
      value: data.activeLeases.toString(),
      icon: TrendingUp,
      tone: 'text-success',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          Executive Rollup
          <span className="text-xs text-muted-foreground font-normal ml-2">
            Top-line KPIs across all roles
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {tiles.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="rounded-lg border bg-card/50 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Icon className={`h-3.5 w-3.5 ${t.tone}`} />
                  {t.label}
                </div>
                <p className={`text-xl font-semibold ${t.tone}`}>{t.value}</p>
                {t.sub && <p className="text-xs text-muted-foreground mt-0.5">{t.sub}</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutiveDirectorRollup;
