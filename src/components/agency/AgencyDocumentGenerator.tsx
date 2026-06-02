import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Printer, Search, Settings, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { downloadHtmlAsPdf } from '@/utils/htmlToPdfDownload';
import DocumentTemplateEditor from './documents/DocumentTemplateEditor';
import DocumentHistoryList from './documents/DocumentHistoryList';

interface Props {
  agencyId: string;
  agencyName: string;
}

const AgencyDocumentGenerator: React.FC<Props> = ({ agencyId }) => {
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['agency-doc-templates-picker', agencyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('agency_document_templates')
        .select('id, name, category, description')
        .or(`agency_id.eq.${agencyId},and(agency_id.is.null,is_system_default.eq.true)`)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const { data: tenantResults } = useQuery({
    queryKey: ['tenant-search-docgen', agencyId, tenantSearch],
    queryFn: async () => {
      if (!tenantSearch || tenantSearch.length < 2) return [];
      const { data } = await supabase
        .from('agency_hap_contracts')
        .select('tenant_id')
        .eq('agency_id', agencyId)
        .limit(50);
      if (!data?.length) return [];
      const tenantIds = [...new Set(data.map((d) => d.tenant_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', tenantIds)
        .or(`first_name.ilike.%${tenantSearch}%,last_name.ilike.%${tenantSearch}%`);
      return (profiles || []).map((p) => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      }));
    },
    enabled: tenantSearch.length >= 2,
  });

  const handleGenerate = async () => {
    if (!templateId || !selectedTenant) {
      toast.error('Select a template and tenant');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-agency-document', {
        body: {
          agency_id: agencyId,
          template_id: templateId,
          entity_type: 'tenant',
          entity_id: selectedTenant.id,
        },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Generation failed');
      if (data?.html) {
        await downloadHtmlAsPdf(data.html, data.fileName || 'document');
        toast.success('PDF generated and downloaded');
      } else {
        toast.success('Document generated');
      }
      qc.invalidateQueries({ queryKey: ['agency-generated-docs-history', agencyId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Tabs defaultValue="generate" className="space-y-4">
      <TabsList>
        <TabsTrigger value="generate"><Printer className="w-3.5 h-3.5 mr-1" /> Generate</TabsTrigger>
        <TabsTrigger value="templates"><Settings className="w-3.5 h-3.5 mr-1" /> Templates</TabsTrigger>
        <TabsTrigger value="history"><History className="w-3.5 h-3.5 mr-1" /> History</TabsTrigger>
      </TabsList>

      <TabsContent value="generate">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Printer className="h-5 w-5 text-primary" /> Generate Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                  <SelectContent>
                    {(templates || []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div>
                          <p className="font-medium">{t.name}</p>
                          {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Tenant</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={selectedTenant ? selectedTenant.name : tenantSearch}
                    onChange={(e) => {
                      setTenantSearch(e.target.value);
                      setSelectedTenant(null);
                    }}
                    className="pl-9"
                  />
                </div>
                {tenantResults && tenantResults.length > 0 && !selectedTenant && (
                  <div className="mt-1 border rounded-md bg-popover shadow-sm max-h-40 overflow-y-auto">
                    {tenantResults.map((t) => (
                      <button
                        key={t.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => { setSelectedTenant(t); setTenantSearch(''); }}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generating || !templateId || !selectedTenant}>
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF...</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" /> Generate PDF</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              The PDF downloads to your device and a copy is saved to History for re-download.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="templates">
        <DocumentTemplateEditor agencyId={agencyId} />
      </TabsContent>

      <TabsContent value="history">
        <DocumentHistoryList agencyId={agencyId} />
      </TabsContent>
    </Tabs>
  );
};

export default AgencyDocumentGenerator;
