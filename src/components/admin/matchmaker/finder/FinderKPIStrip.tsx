import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, Send, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinderTenant } from '@/hooks/usePropertyFinder';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface FinderKPIStripProps {
  tenants: FinderTenant[];
}

const useFinderKPIs = (currentUserId: string | undefined) => {
  return useQuery({
    queryKey: ['finder-kpis', currentUserId],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Pushes this week + last week
      const { data: recentPushes } = await supabase
        .from('property_pushes')
        .select('id, admin_id, pushed_at, status')
        .gte('pushed_at', fourteenDaysAgo.toISOString());

      const thisWeek = (recentPushes || []).filter(
        p => new Date(p.pushed_at) >= sevenDaysAgo
      );
      const lastWeek = (recentPushes || []).filter(
        p => new Date(p.pushed_at) < sevenDaysAgo
      );
      const thisWeekMine = thisWeek.filter(p => p.admin_id === currentUserId);

      // Response rate last 30d
      const { data: monthPushes } = await supabase
        .from('property_pushes')
        .select('id, status')
        .gte('pushed_at', thirtyDaysAgo.toISOString());

      const totalMonth = (monthPushes || []).length;
      const responded = (monthPushes || []).filter(p =>
        ['interested', 'denied', 'rejected', 'landlord_review', 'primary_applicant'].includes(p.status)
      ).length;
      const responseRate = totalMonth > 0 ? Math.round((responded / totalMonth) * 100) : 0;

      return {
        pushesThisWeek: thisWeek.length,
        pushesLastWeek: lastWeek.length,
        pushesThisWeekMine: thisWeekMine.length,
        responseRate,
        totalMonth,
      };
    },
    staleTime: 60 * 1000,
  });
};

export const FinderKPIStrip: React.FC<FinderKPIStripProps> = ({ tenants }) => {
  const { user } = useAuth();
  const { data: kpis } = useFinderKPIs(user?.id);

  const tenantStats = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newThisWeek = tenants.filter(t => new Date(t.created_at) >= sevenDaysAgo).length;
    const lastWeekCount = tenants.length - newThisWeek;
    const totalDays = tenants.reduce((sum, t) => sum + (t.days_looking || 0), 0);
    const avgDays = tenants.length > 0 ? Math.round(totalDays / tenants.length) : 0;
    return {
      total: tenants.length,
      newThisWeek,
      lastWeekCount,
      avgDays,
    };
  }, [tenants]);

  const pushDelta = kpis ? kpis.pushesThisWeek - kpis.pushesLastWeek : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPICard
        icon={Users}
        label="Tenants searching"
        value={tenantStats.total.toLocaleString()}
        delta={tenantStats.newThisWeek > 0 ? `+${tenantStats.newThisWeek} new this week` : undefined}
        deltaPositive={tenantStats.newThisWeek > 0}
        accent="primary"
      />
      <KPICard
        icon={Clock}
        label="Avg days looking"
        value={`${tenantStats.avgDays}d`}
        delta="across active queue"
        accent={tenantStats.avgDays >= 30 ? 'amber' : 'green'}
      />
      <KPICard
        icon={Send}
        label="Pushes this week"
        value={kpis ? kpis.pushesThisWeek.toString() : '—'}
        delta={
          kpis
            ? `${kpis.pushesThisWeekMine} by you${pushDelta !== 0 ? ` · ${pushDelta > 0 ? '+' : ''}${pushDelta} vs last wk` : ''}`
            : undefined
        }
        deltaPositive={pushDelta > 0}
        deltaNegative={pushDelta < 0}
        accent="primary"
      />
      <KPICard
        icon={TrendingUp}
        label="Response rate (30d)"
        value={kpis ? `${kpis.responseRate}%` : '—'}
        delta={kpis ? `${kpis.totalMonth} pushes` : undefined}
        accent={
          kpis && kpis.responseRate >= 50 ? 'green' : kpis && kpis.responseRate >= 25 ? 'amber' : 'red'
        }
      />
    </div>
  );
};

interface KPICardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  deltaNegative?: boolean;
  accent?: 'primary' | 'green' | 'amber' | 'red';
}

const accentClasses = {
  primary: 'text-primary bg-primary/10',
  green: 'text-green-600 bg-green-50',
  amber: 'text-amber-600 bg-amber-50',
  red: 'text-red-600 bg-red-50',
};

const KPICard: React.FC<KPICardProps> = ({
  icon: Icon,
  label,
  value,
  delta,
  deltaPositive,
  deltaNegative,
  accent = 'primary',
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          {delta && (
            <p
              className={cn(
                'text-xs mt-1 flex items-center gap-1',
                deltaPositive && 'text-green-600',
                deltaNegative && 'text-red-600',
                !deltaPositive && !deltaNegative && 'text-muted-foreground'
              )}
            >
              {deltaPositive && <ArrowUp className="w-3 h-3" />}
              {deltaNegative && <ArrowDown className="w-3 h-3" />}
              {delta}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', accentClasses[accent])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);
