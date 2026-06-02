import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Download, FileText, Calendar, Tag } from 'lucide-react';
import { useAssetDocumentSearch, useAssetDocumentCategories } from '@/hooks/useAssetDocuments';
import { usePortfolioAssets } from '@/hooks/usePortfolioAssets';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDate } from '@/lib/utils';
import type { AssetDocumentSearchParams } from '@/types/portfolio-asset-documents';

interface AssetDocumentSearchProps {
  portfolioId: string;
  onDocumentSelect?: (documentId: string) => void;
}

export const AssetDocumentSearch: React.FC<AssetDocumentSearchProps> = ({
  portfolioId,
  onDocumentSelect,
}) => {
  const [searchParams, setSearchParams] = useState<AssetDocumentSearchParams>({
    portfolio_id: portfolioId,
    search_term: '',
    document_type: '',
    expiring_within_days: undefined,
    page: 1,
    limit: 20,
  });

  const { data: documents, isLoading } = useAssetDocumentSearch(searchParams);
  const { data: categories } = useAssetDocumentCategories();
  const { data: assets } = usePortfolioAssets(portfolioId);

  const updateSearchParams = (updates: Partial<AssetDocumentSearchParams>) => {
    setSearchParams(prev => ({ ...prev, ...updates, page: 1 }));
  };

  const getAssetName = (assetId: string) => {
    return assets?.find(asset => asset.id === assetId)?.asset_name || 'Unknown Asset';
  };

  const getCategoryInfo = (documentType: string) => {
    for (const category of categories || []) {
      if (category.asset_category_ids.some(id => 
        assets?.some(asset => asset.asset_category_id === id)
      )) {
        return category;
      }
    }
    return null;
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="h-4 w-4" />;
    
    if (mimeType.includes('image')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (mimeType.includes('word')) return <FileText className="h-4 w-4 text-blue-600" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className="h-4 w-4 text-green-600" />;
    
    return <FileText className="h-4 w-4" />;
  };

  const isDocumentExpiring = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isDocumentExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Document Search
          </CardTitle>
          <CardDescription>
            Search across all portfolio documents with advanced filtering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchParams.search_term || ''}
                onChange={(e) => updateSearchParams({ search_term: e.target.value })}
                className="pl-10"
              />
            </div>

            <Select 
              value={searchParams.document_type || ''} 
              onValueChange={(value) => updateSearchParams({ document_type: value || undefined })}
            >
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="lease">Lease Documents</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="tax">Tax Documents</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={searchParams.asset_id || ''} 
              onValueChange={(value) => updateSearchParams({ asset_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Assets</SelectItem>
                {assets?.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={searchParams.expiring_within_days?.toString() || ''} 
              onValueChange={(value) => updateSearchParams({ 
                expiring_within_days: value ? parseInt(value) : undefined 
              })}
            >
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Expiration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Documents</SelectItem>
                <SelectItem value="7">Expiring in 7 days</SelectItem>
                <SelectItem value="30">Expiring in 30 days</SelectItem>
                <SelectItem value="90">Expiring in 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {!documents || documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground text-center">
                Try adjusting your search criteria or upload some documents first.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Found {documents.length} document{documents.length !== 1 ? 's' : ''}
              </h3>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Selected
              </Button>
            </div>

            {documents.map((document) => {
              const category = getCategoryInfo(document.document_type);
              const isExpiring = isDocumentExpiring(document.expiration_date);
              const isExpired = isDocumentExpired(document.expiration_date);

              return (
                <Card 
                  key={document.id} 
                  className={`cursor-pointer hover:bg-accent/5 transition-colors ${
                    isExpired ? 'border-destructive' : isExpiring ? 'border-warning' : ''
                  }`}
                  onClick={() => onDocumentSelect?.(document.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getDocumentIcon(document.mime_type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{document.document_name}</h4>
                            {category && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs"
                                style={{ backgroundColor: `hsl(${category.color_theme})` }}
                              >
                                {document.document_type}
                              </Badge>
                            )}
                            {isExpired && (
                              <Badge variant="destructive" className="text-xs">
                                Expired
                              </Badge>
                            )}
                            {isExpiring && (
                              <Badge variant="outline" className="text-xs border-warning text-warning">
                                Expiring Soon
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            Asset: {getAssetName(document.asset_id)}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Uploaded {formatDate(new Date(document.created_at))}</span>
                            {document.file_size && (
                              <span>{Math.round(document.file_size / 1024)} KB</span>
                            )}
                            {document.expiration_date && (
                              <span>Expires {formatDate(new Date(document.expiration_date))}</span>
                            )}
                            <span>v{document.version_number}</span>
                          </div>

                          {document.tags && document.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <div className="flex gap-1">
                                {document.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};