import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, FileText, ClipboardCheck, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CaseloadMarketplaceFeed from '@/components/agency/mesh/CaseloadMarketplaceFeed';
import TenantMarketplacePulse from '@/components/agency/mesh/TenantMarketplacePulse';

interface CaseloadTenant {
  id: string;
  user_id: string;
  voucher_status: string | null;
  housing_authority: string | null;
  city: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface RftaPacket {
  id: string;
  tenant_id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
}

interface CaseworkerCaseloadProps {
  agencyId: string;
  staffId: string;
}

const CaseworkerCaseload: React.FC<CaseworkerCaseloadProps> = ({ agencyId, staffId }) => {
  const [tenants, setTenants] = useState<CaseloadTenant[]>([]);
  const [packets, setPackets] = useState<RftaPacket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const fetchCaseload = useCallback(async () => {
    setLoading(true);

    // Get assignments
    const { data: assignments } = await supabase
      .from('caseworker_assignments')
      .select('tenant_id')
      .eq('caseworker_id', staffId)
      .eq('is_active', true);

    if (!assignments?.length) {
      setTenants([]);
      setPackets([]);
      setLoading(false);
      return;
    }

    const tenantIds = assignments.map(a => a.tenant_id);

    // Fetch tenants and packets in parallel
    const [tenantsRes, packetsRes] = await Promise.all([
      supabase
        .from('tenant_profiles')
        .select('id, user_id, voucher_status, housing_authority, city, created_at, profiles:user_id(full_name, email)')
        .in('user_id', tenantIds),
      supabase
        .from('rfta_packets')
        .select('id, tenant_id, status, submitted_at, created_at')
        .eq('agency_id', agencyId)
        .in('tenant_id', tenantIds)
        .order('created_at', { ascending: false }),
    ]);

    setTenants((tenantsRes.data as unknown as CaseloadTenant[]) || []);
    setPackets((packetsRes.data as unknown as RftaPacket[]) || []);
    setLoading(false);
  }, [agencyId, staffId]);

  useEffect(() => { fetchCaseload(); }, [fetchCaseload]);

  const selectedTenant = tenants.find(t => t.user_id === selectedTenantId);
  const tenantPackets = packets.filter(p => p.tenant_id === selectedTenantId);

  const pendingCount = packets.filter(p => ['submitted', 'under_review'].includes(p.status)).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Caseload Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tenants.length}</p>
              <p className="text-xs text-muted-foreground">My Tenants</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending RFTAs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{packets.length}</p>
              <p className="text-xs text-muted-foreground">Total Packets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marketplace mesh feed (read-only signals from marketplace side) */}
      <CaseloadMarketplaceFeed agencyId={agencyId} staffId={staffId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">My Caseload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Voucher</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.length ? tenants.map(t => (
                    <TableRow
                      key={t.id}
                      className={`cursor-pointer ${selectedTenantId === t.user_id ? 'bg-accent' : ''}`}
                      onClick={() => setSelectedTenantId(t.user_id)}
                    >
                      <TableCell className="font-medium">{t.profiles?.full_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.profiles?.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={t.voucher_status === 'active' ? 'success' : 'secondary'}>
                          {t.voucher_status || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{t.city || '—'}</TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No tenants assigned to your caseload.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Detail Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenant Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTenant ? (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{selectedTenant.profiles?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{selectedTenant.profiles?.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Voucher Status</p>
                  <Badge variant={selectedTenant.voucher_status === 'active' ? 'success' : 'secondary'}>
                    {selectedTenant.voucher_status || 'unknown'}
                  </Badge>
                </div>
                <TenantMarketplacePulse tenantUserId={selectedTenant.user_id} />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">RFTA Packets ({tenantPackets.length})</p>
                  {tenantPackets.length ? tenantPackets.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <span className="text-xs font-mono">{p.id.slice(0, 8)}...</span>
                      <Badge variant={
                        p.status === 'approved' ? 'success' :
                        p.status === 'denied' ? 'destructive' :
                        p.status === 'submitted' ? 'warning' :
                        'secondary'
                      }>
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No packets</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Select a tenant to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CaseworkerCaseload;
