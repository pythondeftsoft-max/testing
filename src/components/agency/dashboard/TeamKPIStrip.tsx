import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ClipboardCheck, AlertTriangle, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  agencyId: string;
  showCaseworkers: boolean;
  showInspectors: boolean;
  onJump: () => void;
}

interface TeamMetrics {
  activeStaff: number;
  avgCaseload: number;
  overdueWork: number;
  reassignments: number;
}

/**
 * Compact 4-card strip surfacing workforce KPIs for supervisors / ED / admin.
 * All clicks jump into the Team tab. No new RPCs — reads existing tables.
 */
const TeamKPIStrip: React.FC<Props> = ({ agencyId, showCaseworkers, showInspectors, onJump }) => {
  const [m, setM] = useState<TeamMetrics>({ activeStaff: 0, avgCaseload: 0, overdueWork: 0, reassignments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const allowedRoles: string[] = [];
      if (showCaseworkers) allowedRoles.push('caseworker');
      if (showInspectors) allowedRoles.push('inspector');

      const staffPromise = (supabase
        .from('agency_staff') as any)
        .select('id, role')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .in('role', allowedRoles.length ? allowedRoles : ['caseworker', 'inspector']);

      const tenantsPromise = showCaseworkers
        ? (supabase.from('tenant_profiles') as any)
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', agencyId)
        : Promise.resolve({ count: 0 });

      const inspPromise = showInspectors
        ? (supabase.from('inspections') as any)
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', agencyId)
            .eq('status', 'scheduled')
            .lt('scheduled_date', new Date().toISOString())
        : Promise.resolve({ count: 0 });

      const assignPromise = showCaseworkers
        ? (supabase.from('caseworker_assignments') as any)
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', agencyId)
        : Promise.resolve({ count: 0 });

      const [staffRes, tenantsRes, inspRes, assignRes] = await Promise.all([
        staffPromise, tenantsPromise, inspPromise, assignPromise,
      ]);

      if (cancelled) return;

      const staff = ((staffRes as any).data || []) as Array<{ id: string; role: string }>;
      const totalTenants = (tenantsRes as any).count ?? 0;
      const overdueInsp = (inspRes as any).count ?? 0;
      const totalAssigned = (assignRes as any).count ?? 0;

      const caseworkerCount = staff.filter(s => s.role === 'caseworker').length;
      const avg = caseworkerCount ? Math.round(totalTenants / caseworkerCount) : 0;
      const unassigned = Math.max(0, totalTenants - totalAssigned);

      setM({
        activeStaff: staff.length,
        avgCaseload: avg,
        overdueWork: overdueInsp,
        reassignments: unassigned,
      });
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [agencyId, showCaseworkers, showInspectors]);

  const cards = [
    { label: 'Active staff',    value: m.activeStaff,    icon: Users,           tone: 'text-primary' },
    { label: 'Avg caseload',    value: m.avgCaseload,    icon: ClipboardCheck,  tone: 'text-foreground', show: showCaseworkers },
    { label: 'Overdue in team', value: m.overdueWork,    icon: AlertTriangle,   tone: m.overdueWork > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Unassigned',      value: m.reassignments,  icon: ArrowRightLeft,  tone: m.reassignments > 0 ? 'text-amber-600' : 'text-muted-foreground', show: showCaseworkers },
  ].filter(c => c.show !== false);

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> My Team
          </h3>
          <button
            type="button"
            onClick={onJump}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Open team view <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className={`grid gap-3 ${cards.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
          {cards.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                type="button"
                onClick={onJump}
                className="text-left rounded-md border bg-background hover:bg-muted/50 transition-colors px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                  <Icon className={`w-3 h-3 ${c.tone}`} /> {c.label}
                </div>
                <div className={`text-xl font-semibold ${c.tone}`}>
                  {loading ? '—' : c.value}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamKPIStrip;
