import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, FileText, Copy, Sparkles } from 'lucide-react';
import { useAgencyNotices, type NoticeTemplate } from '@/hooks/useAgencyNotices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CATEGORIES = ['recertification', 'inspection', 'voucher', 'termination', 'general'];

const MERGE_FIELDS = [
  { key: '{{tenant_name}}', desc: 'Tenant full name' },
  { key: '{{landlord_name}}', desc: 'Landlord full name' },
  { key: '{{agency_name}}', desc: 'Agency name' },
  { key: '{{agency_phone}}', desc: 'Agency phone number' },
  { key: '{{agency_address}}', desc: 'Agency address' },
  { key: '{{unit_address}}', desc: 'Unit address' },
  { key: '{{voucher_number}}', desc: 'Voucher number' },
  { key: '{{due_date}}', desc: 'Due date' },
  { key: '{{effective_date}}', desc: 'Effective date' },
  { key: '{{inspection_date}}', desc: 'Inspection date' },
  { key: '{{inspection_time}}', desc: 'Inspection time' },
  { key: '{{bedroom_size}}', desc: 'Bedroom size' },
  { key: '{{payment_standard}}', desc: 'Payment standard' },
];

const categoryColors: Record<string, "default" | "secondary" | "warning" | "success" | "destructive"> = {
  recertification: 'warning',
  termination: 'destructive',
  inspection: 'default',
  voucher: 'success',
  general: 'secondary',
};

interface Props {
  agencyId: string;
  canManage: boolean;
}

const NoticeTemplateEditor: React.FC<Props> = ({ agencyId, canManage }) => {
  const { templates, loading, seedDefaults, saveTemplate, refetch } = useAgencyNotices(agencyId);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<NoticeTemplate>>({});

  const handleEdit = (template: NoticeTemplate) => {
    setEditing({ ...template });
    setEditOpen(true);
  };

  const handleNew = () => {
    setEditing({ name: '', category: 'general', subject_line: '', body_template: '', is_default: false });
    setEditOpen(true);
  };

  const handleDuplicate = (template: NoticeTemplate) => {
    setEditing({
      name: `${template.name} (Copy)`,
      category: template.category,
      subject_line: template.subject_line,
      body_template: template.body_template,
      is_default: false,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing.name || !editing.body_template) {
      toast.error('Name and body are required');
      return;
    }
    await saveTemplate(editing);
    setEditOpen(false);
    setEditing({});
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('agency_notice_templates').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Template deleted');
    refetch();
  };

  const insertMergeField = (field: string) => {
    setEditing(prev => ({
      ...prev,
      body_template: (prev.body_template || '') + field,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Notice Templates ({templates.length})
        </h3>
        <div className="flex gap-2">
          {templates.length === 0 && canManage && (
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              <Sparkles className="w-4 h-4 mr-1" /> Create Defaults
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-1" /> New Template
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Merge Fields</TableHead>
                    {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(t => {
                    const fields = (t.body_template.match(/\{\{(\w+)\}\}/g) || []);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-sm">
                          {t.name}
                          {t.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={categoryColors[t.category] || 'secondary'} className="text-xs capitalize">
                            {t.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {t.subject_line}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {fields.slice(0, 3).map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-mono">
                                {f}
                              </Badge>
                            ))}
                            {fields.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{fields.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(t)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              {!t.is_default && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {templates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No templates yet. Create default templates or add your own.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editing.name || ''}
                  onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Annual Recertification Notice"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editing.category || 'general'}
                  onValueChange={v => setEditing(p => ({ ...p, category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={editing.subject_line || ''}
                onChange={e => setEditing(p => ({ ...p, subject_line: e.target.value }))}
                placeholder="e.g., Annual Recertification Required"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Body Template</Label>
                <span className="text-xs text-muted-foreground">Click merge fields to insert</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {MERGE_FIELDS.map(f => (
                  <Button
                    key={f.key}
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2 font-mono"
                    onClick={() => insertMergeField(f.key)}
                    title={f.desc}
                  >
                    {f.key}
                  </Button>
                ))}
              </div>
              <Textarea
                value={editing.body_template || ''}
                onChange={e => setEditing(p => ({ ...p, body_template: e.target.value }))}
                rows={12}
                className="font-mono text-sm"
                placeholder="Dear {{tenant_name}},&#10;&#10;..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoticeTemplateEditor;
