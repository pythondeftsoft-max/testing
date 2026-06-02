import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSignature, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import NewHAPContractDialog from './NewHAPContractDialog';
import ProgramFilter, { HousingProgramType } from './ProgramFilter';
import { useEnabledPrograms } from '@/hooks/useEnabledPrograms';
import GenerateDocumentButton from './GenerateDocumentButton';
import HudFormButton from './hud-pdfs/HudFormButton';
import { EmptyState } from '@/components/shared/EmptyState';

interface HAPContract {
  id: string;
  contract_number: string | null;
  tenant_id: string;
  property_address: string | null;
  status: string;
  effective_date: string | null;
  expiration_date: string | null;
  hap_amount: number | null;
  tenant_rent: number | null;
  gross_rent: number | null;
  bedroom_count: number | null;
  program_type?: string | null;
}

const statusColor = (s: string): "default" | "warning" | "secondary" | "success" | "destructive" => {
  switch (s) {
    case 'draft': return 'secondary';
    case 'pending_signature': return 'warning';
    case 'active': return 'success';
    case 'expired': return 'default';
    case 'terminated': return 'destructive';
    default: return 'default';
  }
};

interface Props {
  agencyId: string;
  canManage: boolean;
}

const AgencyHAPContracts: React.FC<Props> = ({ agencyId, canManage }) => {
  const [contracts, setContracts] = useState<HAPContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState<HousingProgramType>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: enabledPrograms } = useEnabledPrograms(agencyId);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('agency_hap_contracts').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    if (programFilter !== 'all') q = q.eq('program_type', programFilter as any);
    const { data, error } = await q;
    if (error) toast.error('Failed to load contracts');
    setContracts((data as unknown as HAPContract[]) || []);
    setLoading(false);
  }, [agencyId, filter, programFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('agency_hap_contracts').update({ status } as any).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(`Contract ${status.replace('_', ' ')}`);
    fetch();
  };

  const fmt = (n: number | null) => n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="h-4 w-4" /> HAP Contracts ({contracts.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[170px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_signature">Pending Signature</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              {canManage && (
                <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
                  <Plus className="h-3 w-3" /> New Contract
                </Button>
              )}
            </div>
          </div>
          <div className="mt-3">
            <ProgramFilter value={programFilter} onChange={setProgramFilter} enabledPrograms={enabledPrograms} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : contracts.length === 0 ? (
            <EmptyState
              bare
              icon={FileSignature}
              title="No HAP contracts yet"
              description="HAP contracts track the financial terms of every voucher placement. Create your first to begin disbursing housing assistance payments."
              primaryAction={canManage ? { label: 'Create HAP contract', onClick: () => setDialogOpen(true) } : undefined}
            />
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>HAP</TableHead>
                    <TableHead>Tenant Rent</TableHead>
                    <TableHead>Gross Rent</TableHead>
                    <TableHead>BR</TableHead>
                    <TableHead>Effective</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.contract_number || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{c.property_address || '—'}</TableCell>
                      <TableCell><Badge variant={statusColor(c.status)}>{c.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>{fmt(c.hap_amount)}</TableCell>
                      <TableCell>{fmt(c.tenant_rent)}</TableCell>
                      <TableCell>{fmt(c.gross_rent)}</TableCell>
                      <TableCell>{c.bedroom_count != null ? (c.bedroom_count === 0 ? 'Studio' : `${c.bedroom_count}BR`) : '—'}</TableCell>
                      <TableCell className="text-sm">{c.effective_date ? new Date(c.effective_date).toLocaleDateString() : '—'}</TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1 items-center">
                            {c.status === 'draft' && (
                              <Button size="sm" variant="default" onClick={() => updateStatus(c.id, 'pending_signature')}>Send for Sig</Button>
                            )}
                            {c.status === 'pending_signature' && (
                              <Button size="sm" variant="default" onClick={() => updateStatus(c.id, 'active')}>Activate</Button>
                            )}
                            {c.status === 'active' && (
                              <Button size="sm" variant="destructive" onClick={() => updateStatus(c.id, 'terminated')}>Terminate</Button>
                            )}
                            <HudFormButton formNumber="52641" entityId={c.id} agencyName="Housing Authority" variant="ghost" />
                            <GenerateDocumentButton
                              agencyId={agencyId}
                              entityType="hap_contract"
                              entityId={c.id}
                              recipientName={c.contract_number || c.property_address || undefined}
                              variant="ghost"
                              size="sm"
                              label=""
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <NewHAPContractDialog open={dialogOpen} onOpenChange={setDialogOpen} agencyId={agencyId} onCreated={fetch} />
    </>
  );
};

export default AgencyHAPContracts;
