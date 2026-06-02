import React, { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Trash2, Download, File, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface LandlordS8DocumentsTabProps {
  userId: string;
}

const DOC_CATEGORIES = ['W-9', 'Insurance', 'Lease', 'HAP Contract', 'Other'] as const;

const LandlordS8DocumentsTab = ({ userId }: LandlordS8DocumentsTabProps) => {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>('Other');
  const [expirationDate, setExpirationDate] = useState<string>('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['landlord-s8-docs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_documents')
        .select('*')
        .eq('entity_type', 'landlord_s8')
        .eq('entity_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = `${userId}/landlord-s8/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Find agency from landlord enrollments
      const { data: enrollment } = await supabase
        .from('agency_landlords')
        .select('agency_id')
        .or(`landlord_id.eq.${userId},landlord_email.eq.${userId}`)
        .limit(1)
        .maybeSingle();

      const agencyId = enrollment?.agency_id;
      if (!agencyId) throw new Error('No PHA enrollment found. Please register with a PHA first.');

      const { error: dbError } = await supabase.from('agency_documents').insert({
        agency_id: agencyId,
        entity_type: 'landlord_s8',
        entity_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
        document_category: category,
        expiration_date: expirationDate || null,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      queryClient.invalidateQueries({ queryKey: ['landlord-s8-docs'] });
      setExpirationDate('');
    },
    onError: (err: any) => toast.error(err.message || 'Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from('documents').remove([doc.file_path]);
      const { error } = await supabase.from('agency_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['landlord-s8-docs'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    } else toast.error('Failed to generate download link');
  };

  const onDrop = useCallback((files: File[]) => {
    files.forEach(f => uploadMutation.mutate(f));
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

  const getExpirationBadge = (expDate: string | null) => {
    if (!expDate) return null;
    const days = differenceInDays(new Date(expDate), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    if (days < 30) return <Badge variant="destructive" className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{days}d left</Badge>;
    if (days < 60) return <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">{days}d left</Badge>;
    return <Badge variant="outline" className="text-xs">{format(new Date(expDate), 'MMM d, yyyy')}</Badge>;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-primary" />
            Upload Section 8 Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Document Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Expiration Date (optional)</Label>
              <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
            </div>
          </div>
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
            <p className="text-xs text-muted-foreground mt-1">W-9, Insurance certificates, Leases — max 10 MB</p>
          </div>
        </CardContent>
      </Card>

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
          ) : !documents?.length ? (
            <p className="text-center text-muted-foreground py-6">
              No documents uploaded yet. Upload W-9, insurance, or lease documents above.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <File className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                        {doc.document_category && (
                          <Badge variant="secondary" className="text-xs">{doc.document_category}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), 'MMM d, yyyy')}
                          {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                        </p>
                        {getExpirationBadge(doc.expiration_date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.file_path, doc.file_name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate({ id: doc.id, file_path: doc.file_path })} className="text-destructive hover:text-destructive">
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

export default LandlordS8DocumentsTab;
