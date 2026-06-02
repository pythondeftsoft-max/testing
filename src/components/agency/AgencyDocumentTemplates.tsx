import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Edit, Copy, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';

interface Template {
  id: string;
  agency_id: string | null;
  name: string;
  category: string;
  description: string | null;
  body_html: string;
  merge_fields: string[];
  is_system_default: boolean;
  is_active: boolean;
  footer_text: string | null;
}

const CATEGORIES = [
  { value: 'hap_contract', label: 'HAP Contract' },
  { value: 'voucher_issuance', label: 'Voucher Issuance' },
  { value: 'termination_notice', label: 'Termination Notice' },
  { value: 'recert_notice', label: 'Recertification Notice' },
  { value: 'briefing_letter', label: 'Briefing Letter' },
  { value: 'port_out_authorization', label: 'Port-Out Authorization' },
  { value: 'inspection_notice', label: 'Inspection Notice' },
  { value: 'rfta_approval', label: 'RFTA Approval' },
  { value: 'general_notice', label: 'General Notice' },
  { value: 'custom', label: 'Custom' },
];

interface Props {
  agencyId: string;
}

const AgencyDocumentTemplates: React.FC<Props> = ({ agencyId }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Template> | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['agency-doc-templates', agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_document_templates')
        .select('*')
        .or(`agency_id.eq.${agencyId},and(agency_id.is.null,is_system_default.eq.true)`)
        .eq('is_active', true)
        .order('is_system_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data || []) as Template[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (t: Partial<Template>) => {
      const payload: any = {
        agency_id: agencyId,
        name: t.name,
        category: t.category || 'custom',
        description: t.description || null,
        body_html: t.body_html || '',
        merge_fields: t.merge_fields || [],
        footer_text: t.footer_text || null,
        is_system_default: false,
        is_active: true,
      };
      if (t.id) {
        const { error } = await (supabase as any)
          .from('agency_document_templates').update(payload).eq('id', t.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('agency_document_templates').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Template saved');
      qc.invalidateQueries({ queryKey: ['agency-doc-templates', agencyId] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('agency_document_templates').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template removed');
      qc.invalidateQueries({ queryKey: ['agency-doc-templates', agencyId] });
    },
  });

  const cloneTemplate = (t: Template) => {
    setEditing({
      name: `${t.name} (Copy)`,
      category: t.category,
      description: t.description,
      body_html: t.body_html,
      merge_fields: t.merge_fields,
      footer_text: t.footer_text,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Templates</h3>
          <p className="text-sm text-muted-foreground">Edit or create branded templates for HAP contracts, notices, and letters.</p>
        </div>
        <Button onClick={() => setEditing({ category: 'general_notice', body_html: '', merge_fields: [] })}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create branded templates for HAP contracts, voucher issuance letters, termination notices, and more. System defaults appear here once seeded."
          primaryAction={{
            label: 'New template',
            onClick: () => setEditing({ category: 'general_notice', body_html: '', merge_fields: [] }),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(t => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">{t.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.is_system_default && <Badge variant="secondary" className="text-xs">System</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {t.is_system_default ? (
                      <Button size="sm" variant="ghost" onClick={() => cloneTemplate(t)}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Clone
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (confirm(`Remove "${t.name}"?`)) deleteMutation.mutate(t.id);
                        }}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editing.name || ''}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g., Annual Recert Notice"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editing.category || 'custom'} onValueChange={v => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editing.description || ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Brief purpose of this template"
                />
              </div>
              <div>
                <Label>Body HTML (use {'{{field_name}}'} for merge fields)</Label>
                <Textarea
                  value={editing.body_html || ''}
                  onChange={e => setEditing({ ...editing, body_html: e.target.value })}
                  rows={14}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Common fields: <code>{'{{tenant_name}}'}</code>, <code>{'{{agency_name}}'}</code>, <code>{'{{today}}'}</code>, <code>{'{{voucher_number}}'}</code>, <code>{'{{hap_amount}}'}</code>, <code>{'{{tenant_rent}}'}</code>, <code>{'{{property_address}}'}</code>
                </p>
              </div>
              <div>
                <Label>Footer text (optional)</Label>
                <Input
                  value={editing.footer_text || ''}
                  onChange={e => setEditing({ ...editing, footer_text: e.target.value })}
                  placeholder="e.g., Confidential. Contact us at..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={() => editing && saveMutation.mutate(editing)}
              disabled={!editing?.name || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgencyDocumentTemplates;
