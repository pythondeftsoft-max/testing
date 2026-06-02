import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  FileText, 
  X, 
  Calendar, 
  Tag, 
  AlertCircle, 
  CheckCircle,
  Plus
} from 'lucide-react';
import { usePortfolioAssets } from '@/hooks/usePortfolioAssets';
import { useAssetDocumentCategories, useAssetDocumentOperations } from '@/hooks/useAssetDocuments';
import { AssetDocumentUploadProgress } from '@/types/portfolio-asset-documents';

interface AssetDocumentUploadDialogProps {
  portfolioId: string;
  assetId?: string;
  onClose: () => void;
}

export const AssetDocumentUploadDialog = ({ portfolioId, assetId, onClose }: AssetDocumentUploadDialogProps) => {
  const [selectedAssetId, setSelectedAssetId] = useState(assetId || '');
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState<AssetDocumentUploadProgress[]>([]);

  const { data: assets = [] } = usePortfolioAssets(portfolioId);
  const { data: categories = [] } = useAssetDocumentCategories();
  const { uploadDocument } = useAssetDocumentOperations(portfolioId);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: AssetDocumentUploadProgress[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
    }));
    
    setUploadProgress(prev => [...prev, ...newUploads]);

    // Auto-fill document name if empty and single file
    if (acceptedFiles.length === 1 && !documentName) {
      const fileName = acceptedFiles[0].name.split('.').slice(0, -1).join('.');
      setDocumentName(fileName);
    }
  }, [documentName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const removeFile = (index: number) => {
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedAssetId || !documentType || uploadProgress.length === 0) {
      return;
    }

    for (let i = 0; i < uploadProgress.length; i++) {
      const upload = uploadProgress[i];
      
      try {
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i 
              ? { ...item, status: 'processing', progress: 50 }
              : item
          )
        );

        const fileName = upload.file.name.split('.').slice(0, -1).join('.');
        const finalDocumentName = uploadProgress.length === 1 && documentName 
          ? documentName 
          : `${documentName || fileName}${uploadProgress.length > 1 ? ` (${i + 1})` : ''}`;

        await uploadDocument.mutateAsync({
          asset_id: selectedAssetId,
          portfolio_id: portfolioId,
          document_name: finalDocumentName,
          document_type: documentType,
          file: upload.file,
          tags,
          metadata: { notes },
          expiration_date: expirationDate || undefined,
        });

        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i 
              ? { ...item, status: 'completed', progress: 100 }
              : item
          )
        );
      } catch (error) {
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i 
              ? { ...item, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : item
          )
        );
      }
    }

    // Close dialog after a short delay if all uploads completed
    setTimeout(() => {
      const allCompleted = uploadProgress.every(upload => 
        upload.status === 'completed' || upload.status === 'error'
      );
      if (allCompleted) {
        onClose();
      }
    }, 1000);
  };

  const canUpload = selectedAssetId && documentType && uploadProgress.length > 0 && 
    !uploadProgress.some(upload => upload.status === 'uploading' || upload.status === 'processing');

  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload Asset Documents</DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Asset Selection */}
        {!assetId && (
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Document Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="documentName">Document Name</Label>
            <Input
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <Label>Files</Label>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-primary">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Support for PDF, images, Word docs, Excel sheets (max 50MB each)
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-2">
              {uploadProgress.map((upload, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">{upload.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(upload.file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {upload.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {upload.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        {upload.status === 'uploading' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {upload.status !== 'uploading' && (
                      <Progress value={upload.progress} className="h-2" />
                    )}
                    {upload.error && (
                      <p className="text-xs text-destructive mt-1">{upload.error}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex items-center gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Optional Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or description"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!canUpload || uploadDocument.isPending}
          >
            {uploadDocument.isPending ? 'Uploading...' : 'Upload Documents'}
          </Button>
        </div>
      </div>
    </>
  );
};