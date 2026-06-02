import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';

interface DocumentUploaderProps {
  entityType: string;
  entityId: string;
  agencyId: string;
  readOnly?: boolean;
  isAdmin?: boolean;
  compact?: boolean;
  additionalEntityTypes?: string[];
}

interface DocRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  entity_type?: string;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ entityType, entityId, agencyId, readOnly = false, isAdmin = false, compact = false, additionalEntityTypes = [] }) => {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    setLoading(true);
    const allEntityTypes = [entityType, ...additionalEntityTypes];
    let query = supabase
      .from('agency_documents')
      .select('id, file_name, file_path, file_size, mime_type, created_at, entity_type')
      .eq('entity_id', entityId)
      .in('entity_type', allEntityTypes)
      .order('created_at', { ascending: false });
    const { data } = await query;
    setDocs((data as DocRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [entityType, entityId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { toast.error('Not authenticated'); setUploading(false); return; }

    for (const file of Array.from(files)) {
      const path = `${agencyId}/${entityType}/${entityId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('agency-documents').upload(path, file);
      if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }

      await supabase.from('agency_documents').insert({
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        agency_id: agencyId,
      } as any);
    }

    toast.success('Documents uploaded');
    fetchDocs();
    setUploading(false);
    e.target.value = '';
  };

  const handleDownload = async (doc: DocRecord) => {
    const { data } = await supabase.storage.from('agency-documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Failed to generate download link');
  };

  const handleDelete = async (doc: DocRecord) => {
    await supabase.storage.from('agency-documents').remove([doc.file_path]);
    await supabase.from('agency_documents').delete().eq('id', doc.id);
    toast.success('Document deleted');
    fetchDocs();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  const content = (
    <>
      {!compact && !readOnly && (
        <div className="flex items-center justify-between pb-2">
          <span className="text-sm font-medium">Documents</span>
          <label>
            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload
              </span>
            </Button>
          </label>
        </div>
      )}
      {compact && !readOnly && (
        <div className="flex justify-end mb-2">
          <label>
            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload
              </span>
            </Button>
          </label>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : docs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No documents attached</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-2 rounded border text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                    {doc.entity_type && additionalEntityTypes.length > 0 && (
                      <span className="ml-1 text-primary">
                        • {doc.entity_type === 'tenant_s8' ? 'Tenant uploaded' : 'Agency'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (compact) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Documents</CardTitle>
        {!readOnly && (
          <label>
            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload
              </span>
            </Button>
          </label>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : docs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No documents attached</p>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                      <Trash2 className="w-3.5 h-3.5" />
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

export default DocumentUploader;
