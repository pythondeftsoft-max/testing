import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText, History } from 'lucide-react';
import { format } from 'date-fns';
import { downloadNachaFile } from '@/utils/nachaGenerator';

interface Props {
  agencyId: string;
}

const statusVariant: Record<string, string> = {
  generated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  downloaded: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  submitted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-destructive/10 text-destructive',
};

const NachaFileHistory: React.FC<Props> = ({ agencyId }) => {
  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ['nacha-files', agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_nacha_files')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const handleDownload = async (file: any) => {
    downloadNachaFile(file.file_content, file.file_name);
    if (file.status === 'generated') {
      await (supabase as any)
        .from('agency_nacha_files')
        .update({ status: 'downloaded' })
        .eq('id', file.id);
      refetch();
    }
  };

  const handleMarkSubmitted = async (id: string) => {
    await (supabase as any)
      .from('agency_nacha_files')
      .update({ status: 'submitted' })
      .eq('id', id);
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> NACHA File History
        </CardTitle>
        <CardDescription>
          Audit log of every ACH file generated. Re-download files or mark them as submitted to your bank.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !files || files.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No NACHA files generated yet. Use "Export NACHA" on a HAP batch to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(f.created_at), 'MMM d, yyyy h:mm a')} · {f.total_entries} entries · ${Number(f.total_credit_amount).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={statusVariant[f.status] || ''}>{f.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(f)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {f.status !== 'submitted' && (
                    <Button size="sm" variant="outline" onClick={() => handleMarkSubmitted(f.id)}>
                      Mark Submitted
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NachaFileHistory;
