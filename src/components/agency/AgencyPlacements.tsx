import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, TrendingUp, Clock, AlertTriangle, Search, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AgencyPlacementsProps {
  agencyId: string;
}

interface PlacementRecord {
  id: string;
  tenant_name: string;
  tenant_email: string | null;
  property_name: string;
  unit_name: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  hap_amount: number | null;
  tenant_portion: number | null;
  last_payment: string | null;
  status: string;
  voucher_number: string | null;
}

const AgencyPlacements: React.FC<AgencyPlacementsProps> = ({ agencyId }) => {
  const [placements, setPlacements] = useState<PlacementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPlacements();
  }, [agencyId]);

  const fetchPlacements = async () => {
    setLoading(true);
    try {
      const { data: vouchers } = await supabase
        .from('agency_vouchers')
        .select('id, tenant_id, voucher_number, status, amount, issued_at, expires_at')
        .eq('agency_id', agencyId)
        .order('issued_at', { ascending: false });

      if (!vouchers?.length) { setPlacements([]); return; }

      const tenantIds = [...new Set(vouchers.map(v => v.tenant_id))];

      const [profilesRes, rftasRes, hapRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, email').in('id', tenantIds),
        supabase.from('rfta_packets').select('tenant_id, property_id, unit_id, status').eq('agency_id', agencyId).in('tenant_id', tenantIds),
        supabase.from('hap_payments' as any).select('voucher_id, amount, tenant_portion, payment_date, status').eq('agency_id', agencyId).order('payment_date', { ascending: false }),
      ]);

      const profileMap: Record<string, any> = {};
      profilesRes.data?.forEach((p: any) => {
        profileMap[p.id] = { ...p, full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || null };
      });

      const rftaMap: Record<string, any> = {};
      rftasRes.data?.forEach(r => { if (!rftaMap[r.tenant_id] || r.status === 'approved') rftaMap[r.tenant_id] = r; });

      // HAP payment map by voucher_id (latest payment)
      const hapMap: Record<string, any> = {};
      (hapRes.data || []).forEach((h: any) => {
        if (!hapMap[h.voucher_id]) hapMap[h.voucher_id] = h;
      });

      const propIds = [...new Set((rftasRes.data || []).map(r => r.property_id).filter(Boolean))];
      let propMap: Record<string, string> = {};
      if (propIds.length) {
        const { data: props } = await supabase.from('properties').select('id, address, city').in('id', propIds as string[]);
        props?.forEach(p => { propMap[p.id] = p.address + (p.city ? `, ${p.city}` : ''); });
      }

      const records: PlacementRecord[] = vouchers.map(v => {
        const profile = profileMap[v.tenant_id];
        const rfta = rftaMap[v.tenant_id];
        const hap = hapMap[v.id];
        return {
          id: v.id,
          tenant_name: profile?.full_name || 'Unknown',
          tenant_email: profile?.email || null,
          property_name: rfta?.property_id ? (propMap[rfta.property_id] || 'Property') : '—',
          unit_name: null,
          lease_start: v.issued_at,
          lease_end: v.expires_at,
          monthly_rent: v.amount,
          hap_amount: hap?.amount || v.amount || null,
          tenant_portion: hap?.tenant_portion || null,
          last_payment: hap?.payment_date || null,
          status: v.status,
          voucher_number: v.voucher_number,
        };
      });

      setPlacements(records);
    } finally {
      setLoading(false);
    }
  };

  const filtered = placements.filter(p => {
    const q = search.toLowerCase();
    return p.tenant_name.toLowerCase().includes(q) || p.property_name.toLowerCase().includes(q) || (p.voucher_number || '').toLowerCase().includes(q);
  });

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const active = placements.filter(p => p.status === 'active');
  const expiringSoon = placements.filter(p => {
    if (!p.lease_end || p.status !== 'active') return false;
    const end = new Date(p.lease_end);
    return end > now && end <= thirtyDays;
  });
  const expired = placements.filter(p => p.status === 'expired' || (p.lease_end && new Date(p.lease_end) < now && p.status === 'active'));
  const totalHap = placements.reduce((sum, p) => sum + (p.hap_amount || 0), 0);

  const getExpiryBadge = (leaseEnd: string | null, status: string) => {
    if (status === 'expired') return <Badge variant="destructive">Expired</Badge>;
    if (!leaseEnd) return <Badge variant="secondary">{status}</Badge>;
    const end = new Date(leaseEnd);
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return <Badge variant="destructive">Expired</Badge>;
    if (daysLeft <= 30) return <Badge className="bg-red-500/10 text-red-600 border-red-200">≤30 days</Badge>;
    if (daysLeft <= 60) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">≤60 days</Badge>;
    if (daysLeft <= 90) return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">≤90 days</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{active.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{expiringSoon.length}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{expired.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly HAP</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">${totalHap.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {placements.length > 0 ? `${Math.round((active.length / placements.length) * 100)}%` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" /> Placements & HAP Tracking ({filtered.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search placements..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>HAP</TableHead>
                    <TableHead>Tenant Portion</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{p.tenant_name}</span>
                          {p.tenant_email && <p className="text-xs text-muted-foreground">{p.tenant_email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{p.property_name}</TableCell>
                      <TableCell className="text-sm font-mono">{p.voucher_number || '—'}</TableCell>
                      <TableCell className="text-sm">{p.lease_start ? new Date(p.lease_start).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-sm">{p.lease_end ? new Date(p.lease_end).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{p.hap_amount ? `$${p.hap_amount.toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="text-sm">{p.tenant_portion != null ? `$${p.tenant_portion.toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="text-sm">{p.last_payment ? new Date(p.last_payment).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{getExpiryBadge(p.lease_end, p.status)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No placements recorded yet. Placements appear when vouchers are issued and tenants are housed.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyPlacements;
