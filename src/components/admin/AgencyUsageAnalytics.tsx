import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Users, Database, Activity, Ticket, FileText, ClipboardCheck, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

interface AgencyUsageAnalyticsProps {
  agencyId: string;
  agencyName: string;
}

export const AgencyUsageAnalytics = ({ agencyId, agencyName }: AgencyUsageAnalyticsProps) => {
  // Staff with last login
  const { data: staffUsage = [] } = useQuery({
    queryKey: ['agency-usage-staff', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_staff')
        .select('id, role, is_active, created_at, profiles:user_id(first_name, last_name, email, last_sign_in_at)')
        .eq('agency_id', agencyId)
        .order('created_at');
      if (error) throw error;
      return data as any[];
    }
  });

  // Data volumes
  const { data: volumes } = useQuery({
    queryKey: ['agency-usage-volumes', agencyId],
    queryFn: async () => {
      const [tenants, vouchers, rfta, inspections, hapBatches, properties] = await Promise.all([
        supabase.from('tenant_profiles').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('agency_vouchers').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('rfta_packets').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('agency_notices_sent').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('agency_landlords').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
      ]);
      return {
        tenants: tenants.count ?? 0,
        vouchers: vouchers.count ?? 0,
        rfta: rfta.count ?? 0,
        inspections: inspections.count ?? 0,
        notices: hapBatches.count ?? 0,
        landlords: properties.count ?? 0,
      };
    }
  });

  // Activity last 30 days
  const { data: activityData = [] } = useQuery({
    queryKey: ['agency-usage-activity', agencyId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('agency_activity_log')
        .select('action, entity_type, created_at')
        .eq('agency_id', agencyId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Activity by day chart
  const activityByDay = React.useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'MM/dd');
      map.set(day, 0);
    }
    activityData.forEach(a => {
      const day = format(new Date(a.created_at), 'MM/dd');
      if (map.has(day)) map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [activityData]);

  // Feature usage breakdown
  const featureUsage = React.useMemo(() => {
    const map = new Map<string, number>();
    activityData.forEach(a => {
      const key = a.entity_type || 'other';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([feature, count]) => ({ feature: feature.replace(/_/g, ' '), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [activityData]);

  const activeStaff = staffUsage.filter(s => s.is_active);
  const recentLogins = activeStaff.filter(s => {
    const lastLogin = s.profiles?.last_sign_in_at;
    if (!lastLogin) return false;
    return new Date(lastLogin) > subDays(new Date(), 30);
  });

  const VolumeCard = ({ icon: Icon, value, label }: { icon: any; value: number; label: string }) => (
    <div className="rounded-lg border bg-background p-3 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-primary" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <div>
            <CardTitle className="text-base">Usage Analytics — {agencyName}</CardTitle>
            <CardDescription>{activityData.length} actions in last 30 days • {recentLogins.length}/{activeStaff.length} staff active this month</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Volumes */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Data Volume</h4>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <VolumeCard icon={Users} value={volumes?.tenants ?? 0} label="Tenants" />
            <VolumeCard icon={Ticket} value={volumes?.vouchers ?? 0} label="Vouchers" />
            <VolumeCard icon={FileText} value={volumes?.rfta ?? 0} label="RFTAs" />
            <VolumeCard icon={ClipboardCheck} value={volumes?.inspections ?? 0} label="Inspections" />
            <VolumeCard icon={DollarSign} value={volumes?.notices ?? 0} label="Notices Sent" />
            <VolumeCard icon={Database} value={volumes?.landlords ?? 0} label="Landlords" />
          </div>
        </div>

        {/* Activity Chart */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Activity (Last 30 Days)</h4>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={activityByDay}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} width={25} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--popover-foreground))' }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Actions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Usage */}
        {featureUsage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Feature Usage (30 Days)</h4>
            <div className="flex flex-wrap gap-2">
              {featureUsage.map(f => (
                <Badge key={f.feature} variant="outline" className="capitalize text-xs">
                  {f.feature}: {f.count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Staff Login Table */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Staff Activity</h4>
          <div className="max-h-48 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffUsage.map((s: any) => {
                  const lastLogin = s.profiles?.last_sign_in_at;
                  const isRecent = lastLogin && new Date(lastLogin) > subDays(new Date(), 7);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-medium">
                        {s.profiles?.first_name ? `${s.profiles.first_name} ${s.profiles.last_name || ''}` : s.profiles?.email || '—'}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{s.role?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {lastLogin ? (
                          <span className={isRecent ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {format(new Date(lastLogin), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgencyUsageAnalytics;
