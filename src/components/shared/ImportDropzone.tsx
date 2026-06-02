import React, { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type IntakeKind = 'tenants' | 'landlords' | 'vouchers' | 'inspectors' | 'staff' | 'misc';

interface Props {
  agencyId: string;
  kind: IntakeKind;
  title?: string;
  description?: string;
  accept?: string;
}

const KIND_LABELS: Record<IntakeKind, string> = {
  tenants: 'Tenants / households',
  landlords: 'Landlords / owners',
  vouchers: 'Vouchers / HAP roster',
  inspectors: 'Inspectors / vendors',
  staff: 'Staff invitations',
  misc: 'Other documents',
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: 'bg-blue-500',
  parsing: 'bg-amber-500',
  ready_for_review: 'bg-violet-500',
  imported: 'bg-emerald-500',
  failed: 'bg-destructive',
  skipped: 'bg-muted-foreground',
};

export const ImportDropzone: React.FC<Props> = ({
  agencyId,
  kind,
  title,
  description,
  accept = '.csv,.xlsx,.xls,.pdf,.tsv',
}) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: files = [] } = useQuery({
    queryKey: ['intake-files', agencyId, kind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_intake_files')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('kind', kind)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!agencyId,
  });

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      if (arr.length === 0) return;
      setUploading(true);
      try {
        for (const file of arr) {
          const path = `${agencyId}/${kind}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from('onboarding-intake')
            .upload(path, file, { upsert: false, contentType: file.type });
          if (upErr) throw upErr;

          const { data: signed } = await supabase.storage
            .from('onboarding-intake')
            .createSignedUrl(path, 60 * 60 * 24 * 7);

          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('agency_intake_files').insert({
            agency_id: agencyId,
            uploaded_by: user?.id,
            kind,
            original_filename: file.name,
            file_url: signed?.signedUrl || path,
            mime_type: file.type,
            size_bytes: file.size,
            status: 'uploaded',
          });
        }
        toast({ title: 'Files uploaded', description: `${arr.length} file(s) queued for review.` });
        qc.invalidateQueries({ queryKey: ['intake-files', agencyId, kind] });
      } catch (e: any) {
        toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
      } finally {
        setUploading(false);
      }
    },
    [agencyId, kind, toast, qc],
  );

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('agency_intake_files').update({ status }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['intake-files', agencyId, kind] });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm">{title || `Drop ${KIND_LABELS[kind]} files`}</h4>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <Badge variant="outline" className="text-[10px]">{kind.toUpperCase()}</Badge>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Uploading…</span>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm">
              Drop CSV, XLSX, or PDF files here, or{' '}
              <label className="text-primary cursor-pointer hover:underline">
                browse
                <input
                  type="file"
                  multiple
                  accept={accept}
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </label>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              We'll parse and let you confirm before importing.
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f: any) => (
            <div key={f.id} className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/30">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate font-medium">{f.original_filename}</span>
              <Badge className={`${STATUS_COLORS[f.status] || 'bg-muted'} text-white text-[9px] px-1.5 h-4`}>
                {f.status.replace('_', ' ')}
              </Badge>
              {f.status === 'ready_for_review' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={() => updateStatus(f.id, 'imported')}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm import
                </Button>
              )}
              {f.status !== 'imported' && f.status !== 'skipped' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => updateStatus(f.id, 'skipped')}
                  title="Skip this file"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {f.status === 'failed' && f.error_text && (
                <AlertCircle className="h-3.5 w-3.5 text-destructive"><title>{f.error_text}</title></AlertCircle>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ImportDropzone;
