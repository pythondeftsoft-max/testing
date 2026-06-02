import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Edit, Eye, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { downloadHtmlAsPdf } from '@/utils/htmlToPdfDownload';

interface Props {
  agencyId: string;
}

const CATEGORIES = [
  { value: 'voucher_issuance', label: 'Voucher Issuance' },
  { value: 'briefing_letter', label: 'Briefing Letter' },
  { value: 'rfta_approval', label: 'RFTA Approval' },
  { value: 'hap_contract', label: 'HAP Contract' },
  { value: 'recert_notice', label: 'Recertification Notice' },
  { value: 'inspection_notice', label: 'Inspection Notice' },
  { value: 'termination_notice', label: 'Termination Notice' },
  { value: 'port_out_authorization', label: 'Port-Out Authorization' },
  { value: 'general_notice', label: 'General Notice' },
  { value: 'custom', label: 'Custom' },
];

const MERGE_TAGS = [
  '{{tenant_name}}', '{{tenant_email}}', '{{tenant_phone}}',
  '{{voucher_number}}', '{{bedroom_size}}', '{{issue_date}}', '{{expiration_date}}',
  '{{contract_number}}', '{{property_address}}', '{{gross_rent}}', '{{hap_amount}}', '{{tenant_rent}}',
  '{{landlord_name}}', '{{landlord_email}}',
  '{{agency_name}}', '{{agency_city}}', '{{agency_state}}', '{{agency_phone}}', '{{agency_email}}',
  '{{today}}',
];

const SAMPLE_DATA: Record<string, string> = {
  tenant_name: 'Jane Doe',
  tenant_email: 'jane@example.com',
  tenant_phone: '(555) 123-4567',
  voucher_number: 'V-2026-00123',
  bedroom_size: '2',
  issue_date: 'January 15, 2026',
  expiration_date: 'April 15, 2026',
  contract_number: 'HAP-00789',
  property_address: '123 Main St, Springfield, IL 62701',
  gross_rent: '1,450.00',
  hap_amount: '1,100.00',
  tenant_rent: '350.00',
  landlord_name: 'Acme Properties LLC',
  landlord_email: 'leasing@acmeprops.com',
  agency_name: 'Springfield Housing Authority',
  agency_city: 'Springfield',
  agency_state: 'IL',
  agency_phone: '(555) 999-0000',
  agency_email: 'info@sha.gov',
  today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
};

function fillSample(html: string): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => SAMPLE_DATA[k] ?? `[${k}]`);
}

interface TemplateRow {
  id: string;
  agency_id: string | null;
  name: string;
  category: string;
  description: string | null;
  subject_line?: string | null;
  body_html: string;
  footer_text: string | null;
  is_system_default: boolean;
  is_active: boolean;
}

const DocumentTemplateEditor: React.FC<Props> = ({ agencyId }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['agency-doc-templates-editor', agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_document_templates')
        .select('*')
        .or(`agency_id.eq.${agencyId},and(agency_id.is.null,is_system_default.eq.true)`)
        .order('is_system_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data || []) as TemplateRow[];
    },
  });

  const startNew = () => {
    setEditing({
      id: '',
      agency_id: agencyId,
      name: '',
      category: 'general_notice',
      description: '',
      body_html: '<h1>Document Title</h1>\n<p>Dear {{tenant_name}},</p>\n<p>...</p>\n<p>Sincerely,<br/>{{agency_name}}</p>',
      footer_text: '',
      is_system_default: false,
      is_active: true,
    });
  };

  const cloneTemplate = (t: TemplateRow) => {
    setEditing({
      ...t,
      id: '',
      agency_id: agencyId,
      is_system_default: false,
      name: `${t.name} (Copy)`,
    });
  };

  const editTemplate = (t: TemplateRow) => {
    if (t.is_system_default) {
      toast.info('System templates are read-only. Use "Clone" to customize.');
      return;
    }
    setEditing(t);
  };

  const deleteTemplate = async (t: TemplateRow) => {
    if (t.is_system_default) return;
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const { error } = await (supabase as any).from('agency_document_templates').delete().eq('id', t.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Template deleted');
    qc.invalidateQueries({ queryKey: ['agency-doc-templates-editor', agencyId] });
    qc.invalidateQueries({ queryKey: ['agency-doc-templates-picker', agencyId] });
    qc.invalidateQueries({ queryKey: ['agency-doc-templates-button', agencyId] });
  };

  const saveTemplate = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        agency_id: agencyId,
        name: editing.name.trim(),
        category: editing.category,
        description: editing.description || null,
        body_html: editing.body_html,
        footer_text: editing.footer_text || null,
        is_system_default: false,
        is_active: editing.is_active,
      };
      let res;
      if (editing.id) {
        res = await (supabase as any).from('agency_document_templates').update(payload).eq('id', editing.id);
      } else {
        res = await (supabase as any).from('agency_document_templates').insert(payload);
      }
      if (res.error) throw res.error;
      toast.success(editing.id ? 'Template updated' : 'Template created');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['agency-doc-templates-editor', agencyId] });
      qc.invalidateQueries({ queryKey: ['agency-doc-templates-picker', agencyId] });
      qc.invalidateQueries({ queryKey: ['agency-doc-templates-button', agencyId] });
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const insertTag = (tag: string) => {
    if (!editing) return;
    setEditing({ ...editing, body_html: (editing.body_html || '') + ' ' + tag });
  };

  const showPreview = (html: string) => {
    const filled = fillSample(html);
    const wrapped = `<div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #1a1a1a; max-width: 720px; margin: 0 auto; padding: 24px;">${filled}</div>`;
    setPreviewHtml(wrapped);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" /> Document Templates
          </CardTitle>
          <Button size="sm" onClick={startNew}><Plus className="w-4 h-4 mr-1" /> New Template</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
          ) : !templates?.length ? (
            <p className="text-center text-muted-foreground py-6">No templates yet.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                      {t.is_system_default && <Badge variant="outline" className="text-xs">System</Badge>}
                      {!t.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-1 truncate">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" title="Preview" onClick={() => showPreview(t.body_html)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {t.is_system_default ? (
                      <Button variant="ghost" size="icon" title="Clone & customize" onClick={() => cloneTemplate(t)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => editTemplate(t)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => deleteTemplate(t)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Body (HTML, supports merge tags)</Label>
                  <Button variant="outline" size="sm" onClick={() => showPreview(editing.body_html)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                  </Button>
                </div>
                <Textarea
                  value={editing.body_html}
                  onChange={(e) => setEditing({ ...editing, body_html: e.target.value })}
                  rows={14}
                  className="font-mono text-xs"
                />
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Click a tag to insert:</p>
                  <div className="flex flex-wrap gap-1">
                    {MERGE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertTag(tag)}
                        className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-accent border border-border font-mono"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label>Footer Text (optional)</Label>
                <Textarea
                  value={editing.footer_text || ''}
                  onChange={(e) => setEditing({ ...editing, footer_text: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={saveTemplate} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-2" /> Save Template</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewHtml} onOpenChange={(o) => !o && setPreviewHtml(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview (sample data)</DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <>
              <div className="border rounded-md bg-white" dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }} />
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => downloadHtmlAsPdf(previewHtml, 'template_preview')}>
                  <FileText className="w-4 h-4 mr-1" /> Download as PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentTemplateEditor;
