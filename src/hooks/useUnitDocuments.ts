import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { withStorageTimeout, retryStorageOperation } from '@/lib/storageUtils';
import { previewCache } from '@/lib/previewCache';

export interface UnitDocument {
  id: string;
  unit_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  document_type: string;
  created_at: string;
  updated_at: string;
}

// File sanitization helper
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .trim();
};

// Determine correct storage bucket based on file path
// Lease documents are stored in property-documents bucket with /leases/ in path
const getBucketForPath = (filePath: string): string => {
  if (filePath.includes('/leases/')) {
    return 'property-documents';
  }
  return 'unit-documents';
};

export const useUnitDocuments = (unitId?: string) => {
  const [documents, setDocuments] = useState<UnitDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!unitId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('property_unit_documents')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching unit documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (
    file: File,
    documentType: string,
    notes?: string
  ): Promise<UnitDocument | null> => {
    if (!unitId) return null;

    try {
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'File size cannot exceed 50MB',
          variant: 'destructive'
        });
        return null;
      }

      // Create optimistic document immediately
      const optimisticDoc: UnitDocument = {
        id: `temp-${Date.now()}`,
        unit_id: unitId,
        uploaded_by: '',
        file_name: file.name,
        file_path: `${unitId}/${Date.now()}-${file.name}`,
        file_size: file.size,
        document_type: documentType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Show immediate feedback
      toast({
        title: 'Uploading...',
        description: 'Document is being uploaded in the background'
      });

      // Perform actual upload in background (don't await)
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const safeName = sanitizeFileName(baseName);
      const fileName = `${timestamp}-${safeName}.${fileExtension}`;
      const filePath = `${unitId}/${fileName}`;

      // Background upload
      (async () => {
        try {
          const { error: uploadError } = await supabase.storage
            .from('unit-documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data, error } = await supabase
            .from('property_unit_documents')
            .insert({
              unit_id: unitId,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id || '',
              file_name: file.name,
              document_type: documentType,
              file_path: filePath,
              file_size: file.size
            })
            .select()
            .single();

          if (error) throw error;

          toast({
            title: 'Success',
            description: 'Document uploaded successfully'
          });

          await fetchDocuments();
        } catch (error: any) {
          console.error('Error uploading document:', error);
          toast({
            title: 'Upload Failed',
            description: error.message || 'Failed to upload document',
            variant: 'destructive'
          });
          await fetchDocuments(); // Refresh to remove optimistic doc
        }
      })();

      return optimisticDoc;
    } catch (error: any) {
      console.error('Error preparing upload:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to prepare upload',
        variant: 'destructive'
      });
      return null;
    }
  };

  const deleteDocument = async (documentId: string): Promise<boolean> => {
    const document = documents.find(d => d.id === documentId);
    if (!document) return false;

    // Show immediate feedback
    toast({
      title: 'Deleting...',
      description: 'Document is being deleted'
    });

    // Perform deletion in background
    (async () => {
      try {
        // Delete from database FIRST (faster, more reliable)
        const { error: dbError } = await supabase
          .from('property_unit_documents')
          .delete()
          .eq('id', documentId);

        if (dbError) throw dbError;

        // Try to delete from storage with timeout (less critical)
        const bucket = getBucketForPath(document.file_path);
        const storageResult = await withStorageTimeout(
          async () => {
            const { error } = await supabase.storage
              .from(bucket)
              .remove([document.file_path]);
            if (error) throw error;
            return true;
          },
          'Storage deletion'
        );

        // Success even if storage deletion times out
        if (storageResult.timedOut) {
          console.warn('Storage deletion timed out, but database record removed');
        }

        toast({
          title: 'Success',
          description: 'Document deleted successfully'
        });

        await fetchDocuments();
      } catch (error: any) {
        console.error('Error deleting document:', error);
        
        const errorMessage = error.message?.includes('timeout')
          ? 'Operation timed out. Please try again.'
          : error.message || 'Failed to delete document';

        toast({
          title: 'Delete Failed',
          description: errorMessage,
          variant: 'destructive'
        });
        await fetchDocuments(); // Refresh to restore document
      }
    })();

    return true;
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const bucket = getBucketForPath(filePath);
    // Check cache first for instant load
    const cacheKey = `${bucket}/${filePath}`;
    const cachedUrl = previewCache.get(cacheKey);
    
    if (cachedUrl) {
      console.log('✅ Instant preview from cache (unit doc)');
      return cachedUrl;
    }

    // Not cached, need to download
    toast({
      title: 'Opening preview...',
      description: 'First time may take 15-30 seconds'
    });

    try {
      // Download blob and cache it
      const result = await retryStorageOperation(
        async () => {
          const { data, error } = await supabase.storage
            .from(bucket)
            .download(filePath);
          if (error) throw error;
          return data;
        },
        'Document preview',
        2
      );

      if (result.error) throw result.error;
      if (!result.data) return null;

      // Cache the blob for instant future loads
      const url = previewCache.set(cacheKey, result.data);
      console.log('💾 Cached unit document for instant preview next time');
      
      return url;
    } catch (error) {
      console.error('Error loading document preview:', error);
      toast({
        title: 'Preview Failed',
        description: 'Failed to open document preview',
        variant: 'destructive'
      });
      return null;
    }
  };

  const downloadDocument = async (document: UnitDocument) => {
    const bucket = getBucketForPath(document.file_path);
    // Show immediate feedback
    toast({
      title: 'Preparing download...',
      description: `Downloading ${document.file_name}`
    });

    // Try download with retry logic
    const result = await retryStorageOperation(
      async () => {
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(document.file_path);
        if (error) throw error;
        return data;
      },
      'Document download',
      2 // 2 retries
    );

    if (result.error) {
      console.error('Error downloading document:', result.error);
      
      const isTimeout = result.error.message?.includes('timeout') || result.error.message?.includes('timed out');
      toast({
        title: 'Download Failed',
        description: isTimeout
          ? 'Download timed out. Please try again in a moment.'
          : result.error.message || 'Failed to download document. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Create and trigger download
      const url = URL.createObjectURL(result.data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success
      toast({
        title: 'Download complete',
        description: `${document.file_name} has been downloaded`
      });
    } catch (error: any) {
      console.error('Error triggering download:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to save document',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (unitId) {
      fetchDocuments();

      // Set up realtime subscription
      const channel = supabase
        .channel(`unit-documents-${unitId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'property_unit_documents',
            filter: `unit_id=eq.${unitId}`
          },
          () => {
            fetchDocuments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [unitId]);

  return {
    documents,
    loading,
    createDocument,
    deleteDocument,
    getSignedUrl,
    downloadDocument,
    refetch: fetchDocuments
  };
};