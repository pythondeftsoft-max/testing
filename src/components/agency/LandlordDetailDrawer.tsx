import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, FileText, Loader2, CheckCircle, XCircle, AlertCircle, Home, Download, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import GenerateDocumentButton from '@/components/agency/GenerateDocumentButton';
import PayReadyChecklist from '@/components/agency/landlord/PayReadyChecklist';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landlordId: string;
  landlordName: string;
  agencyId: string;
  isAdmin?: boolean;
  onUpdate?: () => void;
}

const LandlordDetailDrawer: React.FC<Props> = ({ open, onOpenChange, landlordId, landlordName, agencyId, isAdmin = true, onUpdate }) => {
  const [landlord, setLandlord] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencyDefaults, setAgencyDefaults] = useState<{ w9: boolean; docs: string[] | null; notes: string | null } | null>(null);

  // Requirements form state
  const [w9Required, setW9Required] = useState(true);
  const [requirementsNotes, setRequirementsNotes] = useState('');
  const [additionalDocs, setAdditionalDocs] = useState<string[]>([]);
  const [newDocType, setNewDocType] = useState('');

  useEffect(() => {
    if (!open || !landlordId) return;
    const fetch = async () => {
      setLoading(true);
      const [llRes, unitsRes, docRes, agencyRes] = await Promise.all([
        supabase.from('agency_landlords').select('*').eq('id', landlordId).single(),
        supabase
          .from('agency_landlord_units')
          .select(`
            *,
            property:properties!agency_landlord_units_property_id_fkey(id, name, address, city, state),
            unit:property_units!agency_landlord_units_unit_id_fkey(id, unit_number, monthly_rent)
          `)
          .eq('agency_landlord_id', landlordId),
        supabase.from('agency_documents').select('id, file_name, created_at').eq('agency_id', agencyId).eq('entity_type', 'landlord').eq('entity_id', landlordId).order('created_at', { ascending: false }),
        supabase.from('housing_authorities').select('metadata, default_required_docs, default_requirements_notes').eq('id', agencyId).single(),
      ]);
      const ll = llRes.data;
      setLandlord(ll);
      setUnits(unitsRes.data || []);
      setDocuments(docRes.data || []);

      if (agencyRes.data) {
        const meta = (agencyRes.data.metadata as any) || {};
        setAgencyDefaults({
          w9: meta.w9_required_default !== false,
          docs: (agencyRes.data as any).default_required_docs || null,
          notes: (agencyRes.data as any).default_requirements_notes || null,
        });
      }

      if (ll) {
        setW9Required(ll.w9_required ?? true);
        setRequirementsNotes(ll.requirements_notes || '');
        setAdditionalDocs(ll.additional_docs_required || []);
      }
      setLoading(false);
    };
    fetch();
  }, [open, landlordId, agencyId]);

  const getAgencyName = async (): Promise<string> => {
    const { data } = await supabase.from('housing_authorities').select('name').eq('id', agencyId).single();
    return data?.name || 'Housing Authority';
  };

  const notifyLandlord = async (title: string, description: string) => {
    if (!landlord?.landlord_id) return; // no linked user yet
    await supabase.from('notifications').insert({
      user_id: landlord.landlord_id,
      title,
      description,
      type: 'section8',
      read: false,
      category: 'section8',
      related_entity_type: 'agency_landlord',
      related_entity_id: landlordId,
      link: '/section-8',
    });
  };

  const updateStatus = async (status: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('agency_landlords')
      .update({ onboarding_status: status as any })
      .eq('id', landlordId);
    setSaving(false);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Landlord ${status === 'active' ? 'approved' : status === 'inactive' ? 'rejected' : 'updated'}`);
    setLandlord((prev: any) => prev ? { ...prev, onboarding_status: status } : prev);
    onUpdate?.();

    // Log to audit trail
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('agency_activity_log').insert({
      agency_id: agencyId,
      actor_id: user?.id || null,
      action: status === 'active' ? 'landlord_approved' : status === 'inactive' ? 'landlord_denied' : 'landlord_status_updated',
      entity_type: 'landlord',
      entity_id: landlordId,
      metadata: { landlord_name: landlordName, new_status: status },
    });

    // Notify landlord
    const phaName = await getAgencyName();
    if (status === 'active') {
      notifyLandlord('Section 8 Registration Approved', `Your registration with ${phaName} has been approved. You can now manage your enrolled units.`);
    } else if (status === 'inactive') {
      notifyLandlord('Section 8 Registration Not Approved', `Your registration with ${phaName} was not approved. Contact the agency for details.`);
    }
  };

  const saveRequirements = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('agency_landlords')
      .update({
        w9_required: w9Required,
        requirements_notes: requirementsNotes || null,
        additional_docs_required: additionalDocs.length > 0 ? additionalDocs : null,
        onboarding_status: 'invited' as any, // moves from pending_review to "action required"
      } as any)
      .eq('id', landlordId);
    setSaving(false);
    if (error) { toast.error('Failed to save requirements'); return; }
    toast.success('Requirements saved — landlord will see these on their portal');
    setLandlord((prev: any) => prev ? { ...prev, w9_required: w9Required, requirements_notes: requirementsNotes, additional_docs_required: additionalDocs, onboarding_status: 'invited' } : prev);
    onUpdate?.();

    // Notify landlord about new requirements
    const phaName = await getAgencyName();
    const docList = [w9Required ? 'W-9' : '', ...additionalDocs].filter(Boolean).join(', ');
    notifyLandlord('New Requirements from ' + phaName, `Documents needed: ${docList}. Visit your Section 8 portal to upload.`);
  };

  const addDocType = () => {
    if (!newDocType.trim()) return;
    setAdditionalDocs(prev => [...prev, newDocType.trim()]);
    setNewDocType('');
  };

  const removeDocType = (idx: number) => {
    setAdditionalDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const exportPDF = () => {
    if (!landlord) return;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Landlord Registration Summary', 20, y); y += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${landlord.landlord_name}`, 20, y); y += 7;
    doc.text(`Email: ${landlord.landlord_email}`, 20, y); y += 7;
    doc.text(`Status: ${landlord.onboarding_status}`, 20, y); y += 7;
    doc.text(`W-9: ${landlord.w9_status}`, 20, y); y += 7;
    doc.text(`Payment: ${landlord.payment_method}`, 20, y); y += 7;
    doc.text(`Registered: ${new Date(landlord.created_at).toLocaleDateString()}`, 20, y); y += 12;

    if (units.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Enrolled Units', 20, y); y += 7;
      doc.setFont('helvetica', 'normal');
      units.forEach(u => {
        const label = `${u.property?.address || 'Property'}${u.unit?.unit_number ? ` — Unit ${u.unit.unit_number}` : ''}`;
        doc.text(`• ${label}`, 24, y); y += 6;
        if (y > 270) { doc.addPage(); y = 20; }
      });
    }

    doc.save(`landlord-${landlord.landlord_name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const exportCSV = () => {
    if (!landlord) return;
    const rows = [
      ['Name', 'Email', 'Status', 'W-9', 'Payment', 'Properties', 'Registered'],
      [landlord.landlord_name, landlord.landlord_email, landlord.onboarding_status, landlord.w9_status, landlord.payment_method, String(landlord.properties_count), new Date(landlord.created_at).toLocaleDateString()],
    ];
    if (units.length > 0) {
      rows.push([]);
      rows.push(['Property', 'Unit', 'City', 'State']);
      units.forEach(u => {
        rows.push([u.property?.address || '', u.unit?.unit_number || 'Whole property', u.property?.city || '', u.property?.state || '']);
      });
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `landlord-${landlord.landlord_name.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {landlordName}
            </SheetTitle>
            {landlord?.landlord_id && (
              <GenerateDocumentButton
                agencyId={agencyId}
                entityType="landlord"
                entityId={landlord.landlord_id}
                recipientName={landlordName}
              />
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="units"><Home className="w-3 h-3 mr-1" /> Units ({units.length})</TabsTrigger>
              <TabsTrigger value="requirements"><AlertCircle className="w-3 h-3 mr-1" /> Requirements</TabsTrigger>
              <TabsTrigger value="docs"><FileText className="w-3 h-3 mr-1" /> Docs ({documents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {landlord && (
                <div className="space-y-4 mt-2">
                  {/* Status Actions */}
                  {(landlord.onboarding_status === 'pending_review' || landlord.onboarding_status === 'invited') && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                      <Button size="sm" onClick={() => updateStatus('active')} disabled={saving}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus('inactive')} disabled={saving}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        // Switch to requirements tab
                        const tab = document.querySelector('[data-state="inactive"][value="requirements"]') as HTMLElement;
                        tab?.click();
                      }}>
                        <AlertCircle className="w-3 h-3 mr-1" /> Set Requirements
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{landlord.landlord_email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Properties</p>
                      <p className="text-sm font-medium">{landlord.properties_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">W-9 Status</p>
                      <Badge variant={landlord.w9_status === 'approved' ? 'default' : landlord.w9_status === 'submitted' ? 'secondary' : 'outline'}>{landlord.w9_status}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Method</p>
                      <p className="text-sm font-medium capitalize">{landlord.payment_method.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Onboarding Status</p>
                      <Badge variant={landlord.onboarding_status === 'active' ? 'default' : 'secondary'}>{landlord.onboarding_status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Registered</p>
                      <p className="text-sm">{new Date(landlord.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Pay-Ready Checklist (separate from operational onboarding status) */}
                  <PayReadyChecklist
                    agencyLandlordId={landlordId}
                    agencyId={agencyId}
                    payReady={Boolean((landlord as any).pay_ready)}
                    payHoldReason={(landlord as any).pay_hold_reason ?? null}
                    isAdmin={isAdmin}
                    onUpdate={() => { onUpdate?.(); }}
                  />

                  {landlord.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm mt-1">{landlord.notes}</p>
                    </div>
                  )}


                  {/* Export buttons */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" onClick={exportPDF}>
                      <Download className="w-3 h-3 mr-1" /> Export PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="w-3 h-3 mr-1" /> Export CSV
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="units">
              {units.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Rent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm">{u.property?.address || u.property?.name || '—'}</TableCell>
                        <TableCell className="text-sm">{u.unit?.unit_number || 'Whole property'}</TableCell>
                        <TableCell className="text-sm">{u.property?.city || '—'}, {u.property?.state || ''}</TableCell>
                        <TableCell className="text-sm">{u.unit?.monthly_rent ? `$${u.unit.monthly_rent}` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No units enrolled yet.</p>}
            </TabsContent>

            <TabsContent value="requirements">
              <div className="space-y-4 mt-2">
                {agencyDefaults && (
                  <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">From Agency Defaults</Badge>
                    <span className="text-xs text-muted-foreground">Requirements were auto-populated from agency enrollment settings. You can override per landlord below.</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Set what this landlord needs to provide. These requirements will appear on their Section 8 portal.
                </p>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label className="font-medium">W-9 Required</Label>
                    <p className="text-xs text-muted-foreground">Landlord must upload a W-9 form</p>
                  </div>
                  <Switch checked={w9Required} onCheckedChange={setW9Required} />
                </div>

                <div>
                  <Label>Additional Required Documents</Label>
                  <div className="space-y-2 mt-2">
                    {additionalDocs.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{doc}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDocType(i)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Lead Paint Disclosure, Insurance Certificate"
                        value={newDocType}
                        onChange={e => setNewDocType(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addDocType()}
                      />
                      <Button variant="outline" size="sm" onClick={addDocType} disabled={!newDocType.trim()}>
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Notes for Landlord</Label>
                  <Textarea
                    value={requirementsNotes}
                    onChange={e => setRequirementsNotes(e.target.value)}
                    placeholder="Any additional instructions or notes for this landlord..."
                    rows={3}
                  />
                </div>

                <Button onClick={saveRequirements} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Requirements & Notify Landlord
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="docs">
              {documents.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{d.file_name}</TableCell>
                        <TableCell className="text-sm">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded.</p>}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default LandlordDetailDrawer;
