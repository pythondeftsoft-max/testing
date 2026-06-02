import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Sparkles, Mail, ScrollText } from 'lucide-react';
import { useAgencyNotices, type NoticeTemplate } from '@/hooks/useAgencyNotices';
import { generateNoticePdf, fillTemplate } from '@/utils/noticesPdfGenerator';
import RecipientPicker, { type RecipientOption } from './RecipientPicker';

interface Props {
  agencyId: string;
  agencyName: string;
  staffId: string;
  canManage: boolean;
}

const categoryColors: Record<string, "default" | "secondary" | "warning" | "success" | "destructive"> = {
  recertification: 'warning',
  termination: 'destructive',
  inspection: 'default',
  voucher: 'success',
  general: 'secondary',
};

const AgencyNotices: React.FC<Props> = ({ agencyId, agencyName, staffId, canManage }) => {
  const { templates, sentNotices, loading, seedDefaults, recordSentNotice } = useAgencyNotices(agencyId);
  const [selectedTemplate, setSelectedTemplate] = useState<NoticeTemplate | null>(null);
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [customVars, setCustomVars] = useState<Record<string, string>>({});
  const [previewBody, setPreviewBody] = useState('');
  const [tab, setTab] = useState<'generate' | 'history'>('generate');

  const handleSelectRecipient = (recipient: RecipientOption | null) => {
    if (recipient) {
      setTenantId(recipient.id);
      setTenantName(recipient.name);
      // Update template vars with the selected name
      if (selectedTemplate) {
        const updated = { ...customVars, tenant_name: recipient.name };
        setCustomVars(updated);
        setPreviewBody(fillTemplate(selectedTemplate.body_template, { ...updated, agency_name: agencyName }));
      }
    } else {
      setTenantId('');
      setTenantName('');
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const t = templates.find(t => t.id === templateId);
    if (!t) return;
    setSelectedTemplate(t);
    const matches = t.body_template.match(/\{\{(\w+)\}\}/g) || [];
    const vars: Record<string, string> = {};
    matches.forEach(m => {
      const key = m.replace(/\{\{|\}\}/g, '');
      if (key === 'agency_name') vars[key] = agencyName;
      else if (key === 'tenant_name') vars[key] = tenantName;
      else vars[key] = customVars[key] || '';
    });
    setCustomVars(vars);
    setPreviewBody(fillTemplate(t.body_template, { ...vars, agency_name: agencyName, tenant_name: tenantName }));
  };

  const updateVar = (key: string, value: string) => {
    const updated = { ...customVars, [key]: value };
    setCustomVars(updated);
    if (selectedTemplate) {
      setPreviewBody(fillTemplate(selectedTemplate.body_template, updated));
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !tenantName) return;
    const body = fillTemplate(selectedTemplate.body_template, {
      ...customVars,
      agency_name: agencyName,
      tenant_name: tenantName,
    });

    const doc = generateNoticePdf({
      agencyName,
      tenantName,
      templateName: selectedTemplate.name,
      subjectLine: selectedTemplate.subject_line,
      body,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    });

    doc.save(`${selectedTemplate.name.replace(/\s+/g, '_')}_${tenantName.replace(/\s+/g, '_')}.pdf`);

    if (tenantId) {
      await recordSentNotice(tenantId, selectedTemplate.id, selectedTemplate.category, staffId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={tab === 'generate' ? 'default' : 'outline'} size="sm" onClick={() => setTab('generate')}>
          <FileText className="w-4 h-4 mr-1" /> Generate Notice
        </Button>
        <Button variant={tab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setTab('history')}>
          <ScrollText className="w-4 h-4 mr-1" /> History ({sentNotices.length})
        </Button>
      </div>

      {tab === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" /> Notice Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.length === 0 && canManage && (
                <Button variant="outline" onClick={seedDefaults} className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" /> Create Default Templates
                </Button>
              )}

              <div className="space-y-2">
                <Label>Select Template</Label>
                <Select onValueChange={handleSelectTemplate}>
                  <SelectTrigger><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant={categoryColors[t.category] || 'secondary'} className="text-xs">
                            {t.category}
                          </Badge>
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tenant</Label>
                <RecipientPicker
                  type="tenant"
                  agencyId={agencyId}
                  value={tenantId || null}
                  onChange={handleSelectRecipient}
                  placeholder="Search tenants..."
                />
              </div>

              {selectedTemplate && Object.entries(customVars)
                .filter(([key]) => key !== 'agency_name' && key !== 'tenant_name')
                .map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                    <Input value={val} onChange={e => updateVar(key, e.target.value)} />
                  </div>
                ))
              }

              {selectedTemplate && (
                <Button onClick={handleGenerate} disabled={!tenantName} className="w-full">
                  <Download className="w-4 h-4 mr-2" /> Generate & Download PDF
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="border rounded-lg p-6 bg-card min-h-[400px] text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  <div className="font-bold text-base mb-1">{agencyName}</div>
                  <div className="text-muted-foreground text-xs mb-4">
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="font-semibold mb-4">RE: {selectedTemplate.subject_line}</div>
                  <div>{previewBody}</div>
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                  Select a template to see preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sent Notices ({sentNotices.length})</CardTitle>
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
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentNotices.length ? sentNotices.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono text-xs">{n.tenant_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant={categoryColors[n.notice_type] || 'secondary'}>
                            {n.notice_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-sm">{n.delivery_method}</TableCell>
                        <TableCell className="text-sm">{new Date(n.sent_at).toLocaleString()}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No notices sent yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgencyNotices;
