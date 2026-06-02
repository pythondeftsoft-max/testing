import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

type DocCategory = 'w9' | 'lease' | 'verification' | 'inspection' | 'other';

interface ParsedFile {
  file: File;
  category: DocCategory;
  matchedEntity: 'landlord' | 'tenant' | null;
  matchedId: string | null;
  matchedLabel: string | null;
  parsedKey: string | null;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

// Pattern: {LAST}_{FIRST}_{DOCTYPE}.pdf  e.g.  Smith_John_W9.pdf
function parseFilename(name: string): { last: string; first: string; type: string } | null {
  const base = name.replace(/\.[^.]+$/, '');
  const parts = base.split(/[_\-\s]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const type = parts.length >= 3 ? parts[parts.length - 1] : '';
  const last = parts[0];
  const first = parts[1];
  return { last, first, type: type.toLowerCase() };
}

function categorize(typeHint: string): DocCategory {
  const t = typeHint.toLowerCase();
  if (t.includes('w9') || t.includes('w-9')) return 'w9';
  if (t.includes('lease')) return 'lease';
  if (t.includes('verif') || t.includes('income')) return 'verification';
  if (t.includes('insp') || t.includes('hqs') || t.includes('nspire')) return 'inspection';
  return 'other';
}

const BulkDocumentDropzone: React.FC<Props> = ({ agencyId }) => {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = useCallback(async (selected: FileList) => {
    const arr = Array.from(selected);
    // Pre-fetch landlords + tenants for matching
    const [{ data: landlords }, { data: tenants }] = await Promise.all([
      supabase.from('agency_landlords').select('id, landlord_name, landlord_email').eq('agency_id', agencyId).limit(2000),
      supabase.from('voucher_applications').select('id, first_name, last_name, email').eq('agency_id', agencyId).limit(2000),
    ]);

    const parsed: ParsedFile[] = arr.map(f => {
      const p = parseFilename(f.name);
      const category = categorize(p?.type || '');
      let matchedEntity: 'landlord' | 'tenant' | null = null;
      let matchedId: string | null = null;
      let matchedLabel: string | null = null;
      if (p) {
        const fullLower = `${p.first} ${p.last}`.toLowerCase();
        if (category === 'w9') {
          const ll = landlords?.find(l => l.landlord_name?.toLowerCase().includes(p.last.toLowerCase()));
          if (ll) { matchedEntity = 'landlord'; matchedId = ll.id; matchedLabel = ll.landlord_name; }
        } else {
          const t = tenants?.find(t =>
            t.last_name?.toLowerCase() === p.last.toLowerCase() &&
            t.first_name?.toLowerCase().startsWith(p.first.toLowerCase())
          );
          if (t) { matchedEntity = 'tenant'; matchedId = t.id; matchedLabel = `${t.first_name} ${t.last_name}`; }
        }
      }
      return {
        file: f, category, matchedEntity, matchedId, matchedLabel,
        parsedKey: p ? `${p.first}_${p.last}` : null,
        status: 'pending',
      };
    });
    setFiles(parsed);
  }, [agencyId]);

  const upload = async () => {
    setWorking(true);
    const next = [...files];
    for (let i = 0; i < next.length; i++) {
      next[i].status = 'uploading';
      setFiles([...next]);
      try {
        const f = next[i].file;
        const ext = f.name.split('.').pop() || 'pdf';
        const path = `${agencyId}/bulk/${next[i].category}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('onboarding-intake').upload(path, f);
        if (upErr) throw upErr;
        await supabase.from('agency_intake_files' as any).insert({
          agency_id: agencyId,
          original_filename: f.name,
          file_url: path,
          kind: next[i].category,
          mime_type: f.type || 'application/pdf',
          size_bytes: f.size,
          status: 'uploaded',
          notes: next[i].matchedLabel
            ? `Auto-matched to ${next[i].matchedEntity}: ${next[i].matchedLabel} (${next[i].matchedId})`
            : 'Unmatched - manual review needed',
        } as any);
        next[i].status = 'uploaded';
      } catch (e: any) {
        next[i].status = 'error';
        next[i].error = e?.message || 'Upload failed';
      }
      setFiles([...next]);
      setProgress(Math.round(((i + 1) / next.length) * 100));
    }
    setWorking(false);
    toast.success(`Uploaded ${next.filter(n => n.status === 'uploaded').length} of ${next.length}`);
  };

  const matchedCount = files.filter(f => f.matchedId).length;
  const unmatched = files.length - matchedCount;

  return (
    <div className="space-y-4">
      <div className="rounded border border-dashed p-8 flex flex-col items-center gap-3">
        <FolderOpen className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drop or select PDFs. Filename pattern: <code className="font-mono text-xs">LastName_FirstName_DocType.pdf</code>
        </p>
        <label>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Button variant="outline" asChild>
            <span className="cursor-pointer"><Upload className="w-4 h-4 mr-2" />Select Files</span>
          </Button>
        </label>
      </div>

      {files.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">{files.length} files</Badge>
            <Badge variant="default">{matchedCount} auto-matched</Badge>
            {unmatched > 0 && <Badge variant="outline">{unmatched} need review</Badge>}
          </div>

          {working && <Progress value={progress} className="h-2" />}

          <div className="rounded border max-h-96 overflow-y-auto divide-y">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-xs">{f.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.category}
                    {f.matchedLabel ? ` → ${f.matchedEntity}: ${f.matchedLabel}` : ' • unmatched'}
                  </div>
                </div>
                {f.status === 'uploaded' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {f.status === 'error' && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="w-3 h-3" /> {f.error}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setFiles([]); setProgress(0); }} disabled={working}>Clear</Button>
            <Button onClick={upload} disabled={working || files.length === 0}>
              Upload {files.length} files
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkDocumentDropzone;
