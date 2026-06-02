import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { X, Upload, FileText } from 'lucide-react';
import { useUnitDocuments } from '@/hooks/useUnitDocuments';
import { toast } from '@/hooks/use-toast';

interface UnitDocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
}

const DOCUMENT_TYPES = [
  'Lease Agreement',
  'Inspection Report',
  'Maintenance Record',
  'Tenant Application',
  'Insurance Document',
  'Utility Bill',
  'Certificate',
  'Other'
];

const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt']
};

export const UnitDocumentUpload = ({ isOpen, onClose, unitId }: UnitDocumentUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { createDocument } = useUnitDocuments(unitId);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ALLOWED_FILE_TYPES,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file, errors }) => {
          errors.forEach(error => {
            if (error.code === 'file-too-large') {
              alert(`File ${file.name} is too large. Maximum size is 50MB.`);
            } else if (error.code === 'file-invalid-type') {
              alert(`File ${file.name} is not a supported format.`);
            }
          });
        });
      }
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    }
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !documentType) return;

    // Close modal immediately
    const filesToUpload = [...selectedFiles];
    const docType = documentType;
    handleClose();

    // Show immediate feedback
    toast({
      title: 'Upload started',
      description: `Uploading ${filesToUpload.length} file${filesToUpload.length !== 1 ? 's' : ''}...`
    });

    // Upload all files in background (in parallel)
    const uploadPromises = filesToUpload.map(async (file, index) => {
      try {
        await createDocument(file, docType, notes);
        
        // Show progress toast
        toast({
          title: `File ${index + 1} of ${filesToUpload.length} uploaded`,
          description: file.name
        });
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive'
        });
      }
    });

    // Wait for all uploads (but don't block UI)
    await Promise.all(uploadPromises);

    // Show final success
    toast({
      title: 'All uploads complete',
      description: `Successfully uploaded ${filesToUpload.length} document${filesToUpload.length !== 1 ? 's' : ''}`
    });
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setDocumentType('');
    setNotes('');
    setUploadProgress(0);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Unit Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about these documents..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: PDF, DOC, DOCX, JPG, PNG, TXT (Max 50MB each)
              </p>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({selectedFiles.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || !documentType || uploading}
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};