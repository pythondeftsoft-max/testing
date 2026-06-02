import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { User, Shield, Home, ClipboardCheck, FileText, MessageSquare, Loader2, Save, Accessibility, ArrowRightLeft, Plus } from 'lucide-react';
import TenantPortabilityHistory from '@/components/agency/TenantPortabilityHistory';
import AccommodationTracker from '@/components/agency/AccommodationTracker';
import DocumentUploader from '@/components/agency/DocumentUploader';
import TenantMarketplacePulse from '@/components/agency/mesh/TenantMarketplacePulse';
import GenerateDocumentButton from '@/components/agency/GenerateDocumentButton';
import RequestInspectionDialog from '@/components/agency/caseload/RequestInspectionDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantUserId: string;
  tenantName: string;
  agencyId: string;
}

const TenantDetailDrawer: React.FC<Props> = ({ open, onOpenChange, tenantUserId, tenantName, agencyId }) => {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestInspectionOpen, setRequestInspectionOpen] = useState(false);

  useEffect(() => {
    if (!open || !tenantUserId) return;
    const fetch = async () => {
      setLoading(true);
      const [vRes, lRes, iRes, nRes] = await Promise.all([
        supabase.from('agency_vouchers').select('*').eq('agency_id', agencyId).eq('tenant_id', tenantUserId).order('created_at', { ascending: false }),
        supabase.from('tenant_leases').select('*').eq('tenant_id', tenantUserId).order('created_at', { ascending: false }),
        supabase.from('inspections').select('id, scheduled_date, status, result, completed_date').eq('agency_id', agencyId).order('created_at', { ascending: false }).limit(20),
        supabase.from('agency_notices_sent').select('id, notice_type, delivery_method, sent_at').eq('agency_id', agencyId).eq('tenant_id', tenantUserId).order('sent_at', { ascending: false }),
      ]);
      setVouchers(vRes.data || []);
      setLeases(lRes.data || []);
      setInspections(iRes.data || []);
      setNotices(nRes.data || []);

      // Load notes from tenant metadata
      const { data: tenantData } = await supabase
        .from('tenant_profiles')
        .select('notes')
        .eq('user_id', tenantUserId)
        .maybeSingle();
      setNotes((tenantData as any)?.notes || '');
      setLoading(false);
    };
    fetch();
  }, [open, tenantUserId, agencyId]);

  const saveNotes = async () => {
    setSaving(true);
    // Store notes in agency_activity_log as a lightweight approach
    await supabase.from('agency_activity_log').insert({
      agency_id: agencyId,
      entity_type: 'tenant',
      entity_id: tenantUserId,
      action: 'note_updated',
      metadata: { notes } as any,
    });
    toast.success('Notes saved');
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {tenantName}
            </SheetTitle>
            <GenerateDocumentButton
              agencyId={agencyId}
              entityType="tenant"
              entityId={tenantUserId}
              recipientName={tenantName}
            />
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
          <div className="mt-4">
            <TenantMarketplacePulse tenantUserId={tenantUserId} />
          </div>
          <Tabs defaultValue="vouchers" className="mt-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="vouchers"><Shield className="w-3 h-3 mr-1" /> Vouchers ({vouchers.length})</TabsTrigger>
              <TabsTrigger value="leases"><Home className="w-3 h-3 mr-1" /> Leases ({leases.length})</TabsTrigger>
              <TabsTrigger value="inspections"><ClipboardCheck className="w-3 h-3 mr-1" /> Inspections ({inspections.length})</TabsTrigger>
              <TabsTrigger value="notices"><MessageSquare className="w-3 h-3 mr-1" /> Notices ({notices.length})</TabsTrigger>
              <TabsTrigger value="docs"><FileText className="w-3 h-3 mr-1" /> Docs</TabsTrigger>
              <TabsTrigger value="accommodations"><Accessibility className="w-3 h-3 mr-1" /> ADA</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="portability"><ArrowRightLeft className="w-3 h-3 mr-1" /> Portability</TabsTrigger>
            </TabsList>

            <TabsContent value="vouchers">
              {vouchers.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Issued</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.voucher_number || v.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm capitalize">{v.voucher_type}</TableCell>
                        <TableCell><Badge variant={v.status === 'active' ? 'success' : 'secondary'}>{v.status}</Badge></TableCell>
                        <TableCell>{v.amount ? `$${v.amount.toLocaleString()}` : '—'}</TableCell>
                        <TableCell className="text-sm">{v.issued_at ? new Date(v.issued_at).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No vouchers found.</p>}
            </TabsContent>

            <TabsContent value="leases">
              {leases.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leases.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{l.lease_start ? new Date(l.lease_start).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-sm">{l.lease_end ? new Date(l.lease_end).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>{l.monthly_rent ? `$${l.monthly_rent}` : '—'}</TableCell>
                        <TableCell><Badge variant={l.status === 'active' ? 'success' : 'secondary'}>{l.status || 'unknown'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No leases found.</p>}
            </TabsContent>

            <TabsContent value="inspections">
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={() => setRequestInspectionOpen(true)} className="gap-1">
                  <Plus className="h-3 w-3" /> Request Inspection
                </Button>
              </div>
              {inspections.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="text-sm">{i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell><Badge variant={i.status === 'completed' ? 'default' : 'warning'}>{i.status}</Badge></TableCell>
                        <TableCell>{i.result ? <Badge variant={i.result === 'pass' ? 'success' : 'destructive'}>{i.result}</Badge> : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No inspections found.</p>}
              <RequestInspectionDialog
                open={requestInspectionOpen}
                onOpenChange={setRequestInspectionOpen}
                agencyId={agencyId}
                tenantId={tenantUserId}
                tenantName={tenantName}
              />
            </TabsContent>

            <TabsContent value="notices">
              {notices.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notices.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="text-sm capitalize">{n.notice_type.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-sm capitalize">{n.delivery_method}</TableCell>
                        <TableCell className="text-sm">{new Date(n.sent_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No notices sent.</p>}
            </TabsContent>

            <TabsContent value="docs">
              <DocumentUploader
                entityType="tenant"
                entityId={tenantUserId}
                agencyId={agencyId}
                isAdmin={true}
                compact={true}
                additionalEntityTypes={['tenant_s8']}
              />
            </TabsContent>

            <TabsContent value="accommodations">
              <AccommodationTracker
                agencyId={agencyId}
                tenantId={tenantUserId}
                tenantName={tenantName}
              />
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-3">
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder="Add caseworker notes about this tenant..." />
                <Button onClick={saveNotes} disabled={saving} size="sm" className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="portability">
              <TenantPortabilityHistory agencyId={agencyId} tenantId={tenantUserId} />
            </TabsContent>
          </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TenantDetailDrawer;
