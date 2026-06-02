import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropertyDocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onUploadComplete: () => void;
}

const PropertyDocumentUpload = ({ isOpen, onClose, propertyId, onUploadComplete }: PropertyDocumentUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentType, setDocumentType] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  });

  const handleUpload = async () => {
    if (!files.length || !documentType) {
      toast({
        title: "Missing Information",
        description: "Please select files and document type.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${propertyId}/${Date.now()}-${file.name}`;
        
        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save to database
        const { error: dbError } = await supabase
          .from('property_documents')
          .insert({
            property_id: propertyId,
            document_type: documentType,
            file_name: file.name,
            file_path: fileName,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id || '',
            metadata: {
              notes: notes,
              file_size: file.size,
              mime_type: file.type
            }
          });

        if (dbError) throw dbError;

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      toast({
        title: "Upload Complete",
        description: `${files.length} document(s) uploaded successfully.`,
      });

      onUploadComplete();
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setDocumentType('');
    setNotes('');
    setUploadProgress(0);
    onClose();
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Property Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="document-type">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lease_agreement">Lease Agreement</SelectItem>
                <SelectItem value="placement_agreement">Placement Agreement</SelectItem>
                <SelectItem value="inspection_report">Inspection Report</SelectItem>
                <SelectItem value="hap_w9_form">W-9 Tax Form</SelectItem>
                <SelectItem value="hap_direct_deposit_form">Direct Deposit Form</SelectItem>
                <SelectItem value="hap_pm_agreement">PM Agreement</SelectItem>
                <SelectItem value="maintenance_report">Maintenance Report</SelectItem>
                <SelectItem value="insurance_document">Insurance Document</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about these documents..."
              rows={2}
            />
          </div>

          <div>
            <Label>Files</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <p>Drag & drop files here, or click to select</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG, DOC, DOCX files accepted
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files</Label>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !files.length || !documentType}>
              {uploading ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDocumentUpload;