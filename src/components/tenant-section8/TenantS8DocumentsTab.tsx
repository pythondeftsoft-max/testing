
import React, { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Trash2, Download, File } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useDropzone } from 'react-dropzone';

interface TenantS8DocumentsTabProps {
  userId: string;
}

const TenantS8DocumentsTab = ({ userId }: TenantS8DocumentsTabProps) => {
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['tenant-s8-docs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_documents')
        .select('*')
        .eq('entity_type', 'tenant_s8')
        .eq('entity_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = `${userId}/section8/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // We need an agency_id — use a placeholder or the tenant's linked PHA
      const { data: tp } = await supabase
        .from('tenant_profiles')
        .select('housing_authority_id')
        .eq('user_id', userId)
        .maybeSingle();

      const agencyId = tp?.housing_authority_id;
      if (!agencyId) throw new Error('Please link a Housing Authority in your voucher info first.');

      const { error: dbError } = await supabase.from('agency_documents').insert({
        agency_id: agencyId,
        entity_type: 'tenant_s8',
        entity_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      queryClient.invalidateQueries({ queryKey: ['tenant-s8-docs'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from('documents').remove([doc.file_path]);
      const { error } = await supabase.from('agency_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['tenant-s8-docs'] });
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    } else {
      toast.error('Failed to generate download link');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => uploadMutation.mutate(file));
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-primary" />
            Upload Section 8 Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, images, DOC/DOCX — max 10 MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            My Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : !documents || documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No documents uploaded yet. Upload income verification, ID, or voucher letters above.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <File className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc.file_path, doc.file_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: doc.id, file_path: doc.file_path })}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantS8DocumentsTab;
