import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentExpirationTracker } from './DocumentExpirationTracker';
import AgencyOnboardingChecklist from './AgencyOnboardingChecklist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, FileText, ClipboardCheck, Shield, TrendingUp,
  Home, AlertTriangle, Clock, Download, Activity, ListOrdered, ArrowRight,
  MessageSquare, Bell, BarChart3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ComplianceHealthCard from './ComplianceHealthCard';
import SEMAPDashboardWidget from './SEMAPDashboardWidget';
import InspectorWorkloadCard from './InspectorWorkloadCard';
import CaseloadAnalyticsCard from './CaseloadAnalyticsCard';
import InspectionsDueWidget from './inspections/InspectionsDueWidget';
import ServiceAreaListingsFeed from './mesh/ServiceAreaListingsFeed';
import PortInAwaitingWidget from './PortInAwaitingWidget';
import RiskKPICards from './dashboard/RiskKPICards';
import PendingLandlordApprovals from './PendingLandlordApprovals';
import ExecutiveDirectorRollup from './dashboard/ExecutiveDirectorRollup';
import TeamKPIStrip from './dashboard/TeamKPIStrip';
import LaunchReadinessTile from './LaunchReadinessTile';
import { AgencyDataTable, type AgencyDataTableColumn } from './shared';

interface AgencyOverviewProps {
  stats: {
    totalTenants: number;
    pendingRfta: number;
    scheduledInspections: number;
    activeVouchers: number;
    activeLeases: number;
    expiringSoon: number;
    placementRate: number;
    waitlistPending?: number;
    waitlistTotal?: number;
    avgDaysOnWaitlist?: number;
  };
  roleName: string;
  role?: string;
  agencyId?: string;
  agencyCity?: string | null;
  agencyState?: string | null;
  onTabChange?: (tab: string) => void;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', '#f59e0b', '#10b981'];

const AgencyOverview: React.FC<AgencyOverviewProps> = ({ stats, roleName, role, agencyId, agencyCity, agencyState, onTabChange }) => {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [voucherChart, setVoucherChart] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingNotices, setPendingNotices] = useState(0);
  const [overdueRecerts, setOverdueRecerts] = useState(0);

  const isInspector = role === 'inspector';
  const isCaseworker = role === 'caseworker';

  useEffect(() => {
    if (!agencyId) return;
    const fetchExtra = async () => {
      const [actRes, vouchRes, appRes, msgRes, noticeRes, recertRes] = await Promise.all([
        supabase
          .from('agency_activity_log')
          .select('id, action, entity_type, created_at')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('agency_vouchers')
          .select('status')
          .eq('agency_id', agencyId),
        supabase
          .from('voucher_applications')
          .select('status')
          .eq('agency_id', agencyId),
        supabase
          .from('agency_messages')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('is_read', false),
        supabase
          .from('agency_notices_sent')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase
          .from('agency_recertifications')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .in('status', ['pending', 'overdue'] as any)
          .lt('due_date', new Date().toISOString()),
      ]);
      setRecentActivity(actRes.data || []);
      setUnreadMessages(msgRes.count || 0);
      setPendingNotices(noticeRes.count || 0);
      setOverdueRecerts(recertRes.count || 0);

      if (vouchRes.data?.length) {
        const counts: Record<string, number> = {};
        vouchRes.data.forEach((v: any) => { counts[v.status] = (counts[v.status] || 0) + 1; });
        setVoucherChart(Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })));
      }

      if (appRes.data?.length) {
        const appCounts: Record<string, number> = {};
        appRes.data.forEach((a: any) => { appCounts[a.status] = (appCounts[a.status] || 0) + 1; });
        setPipelineData([
          { stage: 'Applied', count: appRes.data.length },
          { stage: 'Waitlisted', count: appCounts['waitlisted'] || 0 },
          { stage: 'Approved', count: appCounts['approved'] || 0 },
          { stage: 'Voucher Issued', count: vouchRes.data?.length || 0 },
          { stage: 'Housed', count: vouchRes.data?.filter((v: any) => v.status === 'active').length || 0 },
        ]);
      }
    };
    fetchExtra();
  }, [agencyId]);

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => row[h]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { label: isCaseworker ? 'My Caseload' : 'Total Caseload', value: stats.totalTenants, icon: Users, show: !isInspector },
    { label: 'Active Vouchers', value: stats.activeVouchers, icon: Shield, show: !isInspector && !isCaseworker },
    { label: 'Pending RFTAs', value: stats.pendingRfta, icon: FileText, show: !isInspector },
    { label: isInspector ? 'My Inspections' : 'Scheduled Inspections', value: stats.scheduledInspections, icon: ClipboardCheck, show: true },
    { label: 'Active Leases', value: stats.activeLeases, icon: Home, show: !isInspector && !isCaseworker },
    { label: 'Expiring (30d)', value: stats.expiringSoon, icon: AlertTriangle, show: !isInspector && !isCaseworker },
    { label: 'Unread Messages', value: unreadMessages, icon: MessageSquare, show: !isInspector, highlight: unreadMessages > 0 },
    { label: 'Overdue Recerts', value: overdueRecerts, icon: Bell, show: !isInspector && !isCaseworker, highlight: overdueRecerts > 0 },
  ].filter(k => k.show);

  const actionItems = [
    { text: `${unreadMessages} unread messages`, tab: 'communications', count: unreadMessages, icon: MessageSquare },
    { text: `${overdueRecerts} overdue recertifications`, tab: 'recertifications', count: overdueRecerts, icon: Bell },
    { text: `${stats.waitlistPending || 0} applications pending review`, tab: 'waitlist', count: stats.waitlistPending || 0, icon: ListOrdered },
    { text: `${stats.pendingRfta} RFTAs pending review`, tab: 'rfta', count: stats.pendingRfta, icon: FileText },
    { text: `${stats.scheduledInspections} inspections scheduled`, tab: 'inspections', count: stats.scheduledInspections, icon: ClipboardCheck },
    { text: `${stats.expiringSoon} leases expiring soon`, tab: 'placements', count: stats.expiringSoon, icon: AlertTriangle },
  ].filter(a => a.count > 0);

  return (
    <div className="space-y-6">
      {/* Executive Rollup — top-line KPIs for ED + Admin */}
      {agencyId && (role === 'executive_director' || role === 'agency_admin') && (
        <ExecutiveDirectorRollup agencyId={agencyId} />
      )}

      {/* Team KPI strip — supervisors / ED / admin */}
      {agencyId && ['agency_admin','executive_director','caseworker_supervisor','inspection_supervisor'].includes(role || '') && (
        <TeamKPIStrip
          agencyId={agencyId}
          showCaseworkers={['agency_admin','executive_director','caseworker_supervisor'].includes(role || '')}
          showInspectors={['agency_admin','executive_director','inspection_supervisor'].includes(role || '')}
          onJump={() => onTabChange?.('team')}
        />
      )}

      {agencyId && <AgencyOnboardingChecklist agencyId={agencyId} onTabChange={onTabChange} />}
      {agencyId && (role === 'agency_admin' || role === 'executive_director') && (
        <LaunchReadinessTile agencyId={agencyId} onTabChange={onTabChange} />
      )}

      {/* Compliance Health */}
      {agencyId && <ComplianceHealthCard agencyId={agencyId} />}

      {/* Risk & Compliance Alerts — only renders when issues exist */}
      {agencyId && !isInspector && <RiskKPICards agencyId={agencyId} onTabChange={onTabChange} />}

      {agencyId && !isInspector && (
        <PendingLandlordApprovals agencyId={agencyId} onJump={() => onTabChange?.('compliance')} />
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi: any, i) => (
          <Card key={i} className={`hover:shadow-md transition-shadow ${kpi.highlight ? 'border-destructive/50' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.highlight ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.highlight ? 'text-destructive' : ''}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Items + Pipeline Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionItems.length ? (
              <div className="space-y-3">
                {actionItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onTabChange?.(item.tab)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="p-2 rounded-md bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium flex-1">{item.text}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">All caught up — no pending items!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Pipeline Funnel
            </CardTitle>
            {pipelineData.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => exportCSV(pipelineData, 'pipeline-funnel')}>
                <Download className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {pipelineData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No pipeline data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Voucher Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Voucher Utilization
            </CardTitle>
            {voucherChart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => exportCSV(voucherChart, 'voucher-utilization')}>
                <Download className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {voucherChart.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={voucherChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {voucherChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No voucher data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AgencyDataTable
              card={false}
              rows={recentActivity}
              rowKey={(r: any) => r.id}
              columns={[
                {
                  key: 'entity',
                  header: 'Entity',
                  cell: (r: any) => (
                    <span className="font-medium capitalize">
                      {String(r.entity_type || '').replace(/_/g, ' ')}
                    </span>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  cell: (r: any) => (
                    <span className="text-muted-foreground">
                      {String(r.action || '').replace(/_/g, ' ')}
                    </span>
                  ),
                },
                {
                  key: 'when',
                  header: 'When',
                  className: 'text-right text-xs text-muted-foreground',
                  headerClassName: 'text-right',
                  cell: (r: any) => new Date(r.created_at).toLocaleDateString(),
                },
              ] as AgencyDataTableColumn<any>[]}
              empty={{
                icon: Activity,
                title: 'No recent activity',
                description: 'Actions taken across the agency will show up here as they happen.',
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Inspector Workload + Caseload Analytics */}
      {agencyId && !isInspector && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InspectorWorkloadCard agencyId={agencyId} />
          <CaseloadAnalyticsCard agencyId={agencyId} />
        </div>
      )}

      {agencyId && (
        <InspectionsDueWidget agencyId={agencyId} />
      )}

      {agencyId && !isInspector && (
        <PortInAwaitingWidget agencyId={agencyId} onNavigate={() => onTabChange?.('portability')} />
      )}

      {/* SEMAP Dashboard Widget */}
      {agencyId && (
        <SEMAPDashboardWidget
          agencyId={agencyId}
          onNavigateToSEMAP={() => onTabChange?.('communications')}
        />
      )}

      {/* Marketplace mesh: new listings in the agency's service area (read-only) */}
      {agencyId && (agencyState || agencyCity) && (
        <ServiceAreaListingsFeed agencyCity={agencyCity ?? null} agencyState={agencyState ?? null} />
      )}

      {/* Document Expiration Tracker */}
      {agencyId && (
        <DocumentExpirationTracker agencyId={agencyId} />
      )}
    </div>
  );
};

export default AgencyOverview;
