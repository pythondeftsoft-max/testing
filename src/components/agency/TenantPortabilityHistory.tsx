import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  agencyId: string;
  tenantId: string;
}

const TenantPortabilityHistory: React.FC<Props> = ({ agencyId, tenantId }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('agency_portability_requests')
        .select('id, request_type, status, billing_arrangement, initial_pha_name, receiving_pha_name, voucher_issuance_date, lease_date, hap_amount')
        .eq('agency_id', agencyId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      setRecords(data || []);
      setLoading(false);
    };
    load();
  }, [agencyId, tenantId]);

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading portability history...</p>;
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No portability records for this tenant.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Other PHA</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead>HAP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <Badge variant={r.request_type === 'port_out' ? 'default' : 'secondary'} className="gap-1">
                {r.request_type === 'port_out' ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                {r.request_type === 'port_out' ? 'Out' : 'In'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize text-xs">{r.status?.replace(/_/g, ' ')}</Badge>
              {r.billing_arrangement && (
                <Badge variant="outline" className="ml-1 text-xs">{r.billing_arrangement}</Badge>
              )}
            </TableCell>
            <TableCell className="text-sm">
              {r.request_type === 'port_out' ? r.receiving_pha_name : r.initial_pha_name || '—'}
            </TableCell>
            <TableCell className="text-sm">{r.voucher_issuance_date || '—'}</TableCell>
            <TableCell className="text-sm">{r.hap_amount ? `$${Number(r.hap_amount).toFixed(0)}` : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TenantPortabilityHistory;
