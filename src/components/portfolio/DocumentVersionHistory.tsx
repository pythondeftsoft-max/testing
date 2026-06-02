import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Download, FileText, User } from 'lucide-react';
import { useAssetDocumentVersions } from '@/hooks/useAssetDocuments';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDate } from '@/lib/utils';

interface DocumentVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

export const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  isOpen,
  onClose,
  documentId,
  documentName,
}) => {
  const { data: versions, isLoading } = useAssetDocumentVersions(documentId);

  const handleDownload = async (version: any) => {
    try {
      // This would be implemented with the actual download logic
      console.log('Downloading version:', version.id);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Version History: {documentName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>No version history available</div>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div key={version.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          v{version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(new Date(version.created_at))}
                        </span>
                      </div>

                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-muted-foreground">File:</span> {version.document_name}
                        </div>
                        {version.file_size && (
                          <div>
                            <span className="text-muted-foreground">Size:</span> {Math.round(version.file_size / 1024)} KB
                          </div>
                        )}
                        {version.uploaded_by && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Uploaded by:</span> {version.uploaded_by}
                          </div>
                        )}
                      </div>

                      {version.tags && version.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {version.tags.map((tag: string, tagIndex: number) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(version)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};