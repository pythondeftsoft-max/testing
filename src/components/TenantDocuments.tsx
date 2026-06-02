
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withStorageTimeout } from '@/lib/storageUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Eye, Trash2 } from 'lucide-react';
import { DocumentViewerDialog } from './DocumentViewerDialog';

interface TenantDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
  size?: number;
  mime_type?: string;
}

interface TenantDocumentsProps {
  userId: string;
}

const TenantDocuments = ({ userId }: TenantDocumentsProps) => {
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadQueue, setUploadQueue] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<TenantDocument | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<TenantDocument | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const documentList = data?.map(doc => ({
        id: doc.id,
        name: doc.file_name,
        type: doc.document_type,
        url: doc.file_path,
        uploaded_at: doc.created_at,
        size: doc.file_size,
        mime_type: doc.mime_type
      })) || [];

      setDocuments(documentList);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    return <FileText className="h-5 w-5 text-blue-600" />;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadDocument = async () => {
    if (!selectedFile || !selectedDocumentType) {
      toast({
        title: "Missing Information",
        description: "Please select both a file and document type",
        variant: "destructive",
      });
      return;
    }

    // Check if another upload is in progress
    if (uploadQueue) {
      toast({
        title: "Please wait",
        description: "Another upload is in progress",
      });
      return;
    }

    // Store file reference for upload
    const fileToUpload = selectedFile;
    const docType = selectedDocumentType;

    // Create optimistic document entry (using TenantDocument interface)
    const optimisticDoc: TenantDocument = {
      id: `temp-${Date.now()}`, // Temporary ID
      name: fileToUpload.name,
      type: docType,
      url: `${userId}/${Date.now()}_${fileToUpload.name}`,
      uploaded_at: new Date().toISOString(),
      size: fileToUpload.size,
      mime_type: fileToUpload.type,
    };

    // Immediately clear form and show success
    setSelectedFile(null);
    setSelectedDocumentType('');
    const fileInput = document.getElementById('document-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    // Optimistically add to UI
    setDocuments(prev => [optimisticDoc, ...prev]);

    // Show immediate success toast
    toast({
      title: "Uploading...",
      description: "Document is being uploaded in the background",
    });

    // Set upload states
    setUploading(true);
    setUploadQueue(true);

    // Perform actual upload in TRUE background (fire-and-forget)
    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Date.now()}_${fileToUpload.name}`;
    const filePath = `${userId}/${fileName}`;

    // Don't await! Start upload and return immediately
    supabase.storage
      .from('tenant-documents')
      .upload(filePath, fileToUpload)
      .then(async ({ error: uploadError }) => {
        if (uploadError) throw uploadError;

        // Save document metadata to database
        const { data: dbData, error: dbError } = await supabase
          .from('tenant_documents')
          .insert({
            user_id: userId,
            file_name: fileToUpload.name,
            file_path: filePath,
            document_type: docType,
            file_size: fileToUpload.size,
            mime_type: fileToUpload.type
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Map database response to TenantDocument format and replace optimistic doc
        const realDoc: TenantDocument = {
          id: dbData.id,
          name: dbData.file_name,
          type: dbData.document_type,
          url: dbData.file_path,
          uploaded_at: dbData.created_at,
          size: dbData.file_size,
          mime_type: dbData.mime_type
        };

        setDocuments(prev => 
          prev.map(doc => doc.id === optimisticDoc.id ? realDoc : doc)
        );

        // Update toast to confirm completion
        toast({
          title: "Success",
          description: "Document uploaded successfully",
        });
        
        setUploading(false);
        setUploadQueue(false);
      })
      .catch((error: any) => {
        console.error('Error uploading document:', error);

        // Rollback: remove optimistic document from UI
        setDocuments(prev => prev.filter(doc => doc.id !== optimisticDoc.id));

        // Show error
        let errorDescription = "Failed to upload document";
        if (error.message?.includes('storage')) {
          errorDescription = "Storage upload failed. Please try again.";
        } else if (error.message?.includes('duplicate')) {
          errorDescription = "A document with this name already exists";
        }

        toast({
          title: "Upload failed",
          description: errorDescription,
          variant: "destructive",
        });
        
        setUploading(false);
        setUploadQueue(false);
      });
  };

  const downloadDocument = async (document: TenantDocument) => {
    // Show immediate feedback
    toast({
      title: "Preparing download...",
      description: `Downloading ${document.name}`,
    });

    try {
      // Download in background
      const { data, error } = await supabase.storage
        .from('tenant-documents')
        .download(document.url);

      if (error) throw error;

      // Create and trigger download
      const url = URL.createObjectURL(data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.name;
      window.document.body.appendChild(anchor);
      anchor.click();
      URL.revokeObjectURL(url);
      window.document.body.removeChild(anchor);

      // Show success
      toast({
        title: "Download complete",
        description: `${document.name} has been downloaded`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download failed",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const viewDocument = (document: TenantDocument) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  const deleteDocument = (document: TenantDocument) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    const deletedDoc = documentToDelete;

    // Immediately close dialog and show optimistic success
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);

    // Optimistically remove from UI
    setDocuments(prev => prev.filter(doc => doc.id !== deletedDoc.id));

    // Show immediate feedback
    toast({
      title: "Deleting document...",
      description: "This may take a moment",
    });

    // Perform actual deletion in background with timeout
    try {
      // Delete from database FIRST (faster, more reliable)
      const { error: dbError } = await supabase
        .from('tenant_documents')
        .delete()
        .eq('id', deletedDoc.id);

      if (dbError) throw dbError;

      // Try to delete from storage with timeout (less critical)
      const storageResult = await withStorageTimeout(
        async () => {
          const { error } = await supabase.storage
            .from('tenant-documents')
            .remove([deletedDoc.url]);
          if (error) throw error;
          return true;
        },
        'Storage deletion'
      );

      // Success even if storage deletion times out (orphaned file is acceptable)
      if (storageResult.timedOut) {
        console.warn('Storage deletion timed out, but database record removed');
      }

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      
      // Rollback: restore the document in UI
      setDocuments(prev => [...prev, deletedDoc].sort((a, b) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      ));
      
      // Show specific error message
      const errorMessage = error.message?.includes('timeout')
        ? 'Operation timed out. Please try again.'
        : 'Failed to delete document. Document has been restored.';

      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, TenantDocument[]>);

  const documentTypeLabels = {
    lease: 'Lease Documents',
    hap: 'HAP/Voucher Documents',
    income: 'Income Documents',
    identification: 'Identification',
    other: 'Other Documents'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lease">Lease Documents</SelectItem>
                  <SelectItem value="hap">HAP/Voucher Documents</SelectItem>
                  <SelectItem value="income">Income Documents</SelectItem>
                  <SelectItem value="identification">Identification</SelectItem>
                  <SelectItem value="other">Other Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="document-upload">Choose File</Label>
              <Input
                id="document-upload"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
              </p>
            </div>

            <Button 
              onClick={uploadDocument} 
              disabled={uploading || !selectedFile || !selectedDocumentType}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>

            {selectedFile && (
              <div className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents by Category */}
      {Object.entries(documentTypeLabels).map(([type, label]) => {
        const typeDocuments = groupedDocuments[type] || [];
        
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getDocumentIcon(type)}
                {label}
                <span className="text-sm font-normal text-gray-500">
                  ({typeDocuments.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeDocuments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No {label.toLowerCase()} uploaded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {typeDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getDocumentIcon(document.type)}
                        <div>
                          <p className="font-medium">{document.name}</p>
                          <p className="text-sm text-gray-500">
                            Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
                            {document.size && ` • ${(document.size / 1024 / 1024).toFixed(1)} MB`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewDocument(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDocument(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteDocument(document)}
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
        );
      })}

      <DocumentViewerDialog
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        document={selectedDocument}
        bucketName="tenant-documents"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TenantDocuments;
