import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { downloadHtmlAsPdf } from '@/utils/htmlToPdfDownload';

interface Props {
  agencyId: string;
}

const DocumentHistoryList: React.FC<Props> = ({ agencyId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['agency-generated-docs-history', agencyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('agency_generated_documents')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const handleDownload = async (filePath: string, name: string) => {
    try {
      const { data: signed } = await supabase.storage
        .from('agency-generated-docs')
        .createSignedUrl(filePath, 300);
      if (!signed?.signedUrl) {
        toast.error('Failed to retrieve document');
        return;
      }
      const res = await fetch(signed.signedUrl);
      const html = await res.text();
      await downloadHtmlAsPdf(html, name);
    } catch (err: any) {
      toast.error(err.message || 'Download failed');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" /> Document History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
        ) : !data?.length ? (
          <p className="text-center text-muted-foreground py-6">No documents generated yet.</p>
        ) : (
          <div className="space-y-2">
            {data.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.template_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{doc.category}</Badge>
                      {doc.recipient_name && (
                        <span className="text-xs text-muted-foreground">{doc.recipient_name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.file_path, doc.template_name || 'document')}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentHistoryList;
