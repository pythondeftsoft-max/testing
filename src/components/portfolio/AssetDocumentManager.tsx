import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Calendar,
  Tag,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { usePortfolioAssetDocuments, useAssetDocumentCategories, useAssetDocumentOperations } from '@/hooks/useAssetDocuments';
import { AssetDocumentUploadDialog } from './AssetDocumentUploadDialog';
import { AssetDocumentDetailsDialog } from './AssetDocumentDetailsDialog';
import { PortfolioAssetDocument } from '@/types/portfolio-asset-documents';
import { formatDate } from '@/lib/utils';

interface AssetDocumentManagerProps {
  portfolioId: string;
  assetId?: string;
  showAssetFilter?: boolean;
}

const AssetDocumentManager = ({ portfolioId, assetId, showAssetFilter = true }: AssetDocumentManagerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showExpiring, setShowExpiring] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PortfolioAssetDocument | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: documents = [], isLoading } = usePortfolioAssetDocuments(portfolioId);
  const { data: categories = [] } = useAssetDocumentCategories();
  const { downloadDocument, deleteDocument } = useAssetDocumentOperations(portfolioId);

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    if (assetId && doc.asset_id !== assetId) return false;
    if (searchTerm && !doc.document_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedType && doc.document_type !== selectedType) return false;
    if (selectedTag && !doc.tags.includes(selectedTag)) return false;
    if (showExpiring) {
      if (!doc.expiration_date) return false;
      const expiryDate = new Date(doc.expiration_date);
      const today = new Date();
      const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (daysDiff > 30) return false;
    }
    return true;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags)));

  const getCategoryInfo = (documentType: string) => {
    return categories.find(cat => cat.name === documentType);
  };

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

  const handleDownload = (document: PortfolioAssetDocument) => {
    downloadDocument.mutate(document);
  };

  const handleDelete = (document: PortfolioAssetDocument) => {
    if (confirm(`Are you sure you want to delete "${document.document_name}"?`)) {
      deleteDocument.mutate(document.id);
    }
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return FileText;
    if (mimeType.includes('pdf')) return FileText;
    if (mimeType.includes('image')) return FileText;
    if (mimeType.includes('word')) return FileText;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileText;
    return FileText;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading documents...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Asset Documents
            {filteredDocuments.length > 0 && (
              <Badge variant="secondary">{filteredDocuments.length}</Badge>
            )}
          </CardTitle>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <AssetDocumentUploadDialog 
                portfolioId={portfolioId}
                assetId={assetId}
                onClose={() => setUploadDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {allTags.length > 0 && (
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant={showExpiring ? "default" : "outline"}
            onClick={() => setShowExpiring(!showExpiring)}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Expiring Soon
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || selectedType || selectedTag || showExpiring
                ? "No documents match your filters."
                : assetId 
                  ? "No documents for this asset."
                  : "No documents in this portfolio."}
            </p>
            {!assetId && (
              <Button 
                onClick={() => setUploadDialogOpen(true)}
                className="mt-4"
                variant="outline"
              >
                Upload your first document
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((document) => {
              const category = getCategoryInfo(document.document_type);
              const DocumentIcon = getDocumentIcon(document.mime_type);
              const isExpiring = isDocumentExpiring(document.expiration_date);
              const isExpired = isDocumentExpired(document.expiration_date);

              return (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <DocumentIcon className="h-5 w-5 text-muted-foreground" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{document.document_name}</h4>
                        {category && (
                          <Badge 
                            variant="outline"
                            className={`text-xs bg-${category.color_theme}-50 text-${category.color_theme}-700 border-${category.color_theme}-200`}
                          >
                            {category.display_name}
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                        {isExpiring && !isExpired && (
                          <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>v{document.version_number}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(document.created_at)}
                        </span>
                        {document.expiration_date && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Expires {formatDate(document.expiration_date)}
                          </span>
                        )}
                        {document.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span>{document.tags.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDocument(document)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      disabled={downloadDocument.isPending}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(document)}
                      disabled={deleteDocument.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Document Details Dialog */}
        {selectedDocument && (
          <AssetDocumentDetailsDialog
            document={selectedDocument}
            open={!!selectedDocument}
            onClose={() => setSelectedDocument(null)}
            portfolioId={portfolioId}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AssetDocumentManager;