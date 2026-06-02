import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Edit, 
  History, 
  Calendar, 
  Tag, 
  User, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { PortfolioAssetDocument } from '@/types/portfolio-asset-documents';
import { useAssetDocumentVersions, useAssetDocumentOperations } from '@/hooks/useAssetDocuments';
import { formatDate } from '@/lib/utils';

interface AssetDocumentDetailsDialogProps {
  document: PortfolioAssetDocument;
  open: boolean;
  onClose: () => void;
  portfolioId: string;
}

export const AssetDocumentDetailsDialog = ({ 
  document, 
  open, 
  onClose, 
  portfolioId 
}: AssetDocumentDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState('details');
  
  const { data: versions = [] } = useAssetDocumentVersions(document.id);
  const { downloadDocument } = useAssetDocumentOperations(portfolioId);

  const isDocumentExpiring = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expiryDate = new Date(expirationDate);
    const today = new Date();
    const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 30 && daysDiff >= 0;
  };

  const isDocumentExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expiryDate = new Date(expirationDate);
    const today = new Date();
    return expiryDate < today;
  };

  const handleDownload = () => {
    downloadDocument.mutate(document);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const isExpiring = isDocumentExpiring(document.expiration_date);
  const isExpired = isDocumentExpired(document.expiration_date);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {document.document_name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">v{document.version_number}</Badge>
                {isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
                {isExpiring && !isExpired && (
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                    Expiring Soon
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="versions">Version History</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Document Name</label>
                    <p className="font-medium">{document.document_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Document Type</label>
                    <p className="font-medium">{document.document_type}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">File Size</label>
                    <p className="font-medium">{formatFileSize(document.file_size)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">File Type</label>
                    <p className="font-medium">{document.mime_type || 'Unknown'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Dates & Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dates & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Uploaded</label>
                      <p className="font-medium">{formatDate(document.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
                      <p className="font-medium">{formatDate(document.updated_at)}</p>
                    </div>
                  </div>
                  
                  {document.expiration_date && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${isExpired ? 'text-red-500' : isExpiring ? 'text-orange-500' : 'text-muted-foreground'}`} />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Expires</label>
                        <p className={`font-medium ${isExpired ? 'text-red-600' : isExpiring ? 'text-orange-600' : ''}`}>
                          {formatDate(document.expiration_date)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {document.uploaded_by && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Uploaded By</label>
                        <p className="font-medium">{document.uploaded_by}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tags */}
            {document.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {document.metadata?.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{document.metadata.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Asset Information */}
            {document.asset && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Associated Asset</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{document.asset.asset_name}</p>
                      {document.asset.asset_category && (
                        <Badge variant="outline" className="mt-1">
                          {document.asset.asset_category.display_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="versions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {versions.length === 0 ? (
                  <p className="text-muted-foreground">No version history available.</p>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          version.id === document.id ? 'bg-primary/5 border-primary/20' : 'bg-muted/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={version.id === document.id ? "default" : "outline"}>
                            v{version.version_number}
                          </Badge>
                          <div>
                            <p className="font-medium">{version.document_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(version.created_at)} • {formatFileSize(version.file_size)}
                            </p>
                          </div>
                          {version.id === document.id && (
                            <Badge variant="secondary" className="ml-2">
                              Current
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument.mutate(version)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {document.mime_type?.includes('image') ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Image preview will be available soon.</p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                ) : document.mime_type?.includes('pdf') ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">PDF preview will be available soon.</p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};