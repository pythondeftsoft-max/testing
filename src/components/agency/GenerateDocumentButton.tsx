import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { downloadHtmlAsPdf } from '@/utils/htmlToPdfDownload';

type EntityType = 'tenant' | 'landlord' | 'hap_contract';

interface Props {
  agencyId: string;
  entityType: EntityType;
  entityId: string;
  recipientName?: string;
  /** Filter templates to a specific category (e.g. 'rfta', 'rent_change'). */
  category?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  label?: string;
  className?: string;
}

const GenerateDocumentButton: React.FC<Props> = ({
  agencyId,
  entityType,
  entityId,
  recipientName,
  category,
  variant = 'outline',
  size = 'sm',
  label = 'Generate Document',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['agency-doc-templates-button', agencyId, category],
    enabled: open && !!agencyId,
    queryFn: async () => {
      let query = (supabase as any)
        .from('agency_document_templates')
        .select('id, name, category, description')
        .or(`agency_id.eq.${agencyId},and(agency_id.is.null,is_system_default.eq.true)`)
        .eq('is_active', true)
        .order('name');
      if (category) query = query.eq('category', category);
      const { data } = await query;
      return data || [];
    },
  });

  const handleGenerate = async () => {
    if (!templateId) {
      toast.error('Select a template');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-agency-document', {
        body: { agency_id: agencyId, template_id: templateId, entity_type: entityType, entity_id: entityId },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Generation failed');
      if (data?.html) {
        await downloadHtmlAsPdf(data.html, data.fileName || 'document');
        toast.success('PDF generated and downloaded');
      } else {
        toast.success('Document generated');
      }
      setOpen(false);
      setTemplateId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className={className}>
        <Printer className="h-3.5 w-3.5 mr-1" /> {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Generate Document
            </DialogTitle>
            <DialogDescription>
              {recipientName ? `For: ${recipientName}` : `Select a template to generate a document.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-sm">Template</Label>
              <Select value={templateId} onValueChange={setTemplateId} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? 'Loading…' : 'Select template…'} />
                </SelectTrigger>
                <SelectContent>
                  {(templates || []).length === 0 && !isLoading ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      No templates available. Create one in Document Templates.
                    </div>
                  ) : (
                    (templates || []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{t.name}</span>
                          {t.description && (
                            <span className="text-xs text-muted-foreground">{t.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleGenerate} disabled={!templateId || generating}>
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
                ) : (
                  <><FileText className="h-4 w-4 mr-2" /> Generate</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GenerateDocumentButton;
