import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Users, Building2, FileText, 
  ClipboardCheck, Ticket, Activity, AlertTriangle, Search, StickyNote
} from 'lucide-react';
import { useAgencyCRMNoteCounts } from '@/components/admin/AgencyCRMPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'hsl(var(--muted-foreground))',
  submitted: 'hsl(var(--primary))',
  under_review: 'hsl(var(--chart-3, 30 80% 55%))',
  approved: 'hsl(var(--chart-2, 160 60% 45%))',
  denied: 'hsl(var(--destructive))',
  waitlisted: 'hsl(var(--chart-4, 280 65% 60%))',
};

// Shared data hook
export function useAnalyticsData() {
  const { data: agencies = [] } = useQuery({
    queryKey: ['analytics-agencies'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('housing_authorities')
          .select('id, name, state, city, is_active')
          .order('name')
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    }
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['analytics-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_staff')
        .select('agency_id, role, is_active, profiles:user_id(last_sign_in_at)')
        .eq('is_active', true);
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: tenantsByAgency = [] } = useQuery({
    queryKey: ['analytics-tenants-by-agency'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('tenant_profiles')
          .select('agency_id')
          .not('agency_id', 'is', null)
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    }
  });

  const { data: rftaData = [] } = useQuery({
    queryKey: ['analytics-rfta-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rfta_packets').select('status, agency_id');
      if (error) throw error;
      return data;
    }
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['analytics-applications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('voucher_applications').select('status, agency_id');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['analytics-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inspections').select('status, result, agency_id');
      if (error) throw error;
      return data;
    }
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ['analytics-vouchers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agency_vouchers').select('status, agency_id');
      if (error) throw error;
      return data;
    }
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['analytics-activity-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_activity_log')
        .select('*, housing_authorities:agency_id(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    }
  });

  return { agencies, allStaff, tenantsByAgency, rftaData, applications, inspections, vouchers, recentActivity };
}

// ===== State Coverage Section =====
export const StateCoverageSection = () => {
  const { agencies, allStaff, tenantsByAgency } = useAnalyticsData();

  const stateBreakdown = useMemo(() => {
    const map = new Map<string, { agencies: number; staff: number; tenants: number }>();
    agencies.forEach(a => {
      const st = a.state || 'Unknown';
      const entry = map.get(st) || { agencies: 0, staff: 0, tenants: 0 };
      entry.agencies++;
      map.set(st, entry);
    });
    allStaff.forEach((s: any) => {
      const agency = agencies.find(a => a.id === s.agency_id);
      const st = agency?.state || 'Unknown';
      const entry = map.get(st) || { agencies: 0, staff: 0, tenants: 0 };
      entry.staff++;
      map.set(st, entry);
    });
    tenantsByAgency.forEach((t: any) => {
      const agency = agencies.find(a => a.id === t.agency_id);
      const st = agency?.state || 'Unknown';
      const entry = map.get(st) || { agencies: 0, staff: 0, tenants: 0 };
      entry.tenants++;
      map.set(st, entry);
    });
    return Array.from(map.entries())
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.tenants - a.tenants);
  }, [agencies, allStaff, tenantsByAgency]);

  const top10States = stateBreakdown.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-base">State Coverage Breakdown</CardTitle>
            <CardDescription>{stateBreakdown.length} states with agencies</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {top10States.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Top 10 States by Tenant Count</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top10States} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="state" type="category" tick={{ fontSize: 11 }} width={35} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--popover-foreground))' }} />
                <Bar dataKey="tenants" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Tenants" />
                <Bar dataKey="staff" fill="hsl(var(--chart-2, 160 60% 45%))" radius={[0, 4, 4, 0]} name="Staff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Agencies</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Tenants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stateBreakdown.map(s => (
                <TableRow key={s.state}>
                  <TableCell className="font-medium">{s.state}</TableCell>
                  <TableCell className="text-right">{s.agencies}</TableCell>
                  <TableCell className="text-right">{s.staff}</TableCell>
                  <TableCell className="text-right font-semibold">{s.tenants}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// ===== Agency Coverage Section (NEW) =====
export const AgencyCoverageSection = () => {
  const { agencies, allStaff, tenantsByAgency, vouchers } = useAnalyticsData();
  const [agencySearch, setAgencySearch] = useState('');

  const agencyCoverage = useMemo(() => {
    const tenantCount = new Map<string, number>();
    tenantsByAgency.forEach((t: any) => {
      tenantCount.set(t.agency_id, (tenantCount.get(t.agency_id) || 0) + 1);
    });

    const staffCount = new Map<string, number>();
    allStaff.forEach((s: any) => {
      staffCount.set(s.agency_id, (staffCount.get(s.agency_id) || 0) + 1);
    });

    const voucherCount = new Map<string, number>();
    vouchers.filter(v => v.status === 'active').forEach(v => {
      if (v.agency_id) voucherCount.set(v.agency_id, (voucherCount.get(v.agency_id) || 0) + 1);
    });

    return agencies
      .map(a => ({
        id: a.id,
        name: a.name,
        state: a.state || '—',
        tenants: tenantCount.get(a.id) || 0,
        staff: staffCount.get(a.id) || 0,
        vouchers: voucherCount.get(a.id) || 0,
      }))
      .filter(a => a.tenants > 0 || a.staff > 0)
      .sort((a, b) => b.tenants - a.tenants);
  }, [agencies, allStaff, tenantsByAgency, vouchers]);

  const top10Agencies = agencyCoverage.slice(0, 10);

  const filteredAgencies = agencyCoverage.filter(a =>
    !agencySearch || a.name.toLowerCase().includes(agencySearch.toLowerCase()) || a.state.toLowerCase().includes(agencySearch.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-base">Agency Coverage Breakdown</CardTitle>
            <CardDescription>{agencyCoverage.length} agencies with tenants or staff</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {top10Agencies.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Top 10 Agencies by Tenant Count</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={top10Agencies} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={115} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--popover-foreground))' }} />
                <Bar dataKey="tenants" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Tenants" />
                <Bar dataKey="staff" fill="hsl(var(--chart-2, 160 60% 45%))" radius={[0, 4, 4, 0]} name="Staff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agencies..."
            value={agencySearch}
            onChange={e => setAgencySearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Tenants</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Vouchers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgencies.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.state}</TableCell>
                  <TableCell className="text-right font-semibold">{a.tenants}</TableCell>
                  <TableCell className="text-right text-sm">{a.staff}</TableCell>
                  <TableCell className="text-right text-sm">{a.vouchers}</TableCell>
                </TableRow>
              ))}
              {filteredAgencies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No agencies match</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// ===== Agency Health Section =====
export const AgencyHealthSection = () => {
  const { agencies, allStaff, tenantsByAgency, rftaData, applications, vouchers } = useAnalyticsData();
  const { data: crmNoteCounts } = useAgencyCRMNoteCounts();
  const [healthFilter, setHealthFilter] = useState<'all' | 'attention'>('all');
  const [healthSearch, setHealthSearch] = useState('');

  const agencyHealth = useMemo(() => {
    const staffByAgency = new Map<string, { count: number; lastLogin: string | null }>();
    allStaff.forEach((s: any) => {
      const entry = staffByAgency.get(s.agency_id) || { count: 0, lastLogin: null };
      entry.count++;
      const login = s.profiles?.last_sign_in_at;
      if (login && (!entry.lastLogin || login > entry.lastLogin)) entry.lastLogin = login;
      staffByAgency.set(s.agency_id, entry);
    });

    const tenantCount = new Map<string, number>();
    tenantsByAgency.forEach((t: any) => {
      tenantCount.set(t.agency_id, (tenantCount.get(t.agency_id) || 0) + 1);
    });

    const rftaCount = new Map<string, number>();
    rftaData.filter(r => ['submitted', 'under_review'].includes(r.status)).forEach(r => {
      if (r.agency_id) rftaCount.set(r.agency_id, (rftaCount.get(r.agency_id) || 0) + 1);
    });

    const appCount = new Map<string, number>();
    applications.filter((a: any) => a.status === 'submitted').forEach((a: any) => {
      if (a.agency_id) appCount.set(a.agency_id, (appCount.get(a.agency_id) || 0) + 1);
    });

    const voucherCount = new Map<string, number>();
    vouchers.filter(v => v.status === 'active').forEach(v => {
      if (v.agency_id) voucherCount.set(v.agency_id, (voucherCount.get(v.agency_id) || 0) + 1);
    });

    return agencies
      .filter(a => {
        const staff = staffByAgency.get(a.id);
        const tenants = tenantCount.get(a.id) || 0;
        return (staff && staff.count > 0) || tenants > 0;
      })
      .map(a => {
        const staff = staffByAgency.get(a.id) || { count: 0, lastLogin: null };
        const tenants = tenantCount.get(a.id) || 0;
        const pendingRfta = rftaCount.get(a.id) || 0;
        const pendingApps = appCount.get(a.id) || 0;
        const activeVouchers = voucherCount.get(a.id) || 0;

        let health: 'green' | 'yellow' | 'red' = 'red';
        if (staff.count > 0 && staff.lastLogin) {
          const daysSinceLogin = (Date.now() - new Date(staff.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
          health = daysSinceLogin < 7 ? 'green' : 'yellow';
        }

        const needsAttention = health !== 'green' && (pendingRfta > 0 || pendingApps > 0);

        return { id: a.id, name: a.name, state: a.state || '—', staffCount: staff.count, tenants, pendingRfta, pendingApps, activeVouchers, lastLogin: staff.lastLogin, health, needsAttention };
      })
      .sort((a, b) => b.tenants - a.tenants);
  }, [agencies, allStaff, tenantsByAgency, rftaData, applications, vouchers]);

  const filteredHealth = agencyHealth
    .filter(a => healthFilter === 'all' || a.needsAttention)
    .filter(a => !healthSearch || a.name.toLowerCase().includes(healthSearch.toLowerCase()) || a.state.toLowerCase().includes(healthSearch.toLowerCase()));

  const healthDotColor = (h: string) => {
    if (h === 'green') return 'bg-green-500';
    if (h === 'yellow') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-base">Agency Health</CardTitle>
            <CardDescription>
              {agencyHealth.length} active agencies • {agencyHealth.filter(a => a.needsAttention).length} need attention
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search agencies..." value={healthSearch} onChange={e => setHealthSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Button variant={healthFilter === 'attention' ? 'default' : 'outline'} size="sm" onClick={() => setHealthFilter(f => f === 'all' ? 'attention' : 'all')}>
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Needs Attention ({agencyHealth.filter(a => a.needsAttention).length})
          </Button>
        </div>
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Tenants</TableHead>
                <TableHead className="text-right">Pending RFTA</TableHead>
                <TableHead className="text-right">Applications</TableHead>
                <TableHead className="text-right">Vouchers</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-center w-12">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHealth.map(a => (
                <TableRow key={a.id}>
                  <TableCell><div className={`w-2.5 h-2.5 rounded-full ${healthDotColor(a.health)}`} /></TableCell>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.state}</TableCell>
                  <TableCell className="text-right text-sm">{a.staffCount}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{a.tenants}</TableCell>
                  <TableCell className="text-right">
                    {a.pendingRfta > 0 ? <Badge variant="secondary" className="text-xs">{a.pendingRfta}</Badge> : <span className="text-muted-foreground text-sm">0</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.pendingApps > 0 ? <Badge variant="secondary" className="text-xs">{a.pendingApps}</Badge> : <span className="text-muted-foreground text-sm">0</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">{a.activeVouchers}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.lastLogin ? new Date(a.lastLogin).toLocaleDateString() : 'Never'}</TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const noteData = crmNoteCounts?.get(a.id);
                      if (!noteData || noteData.total === 0) return <span className="text-muted-foreground text-xs">—</span>;
                      return (
                        <div className="flex items-center justify-center gap-1">
                          <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs">{noteData.total}</span>
                          {noteData.overdue > 0 && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
                        </div>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredHealth.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No agencies match the current filter</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// ===== Pipeline Section =====
export const PipelineSection = () => {
  const { rftaData, applications, inspections } = useAnalyticsData();

  const rftaPipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    rftaData.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: status.replace('_', ' '), value: count, fill: STATUS_COLORS[status] || CHART_COLORS[0] }));
  }, [rftaData]);

  const appFunnel = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((a: any) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: status.replace('_', ' '), value: count, fill: STATUS_COLORS[status] || CHART_COLORS[0] }));
  }, [applications]);

  const inspectionResults = useMemo(() => {
    const counts: Record<string, number> = { pass: 0, fail: 0, conditional: 0, pending: 0 };
    inspections.forEach((i: any) => {
      if (i.result === 'pass') counts.pass++;
      else if (i.result === 'fail') counts.fail++;
      else if (i.result === 'conditional_pass') counts.conditional++;
      else counts.pending++;
    });
    return [
      { name: 'Pass', value: counts.pass, fill: 'hsl(var(--chart-2, 160 60% 45%))' },
      { name: 'Fail', value: counts.fail, fill: 'hsl(var(--destructive))' },
      { name: 'Conditional', value: counts.conditional, fill: 'hsl(var(--chart-3, 30 80% 55%))' },
      { name: 'Pending', value: counts.pending, fill: 'hsl(var(--muted-foreground))' },
    ].filter(d => d.value > 0);
  }, [inspections]);

  const tooltipStyle = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--popover-foreground))' };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-base">Pipeline Overview</CardTitle>
            <CardDescription>{rftaData.length} RFTAs • {applications.length} Applications • {inspections.length} Inspections</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">RFTA Status</p>
            {rftaPipeline.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={rftaPipeline} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>{rftaPipeline.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">{rftaPipeline.map(d => <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} /><span className="capitalize text-muted-foreground">{d.name}: {d.value}</span></div>)}</div>
              </>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No RFTA data</p>}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Applications</p>
            {appFunnel.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={appFunnel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>{appFunnel.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">{appFunnel.map(d => <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} /><span className="capitalize text-muted-foreground">{d.name}: {d.value}</span></div>)}</div>
              </>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No applications yet</p>}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Inspections</p>
            {inspectionResults.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={inspectionResults} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>{inspectionResults.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">{inspectionResults.map(d => <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} /><span className="text-muted-foreground">{d.name}: {d.value}</span></div>)}</div>
              </>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No inspections yet</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ===== Activity Section =====
export const ActivitySection = () => {
  const { recentActivity } = useAnalyticsData();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-base">Recent Platform Activity</CardTitle>
            <CardDescription>Latest actions across all agencies</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent activity recorded</p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-auto">
            {recentActivity.map((entry: any) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm border-b border-border pb-3 last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground capitalize">{entry.action?.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">on</span>
                    <Badge variant="outline" className="text-xs capitalize">{entry.entity_type?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{(entry.housing_authorities as any)?.name || 'Unknown Agency'}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Legacy default export (kept for backward compat but no longer used)
export const AgencyPlatformAnalytics = () => {
  return (
    <div className="space-y-4">
      <StateCoverageSection />
      <AgencyCoverageSection />
      <AgencyHealthSection />
      <PipelineSection />
      <ActivitySection />
    </div>
  );
};

export default AgencyPlatformAnalytics;
